import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
import { useCurrency } from '../services/CurrencyProvider';
import { spacing, fontSize } from '../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type MetricType = 'total' | 'average' | 'count' | 'max' | 'min';

interface AnimatedCircleMetricProps {
  value: number;
  label: string;
  type: MetricType;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  maxValue?: number; // For calculating fill percentage
  size?: number;
  showCurrency?: boolean;
}

/**
 * AnimatedCircleMetric - A reusable animated circular indicator component
 * 
 * Features:
 * - Smooth fill animation based on value/maxValue ratio
 * - Color transitions when period changes
 * - Configurable metric types with appropriate icons and colors
 * - Responsive sizing
 * 
 * @param value - The numeric value to display
 * @param label - Text label for the metric
 * @param type - Type of metric (total, average, count, max, min)
 * @param period - Current time period (affects color animation)
 * @param maxValue - Maximum value for calculating fill percentage (defaults to value for 100%)
 * @param size - Circle diameter in pixels (default: 110)
 * @param showCurrency - Whether to format value as currency (default: true for non-count types)
 */
export function AnimatedCircleMetric({
  value,
  label,
  type,
  period = 'daily',
  maxValue,
  size = 110,
  showCurrency = type !== 'count',
}: AnimatedCircleMetricProps) {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();
  
  // Animation values
  const progress = useSharedValue(0);
  const colorProgress = useSharedValue(0);
  
  // Circle dimensions
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Color mapping based on metric type
  const getMetricColor = () => {
    switch (type) {
      case 'total':
        return '#14B8A6'; // Teal
      case 'average':
        return '#A855F7'; // Purple
      case 'count':
        return '#F59E0B'; // Amber/Orange
      case 'max':
        return '#10B981'; // Green
      case 'min':
        return '#EF4444'; // Red
      default:
        return colors.primary;
    }
  };
  
  // Icon mapping
  const getMetricIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'total':
        return 'cash-outline';
      case 'average':
        return 'speedometer-outline';
      case 'count':
        return 'receipt-outline';
      case 'max':
        return 'trending-up-outline';
      case 'min':
        return 'trending-down-outline';
      default:
        return 'analytics-outline';
    }
  };
  
  const metricColor = getMetricColor();
  const metricIcon = getMetricIcon();
  
  // Calculate fill percentage
  const fillPercentage = maxValue && maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 100;
  
  // Animate progress when value changes
  useEffect(() => {
    progress.value = withSpring(fillPercentage / 100, {
      damping: 15,
      stiffness: 80,
    });
  }, [fillPercentage, value]);
  
  // Animate color transitions when period changes
  useEffect(() => {
    const periodValues = { daily: 0, weekly: 0.33, monthly: 0.66, yearly: 1 };
    colorProgress.value = withTiming(periodValues[period], {
      duration: 500,
      easing: Easing.inOut(Easing.ease),
    });
  }, [period]);
  
  // Animated circle props
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });
  
  // Format display value
  const displayValue = showCurrency 
    ? formatCurrency(value)
    : value.toLocaleString();
  
  // Shorten large numbers for better display
  const formatCompactValue = (val: number): string => {
    if (!showCurrency) return val.toLocaleString();
    
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return formatCurrency(val);
  };
  
  const compactValue = formatCompactValue(value);
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surface}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Animated progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={metricColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      
      {/* Center content */}
      <View style={styles.centerContent}>
        <Ionicons name={metricIcon} size={24} color={metricColor} />
        <Text style={[styles.value, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {compactValue}
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginTop: 2,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
