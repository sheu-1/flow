import { Platform, PermissionsAndroid } from 'react-native';
import { requestSmsPermission as requestPerm } from './SmsPermissions';
import { parseTransactionFromSms, RawSms } from '../utils/SMSParser';
import { insertTransactionSupabase } from './SupabaseService';
import { supabase } from './SupabaseClient';
import { PermissionService } from './PermissionService';

// Types for dynamic imports so TS doesn't error when the modules are absent in web/iOS/dev-client
// react-native-android-sms-listener: listens for incoming SMS broadcast
type SmsListenerModule = {
  addListener: (cb: (msg: { originatingAddress?: string; body: string; timestamp?: number }) => void) => { remove: () => void };
};

// react-native-get-sms-android: allows querying SMS inbox (fallback/polling)
type SmsAndroidModule = {
  list: (
    filter: string,
    fail: (e: any) => void,
    success: (cnt: number, smsList: string) => void,
  ) => void;
};

let subscription: { remove: () => void } | null = null;
let lastSeenTimestamp = 0;

export async function requestSmsPermission(): Promise<boolean> {
  return requestPerm();
}

/**
 * Check if SMS ingestion should be active based on permissions and settings
 */
export async function canIngestSms(): Promise<boolean> {
  const status = await PermissionService.getSmsStatus();
  return status.canImport;
}

/**
 * Read latest N SMS from inbox (Android-only) using react-native-get-sms-android
 */
export async function readRecentSms(limit = 50): Promise<RawSms[]> {
  if (Platform.OS !== 'android') return [];
  
  // Check if SMS ingestion is allowed
  const canIngest = await canIngestSms();
  if (!canIngest) {
    console.warn('[SMS] SMS ingestion not allowed - check permissions and settings');
    return [];
  }
  
  const hasPerm = await ensureReadPermissions();
  if (!hasPerm) return [];
  const SmsAndroid: SmsAndroidModule | undefined = loadSmsAndroidModule();
  if (!SmsAndroid) return [];

  return new Promise<RawSms[]>((resolve) => {
    const filter = JSON.stringify({ box: 'inbox', maxCount: Math.max(1, Math.min(200, limit)) });
    SmsAndroid.list(
      filter,
      () => resolve([]),
      (_count, smsList) => {
        try {
          const arr: Array<{ body: string; date: number; originatingAddress?: string }> = JSON.parse(smsList);
          const mapped: RawSms[] = arr.map((s) => ({ body: s.body, date: s.date, originatingAddress: s.originatingAddress }));
          resolve(mapped);
        } catch {
          resolve([]);
        }
      }
    );
  });
}

/**
 * Start listening for new SMS. Calls callback with raw SMS, and also processes & saves.
 */
export async function startSmsListener(onMessage?: (raw: RawSms) => void): Promise<{ remove: () => void } | undefined> {
  if (Platform.OS !== 'android') return;

  // Check if SMS ingestion is allowed
  const canIngest = await canIngestSms();
  if (!canIngest) {
    console.warn('[SMS] SMS ingestion not allowed - check permissions and settings');
    return;
  }

  const granted = await requestPerm();
  if (!granted) {
    console.warn('[SMS] Permission not granted');
    return;
  }

  // Try broadcast listener
  try {
    const SmsListener: SmsListenerModule | undefined = loadSmsListenerModule();
    if (SmsListener && typeof SmsListener.addListener === 'function') {
      if (subscription) subscription.remove();
      subscription = SmsListener.addListener(async (message) => {
        const raw: RawSms = { body: message.body, date: message.timestamp, originatingAddress: message.originatingAddress };
        try {
          onMessage?.(raw);
          await processSmsAndSave(raw);
        } catch (e) {
          console.warn('[SMS] process failed', e);
        }
      });
      console.log('[SMS] Listening for incoming SMS via broadcast');
      return subscription;
    }
  } catch (e) {
    console.warn('[SMS] Broadcast listener not available, will use polling fallback', e);
  }

  // Fallback: polling using react-native-get-sms-android
  try {
    const SmsAndroid: SmsAndroidModule | undefined = loadSmsAndroidModule();
    if (!SmsAndroid) {
      console.warn('[SMS] Polling module not available');
      return;
    }
    const intervalId = setInterval(async () => {
      try {
        const list = await readRecentSms(20);
        list
          .filter((s) => typeof s.date === 'number' && (s.date as number) > lastSeenTimestamp)
          .sort((a, b) => (Number(a.date) || 0) - (Number(b.date) || 0));
        for (const sms of list) {
          const ts = Number(sms.date) || 0;
          if (ts <= lastSeenTimestamp) continue;
          onMessage?.(sms);
          await processSmsAndSave(sms);
          lastSeenTimestamp = Math.max(lastSeenTimestamp, ts);
        }
      } catch (e) {
        console.warn('[SMS] polling failed', e);
      }
    }, 20000);
    subscription = { remove: () => clearInterval(intervalId) };
    console.log('[SMS] Polling inbox for new messages');
    return subscription;
  } catch (e) {
    console.warn('[SMS] Polling fallback unavailable', e);
  }
}

export function stopSmsListener() {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
}

export async function processSmsAndSave(raw: RawSms): Promise<void> {
  try {
    const parsed = parseTransactionFromSms(raw.body, raw.date ? new Date(raw.date).toISOString() : undefined);
    if (!parsed) return; // not a transaction message
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      console.warn('[SMS] No authenticated user; skipping insert');
      return;
    }
    const res = await insertTransactionSupabase(parsed, userId);
    if (!res.success) {
      console.warn('[SMS] Supabase insert failed', res.error);
    }
  } catch (e) {
    console.warn('[SMS] processSmsAndSave error', e);
  }
}

async function ensureReadPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);
    const readOk = granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
    const recvOk = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
    return !!(readOk && recvOk);
  } catch {
    return false;
  }
}

function loadSmsListenerModule(): SmsListenerModule | undefined {
  if (Platform.OS !== 'android') return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-android-sms-listener');
    return (mod?.default || mod) as SmsListenerModule;
  } catch {
    return undefined;
  }
}

function loadSmsAndroidModule(): SmsAndroidModule | undefined {
  if (Platform.OS !== 'android') return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-get-sms-android');
    return (mod?.default || mod) as SmsAndroidModule;
  } catch {
    return undefined;
  }
}
