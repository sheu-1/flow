import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming,
  withSpring,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useCurrency } from '../services/CurrencyProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedPieChartProps {
  moneyIn: number;
  moneyOut: number;
}

/**
 * AnimatedPieChart - An animated donut chart component
 * 
 * Features:
 * - Smooth arc animations on mount and value changes
 * - Animated center total with spring effect
 * - Staggered legend animations
 * - Color-coded segments (green for income, red for expense)
 */
export const AnimatedPieChart: React.FC<AnimatedPieChartProps> = ({ moneyIn, moneyOut }) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();
  const total = moneyIn + moneyOut;
  const moneyInPercentage = total > 0 ? (moneyIn / total) * 100 : 0;
  const moneyOutPercentage = total > 0 ? (moneyOut / total) * 100 : 0;

  return (
    <Animated.View 
      entering={FadeInUp.delay(100).springify()}
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Money Flow Distribution</Text>
      
      <View style={styles.chartContainer}>
        <AnimatedDonut moneyIn={moneyIn} moneyOut={moneyOut} total={total} formatter={formatCurrency} />
      </View>

      <View style={styles.legend}>
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
          <View style={styles.legendText}>
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Money In</Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>
              {formatCurrency(moneyIn)} ({moneyInPercentage.toFixed(1)}%)
            </Text>
          </View>
        </Animated.View>
        
        <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.danger }]} />
          <View style={styles.legendText}>
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Money Out</Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>
              {formatCurrency(moneyOut)} ({moneyOutPercentage.toFixed(1)}%)
            </Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

function AnimatedDonut({ 
  moneyIn, 
  moneyOut, 
  total, 
  formatter 
}: { 
  moneyIn: number; 
  moneyOut: number; 
  total: number; 
  formatter: (n: number) => string;
}) {
  const colors = useThemeColors();
  const size = 160;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animation values
  const inProgress = useSharedValue(0);
  const outProgress = useSharedValue(0);
  const totalScale = useSharedValue(0);

  const inFraction = total > 0 ? moneyIn / total : 0;
  const outFraction = total > 0 ? moneyOut / total : 0;

  const inDash = circumference * inFraction;
  const outDash = circumference * outFraction;

  // Animate on mount and when values change with smooth ease-in-out timing
  useEffect(() => {
    // Reset to 0 first for re-animation on data change
    inProgress.value = 0;
    outProgress.value = 0;
    
    // Smooth arc animations with ease-in-out timing (matching metric circles)
    inProgress.value = withTiming(1, {
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
    });
    
    // Stagger the expense animation slightly for visual flow
    setTimeout(() => {
      outProgress.value = withTiming(1, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      });
    }, 150);

    // Center total scale animation with spring
    totalScale.value = withSpring(1, {
      damping: 15,
      stiffness: 80,
    });
  }, [moneyIn, moneyOut]);

  // Animated props for income arc
  const animatedInProps = useAnimatedProps(() => {
    const animatedDash = inDash * inProgress.value;
    return {
      strokeDasharray: `${animatedDash} ${circumference - animatedDash}`,
    };
  });

  // Animated props for expense arc
  const animatedOutProps = useAnimatedProps(() => {
    const animatedDash = outDash * outProgress.value;
    return {
      strokeDasharray: `${animatedDash} ${circumference - animatedDash}`,
    };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.divider}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Money In arc (green) starts at 0deg */}
          {inDash > 0 && (
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.success}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              animatedProps={animatedInProps}
            />
          )}

          {/* Money Out arc (red) starts after Money In arc */}
          {outDash > 0 && (
            <G rotation={(inFraction * 360)} originX={size / 2} originY={size / 2}>
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors.danger}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                animatedProps={animatedOutProps}
              />
            </G>
          )}
        </G>
      </Svg>

      {/* Center label with scale animation */}
      <Animated.View 
        style={[
          styles.centerCircle, 
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>{formatter(total)}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  centerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 35,
  },
  totalLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  totalAmount: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  legend: {
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  legendValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
