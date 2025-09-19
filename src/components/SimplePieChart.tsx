import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';

interface SimplePieChartProps {
  income: number;
  expense: number;
  size?: number;
}

export const SimplePieChart: React.FC<SimplePieChartProps> = ({
  income,
  expense,
  size = 100,
}) => {
  const colors = useThemeColors();
  
  const total = income + expense;
  const incomePercentage = total > 0 ? (income / total) * 100 : 0;
  const expensePercentage = total > 0 ? (expense / total) * 100 : 0;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Simple horizontal bar representation
  return (
    <View style={styles.container}>
      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Period Total</Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>
          {formatCurrency(total)}
        </Text>
      </View>

      {/* Horizontal Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
        {income > 0 && (
          <View
            style={[
              styles.incomeBar,
              {
                backgroundColor: colors.success,
                width: `${incomePercentage}%`,
              },
            ]}
          />
        )}
        {expense > 0 && (
          <View
            style={[
              styles.expenseBar,
              {
                backgroundColor: colors.danger,
                width: `${expensePercentage}%`,
              },
            ]}
          />
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendLabel, { color: colors.text }]}>Income</Text>
          <Text style={[styles.legendValue, { color: colors.success }]}>
            {formatCurrency(income)} ({incomePercentage.toFixed(0)}%)
          </Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendLabel, { color: colors.text }]}>Expense</Text>
          <Text style={[styles.legendValue, { color: colors.danger }]}>
            {formatCurrency(expense)} ({expensePercentage.toFixed(0)}%)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  summaryContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginTop: 4,
  },
  progressBar: {
    width: '100%',
    height: 20,
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  incomeBar: {
    height: '100%',
  },
  expenseBar: {
    height: '100%',
  },
  legend: {
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  legendLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginRight: spacing.sm,
    flex: 1,
  },
  legendValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
