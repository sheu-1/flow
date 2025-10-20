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
import { UnifiedPeriodSelector } from '../components/UnifiedPeriodSelector';
import { DetailedPeriodSelector } from '../components/DetailedPeriodSelector';
import { ProfileMenu } from '../components/ProfileMenu';
import NotificationPanel from '../components/NotificationPanel';
import { TransactionCard } from '../components/TransactionCard';
import { FinancialHealthScore } from '../components/FinancialHealthScore';
import { SmartInsights } from '../components/SmartInsights';
import { SavingsGoals } from '../components/SavingsGoals';
import { spacing, fontSize } from '../theme/colors';
import { useRealtimeTransactions } from '../hooks/useRealtimeTransactions';
import { invalidateUserCaches } from '../services/TransactionService';
import { useDateFilter } from '../hooks/useDateFilter';

// Enable detailed logging
console.log('🚀 DashboardScreen loading...');

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aggregates, setAggregates] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [refreshing, setRefreshing] = useState(false);
  const colors = useThemeColors();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDetailedPeriodSelector, setShowDetailedPeriodSelector] = useState(false);
  
  // Date filtering
  const {
    filteredTransactions,
    selectedPreset,
    formattedRange,
    setPreset,
    setCustomRange,
    resetFilter,
  } = useDateFilter(transactions);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const [txns, aggregates] = await Promise.all([
        getTransactions(user.id, { limit: 100 }).catch(err => {
          console.warn('Failed to load transactions:', err);
          return [];
        }),
        getAggregatesByPeriod(user.id, selectedPeriod, 30).catch(err => {
          console.warn('Failed to load aggregates:', err);
          return [];
        }),
      ]);
      const mapped: Transaction[] = txns.map(r => ({
        ...r,
        date: new Date(r.date),
        description: (r as any).description || (r as any).sender || r.category || '',
        category: r.category || 'Other',
        type: (r.type === 'income' || r.type === 'expense') ? r.type : (r.amount >= 0 ? 'income' : 'expense'),
      }));
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(mapped);
      setAggregates(aggregates);
    } catch (error) {
      console.error('Dashboard refresh error:', error);
      // Set empty data to prevent crashes
      setTransactions([]);
      setAggregates([]);
      try {
        // Check for spending notifications
        await notificationService.checkWeeklySpending(user.id);
      } catch (e) {
        // ignore notification errors
      }
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, selectedPeriod]);

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

  // Realtime updates
  useRealtimeTransactions(user?.id, async () => {
    if (!user?.id) return;
    await invalidateUserCaches(user.id);
    // Refresh without spinner for snappy UX
    refresh();
  });

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
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

    // Use date-filtered transactions instead of all transactions
    const periodFilteredTransactions = filteredTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate < endDate;
    });

    const moneyIn = periodFilteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const moneyOut = periodFilteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netBalance = moneyIn - moneyOut;

    return { moneyIn, moneyOut, netBalance, periodLabel };
  };

  const { moneyIn, moneyOut, netBalance, periodLabel } = calculatePeriodStats();
  const recentTransactions = filteredTransactions.slice(0, 5);

  const displayName = user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        stickyHeaderIndices={[1]} // Make the period selector (index 1) sticky
      >
        {/* Scrollable Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.greeting, { color: colors.text }]}>Hello, {displayName}</Text>
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
          
          <View style={styles.dateRow}>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>
        
        {/* Sticky Unified Period Selector */}
        <View style={[styles.stickyPeriodSelector, { backgroundColor: colors.background }]}>
          <UnifiedPeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            onOpenDetailedSelector={() => setShowDetailedPeriodSelector(true)}
            removeMargin
          />
        </View>
        
        {/* Main Content */}
        <View>
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

        {/* Financial Health Score */}
        <FinancialHealthScore
          totalIncome={moneyIn}
          totalExpense={moneyOut}
          savingsRate={moneyIn > 0 ? ((moneyIn - moneyOut) / moneyIn) * 100 : 0}
          transactionCount={transactions.length}
          onPress={() => console.log('Health score pressed')}
        />

        {/* Smart Insights */}
        <SmartInsights
          transactions={filteredTransactions}
          userId={user?.id || ''}
        />

        {/* Savings Goals */}
        <SavingsGoals
          userId={user?.id || ''}
          totalSavings={netBalance}
        />

        {/* Debug panels removed for production */}

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
        </View>
      </ScrollView>
      
      {/* Notification Panel */}
      <NotificationPanel 
        visible={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
      
      {/* Detailed Period Selector */}
      <DetailedPeriodSelector
        visible={showDetailedPeriodSelector}
        onClose={() => setShowDetailedPeriodSelector(false)}
        selectedPreset={selectedPreset}
        onPresetSelect={setPreset}
        onCustomRangeSelect={setCustomRange}
        onReset={resetFilter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  stickyPeriodSelector: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 6,
    // Ensure sticky header remains above content and interactive on Android
    zIndex: 1000,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  dateRow: {
    paddingHorizontal: spacing.md,
    marginTop: 4,
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
