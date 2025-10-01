import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';

interface FloatingPeriodSelectorProps {
  selectedPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  onPeriodChange: (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => void;
  scrollY?: Animated.Value;
  initialOffset?: number;
}

export const FloatingPeriodSelector: React.FC<FloatingPeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  scrollY,
  initialOffset = 200, // Default offset where the selector becomes sticky
}) => {
  const colors = useThemeColors();
  const [isSticky, setIsSticky] = useState(false);
  const translateY = new Animated.Value(0);
  const opacity = new Animated.Value(1);

  const periods = [
    { key: 'daily' as const, label: 'Daily' },
    { key: 'weekly' as const, label: 'Weekly' },
    { key: 'monthly' as const, label: 'Monthly' },
    { key: 'yearly' as const, label: 'Yearly' },
  ];

  useEffect(() => {
    if (!scrollY) return;

    const listener = scrollY.addListener(({ value }) => {
      const shouldBeSticky = value > initialOffset;
      
      if (shouldBeSticky !== isSticky) {
        setIsSticky(shouldBeSticky);
        
        // Animate the transition
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: shouldBeSticky ? -10 : 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: shouldBeSticky ? 0.95 : 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [scrollY, initialOffset, isSticky, translateY, opacity]);

  const containerStyle = [
    styles.container,
    { backgroundColor: colors.surface },
    isSticky && [
      styles.sticky,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        shadowColor: colors.text,
        ...Platform.select({
          ios: {
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          android: {
            elevation: 8,
          },
        }),
      },
    ],
  ];

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {periods.map((period) => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.periodButton,
            selectedPeriod === period.key && { backgroundColor: colors.primary },
          ]}
          onPress={() => onPeriodChange(period.key)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.periodButtonText,
              { color: colors.textSecondary },
              selectedPeriod === period.key && { color: colors.text },
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    zIndex: 1000,
  },
  sticky: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80, // Account for status bar and header
    left: spacing.md,
    right: spacing.md,
    marginHorizontal: 0,
    marginBottom: 0,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    marginHorizontal: 1,
  },
  periodButtonText: {
    fontWeight: '600',
    fontSize: fontSize.sm,
  },
});
