import * as Notifications from 'expo-notifications';
import { supabase } from './SupabaseClient';
import { formatCurrency } from '../utils/currency';
import { Platform } from 'react-native';

const NOTIFICATION_CHANNEL_ID = 'daily_summary_channel';

// Track if notifications have been scheduled for each user to prevent duplicates
const scheduledUsers = new Set<string>();

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
 * Schedule daily summary notification at 9:00 AM
 * Consolidates Into/Out/Net into a SINGLE notification.
 */
export async function scheduleDailySummaryNotification(userId: string) {
  try {
    await createNotificationChannel();

    // Check if already scheduled for this user to prevent duplicates
    if (scheduledUsers.has(userId)) {
      console.log('Daily summary notification already scheduled for user:', userId);
      return;
    }

    // We don't schedule a placeholder notification anymore
    // Instead, we rely on the background task to send the actual notification at 9 AM
    // This prevents duplicate notifications and ensures the notification contains real data
    
    // Mark this user as having notifications scheduled
    scheduledUsers.add(userId);
    console.log('Daily summary notification will be sent by background task at 9:00 AM for user:', userId);
  } catch (error) {
    console.error('Error setting up daily summary:', error);
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

export async function cancelDailySummaryNotification(userId?: string) {
  try {
    // Since we're not scheduling notifications anymore, we just clear the tracking
    // Remove user from scheduled set if provided
    if (userId) {
      scheduledUsers.delete(userId);
    } else {
      // Clear all users if no specific user provided
      scheduledUsers.clear();
    }

    console.log('Daily summary notification setup cancelled');
  } catch (error) {
    console.error('Error cancelling daily summary:', error);
  }
}
