import * as Notifications from 'expo-notifications';
import { supabase } from './SupabaseClient';
import { formatCurrency } from '../utils/currency';

const NOTIFICATION_CHANNEL_ID = 'daily_summary_channel';

async function createNotificationChannel() {
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Daily Summaries',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
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

  const moneyIn = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const moneyOut = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const netBalance = moneyIn - moneyOut;

  return { moneyIn, moneyOut, netBalance };
}

export async function scheduleDailySummaryNotification(userId: string) {
  await createNotificationChannel();

  await Notifications.cancelAllScheduledNotificationsAsync();

  const summary = await (async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { moneyIn, moneyOut, netBalance } = await getTransactionSummary(userId, yesterday, today);
    
    return `Yesterday: In: ${formatCurrency(moneyIn)}, Out: ${formatCurrency(moneyOut)}, Net: ${formatCurrency(netBalance)}`;
  })();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your Daily Financial Summary',
      body: summary,
      sound: 'default',
    },
    trigger: {
      channelId: NOTIFICATION_CHANNEL_ID,
      seconds: 30 * 60, // 30 minutes
      repeats: true,
    },
  });
}
