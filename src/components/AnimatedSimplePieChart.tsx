import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import { spacing, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useCurrency } from '../services/CurrencyProvider';

interface AnimatedSimplePieChartProps {
  income: number;
  expense: number;
  size?: number;
}

/**
 * AnimatedSimplePieChart - An animated horizontal bar chart
 * 
 * Features:
 * - Smooth width animations for income/expense bars
 * - Staggered entrance animations
 * - Spring animation for total amount
 * - Color-coded segments
 */
export const AnimatedSimplePieChart: React.FC<AnimatedSimplePieChartProps> = ({
  income,
  expense,
  size = 100,
}) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();
  
  const total = income + expense;
  const incomePercentage = total > 0 ? (income / total) * 100 : 0;
  const expensePercentage = total > 0 ? (expense / total) * 100 : 0;

  // Animation values
  const incomeWidth = useSharedValue(0);
  const expenseWidth = useSharedValue(0);
  const totalOpacity = useSharedValue(0);

  // Animate on mount and value changes
  useEffect(() => {
    // Total fade in
    totalOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });

    // Staggered bar animations
    incomeWidth.value = withTiming(incomePercentage, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    setTimeout(() => {
      expenseWidth.value = withTiming(expensePercentage, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }, 200);
  }, [income, expense, incomePercentage, expensePercentage]);

  // Animated styles
  const animatedIncomeStyle = useAnimatedStyle(() => ({
    width: `${incomeWidth.value}%`,
  }));

  const animatedExpenseStyle = useAnimatedStyle(() => ({
    width: `${expenseWidth.value}%`,
  }));

  const animatedTotalStyle = useAnimatedStyle(() => ({
    opacity: totalOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Summary Stats */}
      <Animated.View 
        entering={FadeInUp.delay(50).springify()}
        style={[styles.summaryContainer, animatedTotalStyle]}
      >
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Period Total</Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>
          {formatCurrency(total)}
        </Text>
      </Animated.View>

      {/* Animated Horizontal Progress Bar */}
      <Animated.View 
        entering={FadeInUp.delay(100).springify()}
        style={[styles.progressBar, { backgroundColor: colors.surface }]}
      >
        {income > 0 && (
          <Animated.View
            style={[
              styles.incomeBar,
              {
                backgroundColor: colors.success,
              },
              animatedIncomeStyle,
            ]}
          />
        )}
        {expense > 0 && (
          <Animated.View
            style={[
              styles.expenseBar,
              {
                backgroundColor: colors.danger,
              },
              animatedExpenseStyle,
            ]}
          />
        )}
      </Animated.View>

      {/* Legend with staggered animations */}
      <View style={styles.legend}>
        <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendLabel, { color: colors.text }]}>Income</Text>
          <Text style={[styles.legendValue, { color: colors.success }]}>
            {formatCurrency(income)} ({incomePercentage.toFixed(0)}%)
          </Text>
        </Animated.View>
        
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendLabel, { color: colors.text }]}>Expense</Text>
          <Text style={[styles.legendValue, { color: colors.danger }]}>
            {formatCurrency(expense)} ({expensePercentage.toFixed(0)}%)
          </Text>
        </Animated.View>
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
