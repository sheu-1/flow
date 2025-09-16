import { Platform } from 'react-native';
import { requestSmsPermission as requestPerm } from './SmsPermissions';
import { parseSms } from './SmsParser';
import { saveSmsTransaction } from './SmsIngest';

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

export async function requestSmsPermission() {
  return requestPerm();
}

export async function startSmsListener() {
  if (Platform.OS !== 'android') return;

  const granted = await requestPerm();
  if (!granted) {
    console.warn('[SMS] Permission not granted');
    return;
  }

  // Try to attach a real-time broadcast listener first
  try {
    const SmsListener: SmsListenerModule | undefined = safeRequire('react-native-android-sms-listener');
    if (SmsListener && typeof SmsListener.addListener === 'function') {
      if (subscription) subscription.remove();
      subscription = SmsListener.addListener(async (message) => {
        try {
          const parsed = parseSms({ body: message.body, date: message.timestamp });
          if (!parsed.transaction_type && !parsed.amount) return; // ignore non-financial messages
          await saveSmsTransaction(parsed);
        } catch (e) {
          console.warn('[SMS] parse/save failed', e);
        }
      });
      console.log('[SMS] Listening for incoming SMS via broadcast');
      return;
    }
  } catch (e) {
    console.warn('[SMS] Broadcast listener not available, will use polling fallback', e);
  }

  // Fallback: polling using react-native-get-sms-android to check latest messages periodically
  try {
    const SmsAndroid: SmsAndroidModule | undefined = safeRequire('react-native-get-sms-android');
    if (!SmsAndroid) {
      console.warn('[SMS] Polling module not available');
      return;
    }
    // Poll every 20s for newest 20 SMS messages
    setInterval(() => {
      const filter = JSON.stringify({
        box: 'inbox',
        maxCount: 20,
        minDate: lastSeenTimestamp || undefined,
      });
      SmsAndroid.list(
        filter,
        (fail) => console.warn('[SMS] list fail', fail),
        async (_count, smsList) => {
          try {
            const arr: Array<{ body: string; date: number }> = JSON.parse(smsList);
            arr.sort((a, b) => a.date - b.date);
            for (const sms of arr) {
              if (sms.date <= lastSeenTimestamp) continue;
              const parsed = parseSms({ body: sms.body, date: sms.date });
              if (parsed.transaction_type || parsed.amount) {
                await saveSmsTransaction(parsed);
              }
              lastSeenTimestamp = Math.max(lastSeenTimestamp, sms.date);
            }
          } catch (e) {
            console.warn('[SMS] poll parse/save failed', e);
          }
        }
      );
    }, 20000);
    console.log('[SMS] Polling inbox for new messages');
  } catch (e) {
    console.warn('[SMS] Polling fallback unavailable', e);
  }
}

function safeRequire<T = any>(name: string): T | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(name);
    return mod?.default || mod;
  } catch {
    return undefined;
  }
}
