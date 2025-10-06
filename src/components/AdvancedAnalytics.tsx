import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme, VictoryBar } from 'victory-native';
import { useThemeColors } from '../theme/ThemeProvider';
import { getTransactions, getCategoriesBreakdown } from '../services/TransactionService';
import { Transaction } from '../types';
import { useCurrency } from '../services/CurrencyProvider';

interface Props {
  userId: string;
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;

export const AdvancedAnalytics: React.FC<Props> = ({ userId }) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'spending' | 'income' | 'savings'>('spending');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadData();
  }, [userId, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let from: Date;
      
      switch (timeRange) {
        case 'week':
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case 'quarter':
          from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case 'year':
          from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
      }
      
      const txns = await getTransactions(userId, { from, limit: 1000 });
      setTransactions(txns);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate daily aggregates for trend charts
  const dailyData = useMemo(() => {
    const dailyMap = new Map<string, { income: number; expense: number; date: Date }>();
    
    transactions.forEach(txn => {
      const date = new Date(txn.date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { income: 0, expense: 0, date });
      }
      
      const day = dailyMap.get(dateKey)!;
      if (txn.type === 'income') {
        day.income += Math.abs(txn.amount);
      } else {
        day.expense += Math.abs(txn.amount);
      }
    });
    
    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((day, index) => ({
        x: index + 1,
        y: selectedMetric === 'spending' ? day.expense : 
           selectedMetric === 'income' ? day.income : 
           day.income - day.expense,
        date: day.date,
        income: day.income,
        expense: day.expense,
      }));
  }, [transactions, selectedMetric]);

  // Calculate spending by category for pie chart
  const categoryData = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    
    transactions
      .filter(txn => txn.type === 'expense')
      .forEach(txn => {
        const category = txn.category || 'Other';
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + Math.abs(txn.amount));
      });
    
    return Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6) // Top 6 categories
      .map(([category, amount]) => ({
        x: category,
        y: amount,
      }));
  }, [transactions]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    
    const avgDailySpending = dailyData.length > 0 
      ? totalExpense / dailyData.length 
      : 0;
    
    const biggestExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((max, t) => Math.abs(t.amount) > max ? Math.abs(t.amount) : max, 0);
    
    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      avgDailySpending,
      biggestExpense,
    };
  }, [transactions, dailyData]);

  const MetricCard = ({ title, value, subtitle, icon, color }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: string;
    color: string;
  }) => (
    <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.metricSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['week', 'month', 'quarter', 'year'] as const).map(range => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              { backgroundColor: timeRange === range ? colors.primary : colors.surface }
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[
              styles.timeRangeText,
              { color: timeRange === range ? colors.background : colors.text }
            ]}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Total Income"
          value={formatCurrency(metrics.totalIncome)}
          icon="trending-up"
          color={colors.success}
        />
        <MetricCard
          title="Total Expenses"
          value={formatCurrency(metrics.totalExpense)}
          icon="trending-down"
          color={colors.danger}
        />
        <MetricCard
          title="Net Savings"
          value={formatCurrency(metrics.netSavings)}
          subtitle={`${metrics.savingsRate.toFixed(1)}% savings rate`}
          icon="wallet"
          color={metrics.netSavings >= 0 ? colors.success : colors.danger}
        />
        <MetricCard
          title="Avg Daily Spending"
          value={formatCurrency(metrics.avgDailySpending)}
          icon="calendar"
          color={colors.primary}
        />
      </View>

      {/* Trend Chart */}
      <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Trend Analysis</Text>
          <View style={styles.metricSelector}>
            {(['spending', 'income', 'savings'] as const).map(metric => (
              <TouchableOpacity
                key={metric}
                style={[
                  styles.metricButton,
                  { backgroundColor: selectedMetric === metric ? colors.primary : 'transparent' }
                ]}
                onPress={() => setSelectedMetric(metric)}
              >
                <Text style={[
                  styles.metricButtonText,
                  { color: selectedMetric === metric ? colors.background : colors.textSecondary }
                ]}>
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {dailyData.length > 0 ? (
          <VictoryChart
            theme={VictoryTheme.material}
            width={chartWidth}
            height={200}
            padding={{ left: 60, top: 20, right: 40, bottom: 40 }}
          >
            <VictoryAxis dependentAxis tickFormat={(t) => `${Math.abs(t) > 1000 ? (t/1000).toFixed(0) + 'K' : t}`} />
            <VictoryAxis />
            <VictoryLine
              data={dailyData}
              style={{
                data: { 
                  stroke: selectedMetric === 'savings' && dailyData.some(d => d.y < 0)
                    ? colors.danger
                    : colors.primary,
                  strokeWidth: 3
                }
              }}
              animate={{
                duration: 1000,
                onLoad: { duration: 500 }
              }}
            />
          </VictoryChart>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              No data available for selected period
            </Text>
          </View>
        )}
      </View>

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Spending by Category</Text>
          <VictoryBar
            data={categoryData}
            width={chartWidth}
            height={250}
            colorScale={[
              colors.primary,
              colors.success,
              colors.warning,
              colors.danger,
              colors.income,
              colors.expense,
            ]}
            animate={{
              duration: 1000,
              onLoad: { duration: 500 }
            }}
          />
          <View style={styles.legendContainer}>
            {categoryData.map((item, index) => (
              <View key={item.x} style={styles.legendItem}>
                <View style={[
                  styles.legendColor,
                  { backgroundColor: [colors.primary, colors.success, colors.warning, colors.danger, colors.income, colors.expense][index] }
                ]} />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  {item.x}: {formatCurrency(item.y)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
  },
  chartContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  metricButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metricButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
  },
  legendContainer: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
  },
});
