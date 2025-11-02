import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../theme/ThemeProvider';
import { getTransactions, getAggregatesByPeriod } from '../services/TransactionService';
import { notificationService } from '../services/NotificationService';
import { Transaction, AggregatePeriod } from '../types';
import { AnimatedCircleMetric } from '../components/AnimatedCircleMetric';
import { AnimatedPieChart } from '../components/AnimatedPieChart';
import { UnifiedPeriodSelector } from '../components/UnifiedPeriodSelector';
import { DetailedPeriodSelector } from '../components/DetailedPeriodSelector';
import { ProfileMenu } from '../components/ProfileMenu';
import NotificationPanel from '../components/NotificationPanel';
import { TransactionCard } from '../components/TransactionCard';
import { FinancialHealthScore } from '../components/FinancialHealthScore';
import { SmartInsights } from '../components/SmartInsights';
import { SavingsGoals } from '../components/SavingsGoals';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useRealtimeTransactions } from '../hooks/useRealtimeTransactions';
import { invalidateUserCaches } from '../services/TransactionService';
import { useDateFilterContext } from '../contexts/DateFilterContext';
import { getSubscriptionStatus, shouldShowSubscriptionPrompt, getTrialMessage } from '../services/SubscriptionManager';
import Animated, { FadeInUp } from 'react-native-reanimated';

