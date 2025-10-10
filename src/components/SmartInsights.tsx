import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';
import { useThemeColors } from '../theme/ThemeProvider';
import { Transaction } from '../types';
import { useCurrency } from '../services/CurrencyProvider';
import { AnalyticsService } from '../services/AnalyticsService';

interface Props {
  transactions: Transaction[];
  userId: string;
}

interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'trend';
  title: string;
  description: string;
  value?: string;
  action?: string;
  icon: string;
  priority: number;
  chartData?: Array<{ x: number; y: number }>;
}

const { width: screenWidth } = Dimensions.get('window');

export const SmartInsights: React.FC<Props> = ({ transactions, userId }) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);

  // Helper functions moved before useMemo to avoid hoisting issues
  const getMonthlyData = (transactions: Transaction[]) => {
    // Simplified monthly aggregation
    const monthlyMap = new Map();
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { income: 0, expense: 0 });
      }
      
      const month = monthlyMap.get(key);
      if (t.type === 'income') {
        month.income += Math.abs(t.amount);
      } else {
        month.expense += Math.abs(t.amount);
      }
    });

    return Array.from(monthlyMap.values()).map(m => ({
      ...m,
      savings: m.income - m.expense,
    }));
  };

  const calculateSavingsStreak = (transactions: Transaction[]): number => {
    // Simplified calculation - would need more sophisticated logic
    const monthlyData = getMonthlyData(transactions);
    let streak = 0;
    
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      if (monthlyData[i].savings > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getTopSpendingCategory = (transactions: Transaction[]) => {
    const categoryTotals = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const category = t.category || 'Other';
        acc[category] = (acc[category] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      category: topCategory?.[0] || 'Other',
      amount: topCategory?.[1] || 0,
    };
  };

  const getWeekendSpendingPattern = (transactions: Transaction[]) => {
    const weekendTxns = transactions.filter(t => {
      const day = new Date(t.date).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });

    const weekendAmount = weekendTxns
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalAmount = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Create chart data for weekend vs weekday spending
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const daySpending = transactions
        .filter(t => new Date(t.date).getDay() === i && t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      return { x: i + 1, y: daySpending };
    });

    return {
      amount: weekendAmount,
      ratio: totalAmount > 0 ? weekendAmount / totalAmount : 0,
      chartData,
    };
  };

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        setLoading(true);
        
        // Always start with local insights for immediate feedback
        const localInsights = generateLocalInsights();
        setInsights(localInsights);
        
        // Try to load database insights if user is authenticated
        if (userId) {
          try {
            const dbInsights = await AnalyticsService.getFinancialInsights(userId);
            
            // Convert database insights to component format
            const formattedInsights: Insight[] = dbInsights.map((insight, index) => ({
              id: `insight_${index}`,
              type: insight.type,
              title: insight.title,
              description: insight.description,
              value: insight.amount ? formatCurrency(insight.amount) : undefined,
              action: getActionForInsight(insight.type),
              icon: getIconForInsight(insight.type),
              priority: index + 1,
            }));

            // Combine database and local insights
            setInsights([...formattedInsights, ...localInsights].slice(0, 5));
          } catch (dbError) {
            console.warn('Database insights unavailable, using local insights:', dbError);
            // Keep local insights if database fails
          }
        }
      } catch (error) {
        console.error('Failed to load insights:', error);
        // Fallback to empty insights
        setInsights([]);
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [userId, transactions, formatCurrency]);

  const generateLocalInsights = (): Insight[] => {
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate.getMonth() === now.getMonth() && txnDate.getFullYear() === now.getFullYear();
    });
    
    const lastMonth = transactions.filter(t => {
      const txnDate = new Date(t.date);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return txnDate.getMonth() === lastMonthDate.getMonth() && txnDate.getFullYear() === lastMonthDate.getFullYear();
    });

    const localInsights: Insight[] = [];

    // Spending spike detection
    const thisMonthSpending = thisMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const lastMonthSpending = lastMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    if (thisMonthSpending > lastMonthSpending * 1.2 && lastMonthSpending > 0) {
      localInsights.push({
        id: 'spending_spike',
        type: 'warning',
        title: 'Spending Spike Detected',
        description: `Your spending is ${((thisMonthSpending / lastMonthSpending - 1) * 100).toFixed(0)}% higher than last month`,
        value: formatCurrency(thisMonthSpending - lastMonthSpending),
        action: 'Review recent expenses',
        icon: 'trending-up',
        priority: 1,
      });
    }

    // Weekend spending pattern
    const weekendSpending = getWeekendSpendingPattern(thisMonth);
    if (weekendSpending.ratio > 0.4) {
      localInsights.push({
        id: 'weekend_spending',
        type: 'info',
        title: 'Weekend Spender',
        description: `${(weekendSpending.ratio * 100).toFixed(0)}% of your spending happens on weekends`,
        value: formatCurrency(weekendSpending.amount),
        action: 'Plan weekend budget',
        icon: 'calendar',
        priority: 4,
        chartData: weekendSpending.chartData,
      });
    }

    return localInsights;
  };

  const getActionForInsight = (type: string): string => {
    switch (type) {
      case 'warning': return 'Review and adjust';
      case 'success': return 'Keep it up!';
      case 'info': return 'Learn more';
      default: return 'Take action';
    }
  };

  const getIconForInsight = (type: string): string => {
    switch (type) {
      case 'warning': return 'warning';
      case 'success': return 'trophy';
      case 'info': return 'information-circle';
      default: return 'analytics';
    }
  };

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'warning': return colors.danger;
      case 'success': return colors.success;
      case 'trend': return colors.primary;
      default: return colors.primary;
    }
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'warning': return 'warning';
      case 'success': return 'checkmark-circle';
      case 'trend': return 'trending-up';
      default: return 'information-circle';
    }
  };

  if (insights.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Smart Insights</Text>
        <View style={styles.emptyState}>
          <Ionicons name="analytics" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Keep using the app to unlock personalized insights!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>Smart Insights</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsScroll}>
        {insights.map((insight, index) => (
          <Animated.View
            key={insight.id}
            entering={SlideInRight.delay(index * 100).springify()}
          >
            <TouchableOpacity
              style={[
                styles.insightCard,
                { backgroundColor: colors.background },
                selectedInsight === insight.id && { borderColor: getInsightColor(insight.type) }
              ]}
              onPress={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
            >
              <View style={styles.insightHeader}>
                <View style={[styles.iconContainer, { backgroundColor: getInsightColor(insight.type) + '20' }]}>
                  <Ionicons 
                    name={insight.icon as any} 
                    size={20} 
                    color={getInsightColor(insight.type)} 
                  />
                </View>
                <View style={styles.typeIndicator}>
                  <Ionicons 
                    name={getInsightIcon(insight.type) as any} 
                    size={12} 
                    color={getInsightColor(insight.type)} 
                  />
                </View>
              </View>
              
              <Text style={[styles.insightTitle, { color: colors.text }]}>
                {insight.title}
              </Text>
              
              <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>
                {insight.description}
              </Text>
              
              {insight.value && (
                <Text style={[styles.insightValue, { color: getInsightColor(insight.type) }]}>
                  {insight.value}
                </Text>
              )}
              
              {insight.action && (
                <TouchableOpacity style={[styles.actionButton, { borderColor: getInsightColor(insight.type) }]}>
                  <Text style={[styles.actionText, { color: getInsightColor(insight.type) }]}>
                    {insight.action}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>

      {selectedInsight && insights.find(i => i.id === selectedInsight)?.chartData && (
        <Animated.View 
          style={styles.chartContainer}
          entering={FadeInUp.springify()}
        >
          <VictoryChart
            theme={VictoryTheme.material}
            width={screenWidth - 40}
            height={150}
            padding={{ left: 50, top: 20, right: 20, bottom: 30 }}
          >
            <VictoryAxis dependentAxis />
            <VictoryAxis />
            <VictoryLine
              data={insights.find(i => i.id === selectedInsight)?.chartData}
              style={{
                data: { stroke: colors.primary, strokeWidth: 2 }
              }}
              animate={{
                duration: 1000,
                onLoad: { duration: 500 }
              }}
            />
          </VictoryChart>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  insightsScroll: {
    marginHorizontal: -10,
  },
  insightCard: {
    width: 280,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
