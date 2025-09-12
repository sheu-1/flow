import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';

interface PeriodSelectorProps {
  selectedPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  onPeriodChange: (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const colors = useThemeColors();
  const periods = [
    { key: 'daily' as const, label: 'Daily' },
    { key: 'weekly' as const, label: 'Weekly' },
    { key: 'monthly' as const, label: 'Monthly' },
    { key: 'yearly' as const, label: 'Yearly' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }] }>
      {periods.map((period) => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.periodButton,
            selectedPeriod === period.key && { backgroundColor: colors.primary },
          ]}
          onPress={() => onPeriodChange(period.key)}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  periodButtonText: {
    fontWeight: '600',
    fontSize: fontSize.sm,
  },
});
