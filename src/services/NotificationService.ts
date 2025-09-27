import { getAggregatesByPeriod } from './TransactionService';

export interface SpendingNotification {
  id: string;
  type: 'spending_increase' | 'spending_decrease' | 'income_change';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  data: {
    currentWeekSpending?: number;
    previousWeekSpending?: number;
    percentageChange?: number;
    currentWeekIncome?: number;
    previousWeekIncome?: number;
  };
}

class NotificationService {
  private notifications: SpendingNotification[] = [];
  private listeners: ((notifications: SpendingNotification[]) => void)[] = [];

  // Add a listener for notification updates
  addListener(callback: (notifications: SpendingNotification[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Add a new notification
  addNotification(notification: Omit<SpendingNotification, 'id' | 'timestamp' | 'isRead'>) {
    const newNotification: SpendingNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      isRead: false,
    };

    this.notifications.unshift(newNotification);
    
    // Keep only the last 10 notifications
    if (this.notifications.length > 10) {
      this.notifications = this.notifications.slice(0, 10);
    }

    this.notifyListeners();
  }

  // Mark notification as read
  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.isRead = true;
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true);
    this.notifyListeners();
  }

  // Get all notifications
  getNotifications(): SpendingNotification[] {
    return [...this.notifications];
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  // Check for spending changes and create notifications
  async checkWeeklySpending(userId: string): Promise<void> {
    try {
      // Get last 2 weeks of data (14 days)
      const aggregates = await getAggregatesByPeriod(userId, 'weekly', 14);
      
      if (aggregates.length < 2) return; // Need at least 2 weeks to compare

      // Get current week (most recent 7 days) and previous week
      const currentWeekData = aggregates.slice(0, 7); // Last 7 days
      const previousWeekData = aggregates.slice(7, 14); // Previous 7 days

      const currentWeekSpending = currentWeekData.reduce((sum, day) => sum + day.expense, 0);
      const previousWeekSpending = previousWeekData.reduce((sum, day) => sum + day.expense, 0);
      
      const currentWeekIncome = currentWeekData.reduce((sum, day) => sum + day.income, 0);
      const previousWeekIncome = previousWeekData.reduce((sum, day) => sum + day.income, 0);

      // Calculate percentage changes
      const spendingChange = previousWeekSpending > 0 
        ? ((currentWeekSpending - previousWeekSpending) / previousWeekSpending) * 100 
        : 0;

      const incomeChange = previousWeekIncome > 0 
        ? ((currentWeekIncome - previousWeekIncome) / previousWeekIncome) * 100 
        : 0;

      // Create spending notifications (threshold: 20% change)
      if (Math.abs(spendingChange) >= 20) {
        const isIncrease = spendingChange > 0;
        this.addNotification({
          type: isIncrease ? 'spending_increase' : 'spending_decrease',
          title: isIncrease ? '📈 Spending Alert' : '📉 Spending Reduced',
          message: isIncrease 
            ? `You spent ${Math.abs(spendingChange).toFixed(1)}% more this week ($${currentWeekSpending.toFixed(2)}) compared to last week ($${previousWeekSpending.toFixed(2)})`
            : `Great job! You spent ${Math.abs(spendingChange).toFixed(1)}% less this week ($${currentWeekSpending.toFixed(2)}) compared to last week ($${previousWeekSpending.toFixed(2)})`,
          data: {
            currentWeekSpending,
            previousWeekSpending,
            percentageChange: spendingChange,
          }
        });
      }

      // Create income notifications (threshold: 15% change)
      if (Math.abs(incomeChange) >= 15) {
        const isIncrease = incomeChange > 0;
        this.addNotification({
          type: 'income_change',
          title: isIncrease ? '💰 Income Boost' : '💸 Income Drop',
          message: isIncrease 
            ? `Your income increased by ${Math.abs(incomeChange).toFixed(1)}% this week ($${currentWeekIncome.toFixed(2)}) compared to last week ($${previousWeekIncome.toFixed(2)})`
            : `Your income decreased by ${Math.abs(incomeChange).toFixed(1)}% this week ($${currentWeekIncome.toFixed(2)}) compared to last week ($${previousWeekIncome.toFixed(2)})`,
          data: {
            currentWeekIncome,
            previousWeekIncome,
            percentageChange: incomeChange,
          }
        });
      }

    } catch (error) {
      console.error('Error checking weekly spending:', error);
    }
  }

  // Clear all notifications
  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }
}

export const notificationService = new NotificationService();
