import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './SupabaseClient';
import { readRecentSms, processSmsAndSave, getLastSeenForUser, setLastSeenForUser, canIngestSms } from './SmsService';

const TASK_NAME = 'BACKGROUND_SMS_FETCH';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    if (Platform.OS !== 'android') {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const can = await canIngestSms();
    if (!can) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const lastSeen = await getLastSeenForUser(userId);
    const list = await readRecentSms(50);
    const newer = list
      .filter((s) => typeof s.date === 'number' && (s.date as number) > lastSeen)
      .sort((a, b) => (Number(a.date) || 0) - (Number(b.date) || 0));

    let maxTs = lastSeen;
    for (const sms of newer) {
      try {
        await processSmsAndSave(sms);
        const ts = Number(sms.date) || 0;
        if (ts > maxTs) maxTs = ts;
      } catch {}
    }

    if (maxTs > lastSeen) {
      await setLastSeenForUser(maxTs, userId);
    }

    return newer.length > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (e) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSmsTask(): Promise<boolean> {
  try {
    if (Platform.OS !== 'android') return false;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) return true;

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
      requiresBatteryNotLow: false,
      requiresCharging: false,
      requiresDeviceIdle: false,
      requiresNetworkConnectivity: false,
    });
    return true;
  } catch (e) {
    return false;
  }
}

export async function unregisterBackgroundSmsTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    }
  } catch {}
}
