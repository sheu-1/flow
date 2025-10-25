import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { AggregatePeriod } from '../types';
import { getAggregatesByPeriod, getCategoriesBreakdown } from '../services/TransactionService';
import { Dimensions } from 'react-native';
import { AnimatedSimplePieChart } from '../components/AnimatedSimplePieChart';
import { AnimatedCircleMetric } from '../components/AnimatedCircleMetric';
import { UnifiedPeriodSelector } from '../components/UnifiedPeriodSelector';
import { DetailedPeriodSelector } from '../components/DetailedPeriodSelector';
import { useCurrency } from '../services/CurrencyProvider';
import { useRealtimeTransactions } from '../hooks/useRealtimeTransactions';
import { invalidateUserCaches } from '../services/TransactionService';
import { getTransactions } from '../services/TransactionService';
import { useDateFilter } from '../hooks/useDateFilter';
import { Transaction } from '../types';
import { Logger } from '../utils/Logger';

export default function ReportsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [period, setPeriod] = useState<AggregatePeriod>('daily');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [series, setSeries] = useState<{ labels: string[]; income: number[]; expense: number[] }>({ labels: [], income: [], expense: [] });
  const [categories, setCategories] = useState<{ income: Record<string, number>; expense: Record<string, number> }>({ income: {}, expense: {} });
  const [categoryView, setCategoryView] = useState<'income' | 'expense'>('income');
  const [statsView, setStatsView] = useState<'income' | 'expense'>('income');
  const [currentWeek, setCurrentWeek] = useState(0); // 0 = current week, 1 = previous week, etc.
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [showDetailedPeriodSelector, setShowDetailedPeriodSelector] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [barTooltip, setBarTooltip] = useState<{ label: string; income: number; expense: number; index: number } | null>(null);
  
  // Date filtering
  const {
    filteredTransactions,
    selectedPreset,
    formattedRange,
    setPreset,
    setCustomRange,
    resetFilter,
    dateRange,
  } = useDateFilter(allTransactions);

  const rangeCount = useMemo(() => {
    if (period === 'daily') return 24; // 24 hours
    if (period === 'weekly') return 28; // 4 weeks (28 days)
    if (period === 'monthly') return 12; // 12 months
    return 5; // Last 5 years
  }, [period]);

  const loadData = useCallback(async (showLoading = true) => {
    if (!user?.id) return;
    if (showLoading) setLoading(true);
    try {
      // Load all transactions for date filtering
      const txns = await getTransactions(user.id, { limit: 1000 }).catch(() => []);
      const mapped: Transaction[] = txns.map(r => ({
        ...r,
        date: new Date(r.date),
        description: (r as any).description || (r as any).sender || r.category || '',
        category: r.category || 'Other',
        type: (r.type === 'income' || r.type === 'expense') ? r.type : (r.amount >= 0 ? 'income' : 'expense'),
      }));
      setAllTransactions(mapped);
      
      const buckets = await getAggregatesByPeriod(user.id, period, rangeCount);
      const labels = buckets.map((b) => b.periodLabel);
      const income = buckets.map((b) => b.income);
      const expense = buckets.map((b) => b.expense);
      setSeries({ labels, income, expense });

      // Use filtered transactions for category breakdown
      const start = dateRange.startDate.toISOString();
      const end = dateRange.endDate.toISOString();
      const cat = await getCategoriesBreakdown(user.id, start, end);
      setCategories(cat);
      
      Logger.info('ReportsScreen', `Categories loaded for range: ${start} to ${end}`, { 
        incomeCategories: Object.keys(cat.income).length,
        expenseCategories: Object.keys(cat.expense).length 
      });
    } catch (e) {
      // swallow and show empty
      setSeries({ labels: [], income: [], expense: [] });
      setCategories({ income: {}, expense: {} });
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, period, rangeCount, dateRange]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show loading indicator when date range changes
  useEffect(() => {
    if (dateRange) {
      setFilterLoading(true);
      const timer = setTimeout(() => setFilterLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [dateRange]);

  // Realtime refresh
  useRealtimeTransactions(user?.id, async () => {
    if (!user?.id) return;
    await invalidateUserCaches(user.id);
    loadData(false);
  });

  // Reset current week when period changes
  useEffect(() => {
    setCurrentWeek(0);
  }, [period]);

  // Currency formatting provided by CurrencyProvider

  const categoriesSorted = useMemo(() => {
    const currentCategories = categoryView === 'income' ? categories.income : categories.expense;
    return Object.entries(currentCategories).sort(([, a], [, b]) => (b as number) - (a as number));
  }, [categories, categoryView]);

  // Calculate period data from filtered transactions (like Dashboard) for all periods
  const currentWeekData = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];
    const income: number[] = [];
    const expense: number[] = [];
    
    if (period === 'daily') {
      // Daily: 24 hours of today
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(dayStart);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hour + 1, 0, 0, 0);
        
        const hourTransactions = filteredTransactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate >= hourStart && txDate < hourEnd;
        });
        
        labels.push(`${hour}h`);
        income.push(hourTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0));
        expense.push(hourTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0));
      }
    } else if (period === 'weekly') {
      // Weekly: Current week (Sun-Sat)
      const offset = now.getDay();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset - (currentWeek * 7), 0, 0, 0, 0);
      
      for (let day = 0; day < 7; day++) {
        const dayStart = new Date(weekStart);
        dayStart.setDate(weekStart.getDate() + day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);
        
        const dayTransactions = filteredTransactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate >= dayStart && txDate < dayEnd;
        });
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        labels.push(days[dayStart.getDay()]);
        income.push(dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0));
        expense.push(dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0));
      }
    } else if (period === 'monthly') {
      // Monthly: 12 months of current year
      const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(now.getFullYear(), month, 1, 0, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), month + 1, 0, 23, 59, 59, 999);
        
        const monthTransactions = filteredTransactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate >= monthStart && txDate <= monthEnd;
        });
        
        labels.push(monthNames[month]);
        income.push(monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0));
        expense.push(monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0));
      }
    } else if (period === 'yearly') {
      // Yearly: Last 5 years
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
        
        const yearTransactions = filteredTransactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate >= yearStart && txDate <= yearEnd;
        });
        
        labels.push(year.toString());
        income.push(yearTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0));
        expense.push(yearTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0));
      }
    }
    
    return { labels, income, expense };
  }, [period, currentWeek, filteredTransactions]);

  // Compute summary stats from the current period data
  // Min = lowest positive transaction (x > 0), Max = highest positive transaction
  const incomeStats = useMemo(() => {
    const arr = currentWeekData.income || [];
    // Filter out non-finite values, zeros, and nulls
    const positiveValues = arr.filter((n) => Number.isFinite(n) && n > 0);
    
    // For sum and avg, include all valid values (including zeros)
    const validForSum = arr.filter((n) => Number.isFinite(n));
    const sum = validForSum.reduce((a, b) => a + b, 0);
    const avg = validForSum.length ? sum / validForSum.length : 0;
    
    // Min and Max only consider actual positive transactions
    const min = positiveValues.length ? Math.min(...positiveValues) : 0;
    const max = positiveValues.length ? Math.max(...positiveValues) : 0;
    
    return { sum, avg, min, max };
  }, [currentWeekData.income]);

  const expenseStats = useMemo(() => {
    const arr = currentWeekData.expense || [];
    // Filter out non-finite values, zeros, and nulls
    const positiveValues = arr.filter((n) => Number.isFinite(n) && n > 0);
    
    // For sum and avg, include all valid values (including zeros)
    const validForSum = arr.filter((n) => Number.isFinite(n));
    const sum = validForSum.reduce((a, b) => a + b, 0);
    const avg = validForSum.length ? sum / validForSum.length : 0;
    
    // Min and Max only consider actual positive transactions
    const min = positiveValues.length ? Math.min(...positiveValues) : 0;
    const max = positiveValues.length ? Math.max(...positiveValues) : 0;
    
    return { sum, avg, min, max };
  }, [currentWeekData.expense]);

  // Get current stats based on selected view
  const currentStats = useMemo(() => {
    return statsView === 'income' ? incomeStats : expenseStats;
  }, [statsView, incomeStats, expenseStats]);

  // Calculate transaction count based on selected period
  const calculatePeriodTransactionCount = useCallback(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'weekly':
        const offset = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        startDate = new Date(0);
        endDate = now;
    }

    return filteredTransactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= startDate && txDate <= endDate;
    }).length;
  }, [period, filteredTransactions]);

  // Replace the existing transactionCount calculation with:
  const transactionCount = calculatePeriodTransactionCount();

  // Calculate dynamic period total based on selected view
  const periodTotal = useMemo(() => {
    return statsView === 'income' ? incomeStats.sum : expenseStats.sum;
  }, [statsView, incomeStats, expenseStats]);

  // Calculate total number of weeks available
  const totalWeeks = useMemo(() => {
    if (period !== 'weekly') return 1;
    return Math.ceil(series.labels.length / 7);
  }, [series.labels.length, period]);

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
          <Text style={[styles.title, { color: colors.text }]}>Reports</Text>
        </View>
        
        {/* Sticky Unified Period Selector */}
        <View style={[styles.stickyPeriodSelector, { backgroundColor: colors.background }]}>
          <View style={styles.periodSelectorRow}>
            <View style={{ flex: 1 }}>
              <UnifiedPeriodSelector
                selectedPeriod={period}
                onPeriodChange={setPeriod}
                onOpenDetailedSelector={() => setShowDetailedPeriodSelector(true)}
                removeMargin
              />
            </View>
            {selectedPreset && selectedPreset !== 'all' && (
              <TouchableOpacity
                style={[styles.clearFilterButton, { backgroundColor: colors.surface }]}
                onPress={resetFilter}
              >
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                <Text style={[styles.clearFilterText, { color: colors.textSecondary }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {filterLoading && (
            <View style={styles.filterLoadingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.filterLoadingText, { color: colors.textSecondary }]}>Applying filters...</Text>
            </View>
          )}
        </View>
        
        {/* Main Content */}
        <View>

        {/* Summary statistics */}
        {!loading && series.labels.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.md }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary Statistics</Text>
            
            <View style={[styles.categoryToggle, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[
                  styles.categoryToggleButton,
                  statsView === 'income' && { backgroundColor: colors.success }
                ]}
                onPress={() => setStatsView('income')}
              >
                <Text style={[
                  styles.categoryToggleText,
                  { color: statsView === 'income' ? colors.text : colors.textSecondary }
                ]}>
                  Money In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryToggleButton,
                  statsView === 'expense' && { backgroundColor: colors.danger }
                ]}
                onPress={() => setStatsView('expense')}
              >
                <Text style={[
                  styles.categoryToggleText,
                  { color: statsView === 'expense' ? colors.text : colors.textSecondary }
                ]}>
                  Money Out
                </Text>
              </TouchableOpacity>
            </View>

            {/* Animated Circular Stats Cards */}
            <View style={styles.circularStatsContainer}>
              {/* For Daily/Weekly: Show Min, Avg, Max */}
              {(period === 'daily' || period === 'weekly') ? (
                <>
                  <Animated.View entering={FadeInUp.delay(50).springify()}>
                    <AnimatedCircleMetric
                      value={currentStats.min}
                      label="Min"
                      type="min"
                      period={period}
                      maxValue={currentStats.max}
                      size={100}
                      colorOverride={statsView === 'income' ? colors.success : colors.danger}
                    />
                  </Animated.View>
                  
                  <Animated.View entering={FadeInUp.delay(100).springify()}>
                    <AnimatedCircleMetric
                      value={currentStats.avg}
                      label="Avg"
                      type="average"
                      period={period}
                      maxValue={currentStats.max}
                      size={100}
                      colorOverride={statsView === 'income' ? colors.success : colors.danger}
                    />
                  </Animated.View>
                  
                  <Animated.View entering={FadeInUp.delay(150).springify()}>
                    <AnimatedCircleMetric
                      value={currentStats.max}
                      label="Max"
                      type="max"
                      period={period}
                      maxValue={currentStats.max}
                      size={100}
                      colorOverride={statsView === 'income' ? colors.success : colors.danger}
                    />
                  </Animated.View>
                </>
              ) : (
                /* For Monthly/Yearly: Show Count, Avg, Max */
                <>
                  <Animated.View entering={FadeInUp.delay(50).springify()}>
                    <AnimatedCircleMetric
                      value={transactionCount}
                      label="Count"
                      type="count"
                      period={period}
                      showCurrency={false}
                      size={100}
                    />
                  </Animated.View>
                  
                  <Animated.View entering={FadeInUp.delay(100).springify()}>
                    <AnimatedCircleMetric
                      value={currentStats.avg}
                      label="Avg"
                      type="average"
                      period={period}
                      maxValue={currentStats.max}
                      size={100}
                      colorOverride={statsView === 'income' ? colors.success : colors.danger}
                    />
                  </Animated.View>
                  
                  <Animated.View entering={FadeInUp.delay(150).springify()}>
                    <AnimatedCircleMetric
                      value={currentStats.max}
                      label="Max"
                      type="max"
                      period={period}
                      maxValue={currentStats.max}
                      size={100}
                      colorOverride={statsView === 'income' ? colors.success : colors.danger}
                    />
                  </Animated.View>
                </>
              )}
            </View>
            
            {/* Period Total - Dynamic based on selected period */}
            <Animated.View 
              entering={FadeInUp.delay(200).springify()}
              style={[styles.periodTotalCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.periodTotalContent}>
                <Ionicons 
                  name="calendar-outline" 
                  size={24} 
                  color={statsView === 'income' ? colors.success : colors.danger} 
                />
                <View style={styles.periodTotalText}>
                  <Text style={[styles.periodTotalLabel, { color: colors.textSecondary }]}>
                    Period Total • {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                  <Text style={[styles.periodTotalAmount, { color: statsView === 'income' ? colors.success : colors.danger }]}>
                    {formatCurrency(periodTotal)}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>
        ) : null}

        

        {loading ? (
          <View style={{ paddingVertical: spacing.xl }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : series.labels.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data available</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.md }}>
            {/* Pie Chart Summary */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Period Overview</Text>
            <AnimatedSimplePieChart 
              income={incomeStats.sum} 
              expense={expenseStats.sum} 
            />
            
            {/* Simple bar chart: Money In vs Money Out */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Money In vs Money Out</Text>
            <View style={styles.chartContainer}>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Money In</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.danger }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Money Out</Text>
                </View>
              </View>
              
              {/* Conditional wrapper: ScrollView for daily/monthly/yearly, fixed View for weekly */}
              {period === 'weekly' ? (
                <View style={styles.chartBarsWrapper}>
                  <View style={styles.chartBars}>
                    {currentWeekData.labels.map((label, index) => {
                      const income = currentWeekData.income[index] || 0;
                      const expense = currentWeekData.expense[index] || 0;
                      const maxValue = Math.max(...currentWeekData.income, ...currentWeekData.expense);
                      const incomeHeight = maxValue > 0 ? (income / maxValue) * 120 : 0;
                      const expenseHeight = maxValue > 0 ? (expense / maxValue) * 120 : 0;
                      
                      // For weekly: show only day abbreviation (Sun, Mon, etc.)
                      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const date = new Date();
                      const totalDaysBack = (currentWeek * 7) + (currentWeekData.labels.length - 1 - index);
                      date.setDate(date.getDate() - totalDaysBack);
                      const displayLabel = days[date.getDay()];
                    
                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => setBarTooltip({ label: displayLabel, income, expense, index })}
                          activeOpacity={0.7}
                        >
                          <Animated.View style={styles.barGroupWeekly} entering={FadeInUp.delay(index * 30).springify()}>
                            <View style={styles.barContainer}>
                              <Animated.View 
                                style={[
                                  styles.barWeekly, 
                                  { 
                                    height: incomeHeight, 
                                    backgroundColor: colors.success 
                                  }
                                ]} 
                                entering={FadeInUp.delay(index * 30 + 100).springify()}
                              />
                              <Animated.View 
                                style={[
                                  styles.barWeekly, 
                                  { 
                                    height: expenseHeight, 
                                    backgroundColor: colors.danger, 
                                    marginLeft: 2 
                                  }
                                ]}
                                entering={FadeInUp.delay(index * 30 + 150).springify()}
                              />
                            </View>
                            <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                              {displayLabel}
                            </Text>
                          </Animated.View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                  <View style={styles.chartBarsScrollable}>
                    {currentWeekData.labels.map((label, index) => {
                      const income = currentWeekData.income[index] || 0;
                      const expense = currentWeekData.expense[index] || 0;
                      const maxValue = Math.max(...currentWeekData.income, ...currentWeekData.expense);
                      const incomeHeight = maxValue > 0 ? (income / maxValue) * 120 : 0;
                      const expenseHeight = maxValue > 0 ? (expense / maxValue) * 120 : 0;
                      
                      // Format labels based on period
                      let displayLabel = label;
                      if (period === 'daily') {
                        // For daily: show hour format (0h, 1h, 2h, etc.)
                        displayLabel = `${index}h`;
                      } else if (period === 'monthly') {
                        // For monthly: show month abbreviations (Jan, Feb, etc.)
                        displayLabel = label.length > 3 ? label.substring(0, 3) : label;
                      } else if (period === 'yearly') {
                        // For yearly: show year
                        displayLabel = label;
                      }
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => setBarTooltip({ label: displayLabel, income, expense, index })}
                          activeOpacity={0.7}
                        >
                          <Animated.View style={styles.barGroup} entering={FadeInUp.delay(index * 30).springify()}>
                            <View style={styles.barContainer}>
                              <Animated.View 
                                style={[
                                  styles.bar, 
                                  { 
                                    height: incomeHeight, 
                                    backgroundColor: colors.success 
                                  }
                                ]} 
                                entering={FadeInUp.delay(index * 30 + 100).springify()}
                              />
                              <Animated.View 
                                style={[
                                  styles.bar, 
                                  { 
                                    height: expenseHeight, 
                                    backgroundColor: colors.danger, 
                                    marginLeft: 4 
                                  }
                                ]}
                                entering={FadeInUp.delay(index * 30 + 150).springify()}
                              />
                            </View>
                            <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                              {displayLabel}
                            </Text>
                          </Animated.View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
              
              {/* Dynamic Tooltip */}
              {barTooltip && (
                <Animated.View 
                  entering={FadeInUp.springify()}
                  exiting={FadeOut.duration(200)}
                  style={[styles.tooltipContainer, { backgroundColor: colors.surface }]}
                >
                  <TouchableOpacity 
                    style={styles.tooltipClose}
                    onPress={() => setBarTooltip(null)}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={[styles.tooltipTitle, { color: colors.text }]}>{barTooltip.label}</Text>
                  <View style={styles.tooltipRow}>
                    <View style={styles.tooltipItem}>
                      <View style={[styles.tooltipDot, { backgroundColor: colors.success }]} />
                      <Text style={[styles.tooltipLabel, { color: colors.textSecondary }]}>Money In:</Text>
                      <Text style={[styles.tooltipValue, { color: colors.success }]}>
                        {formatCurrency(barTooltip.income)}
                      </Text>
                    </View>
                    <View style={styles.tooltipItem}>
                      <View style={[styles.tooltipDot, { backgroundColor: colors.danger }]} />
                      <Text style={[styles.tooltipLabel, { color: colors.textSecondary }]}>Money Out:</Text>
                      <Text style={[styles.tooltipValue, { color: colors.danger }]}>
                        {formatCurrency(barTooltip.expense)}
                      </Text>
                    </View>
                  </View>
                  {barTooltip.income > barTooltip.expense ? (
                    <Text style={[styles.tooltipInsight, { color: colors.success }]}>
                      ✓ Positive flow: +{formatCurrency(barTooltip.income - barTooltip.expense)}
                    </Text>
                  ) : barTooltip.expense > barTooltip.income ? (
                    <Text style={[styles.tooltipInsight, { color: colors.danger }]}>
                      ⚠ Spending exceeded income by {formatCurrency(barTooltip.expense - barTooltip.income)}
                    </Text>
                  ) : (
                    <Text style={[styles.tooltipInsight, { color: colors.textSecondary }]}>
                      ⚖ Balanced
                    </Text>
                  )}
                </Animated.View>
              )}
            </View>

            {/* Week Navigation - Enhanced with month indicators */}
            {period === 'weekly' && totalWeeks > 1 && (
              <View style={styles.weekSelectorContainer}>
                <View style={styles.weekSelectorHeader}>
                  <TouchableOpacity 
                    onPress={() => setCurrentWeek(Math.max(currentWeek - 1, 0))}
                    disabled={currentWeek <= 0}
                    style={[styles.navButton, { opacity: currentWeek <= 0 ? 0.3 : 1 }]}
                  >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                  </TouchableOpacity>
                  
                  <View style={styles.weekIndicatorContainer}>
                    <Text style={[styles.weekIndicator, { color: colors.text }]}>
                      Week {currentWeek + 1} of {totalWeeks}
                    </Text>
                    {(() => {
                      // Calculate month for current week
                      const date = new Date();
                      date.setDate(date.getDate() - (currentWeek * 7));
                      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                      return (
                        <Text style={[styles.monthIndicator, { color: colors.textSecondary }]}>
                          {monthName}
                        </Text>
                      );
                    })()}
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => setCurrentWeek(Math.min(currentWeek + 1, totalWeeks - 1))}
                    disabled={currentWeek >= totalWeeks - 1}
                    style={[styles.navButton, { opacity: currentWeek >= totalWeeks - 1 ? 0.3 : 1 }]}
                  >
                    <Ionicons name="chevron-forward" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                {/* Week dots indicator */}
                <View style={styles.weekDotsContainer}>
                  {Array.from({ length: totalWeeks }, (_, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setCurrentWeek(index)}
                      style={[
                        styles.weekDot,
                        {
                          backgroundColor: index === currentWeek ? colors.primary : colors.surface,
                          borderColor: colors.border,
                        }
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Category breakdown - show Income and Expense groups */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories by Type</Text>

              {/* Money In Categories */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Money In Categories
              </Text>
              {Object.keys(categories.income).length > 0 ? (
                (() => {
                  const incomeSorted = Object.entries(categories.income).sort((a, b) => (b[1] as number) - (a[1] as number));
                  const maxIncome = Math.max(...incomeSorted.map(([, v]) => v as number), 1);
                  return incomeSorted.map(([cat, amount], idx) => (
                    <Animated.View key={`inc-${cat}`} style={[styles.categoryItem, { backgroundColor: colors.card }]} entering={FadeInUp.delay(idx * 25).springify()}> 
                      <View style={styles.categoryInfo}>
                        <Text style={[styles.categoryName, { color: colors.text }]}>{cat}</Text>
                        <Text style={[styles.categoryAmount, { color: colors.success }]}>
                          {formatCurrency(amount as number)}
                        </Text>
                      </View>
                      <View style={[styles.categoryBar, { backgroundColor: colors.surface }]}> 
                        <Animated.View 
                          entering={FadeInUp.delay(idx * 25 + 100).springify()}
                          style={[styles.categoryBarFill, { width: `${((amount as number) / maxIncome) * 100}%`, backgroundColor: colors.success }]} 
                        />
                      </View>
                    </Animated.View>
                  ));
                })()
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No money in for this period</Text>
                </View>
              )}

              {/* Money Out Categories */}
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.md }]}> 
                Money Out Categories
              </Text>
              {Object.keys(categories.expense).length > 0 ? (
                (() => {
                  const expenseSorted = Object.entries(categories.expense).sort((a, b) => (b[1] as number) - (a[1] as number));
                  const maxExpense = Math.max(...expenseSorted.map(([, v]) => v as number), 1);
                  return expenseSorted.map(([cat, amount], idx) => (
                    <Animated.View key={`exp-${cat}`} style={[styles.categoryItem, { backgroundColor: colors.card }]} entering={FadeInUp.delay(idx * 25).springify()}> 
                      <View style={styles.categoryInfo}>
                        <Text style={[styles.categoryName, { color: colors.text }]}>{cat}</Text>
                        <Text style={[styles.categoryAmount, { color: colors.danger }]}>
                          {formatCurrency(amount as number)}
                        </Text>
                      </View>
                      <View style={[styles.categoryBar, { backgroundColor: colors.surface }]}> 
                        <Animated.View 
                          entering={FadeInUp.delay(idx * 25 + 100).springify()}
                          style={[styles.categoryBarFill, { width: `${((amount as number) / maxExpense) * 100}%`, backgroundColor: colors.danger }]} 
                        />
                      </View>
                    </Animated.View>
                  ));
                })()
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No money out for this period</Text>
                </View>
              )}
            </View>
          </View>
        )}
        </View>
      </ScrollView>
      
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
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  stickyPeriodSelector: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 6,
    // Ensure the sticky header stays above content and remains tappable
    zIndex: 1000,
  },
  periodSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  clearFilterText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
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
  periodSelector: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  periodButtonText: {
    fontWeight: '600',
  },
  section: {
    marginHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardRowSingle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryItem: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  categoryBar: {
    height: 4,
    borderRadius: 2,
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  chartContainer: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.lg,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  chartScroll: {
    maxHeight: 180,
  },
  chartBarsScrollable: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  chartBarsWrapper: {
    width: '100%',
    overflow: 'hidden',
    paddingHorizontal: 2,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  barGroup: {
    alignItems: 'center',
    minWidth: 50,
  },
  barGroupWeekly: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: spacing.xs,
  },
  bar: {
    width: 16,
    borderRadius: 2,
    minHeight: 2,
  },
  barWeekly: {
    width: 12,
    borderRadius: 2,
    minHeight: 2,
  },
  barLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  categoryToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.md,
  },
  categoryToggleButton: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  categoryToggleText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  chartHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  weekIndicator: {
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  weekSelectorContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
  },
  weekSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weekIndicatorContainer: {
    alignItems: 'center',
    flex: 1,
  },
  monthIndicator: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginTop: spacing.xs / 2,
  },
  weekDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  weekDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  circularStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  periodTotalCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodTotalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  periodTotalText: {
    flex: 1,
  },
  periodTotalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  periodTotalAmount: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
  },
  tooltipContainer: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipClose: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  tooltipTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  tooltipRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tooltipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltipLabel: {
    fontSize: fontSize.sm,
  },
  tooltipValue: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  tooltipInsight: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
