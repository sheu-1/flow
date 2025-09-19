import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { AggregatePeriod } from '../types';
import { getAggregatesByPeriod, getCategoryBreakdown } from '../services/TransactionService';
import { Dimensions } from 'react-native';
import { MoneyCard } from '../components/MoneyCard';
import { SimplePieChart } from '../components/SimplePieChart';

export default function ReportsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [period, setPeriod] = useState<AggregatePeriod>('daily');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [series, setSeries] = useState<{ labels: string[]; income: number[]; expense: number[] }>({ labels: [], income: [], expense: [] });
  const [category, setCategory] = useState<Record<string, number>>({});

  const rangeCount = useMemo(() => {
    if (period === 'daily') return 24; // 24 hours
    if (period === 'weekly') return 7; // 7 days of the week
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
      const cat = await getCategoryBreakdown(user.id, start, end);
      setCategory(cat);
    } catch (e) {
      // swallow and show empty
      setSeries({ labels: [], income: [], expense: [] });
      setCategory({});
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const categoriesSorted = useMemo(() => {
    return Object.entries(category).sort(([, a], [, b]) => b - a);
  }, [category]);

  // Compute summary stats from the current series over the selected range
  const incomeStats = useMemo(() => {
    const arr = series.income || [];
    const filtered = arr.filter((n) => Number.isFinite(n));
    const sum = filtered.reduce((a, b) => a + b, 0);
    const avg = filtered.length ? sum / filtered.length : 0;
    const min = filtered.length ? Math.min(...filtered) : 0;
    const max = filtered.length ? Math.max(...filtered) : 0;
    return { sum, avg, min, max };
  }, [series.income]);

  const expenseStats = useMemo(() => {
    const arr = series.expense || [];
    const filtered = arr.filter((n) => Number.isFinite(n));
    const sum = filtered.reduce((a, b) => a + b, 0);
    const avg = filtered.length ? sum / filtered.length : 0;
    const min = filtered.length ? Math.min(...filtered) : 0;
    const max = filtered.length ? Math.max(...filtered) : 0;
    return { sum, avg, min, max };
  }, [series.expense]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>Reports</Text>

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

        {/* Summary statistics */}
        {!loading && series.labels.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.md }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary statistics</Text>
            {/* Income: Min & Max side-by-side */}
            <View style={styles.cardRow}>
              <MoneyCard title="Income • Min" amount={incomeStats.min} type="in" period={period} icon="trending-down-outline" />
              <MoneyCard title="Income • Max" amount={incomeStats.max} type="in" period={period} icon="trending-up-outline" />
            </View>
            {/* Income: Avg full-width */}
            <View style={styles.cardRowSingle}>
              <MoneyCard title="Income • Avg" amount={incomeStats.avg} type="in" period={period} icon="speedometer-outline" />
            </View>

            {/* Expense: Min & Max side-by-side */}
            <View style={styles.cardRow}>
              <MoneyCard title="Expense • Min" amount={expenseStats.min} type="out" period={period} icon="trending-down-outline" />
              <MoneyCard title="Expense • Max" amount={expenseStats.max} type="out" period={period} icon="trending-up-outline" />
            </View>
            {/* Expense: Avg full-width */}
            <View style={styles.cardRowSingle}>
              <MoneyCard title="Expense • Avg" amount={expenseStats.avg} type="out" period={period} icon="speedometer-outline" />
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
                  {series.labels.map((label, index) => {
                    const income = series.income[index] || 0;
                    const expense = series.expense[index] || 0;
                    const maxValue = Math.max(...series.income, ...series.expense);
                    const incomeHeight = maxValue > 0 ? (income / maxValue) * 120 : 0;
                    const expenseHeight = maxValue > 0 ? (expense / maxValue) * 120 : 0;
                    
                    // Format labels based on period
                    let displayLabel = label;
                    if (period === 'daily') {
                      // For daily: show hour format (0h, 1h, 2h, etc.)
                      displayLabel = `${index}h`;
                    } else if (period === 'weekly') {
                      // For weekly: show day abbreviations (Mon, Tue, etc.)
                      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      displayLabel = days[index] || label.substring(0, 3);
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

            {/* Category breakdown simple list */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses by Category</Text>
              {categoriesSorted.length > 0 ? (
                categoriesSorted.map(([cat, amount]) => (
                  <View key={cat} style={[styles.categoryItem, { backgroundColor: colors.card }]}> 
                    <View style={styles.categoryInfo}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>{cat}</Text>
                      <Text style={[styles.categoryAmount, { color: colors.danger }]}>{formatCurrency(amount)}</Text>
                    </View>
                    <View style={[styles.categoryBar, { backgroundColor: colors.surface }]}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            width: `${(amount / Math.max(...categoriesSorted.map(([, v]) => v))) * 100}%`,
                            backgroundColor: colors.danger,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses in this period</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    margin: spacing.md,
    marginTop: spacing.xl,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
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
    minWidth: 60,
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
    width: 60,
  },
});
