import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Animated, { FadeInUp, FadeOut, useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { AggregatePeriod } from '../types';
// Category breakdown computed locally from filtered transactions
import { Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { AnimatedSimplePieChart } from '../components/AnimatedSimplePieChart';
import { AnimatedCircleMetric } from '../components/AnimatedCircleMetric';
import { UnifiedPeriodSelector } from '../components/UnifiedPeriodSelector';
import { DetailedPeriodSelector } from '../components/DetailedPeriodSelector';
import { useCurrency } from '../services/CurrencyProvider';
// Realtime handled centrally in DateFilterContext
import { useDateFilterContext } from '../contexts/DateFilterContext';
import { Transaction } from '../types';
import { Logger } from '../utils/Logger';
// Using DateFilterContext for filtered transactions
import supabase from '../lib/supabase';

export default function ReportsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [series, setSeries] = useState<{ labels: string[]; income: number[]; expense: number[] }>({ labels: [], income: [], expense: [] });
  const [categories, setCategories] = useState<{ income: Record<string, number>; expense: Record<string, number> }>({ income: {}, expense: {} });
  const [categoryView, setCategoryView] = useState<'income' | 'expense'>('income');
  const [statsView, setStatsView] = useState<'income' | 'expense'>('income');
  const [currentWeek, setCurrentWeek] = useState(0); // 0 = current week, 1 = previous week, etc.
  const [showDetailedPeriodSelector, setShowDetailedPeriodSelector] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [barTooltip, setBarTooltip] = useState<{ label: string; income: number; expense: number; index: number } | null>(null);
  const [showMetricsExplanation, setShowMetricsExplanation] = useState(false);
  const chartScrollRef = useRef<ScrollView>(null);
  const [windowRange, setWindowRange] = useState<{ start: Date; end: Date } | null>(null);

  // Shared values for toggle animation
  const incomeOpacity = useSharedValue(1);
  const expenseOpacity = useSharedValue(0);

  // Date filtering from shared context
  const {
    dateRange,
    selectedPreset,
    selectedPeriod: period,
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

  const rangeCount = useMemo(() => {
    if (period === 'daily') return 24; // 24 hours
    if (period === 'weekly') return 28; // 4 weeks (28 days)
    if (period === 'monthly') return 12; // 12 months
    return 5; // Last 5 years
  }, [period]);

  // Do not override custom date range when the period tab changes.

  const loadData = useCallback(async (showLoading = true) => {
    if (!user?.id) return;
    if (showLoading) setLoading(true);
    try {
      // Build series locally from filtered transactions to respect the custom range
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);

      // Helper to iterate dates
      const addDays = (d: Date, n: number) => {
        const nd = new Date(d);
        nd.setDate(nd.getDate() + n);
        return nd;
      };

      // Bucketing by selected period using an active window derived from the custom range
      const labels: string[] = [];
      const income: number[] = [];
      const expense: number[] = [];

      // Define the active window used for stats and categories
      let wStart = new Date(start);
      let wEnd = new Date(end);

      if (period === 'daily') {
        // Daily: 24 hourly buckets for the last day in range (matching Dashboard logic)
        const dayStart = new Date(end);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(end);
        dayEnd.setHours(23, 59, 59, 999);

        wStart = dayStart;
        wEnd = dayEnd;

        // Filter transactions for this specific day
        const dayTransactions = filteredTransactions.filter(t => {
          const dt = new Date(t.date);
          return dt >= dayStart && dt <= dayEnd;
        });

        // Create 24 hourly buckets
        for (let h = 0; h < 24; h++) {
          const hStart = new Date(dayStart);
          hStart.setHours(h, 0, 0, 0);
          const hEnd = new Date(dayStart);
          hEnd.setHours(h, 59, 59, 999);

          labels.push(`${h}:00`);

          const hourTx = dayTransactions.filter(t => {
            const dt = new Date(t.date);
            return dt >= hStart && dt <= hEnd;
          });

          income.push(hourTx.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0));
          expense.push(hourTx.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0));
        }
      } else if (period === 'weekly') {
        // Weekly: ISO-style weeks (Monday-Sunday), showing current week + last 3 weeks
        // Define the overall start/end from the selected dateRange
        const rangeStart = new Date(start);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(end);
        rangeEnd.setHours(23, 59, 59, 999);

        // Base on "today" so that current week always reflects the real current week
        const today = new Date();
        const baseEnd = new Date(today);
        baseEnd.setHours(23, 59, 59, 999);

        // Find Monday of the current week
        const baseStart = new Date(baseEnd);
        const dayOfWeek = baseStart.getDay(); // 0 = Sunday, 1 = Monday, ...
        const diffToMonday = (dayOfWeek + 6) % 7; // 0 if Monday, 1 if Tuesday, ..., 6 if Sunday
        baseStart.setDate(baseStart.getDate() - diffToMonday);
        baseStart.setHours(0, 0, 0, 0);

        // Active window for stats/categories = week selected by currentWeek (0 = current, 1 = previous, etc.)
        const activeWeekStart = new Date(baseStart);
        activeWeekStart.setDate(baseStart.getDate() - currentWeek * 7);
        activeWeekStart.setHours(0, 0, 0, 0);
        const activeWeekEnd = new Date(activeWeekStart);
        activeWeekEnd.setDate(activeWeekStart.getDate() + 6);
        activeWeekEnd.setHours(23, 59, 59, 999);

        // Clamp the active window to the selected dateRange
        wStart = activeWeekStart < rangeStart ? rangeStart : activeWeekStart;
        wEnd = activeWeekEnd > rangeEnd ? rangeEnd : activeWeekEnd;

        // Build 7 daily buckets for the active week only (MondaySunday)
        for (let i = 0; i < 7; i++) {
          const dayStart = new Date(activeWeekStart);
          dayStart.setDate(activeWeekStart.getDate() + i);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);

          // Label by weekday (Mon, Tue, ...)
          const dayLabel = dayStart.toLocaleDateString('en-US', {
            weekday: 'short',
          });
          labels.push(dayLabel);

          const dayTx = filteredTransactions.filter((t) => {
            const dt = new Date(t.date);
            return dt >= dayStart && dt <= dayEnd;
          });

          income.push(
            dayTx
              .filter((t) => t.type === 'income')
              .reduce((s, t) => s + Math.abs(t.amount), 0)
          );
          expense.push(
            dayTx
              .filter((t) => t.type === 'expense')
              .reduce((s, t) => s + Math.abs(t.amount), 0)
          );
        }
      } else if (period === 'monthly') {
        // Monthly: Months of the current year (Jan–Dec), cumulative per month
        const currentYear = end.getFullYear();
        const currentMonth = end.getMonth();

        // Active window for categories/stats = current month only
        const activeMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const activeMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

        wStart = activeMonthStart;
        wEnd = activeMonthEnd;

        // Bucket by months of the year (still show full year in the chart)
        for (let m = 0; m < 12; m++) {
          const monthStart = new Date(currentYear, m, 1, 0, 0, 0, 0);
          const monthEnd = new Date(currentYear, m + 1, 0, 23, 59, 59, 999);

          // 3-letter month label: Jan, Feb, Mar, ...
          const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short' });
          labels.push(monthLabel);

          const monthTx = filteredTransactions.filter((t) => {
            const dt = new Date(t.date);
            return dt >= monthStart && dt <= monthEnd;
          });

          income.push(
            monthTx
              .filter((t) => t.type === 'income')
              .reduce((s, t) => s + Math.abs(t.amount), 0)
          );
          expense.push(
            monthTx
              .filter((t) => t.type === 'expense')
              .reduce((s, t) => s + Math.abs(t.amount), 0)
          );
        }
      } else {
        // Yearly: Show from 2024 onward to current year
        const currentYear = new Date().getFullYear();
        const startYear = 2024;
        
        for (let y = startYear; y <= currentYear; y++) {
          const yearStart = new Date(y, 0, 1, 0, 0, 0, 0);
          const yearEnd = new Date(y, 11, 31, 23, 59, 59, 999);
          
          labels.push(String(y));
          
          const yearTx = filteredTransactions.filter(t => {
            const dt = new Date(t.date);
            return dt >= yearStart && dt <= yearEnd;
          });
          
          income.push(yearTx.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0));
          expense.push(yearTx.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0));
        }
        
        wStart = new Date(startYear, 0, 1, 0, 0, 0, 0);
        wEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      }

      setSeries({ labels, income, expense });
      setWindowRange({ start: wStart, end: wEnd });

      // Categories breakdown within the active window (local compute)
      const incomeMap: Record<string, number> = {};
      const expenseMap: Record<string, number> = {};
      filteredTransactions.forEach((t) => {
        const dt = new Date(t.date);
        if (dt < wStart || dt > wEnd) return;
        const key = t.category || 'Other';
        const amt = Math.abs(t.amount);
        if (t.type === 'income') {
          incomeMap[key] = (incomeMap[key] || 0) + amt;
        } else if (t.type === 'expense') {
          expenseMap[key] = (expenseMap[key] || 0) + amt;
        }
      });
      const cat = { income: incomeMap, expense: expenseMap };
      setCategories(cat);

      Logger.info('ReportsScreen', `Categories loaded for range: ${start.toISOString()} to ${end.toISOString()}`, {
        incomeCategories: Object.keys(cat.income).length,
        expenseCategories: Object.keys(cat.expense).length,
      });
    } catch (e) {
      // swallow and show empty
      setSeries({ labels: [], income: [], expense: [] });
      setCategories({ income: {}, expense: {} });
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, period, dateRange, filteredTransactions, currentWeek]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Explicitly refetch from Supabase, then compute via effect
    refetchTransactions();
  }, [refetchTransactions]);

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

  // Realtime handled centrally in DateFilterContext

  // Reset current week when period changes
  useEffect(() => {
    setCurrentWeek(0);
  }, [period]);

  // Auto-scroll to current period when data loads or period changes
  useEffect(() => {
    if (series.labels.length === 0) return;

    const scrollToCurrentPeriod = () => {
      if (!chartScrollRef.current) return;

      let scrollToIndex = 0;
      const now = new Date();

      if (period === 'daily') {
        // Scroll to current hour
        scrollToIndex = now.getHours();
      } else if (period === 'monthly') {
        // Scroll to current month
        scrollToIndex = now.getMonth();
      } else if (period === 'yearly') {
        // Scroll to current year (last item in 5-year view)
        scrollToIndex = 4; // Current year is the last in the array
      }

      // Calculate scroll position (approximate bar width + gap)
      const barWidth = period === 'daily' ? 66 : 50; // Adjust based on bar group width
      const scrollX = scrollToIndex * barWidth;

      // Delay to ensure layout is complete
      setTimeout(() => {
        chartScrollRef.current?.scrollTo({ x: scrollX, animated: true });
      }, 300);
    };

    scrollToCurrentPeriod();
  }, [series.labels.length, period]);

  // Currency formatting provided by CurrencyProvider

  const categoriesSorted = useMemo(() => {
    const currentCategories = categoryView === 'income' ? categories.income : categories.expense;
    return Object.entries(currentCategories).sort(([, a], [, b]) => (b as number) - (a as number));
  }, [categories, categoryView]);

  // Use the already-built series (from filteredTransactions + dateRange)
  const periodData = useMemo(() => {
    return { labels: series.labels, income: series.income, expense: series.expense };
  }, [series]);

  // Compute summary stats from the current period data
  // Count = number of individual transactions, Max = highest transaction
  const incomeStats = useMemo(() => {
    let arr = periodData.income || [];

    // For monthly period, focus stats on the current month only
    if (period === 'monthly' && windowRange) {
      const monthIndex = windowRange.start.getMonth();
      if (monthIndex >= 0 && monthIndex < arr.length) {
        arr = [arr[monthIndex]];
      } else {
        arr = [];
      }
    }

    // Filter out non-finite values, zeros, and nulls
    const positiveValues = arr.filter((n) => Number.isFinite(n) && n > 0);

    // For sum and avg, include all valid values (including zeros)
    const validForSum = arr.filter((n) => Number.isFinite(n));
    const sum = validForSum.reduce((a, b) => a + b, 0);
    const avg = validForSum.length ? sum / validForSum.length : 0;

    // Count individual income transactions within active window
    const count = windowRange
      ? filteredTransactions.filter(t => {
          if (t.type !== 'income') return false;
          const dt = new Date(t.date);
          return dt >= windowRange.start && dt <= windowRange.end;
        }).length
      : 0;

    // Max only considers actual positive transactions
    const max = positiveValues.length ? Math.max(...positiveValues) : 0;
    return { sum, avg, count, max };
  }, [period, periodData.income, filteredTransactions, windowRange]);

  const expenseStats = useMemo(() => {
    let arr = periodData.expense || [];

    // For monthly period, focus stats on the current month only
    if (period === 'monthly' && windowRange) {
      const monthIndex = windowRange.start.getMonth();
      if (monthIndex >= 0 && monthIndex < arr.length) {
        arr = [arr[monthIndex]];
      } else {
        arr = [];
      }
    }

    // Filter out non-finite values, zeros, and nulls
    const positiveValues = arr.filter((n) => Number.isFinite(n) && n > 0);

    // For sum and avg, include all valid values (including zeros)
    const validForSum = arr.filter((n) => Number.isFinite(n));
    const sum = validForSum.reduce((a, b) => a + b, 0);
    const avg = validForSum.length ? sum / validForSum.length : 0;

    // Count individual expense transactions within active window
    const count = windowRange
      ? filteredTransactions.filter(t => {
          if (t.type !== 'expense') return false;
          const dt = new Date(t.date);
          return dt >= windowRange.start && dt <= windowRange.end;
        }).length
      : 0;

    // Max only considers actual positive transactions
    const max = positiveValues.length ? Math.max(...positiveValues) : 0;
    return { sum, avg, count, max };
  }, [period, periodData.expense, filteredTransactions, windowRange]);

  // Get current stats based on selected view
  const currentStats = useMemo(() => {
    return statsView === 'income' ? incomeStats : expenseStats;
  }, [statsView, incomeStats, expenseStats]);

  // Calculate transaction count based on the active window
  const transactionCount = useMemo(() => {
    if (!windowRange) return 0;
    return filteredTransactions.filter(t => {
      const dt = new Date(t.date);
      return dt >= windowRange.start && dt <= windowRange.end;
    }).length;
  }, [filteredTransactions, windowRange]);

  // Calculate dynamic period total based on selected view
  const periodTotal = useMemo(() => {
    return statsView === 'income' ? incomeStats.sum : expenseStats.sum;
  }, [statsView, incomeStats, expenseStats]);

  // Update opacity animations when statsView changes
  useEffect(() => {
    if (statsView === 'income') {
      incomeOpacity.value = withTiming(1, { duration: 200 });
      expenseOpacity.value = withTiming(0, { duration: 200 });
    } else {
      incomeOpacity.value = withTiming(0, { duration: 200 });
      expenseOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [statsView]);

  // Animated styles for toggle indicators
  const incomeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: incomeOpacity.value,
  }));

  const expenseIndicatorStyle = useAnimatedStyle(() => ({
    opacity: expenseOpacity.value,
  }));


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
          <UnifiedPeriodSelector
            selectedPeriod={period}
            onPeriodChange={setPeriod}
            onOpenDetailedSelector={() => setShowDetailedPeriodSelector(true)}
            removeMargin
          />
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
            
            <View style={styles.categoryToggle}>
              <TouchableOpacity
                style={styles.categoryToggleButton}
                onPress={() => setStatsView('income')}
              >
                <Animated.View 
                  style={[
                    styles.categoryToggleIndicator,
                    { backgroundColor: colors.success },
                    incomeIndicatorStyle
                  ]}
                />
                <Animated.Text style={[
                  styles.categoryToggleText,
                  { color: statsView === 'income' ? colors.success : colors.textSecondary, fontWeight: statsView === 'income' ? '700' : '500' }
                ]}>
                  Money In
                </Animated.Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.categoryToggleButton}
                onPress={() => setStatsView('expense')}
              >
                <Animated.View 
                  style={[
                    styles.categoryToggleIndicator,
                    { backgroundColor: colors.danger },
                    expenseIndicatorStyle
                  ]}
                />
                <Animated.Text style={[
                  styles.categoryToggleText,
                  { color: statsView === 'expense' ? colors.danger : colors.textSecondary, fontWeight: statsView === 'expense' ? '700' : '500' }
                ]}>
                  Money Out
                </Animated.Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {!loading && series.labels.length > 0 ? (
          <View>
            {/* Dynamic Stats - 3 circles that adjust based on toggle */}
            <View style={{ paddingHorizontal: spacing.md }}>
              <Text style={[styles.statsSubtitle, { color: statsView === 'income' ? colors.success : colors.danger }]}>
                {statsView === 'income' ? 'Money In' : 'Money Out'}
              </Text>
              <View style={styles.circularStatsContainer}>
                <Animated.View entering={FadeInUp.delay(50).springify()}>
                  <AnimatedCircleMetric
                    value={currentStats.count}
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
              </View>
            </View>
            
            {/* Period Total - Styled like Dashboard Net Balance */}
            <Animated.View 
              entering={FadeInUp.delay(350).springify()}
              style={[
                styles.periodTotalCard, 
                { 
                  backgroundColor: colors.surface,
                  borderWidth: 2,
                  borderColor: statsView === 'income' ? colors.success : colors.danger,
                }
              ]}
            >
              <View style={styles.periodTotalContent}>
                <Ionicons 
                  name="analytics-outline" 
                  size={32} 
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

            {/* Metrics Explanation - moved below circles */}
            <View style={{ paddingHorizontal: spacing.md }}>
              <TouchableOpacity 
                style={[styles.metricsExplanationHeader, { backgroundColor: colors.surface }]}
                onPress={() => setShowMetricsExplanation(!showMetricsExplanation)}
              >
                <Text style={[styles.metricsExplanationTitle, { color: colors.text }]}>
                  What do these metrics mean?
                </Text>
                <Ionicons 
                  name={showMetricsExplanation ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
              
              {showMetricsExplanation && (
                <Animated.View 
                  entering={FadeInUp.springify()}
                  style={[styles.metricsExplanationContent, { backgroundColor: colors.surface }]}
                >
                  <View style={styles.explanationItem}>
                    <View style={[styles.explanationDot, { backgroundColor: '#14B8A6' }]} />
                    <View style={styles.explanationTextContainer}>
                      <Text style={[styles.explanationLabel, { color: colors.text }]}>Count</Text>
                      <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                        Number of individual {statsView === 'income' ? 'money in' : 'money out'} transactions
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.explanationItem}>
                    <View style={[styles.explanationDot, { backgroundColor: '#A855F7' }]} />
                    <View style={styles.explanationTextContainer}>
                      <Text style={[styles.explanationLabel, { color: colors.text }]}>Average</Text>
                      <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                        Average amount per period bucket
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.explanationItem}>
                    <View style={[styles.explanationDot, { backgroundColor: statsView === 'income' ? colors.success : colors.danger }]} />
                    <View style={styles.explanationTextContainer}>
                      <Text style={[styles.explanationLabel, { color: colors.text }]}>Maximum</Text>
                      <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                        Highest amount in a single period bucket
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailedInsightsSection, { borderTopColor: colors.border }]}>
                    <View style={styles.insightDetailRow}>
                      <Ionicons name="information-circle" size={16} color={colors.primary} />
                      <Text style={[styles.insightDetailLabel, { color: colors.text }]}>Period Total</Text>
                      <Text style={[styles.insightDetailValue, { color: statsView === 'income' ? colors.success : colors.danger }]}>
                        {formatCurrency(periodTotal)}
                      </Text>
                    </View>
                    <Text style={[styles.insightDetailDescription, { color: colors.textSecondary }]}>
                      Total {statsView === 'income' ? 'income' : 'expenses'} for the selected period
                    </Text>

                    <View style={[styles.insightDetailRow, { marginTop: spacing.sm }]}>
                      <Ionicons name="calculator" size={16} color={colors.primary} />
                      <Text style={[styles.insightDetailLabel, { color: colors.text }]}>Average per Period</Text>
                      <Text style={[styles.insightDetailValue, { color: colors.primary }]}>
                        {formatCurrency(currentStats.avg)}
                      </Text>
                    </View>
                    <Text style={[styles.insightDetailDescription, { color: colors.textSecondary }]}>
                      Average {statsView === 'income' ? 'income' : 'spending'} per {period === 'daily' ? 'hour' : period === 'weekly' ? 'day' : period === 'monthly' ? 'month' : 'year'}
                    </Text>
                  </View>

                  <View style={[styles.tip, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="bulb" size={16} color={colors.primary} />
                    <Text style={[styles.tipText, { color: colors.primary }]}>
                      {statsView === 'income' 
                        ? currentStats.count > 0 
                          ? `You have ${currentStats.count} income transactions. Your highest single income was ${formatCurrency(currentStats.max)}.`
                          : 'No income recorded for this period.'
                        : currentStats.count > 0
                          ? `You made ${currentStats.count} expense transactions. Try to keep daily expenses below ${formatCurrency(currentStats.avg * 0.9)} to reduce spending.`
                          : 'No expenses recorded for this period.'}
                    </Text>
                  </View>
                </Animated.View>
              )}
            </View>
          </View>
        ) : null}

        

        {loading ? (
          <View style={{ paddingVertical: spacing.xl }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : series.labels.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>We couldn’t find transactions for this date range.</Text>
            <View style={{ marginTop: spacing.sm }}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Try:</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>- Widening the date range</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>- Adding a transaction</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>- Turning on SMS import</Text>
            </View>
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
              
              {/* Weekly: show all 7 days within the view (no horizontal scroll) */}
              {period === 'weekly' ? (
                <View style={styles.chartBarsWrapper}>
                  <View style={styles.chartBars}>
                    {series.labels.map((label, index) => {
                      const income = series.income[index] || 0;
                      const expense = series.expense[index] || 0;
                      const maxValue = Math.max(...series.income, ...series.expense);
                      const incomeHeight = maxValue > 0 ? (income / maxValue) * 120 : 0;
                      const expenseHeight = maxValue > 0 ? (expense / maxValue) * 120 : 0;

                      const displayLabel = label;

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
                                  styles.bar,
                                  {
                                    height: incomeHeight,
                                    backgroundColor: colors.success,
                                  },
                                ]}
                                entering={FadeInUp.delay(index * 30 + 100).springify()}
                              />
                              <Animated.View
                                style={[
                                  styles.bar,
                                  {
                                    height: expenseHeight,
                                    backgroundColor: colors.danger,
                                    marginLeft: 2,
                                  },
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
              ) : null}
              
              {/* Week Navigation Below Bars - Weekly Only */}
              {period === 'weekly' && windowRange && (() => {
                // Allow navigating current week plus previous 3 weeks using the same weekly bar graph
                const maxWeeksBack = 3;

                return (
                  <View style={styles.weekNavigationBelow}>
                    <TouchableOpacity
                      onPress={() => setCurrentWeek(prev => Math.min(prev + 1, maxWeeksBack))}
                      disabled={currentWeek >= maxWeeksBack}
                      style={styles.weekNavButtonSimple}
                    >
                      <Ionicons 
                        name="chevron-back" 
                        size={28} 
                        color={currentWeek >= maxWeeksBack ? colors.textSecondary : colors.text} 
                      />
                    </TouchableOpacity>
                    <View style={styles.weekNavCenterSimple}>
                      <Text style={[styles.weekNavDateRangeSimple, { color: colors.text }]}>
                        {windowRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {windowRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setCurrentWeek(prev => Math.max(prev - 1, 0))}
                      disabled={currentWeek <= 0}
                      style={styles.weekNavButtonSimple}
                    >
                      <Ionicons 
                        name="chevron-forward" 
                        size={28} 
                        color={currentWeek <= 0 ? colors.textSecondary : colors.text} 
                      />
                    </TouchableOpacity>
                  </View>
                );
              })()}
              
              {period !== 'weekly' ? (
                /* For non-weekly periods: horizontal scroll with clustered bars */
                <ScrollView
                  horizontal
                  ref={chartScrollRef}
                  showsHorizontalScrollIndicator={false}
                  style={styles.chartScroll}
                >
                  <View style={styles.chartBarsScrollable}>
                    {series.labels.map((label, index) => {
                      const income = series.income[index] || 0;
                      const expense = series.expense[index] || 0;
                      const maxValue = Math.max(...series.income, ...series.expense);
                      const incomeHeight = maxValue > 0 ? (income / maxValue) * 120 : 0;
                      const expenseHeight = maxValue > 0 ? (expense / maxValue) * 120 : 0;

                      return (
                        <TouchableOpacity
                          key={`${label}-${index}`}
                          onPress={() => setBarTooltip({ label, income, expense, index })}
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
                                    marginLeft: 2 
                                  }
                                ]}
                                entering={FadeInUp.delay(index * 30 + 150).springify()}
                              />
                            </View>
                            <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                              {label}
                            </Text>
                          </Animated.View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : null}
              
              {/* Dynamic Tooltip (immediately below bar chart / week nav) */}
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

              {/* Time-Series Line Chart: Money In vs Money Out */}
              <View style={styles.lineChartSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Line graph of money in against money out</Text>
                <LineChart
                  data={{
                    // Daily view: simple fixed hour labels, with 24 at the last tick
                    labels: period === 'daily' ? ['0', '4', '8', '12', '16', '20', '24'] : series.labels,
                    datasets: [
                      {
                        data: series.income,
                        color: () => colors.success,
                        strokeWidth: 2,
                      },
                      {
                        data: series.expense,
                        color: () => colors.danger,
                        strokeWidth: 2,
                      },
                    ],
                    legend: ['Money In', 'Money Out'],
                  }}
                  // Slightly wider than the viewport so the last tick (24) sits on the final grid line
                  width={Dimensions.get('window').width + spacing.md * 2}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: colors.background,
                    backgroundGradientTo: colors.background,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                    propsForDots: {
                      r: '2',
                    },
                    propsForBackgroundLines: {
                      stroke: colors.border,
                      strokeDasharray: '4 4',
                    },
                    useShadowColorFromDataset: false,
                  }}
                  bezier
                  // Shift left while compensating with extra chart width so 24 remains on the last grid line
                  style={{ marginLeft: -spacing.md * 2, marginRight: 0 }}
                />
              </View>
            </View>


            {/* Category breakdown - filtered by statsView toggle */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {statsView === 'income' ? 'Money In Categories' : 'Money Out Categories'}
              </Text>

              {statsView === 'income' ? (
                /* Money In Categories */
                Object.keys(categories.income).length > 0 ? (
                  (() => {
                    const incomeSorted = Object.entries(categories.income).sort((a, b) => (b[1] as number) - (a[1] as number));
                    const maxIncome = Math.max(...incomeSorted.map(([, v]) => v as number), 1);
                    return incomeSorted.map(([cat, amount], idx) => (
                      <Animated.View key={`inc-${cat}`} style={styles.categoryItemHorizontal} entering={FadeInUp.delay(idx * 25).springify()}> 
                        <View style={styles.categoryBarContainer}>
                          <Text style={[styles.categoryNameLeft, { color: colors.text }]}>{cat}</Text>
                          <View style={styles.categoryBarWrapper}>
                            <View style={[styles.categoryBarBackground, { backgroundColor: colors.surface }]}>
                              <Animated.View 
                                entering={FadeInUp.delay(idx * 25 + 100).springify()}
                                style={[styles.categoryBarFillHorizontal, { width: `${((amount as number) / maxIncome) * 100}%`, backgroundColor: colors.success }]} 
                              />
                            </View>
                            <Text style={[styles.categoryValueRight, { color: colors.success }]}>
                              {(amount as number).toFixed(0)}
                            </Text>
                          </View>
                        </View>
                      </Animated.View>
                    ));
                  })()
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No money in for this period</Text>
                  </View>
                )
              ) : (
                /* Money Out Categories */
                Object.keys(categories.expense).length > 0 ? (
                  (() => {
                    const expenseSorted = Object.entries(categories.expense).sort((a, b) => (b[1] as number) - (a[1] as number));
                    const maxExpense = Math.max(...expenseSorted.map(([, v]) => v as number), 1);
                    return expenseSorted.map(([cat, amount], idx) => (
                      <Animated.View key={`exp-${cat}`} style={styles.categoryItemHorizontal} entering={FadeInUp.delay(idx * 25).springify()}> 
                        <View style={styles.categoryBarContainer}>
                          <Text style={[styles.categoryNameLeft, { color: colors.text }]}>{cat}</Text>
                          <View style={styles.categoryBarWrapper}>
                            <View style={[styles.categoryBarBackground, { backgroundColor: colors.surface }]}>
                              <Animated.View 
                                entering={FadeInUp.delay(idx * 25 + 100).springify()}
                                style={[styles.categoryBarFillHorizontal, { width: `${((amount as number) / maxExpense) * 100}%`, backgroundColor: colors.danger }]} 
                              />
                            </View>
                            <Text style={[styles.categoryValueRight, { color: colors.danger }]}>
                              {(amount as number).toFixed(0)}
                            </Text>
                          </View>
                        </View>
                      </Animated.View>
                    ));
                  })()
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No money out for this period</Text>
                  </View>
                )
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  categoryItemHorizontal: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  categoryBarContainer: {
    gap: spacing.xs,
  },
  categoryNameLeft: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  categoryBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryBarBackground: {
    flex: 1,
    height: 24,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  categoryBarFillHorizontal: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  categoryValueRight: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
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
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryToggleButton: {
    position: 'relative',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  categoryToggleIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  categoryToggleText: {
    fontSize: fontSize.sm,
    paddingBottom: spacing.xs,
  },
  chartHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  metricsExplanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
  },
  metricsExplanationTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  metricsExplanationContent: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  explanationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  explanationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  explanationTextContainer: {
    flex: 1,
  },
  explanationLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  explanationText: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  statsSubtitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
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
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
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
  detailedInsightsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  insightDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  insightDetailLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  insightDetailValue: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  insightDetailDescription: {
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
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  weekNavButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  weekNavButtonDisabled: {
    opacity: 0.3,
  },
  weekNavCenter: {
    alignItems: 'center',
    flex: 1,
  },
  weekNavMonth: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  weekNavDateRange: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  weekNavigationBelow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  weekNavButtonSimple: {
    padding: spacing.xs,
  },
  weekNavCenterSimple: {
    alignItems: 'center',
    flex: 1,
  },
  weekNavDateRangeSimple: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
