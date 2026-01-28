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
export async function scheduleDailySummaryNotification(userId: string): Promise<void> {
  try {
    console.log('[DailySummaryNotifications] Scheduling daily summary for user', userId);

    // Cancel any existing notification for this user
    await cancelDailySummaryNotification();

    // Create notification channel for Android
    await createNotificationChannel();

    // Schedule daily notification at 9 AM using daily trigger
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Cash Flow Summary',
        body: 'Tap to view your daily financial summary',
        data: { type: 'daily_summary', userId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });

    console.log('[DailySummaryNotifications] Scheduled notification ID:', notificationId);
    scheduledUsers.add(userId);
  } catch (error) {
    console.error('[DailySummaryNotifications] Error scheduling notification:', error);
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

    // If all are 0, we can still send a "No activity" summary or skip.
    // Let's send it to keep the daily habit alive, but maybe different text?
    const hasActivity = moneyIn > 0 || moneyOut > 0;

    // Better Emoji & Text Formatting
    const title = '📊 Daily Financial Summary';
    const body = hasActivity
      ? `Yesterday:\n💰 In: ${formatCurrency(moneyIn)}\n💸 Out: ${formatCurrency(moneyOut)}\n⚖️ Net: ${formatCurrency(netBalance)}`
      : `No transactions recorded yesterday. 📝`;

    // 1. Send System Notification (Push)
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body, // Note: body newlines might not show on all android versions perfectly, but usually fine
        sound: 'default',
        data: { type: 'daily_summary', userId, date: yesterday.toISOString() },
      },
      trigger: null, // Immediate
    });

    // 2. Add to In-App Notification Panel
    // We import notificationService dynamically or move it here to avoid circular dependencies if any
    const { notificationService } = require('./NotificationService');
    notificationService.addNotification({
      type: 'daily_summary', // We will need to update the type definition in NotificationService
      title,
      message: body.replace(/\n/g, '  '), // Replace newlines with spaces for single-line display if needed
      data: {
        moneyIn,
        moneyOut,
        netBalance,
        date: yesterday.toISOString()
      }
    });

    console.log('Immediate daily summary sent via background task');
  } catch (error) {
    console.error('Error sending immediate daily summary:', error);
  }
}

export async function cancelDailySummaryNotification(userId?: string) {
  try {
    // Cancel all scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

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
