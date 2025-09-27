import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../theme/ThemeProvider';
import { getTransactions, getAggregatesByPeriod } from '../services/TransactionService';
import { notificationService } from '../services/NotificationService';
import { Transaction, AggregatePeriod } from '../types';
import { MoneyCard } from '../components/MoneyCard';
import { PieChart } from '../components/PieChart';
import { PeriodSelector } from '../components/PeriodSelector';
import { ProfileMenu } from '../components/ProfileMenu';
import NotificationPanel from '../components/NotificationPanel';
import { TransactionCard } from '../components/TransactionCard';
import { spacing, fontSize } from '../theme/colors';

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const colors = useThemeColors();
  const { user } = useAuth();

  const refresh = useCallback(async (showRefreshing = false) => {
    if (!user?.id) return;
    if (showRefreshing) setRefreshing(true);
    try {
      const rows = await getTransactions(user.id, { limit: 500 });
      const mapped: Transaction[] = rows.map((r) => ({
        ...r,
        date: new Date(r.date),
        description: (r as any).description || (r as any).sender || r.category || '',
        category: r.category || 'Other',
        type: (r.type === 'income' || r.type === 'expense') ? r.type : (r.amount >= 0 ? 'income' : 'expense'),
      }));
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(mapped);
      
      // Check for spending notifications
      await notificationService.checkWeeklySpending(user.id);
    } catch (e) {
      // ignore
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  }, [user]);

  // Listen for notification updates
  useEffect(() => {
    const unsubscribe = notificationService.addListener((notifications) => {
      setUnreadCount(notificationService.getUnreadCount());
    });
    setUnreadCount(notificationService.getUnreadCount());
    return unsubscribe;
  }, []);

  // Initial load
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = useCallback(() => {
    refresh(true);
  }, [refresh]);

  const calculatePeriodStats = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    switch (selectedPeriod) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1);
        periodLabel = 'Today';
        break;
      case 'weekly':
        // Week starts on Sunday. If you prefer Monday, change offset to: ((now.getDay() + 6) % 7)
        const offset = now.getDay();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - offset);
        startDate = weekStart;
        endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 7);
        periodLabel = 'This Week';
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        periodLabel = 'This Month';
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
        periodLabel = 'This Year';
        break;
    }

    // Fallback for typescript narrowing (endDate is always set in switch above)
    endDate = endDate || now;

    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate < endDate;
    });

    const moneyIn = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const moneyOut = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netBalance = moneyIn - moneyOut;

    return { moneyIn, moneyOut, netBalance, periodLabel };
  };

  const { moneyIn, moneyOut, netBalance, periodLabel } = calculatePeriodStats();
  const recentTransactions = transactions.slice(0, 5);

  const displayName = user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={[styles.header, { paddingTop: spacing.xl }]}> 
          <View style={styles.iconsRow}>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowNotifications(true)}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
                {unreadCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: colors.danger }]}>
                    <Text style={[styles.notificationBadgeText, { color: colors.background }]}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <ProfileMenu />
            </View>
          </View>
          <View style={styles.greetingContainer}>
            <Text style={[styles.greeting, { color: colors.text }]}>Hello, {displayName}</Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        <View style={styles.cardsRow}>
          <MoneyCard
            title="Money In"
            amount={moneyIn}
            type="in"
            period={periodLabel}
            icon="trending-up-outline"
          />
          <MoneyCard
            title="Money Out"
            amount={moneyOut}
            type="out"
            period={periodLabel}
            icon="trending-down-outline"
          />
        </View>

        <View style={styles.netBalanceContainer}>
          <MoneyCard
            title="Net Balance"
            amount={netBalance}
            type="net"
            period={periodLabel}
            icon="analytics-outline"
          />
        </View>

        <PieChart moneyIn={moneyIn} moneyOut={moneyOut} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Add your first transaction to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Notification Panel */}
      <NotificationPanel 
        visible={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    padding: 16,
    paddingBottom: 8,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  greetingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 4,
    paddingHorizontal: spacing.md,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    marginTop: 0,
  },
  profileButton: {
    padding: spacing.xs,
    borderRadius: 999,
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  netBalanceContainer: {
    paddingHorizontal: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
  },
});