// Enable detailed logging
console.log('🚀 DashboardScreen loading...');

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aggregates, setAggregates] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [refreshing, setRefreshing] = useState(false);
  const colors = useThemeColors();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDetailedPeriodSelector, setShowDetailedPeriodSelector] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [showMetricsInsights, setShowMetricsInsights] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  
  // Date filtering from shared context
  const {
    dateRange,
    selectedPreset,
    setPreset,
    setCustomRange,
    resetFilter,
  } = useDateFilterContext();

  // Filter transactions based on shared date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const txDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
      const start = new Date(dateRange.startDate.getFullYear(), dateRange.startDate.getMonth(), dateRange.startDate.getDate());
      const end = new Date(dateRange.endDate.getFullYear(), dateRange.endDate.getMonth(), dateRange.endDate.getDate());
      return txDate >= start && txDate <= end;
    });
  }, [transactions, dateRange]);

  const formattedRange = useMemo(() => {
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (dateRange.startDate.getTime() === dateRange.endDate.getTime()) {
      return formatDate(dateRange.startDate);
    }
    return `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
  }, [dateRange]);

  // Sync period changes to date filter
  useEffect(() => {
    // Auto-set date range based on period
    const now = new Date();
    let start: Date;
    switch (selectedPeriod) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        setCustomRange(start, now);
        break;
      case 'weekly':
        const weekOffset = now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekOffset, 0, 0, 0);
        setCustomRange(start, now);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        setCustomRange(start, now);
        break;
      case 'yearly':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        setCustomRange(start, now);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const [txns, aggregates] = await Promise.all([
        getTransactions(user.id, { limit: 1000 }).catch(err => {
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
    refresh();
  });

  // Show loading indicator when filters change
  useEffect(() => {
    if (dateRange || selectedPeriod) {
      setFilterLoading(true);
      const timer = setTimeout(() => setFilterLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [dateRange, selectedPeriod]);

  // Check subscription status
  useEffect(() => {
    if (user?.id) {
      getSubscriptionStatus(user.id).then(status => {
        setSubscriptionStatus(status);
        // Show subscription prompt if trial ended
        if (status.trialEnded && !status.isActive) {
          shouldShowSubscriptionPrompt(user.id).then(shouldShow => {
            if (shouldShow) {
              Alert.alert(
                'Free Trial Ended',
                'Your 2-week free trial has ended. Subscribe now to continue enjoying all features!',
                [
                  { text: 'Maybe Later', style: 'cancel' },
                  { text: 'Subscribe', onPress: () => navigation.navigate('Subscription' as never) },
                ]
              );
            }
          });
        }
      });
    }
  }, [user?.id, navigation]);

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
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        periodLabel = 'Today';
        break;
      case 'weekly':
        const offset = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        periodLabel = 'This Week';
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodLabel = 'This Month';
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        periodLabel = 'This Year';
        break;
    }

    // Use filteredTransactions to respect date filters and get accurate counts
    const periodTransactions = filteredTransactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= startDate && txDate <= endDate;
    });

    const moneyIn = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const moneyOut = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      moneyIn,
      moneyOut,
      netBalance: moneyIn - moneyOut,
      periodLabel,
      transactionCount: periodTransactions.length // Accurate count of transactions in period
    };
  };

  const { moneyIn, moneyOut, netBalance, periodLabel, transactionCount } = calculatePeriodStats();
  const recentTransactions = filteredTransactions.slice(0, 5);
  
  const avgTransaction = transactionCount > 0 ? (Math.abs(moneyIn) + Math.abs(moneyOut)) / transactionCount : 0;
  const maxAmount = Math.max(moneyIn, moneyOut);

  const displayName = user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        stickyHeaderIndices={[1]} // Keep the period selector (index 1) sticky
        scrollEventThrottle={16} // Improve scroll performance
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
        
        {/* Sticky Unified Period Selector - Update styles */}
        <View style={[styles.stickyPeriodSelector, { backgroundColor: colors.background }]}>
          <View style={styles.stickyContent}>
            <UnifiedPeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              onOpenDetailedSelector={() => setShowDetailedPeriodSelector(true)}
              removeMargin
            />
            {filterLoading && (
              <View style={styles.filterLoadingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.filterLoadingText, { color: colors.textSecondary }]}>
                  Applying filters...
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Main Content */}
        <View>
        {/* Animated Circular Metrics */}
        <View style={styles.circularMetricsContainer}>
          <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.circleWrapper}>
            <AnimatedCircleMetric
              value={moneyIn}
              label="Money In"
              type="total"
              period={selectedPeriod}
              maxValue={maxAmount}
              size={110}
            />
          </Animated.View>
          
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.circleWrapper}>
            <AnimatedCircleMetric
              value={transactionCount}
              label="Count"
              type="count"
              period={selectedPeriod}
              showCurrency={false}
              size={110}
            />
          </Animated.View>
          
          <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.circleWrapper}>
            <AnimatedCircleMetric
              value={moneyOut}
              label="Money Out"
              type="max"
              period={selectedPeriod}
              maxValue={maxAmount}
              size={110}
            />
          </Animated.View>
        </View>

        {/* Metrics Insights Section */}
        <TouchableOpacity
          style={[styles.insightsCard, { backgroundColor: colors.surface }]}
          onPress={() => setShowMetricsInsights(!showMetricsInsights)}
          activeOpacity={0.8}
        >
          <View style={styles.insightsHeader}>
            <Text style={[styles.insightsTitle, { color: colors.text }]}>Period Insights</Text>
            <Ionicons 
              name={showMetricsInsights ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={colors.textSecondary} 
            />
          </View>

        {showMetricsInsights && (
          <Animated.View 
            style={styles.insightsDropdown}
            entering={FadeInUp.springify()}
          >
            <View style={styles.insightRow}>
              <View style={styles.insightInfo}>
                <Ionicons name="trending-up" size={16} color={colors.success} />
                <Text style={[styles.insightLabel, { color: colors.text }]}>Money In</Text>
              </View>
              <Text style={[styles.insightValue, { color: colors.success }]}>
                {moneyIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>
              Total income received during {periodLabel.toLowerCase()}
            </Text>

            <View style={[styles.insightRow, { marginTop: spacing.md }]}>
              <View style={styles.insightInfo}>
                <Ionicons name="receipt" size={16} color={colors.primary} />
                <Text style={[styles.insightLabel, { color: colors.text }]}>Transaction Count</Text>
              </View>
              <Text style={[styles.insightValue, { color: colors.primary }]}>
                {transactionCount}
              </Text>
            </View>
            <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>
              Total number of transactions in {periodLabel.toLowerCase()}
            </Text>

            <View style={[styles.insightRow, { marginTop: spacing.md }]}>
              <View style={styles.insightInfo}>
                <Ionicons name="trending-down" size={16} color={colors.danger} />
                <Text style={[styles.insightLabel, { color: colors.text }]}>Money Out</Text>
              </View>
              <Text style={[styles.insightValue, { color: colors.danger }]}>
                {moneyOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>
              Total expenses incurred during {periodLabel.toLowerCase()}
            </Text>

            <View style={[styles.tip, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="bulb" size={16} color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.primary }]}>
                {netBalance > 0 
                  ? `Great job! You have a positive cash flow of ${Math.abs(netBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for ${periodLabel.toLowerCase()}.`
                  : netBalance < 0
                  ? `Your expenses exceed income by ${Math.abs(netBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Consider reducing spending.`
                  : 'Your income and expenses are balanced.'}
              </Text>
            </View>
          </Animated.View>
        )}
        </TouchableOpacity>
        
        {/* Net Balance Card */}
        <Animated.View 
          entering={FadeInUp.delay(200).springify()}
          style={[
            styles.netBalanceCard, 
            { 
              backgroundColor: colors.surface,
              borderWidth: 2,
              borderColor: netBalance >= 0 ? colors.success : colors.danger,
            }
          ]}
        >
          <View style={styles.netBalanceContent}>
            <Ionicons 
              name="analytics-outline" 
              size={32} 
              color={netBalance >= 0 ? colors.success : colors.danger} 
            />
            <View style={styles.netBalanceText}>
              <Text style={[styles.netBalanceLabel, { color: colors.textSecondary }]}>
                Net Balance • {periodLabel}
              </Text>
              <Text style={[styles.netBalanceAmount, { color: netBalance >= 0 ? colors.success : colors.danger }]}>
                {netBalance >= 0 ? '+' : ''}{(moneyIn - moneyOut).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </Animated.View>

        <AnimatedPieChart moneyIn={moneyIn} moneyOut={moneyOut} />

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
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  stickyContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1000,
  },
  filterLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  filterLoadingText: {
    fontSize: fontSize.sm,
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
  circularMetricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  circleWrapper: {
    alignItems: 'center',
  },
  netBalanceCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  netBalanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  netBalanceText: {
    flex: 1,
  },
  netBalanceLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  netBalanceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
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
  insightsCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  insightsDropdown: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  insightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  insightLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  insightValue: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  insightDescription: {
    fontSize: fontSize.xs,
    marginLeft: 24,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  tipText: {
    fontSize: fontSize.xs,
    flex: 1,
    lineHeight: 16,
  },
});
