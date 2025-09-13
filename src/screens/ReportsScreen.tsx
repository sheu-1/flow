import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { AggregatePeriod } from '../types';
import { getAggregatesByPeriod, getCategoryBreakdown } from '../services/TransactionService';
import { Dimensions } from 'react-native';
import AIAccountantPanel from '../components/AIAccountantPanel';

export default function ReportsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [period, setPeriod] = useState<AggregatePeriod>('monthly');
  const [loading, setLoading] = useState(false);
  const [series, setSeries] = useState<{ labels: string[]; income: number[]; expense: number[] }>({ labels: [], income: [], expense: [] });
  const [category, setCategory] = useState<Record<string, number>>({});
  const [ChartKit, setChartKit] = useState<null | { LineChart: any; BarChart: any }>(null);

  const rangeCount = useMemo(() => {
    if (period === 'daily') return 30; // last 30 days
    if (period === 'weekly') return 12; // last 12 weeks
    if (period === 'monthly') return 12; // last 12 months
    return 5; // last 5 years
  }, [period]);

  // Lazy-load chart kit to avoid native locale crash; fall back gracefully
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('react-native-chart-kit');
        if (mounted) setChartKit({ LineChart: mod.LineChart, BarChart: mod.BarChart });
      } catch (e) {
        // If chart kit fails to load (e.g., locale hook issue), keep it null to render fallback
        if (mounted) setChartKit(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    (async () => {
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
        setLoading(false);
      }
    })();
  }, [user?.id, period, rangeCount]);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
            {/* Line chart: Income and Expense over time */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Income and Expense Over Time</Text>
            {ChartKit ? (
            <ChartKit.LineChart
              data={{
                labels: series.labels,
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
                legend: ['Income', 'Expense'],
              }}
              width={Dimensions.get('window').width - spacing.md * 2}
              height={220}
              chartConfig={{
                backgroundColor: colors.background,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => colors.text,
                labelColor: (opacity = 1) => colors.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: { r: '4', strokeWidth: '2' },
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Charts unavailable on this device</Text>
              </View>
            )}

            {/* Bar chart: Income vs Expense */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Income vs Expense</Text>
            {ChartKit ? (
            <ChartKit.BarChart
              data={{
                labels: series.labels,
                datasets: [
                  {
                    data: series.income.map((income, i) => Math.max(income, series.expense[i])),
                  },
                ],
              }}
              width={Dimensions.get('window').width - spacing.md * 2}
              height={220}
              yAxisLabel="$"
              yAxisSuffix="k"
              chartConfig={{
                backgroundColor: colors.background,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => colors.primary,
                labelColor: (opacity = 1) => colors.textSecondary,
                style: { borderRadius: 16 },
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
            />) : null}

            {/* AI Accountant Panel */}
            {user?.id ? (
              <AIAccountantPanel userId={user.id} period={period} />
            ) : null}

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
    marginTop: spacing.lg,
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
});
