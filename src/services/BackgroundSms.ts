import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './SupabaseClient';
import { readRecentSms, processSmsAndSave, getLastSeenForUser, setLastSeenForUser, canIngestSms } from './SmsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendDailySummaryNotification } from './DailySummaryNotifications';

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
      } catch { }
    }

    if (maxTs > lastSeen) {
      await setLastSeenForUser(maxTs, userId);
    }

    // Check for daily summary trigger (9 AM - 10 AM)
    try {
      const now = new Date();
      if (now.getHours() === 9) {
        const todayStr = now.toISOString().split('T')[0];
        const lastSentKey = `daily_summary_sent_${userId}`;
        const lastSent = await AsyncStorage.getItem(lastSentKey);

        if (lastSent !== todayStr) {
          console.log('[Background] Sending daily summary notification...');
          await sendDailySummaryNotification(userId);
          await AsyncStorage.setItem(lastSentKey, todayStr);
        }
      }
    } catch (e) {
      console.warn('[Background] Daily summary check failed', e);
    }
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
  } catch { }
}
