import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../theme/ThemeProvider';
import { notificationService } from '../services/NotificationService';
import { AggregatePeriod } from '../types';
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
import { useDateFilterContext } from '../contexts/DateFilterContext';
import { getSubscriptionStatus, shouldShowSubscriptionPrompt } from '../services/SubscriptionManager';
import Animated, { FadeInUp } from 'react-native-reanimated';

// Enable detailed logging
console.log('🚀 DashboardScreen loading...');

export default function DashboardScreen() {
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
    selectedPeriod,
    setPreset,
    setPeriod,
    setCustomRange,
    resetFilter,
    transactions: filteredTransactions,
    loading: transactionsLoading,
    refetch: refetchTransactions,
  } = useDateFilterContext();

  const formattedRange = useMemo(() => {
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (dateRange.startDate.getTime() === dateRange.endDate.getTime()) {
      return formatDate(dateRange.startDate);
    }
    return `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
  }, [dateRange]);

  // Do not override custom date range when the period tab changes.

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      // Refetch transactions with current filter
      await refetchTransactions();

      try {
        // Check for spending notifications
        await notificationService.checkWeeklySpending(user.id);
      } catch (e) {
        // ignore notification errors
      }
    } catch (error) {
      console.error('Dashboard refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, refetchTransactions]);

  // Listen for notification updates
  useEffect(() => {
    const unsubscribe = notificationService.addListener((notifications) => {
      setUnreadCount(notificationService.getUnreadCount());
    });
    setUnreadCount(notificationService.getUnreadCount());
    return unsubscribe;
  }, []);

  // Initial load handled by DateFilterContext; no screen-level realtime/refetch

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

  // Avoid on-focus refetch to prevent duplicate loads; context keeps data fresh

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
  }, [refresh]);

  const calculatePeriodStats = () => {
    // Use the custom date range as bounds, but compute the selected period window anchored to the range end
    const rangeStart = new Date(dateRange.startDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(dateRange.endDate);
    rangeEnd.setHours(23, 59, 59, 999);

    let startDate = new Date(rangeStart);
    let endDate = new Date(rangeEnd);
    let periodLabel = '';

    const fmt = (d: Date, withYear = true) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: withYear ? 'numeric' : undefined });

    switch (selectedPeriod) {
      case 'daily': {
        // Last day within the range (end of range)
        startDate = new Date(rangeEnd);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(rangeEnd);
        endDate.setHours(23, 59, 59, 999);
        periodLabel = fmt(startDate);
        break;
      }
      case 'weekly': {
        // Last 7 days ending at rangeEnd, clamped to rangeStart
        const weekStart = new Date(rangeEnd);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - 6);
        startDate = weekStart < rangeStart ? rangeStart : weekStart;
        endDate = rangeEnd;
        periodLabel = `${fmt(startDate, false)} - ${fmt(endDate)}`;
        break;
      }
      case 'monthly': {
        // Month containing rangeEnd, clamped to the custom range
        const mStart = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1, 0, 0, 0, 0);
        const mEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() + 1, 0, 23, 59, 59, 999);
        startDate = mStart < rangeStart ? rangeStart : mStart;
        endDate = mEnd > rangeEnd ? rangeEnd : mEnd;
        periodLabel = mStart.toLocaleString('default', { month: 'short', year: 'numeric' });
        break;
      }
      case 'yearly': {
        // Year containing rangeEnd, clamped to the custom range
        const yStart = new Date(rangeEnd.getFullYear(), 0, 1, 0, 0, 0, 0);
        const yEnd = new Date(rangeEnd.getFullYear(), 11, 31, 23, 59, 59, 999);
        startDate = yStart < rangeStart ? rangeStart : yStart;
        endDate = yEnd > rangeEnd ? rangeEnd : yEnd;
        periodLabel = String(rangeEnd.getFullYear());
        break;
      }
    }

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
      transactionCount: periodTransactions.length
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
              onPeriodChange={setPeriod}
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
          
          {/* Insight Summary inside Net Balance Card */}
          <View style={[styles.netBalanceInsight, { backgroundColor: (netBalance >= 0 ? colors.success : colors.danger) + '15', borderTopColor: colors.border }]}>
            <Ionicons name="bulb-outline" size={16} color={netBalance >= 0 ? colors.success : colors.danger} />
            <Text style={[styles.netBalanceInsightText, { color: colors.text }]}>
              {netBalance > 0 
                ? `${Math.abs(netBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} surplus this period`
                : netBalance < 0
                ? `${Math.abs(netBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} deficit this period`
                : 'Balanced income and expenses'}
            </Text>
          </View>
        </Animated.View>

        {/* Metrics Insights Section - Moved below Net Balance */}
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

        <AnimatedPieChart moneyIn={moneyIn} moneyOut={moneyOut} />

        {/* Financial Health Score */}
        <FinancialHealthScore
          totalIncome={moneyIn}
          totalExpense={moneyOut}
          savingsRate={moneyIn > 0 ? ((moneyIn - moneyOut) / moneyIn) * 100 : 0}
          transactionCount={filteredTransactions.length}
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
  netBalanceInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  netBalanceInsightText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 1,
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
