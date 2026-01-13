import * as Notifications from 'expo-notifications';
import { supabase } from './SupabaseClient';
import { formatCurrency } from '../utils/currency';
import { Platform } from 'react-native';

const NOTIFICATION_CHANNEL_ID = 'daily_summary_channel';

async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Daily Summaries',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

async function getTransactionSummary(userId: string, startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString())
    .lt('date', endDate.toISOString());

  if (error) {
    console.error('Error fetching transaction summary:', error);
    return { moneyIn: 0, moneyOut: 0, netBalance: 0 };
  }

  const moneyIn = data.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
  const moneyOut = data.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
  const netBalance = moneyIn - moneyOut;

  return { moneyIn, moneyOut, netBalance };
}

/**
 * Schedule daily summary notification at 8:00 AM
 * Consolidates Into/Out/Net into a SINGLE notification.
 */
export async function scheduleDailySummaryNotification(userId: string) {
  try {
    await createNotificationChannel();

    // Check if already scheduled to prevent duplicates
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existingSummary = scheduled.find(
      (n) => n.content.data?.type === 'daily_summary'
    );

    if (existingSummary) {
      console.log('Daily summary notification already scheduled');
      return;
    }

    // Prepare the content (Note: Scheduler uses static content provided at scheduling time unfortunately,
    // so ideally we want a background task to update this, but for now we set a generic title
    // or we accept that it might be slightly stale if not updated via background fetch.
    // However, to make it dynamic without background execution, we can only set a generic message
    // OR we schedule it every time the app opens for the NEXT 8am.
    // The user wants it to trigger at 8am.

    // Strategy: We schedule a recurring notification with a generic "Check your daily summary" 
    // IF we cannot guarantee background execution. 
    // BUT, the user complained it "sends three notifications at once with summary transactions of the previous day".
    // This implies we WERE doing dynamic calculation but sending 3 separate ones.

    // To fix "three at once", we send ONE.
    // To fix "update in background", we rely on the background task to CANCEL and RESCHEDULE 
    // or SEND IMMEDIATELY if it runs.

    // For the scheduled trigger, we will try to pre-calculate for "Yesterday" (relative to when it runs? No, relative to scheduling).
    // Actually, Expo local notifications 'body' is static. 
    // So we will schedule a generic message that prompts the user, 
    // AND we will try to inject the actual data via the background task if it runs.

    // Wait, the previous implementation fetched data 'now' and scheduled it. 
    // If the app runs today, it schedules for tomorrow 8am. 
    // "Yesterday" relative to tomorrow 8am is "Today". 
    // So we need to calculate "Today's" stats (which will be "Yesterday" when the notif fires tomorrow).
    // But "Today" isn't over yet. 

    // BEST APPROACH: The background task (running at ~8am) should send the notification with actual data.
    // The scheduled one is a fallback. 

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Daily Financial Summary',
        body: 'Your daily transaction summary is ready. Tap to view details.',
        sound: 'default',
        data: { type: 'daily_summary', userId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 8,
        minute: 0,
        repeats: true,
      } as Notifications.CalendarTriggerInput,
    });

    console.log('Daily summary placeholder scheduled for 8:00 AM');
  } catch (error) {
    console.error('Error scheduling daily summary:', error);
  }
}

/**
 * Triggered by Background Fetch to send actual data
 */
export async function sendDailySummaryNotification(userId: string) {
  try {
    await createNotificationChannel();

    // Get yesterday's summary
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { moneyIn, moneyOut, netBalance } = await getTransactionSummary(userId, yesterday, today);

    // Don't send if there was no activity? Or send anyway? User wants summary.
    // If all are 0, maybe skip?
    if (moneyIn === 0 && moneyOut === 0) {
      console.log('No activity yesterday, skipping summary.');
      return;
    }

    const summaryText = `Yesterday: In ${formatCurrency(moneyIn)}, Out ${formatCurrency(moneyOut)}, Net ${formatCurrency(netBalance)}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Daily Financial Summary',
        body: summaryText,
        sound: 'default',
        data: { type: 'daily_summary', userId, date: yesterday.toISOString() },
      },
      trigger: null, // Immediate
    });

    console.log('Immediate daily summary sent via background task');
  } catch (error) {
    console.error('Error sending immediate daily summary:', error);
  }
}

export async function cancelDailySummaryNotification() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const summaryNotifications = scheduled.filter(
      (n) => n.content.data?.type === 'daily_summary'
    );

    for (const notification of summaryNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    console.log('Daily summary notifications cancelled');
  } catch (error) {
    console.error('Error cancelling daily summary:', error);
  }
}
