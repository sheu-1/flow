import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { AggregatePeriod } from '../types';
import { getAggregatesByPeriod, getCategoriesBreakdown } from '../services/TransactionService';
import { Dimensions } from 'react-native';
import { MoneyCard } from '../components/MoneyCard';
import { SimplePieChart } from '../components/SimplePieChart';
import { useCurrency } from '../services/CurrencyProvider';

export default function ReportsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [period, setPeriod] = useState<AggregatePeriod>('daily');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [series, setSeries] = useState<{ labels: string[]; income: number[]; expense: number[] }>({ labels: [], income: [], expense: [] });
  const [categories, setCategories] = useState<{ income: Record<string, number>; expense: Record<string, number> }>({ income: {}, expense: {} });
  const [categoryView, setCategoryView] = useState<'income' | 'expense'>('expense');
  const [statsView, setStatsView] = useState<'income' | 'expense'>('income');
  const [currentWeek, setCurrentWeek] = useState(0); // 0 = current week, 1 = previous week, etc.

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
      const buckets = await getAggregatesByPeriod(user.id, period, rangeCount);
      const labels = buckets.map((b) => b.periodLabel);
      const income = buckets.map((b) => b.income);
      const expense = buckets.map((b) => b.expense);
      setSeries({ labels, income, expense });

      const start = buckets[0]?.start;
      const end = buckets[buckets.length - 1]?.end;
      const cat = await getCategoriesBreakdown(user.id, start, end);
      setCategories(cat);
    } catch (e) {
      // swallow and show empty
      setSeries({ labels: [], income: [], expense: [] });
      setCategories({ income: {}, expense: {} });
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, period, rangeCount]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset current week when period changes
  useEffect(() => {
    setCurrentWeek(0);
  }, [period]);

  // Currency formatting provided by CurrencyProvider

  const categoriesSorted = useMemo(() => {
    const currentCategories = categoryView === 'income' ? categories.income : categories.expense;
    return Object.entries(currentCategories).sort(([, a], [, b]) => (b as number) - (a as number));
  }, [categories, categoryView]);

  // Compute summary stats from the current series over the selected range
  const incomeStats = useMemo(() => {
    const arr = series.income || [];
    const filtered = arr.filter((n) => Number.isFinite(n) && n > 0); // Exclude zero values for min calculation
    const allFiltered = arr.filter((n) => Number.isFinite(n)); // Include zeros for sum/avg
    const sum = allFiltered.reduce((a, b) => a + b, 0);
    const avg = allFiltered.length ? sum / allFiltered.length : 0;
    const min = filtered.length ? Math.min(...filtered) : 0; // Only non-zero values
    const max = allFiltered.length ? Math.max(...allFiltered) : 0;
    return { sum, avg, min, max };
  }, [series.income]);

  const expenseStats = useMemo(() => {
    const arr = series.expense || [];
    const filtered = arr.filter((n) => Number.isFinite(n) && n > 0); // Exclude zero values for min calculation
    const allFiltered = arr.filter((n) => Number.isFinite(n)); // Include zeros for sum/avg
    const sum = allFiltered.reduce((a, b) => a + b, 0);
    const avg = allFiltered.length ? sum / allFiltered.length : 0;
    const min = filtered.length ? Math.min(...filtered) : 0; // Only non-zero values
    const max = allFiltered.length ? Math.max(...allFiltered) : 0;
    return { sum, avg, min, max };
  }, [series.expense]);

  // Get current stats based on selected view
  const currentStats = useMemo(() => {
    return statsView === 'income' ? incomeStats : expenseStats;
  }, [statsView, incomeStats, expenseStats]);

  // For weekly view, slice data into weeks and get current week
  const currentWeekData = useMemo(() => {
    if (period !== 'weekly') return series;
    
    const weekSize = 7;
    const startIndex = currentWeek * weekSize;
    const endIndex = startIndex + weekSize;
    
    return {
      labels: series.labels.slice(startIndex, endIndex),
      income: series.income.slice(startIndex, endIndex),
      expense: series.expense.slice(startIndex, endIndex),
    };
  }, [series, currentWeek, period]);

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
        
        {/* Sticky Period Selector */}
        <View style={[styles.stickyPeriodSelector, { backgroundColor: colors.background }]}>
          <View style={[styles.periodSelector, { backgroundColor: colors.surface }]}> 
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodButton, period === p && { backgroundColor: colors.primary }]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    { color: colors.textSecondary },
                    period === p && { color: colors.text },
                  ]}
                >
                  {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : p === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
                  Income
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
                  Expenses
                </Text>
              </TouchableOpacity>
            </View>

            {/* Min & Max side-by-side */}
            <View style={styles.cardRow}>
              <MoneyCard 
                title={`${statsView === 'income' ? 'Income' : 'Expense'} • Min`} 
                amount={currentStats.min} 
                type={statsView === 'income' ? 'in' : 'out'} 
                period={period} 
                icon="trending-down-outline" 
              />
              <MoneyCard 
                title={`${statsView === 'income' ? 'Income' : 'Expense'} • Max`} 
                amount={currentStats.max} 
                type={statsView === 'income' ? 'in' : 'out'} 
                period={period} 
                icon="trending-up-outline" 
              />
            </View>
            {/* Avg full-width */}
            <View style={styles.cardRowSingle}>
              <MoneyCard 
                title={`${statsView === 'income' ? 'Income' : 'Expense'} • Avg`} 
                amount={currentStats.avg} 
                type={statsView === 'income' ? 'in' : 'out'} 
                period={period} 
                icon="speedometer-outline" 
              />
            </View>
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
            <SimplePieChart 
              income={incomeStats.sum} 
              expense={expenseStats.sum} 
            />
            
            {/* Simple bar chart: Income vs Expense */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Income vs Expense</Text>
            <View style={styles.chartContainer}>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Income</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.danger }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Expense</Text>
                </View>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                <View style={styles.chartBars}>
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
                    } else if (period === 'weekly') {
                      // For weekly: show day abbreviation with date (Mon 23, Tue 24, etc.)
                      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const date = new Date();
                      const totalDaysBack = (currentWeek * 7) + (currentWeekData.labels.length - 1 - index);
                      date.setDate(date.getDate() - totalDaysBack);
                      const dayName = days[date.getDay()];
                      const dayOfMonth = date.getDate();
                      displayLabel = `${dayName} ${dayOfMonth}`;
                    } else if (period === 'monthly') {
                      // For monthly: show month abbreviations (Jan, Feb, etc.)
                      displayLabel = label.length > 3 ? label.substring(0, 3) : label;
                    }
                    
                    return (
                      <View key={index} style={styles.barGroup}>
                        <View style={styles.barContainer}>
                          <View style={[styles.bar, { height: incomeHeight, backgroundColor: colors.success }]} />
                          <View style={[styles.bar, { height: expenseHeight, backgroundColor: colors.danger, marginLeft: 4 }]} />
                        </View>
                        <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                          {displayLabel}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Week Navigation - Enhanced with month indicators */}
            {period === 'weekly' && totalWeeks > 1 && (
              <View style={styles.weekSelectorContainer}>
                <View style={styles.weekSelectorHeader}>
                  <TouchableOpacity 
                    onPress={() => setCurrentWeek(Math.min(currentWeek + 1, totalWeeks - 1))}
                    disabled={currentWeek >= totalWeeks - 1}
                    style={[styles.navButton, { opacity: currentWeek >= totalWeeks - 1 ? 0.3 : 1 }]}
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
                    onPress={() => setCurrentWeek(Math.max(currentWeek - 1, 0))}
                    disabled={currentWeek <= 0}
                    style={[styles.navButton, { opacity: currentWeek <= 0 ? 0.3 : 1 }]}
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

            {/* Category breakdown with horizontal scrolling */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories by Type</Text>
              
              <View style={[styles.categoryToggle, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                  style={[
                    styles.categoryToggleButton,
                    categoryView === 'income' && { backgroundColor: colors.success }
                  ]}
                  onPress={() => setCategoryView('income')}
                >
                  <Text style={[
                    styles.categoryToggleText,
                    { color: categoryView === 'income' ? colors.text : colors.textSecondary }
                  ]}>
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.categoryToggleButton,
                    categoryView === 'expense' && { backgroundColor: colors.danger }
                  ]}
                  onPress={() => setCategoryView('expense')}
                >
                  <Text style={[
                    styles.categoryToggleText,
                    { color: categoryView === 'expense' ? colors.text : colors.textSecondary }
                  ]}>
                    Expenses
                  </Text>
                </TouchableOpacity>
              </View>
              
              {categoriesSorted.length > 0 ? (
                categoriesSorted.map(([cat, amount]) => (
                  <View key={cat} style={[styles.categoryItem, { backgroundColor: colors.card }]}> 
                    <View style={styles.categoryInfo}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>{cat}</Text>
                      <Text style={[
                        styles.categoryAmount, 
                        { color: categoryView === 'income' ? colors.success : colors.danger }
                      ]}>
                        {formatCurrency(amount as number)}
                      </Text>
                    </View>
                    <View style={[styles.categoryBar, { backgroundColor: colors.surface }]}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            width: `${((amount as number) / Math.max(...categoriesSorted.map(([, v]) => v as number))) * 100}%`,
                            backgroundColor: categoryView === 'income' ? colors.success : colors.danger,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No {categoryView === 'income' ? 'income' : 'expenses'} in this period
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        </View>
      </ScrollView>
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
    elevation: 2,
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
    padding: spacing.md,
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
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  barGroup: {
    alignItems: 'center',
    minWidth: 50,
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
  barLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    width: 50,
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
});
