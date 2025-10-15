/**
 * UnifiedPeriodSelector Component
 * 
 * Merges primary and secondary period selectors into a single unified control.
 * Shows the main period selector with a caret icon that opens the detailed period selection page.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';

interface UnifiedPeriodSelectorProps {
  selectedPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  onPeriodChange: (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => void;
  onOpenDetailedSelector: () => void;
  removeMargin?: boolean;
}

export const UnifiedPeriodSelector: React.FC<UnifiedPeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  onOpenDetailedSelector,
  removeMargin = false,
}) => {
  const colors = useThemeColors();
  const periods = [
    { key: 'daily' as const, label: 'Daily' },
    { key: 'weekly' as const, label: 'Weekly' },
    { key: 'monthly' as const, label: 'Monthly' },
    { key: 'yearly' as const, label: 'Yearly' },
  ];

  return (
    <View style={[styles.container, removeMargin && styles.noMargin]}>
      <View style={[styles.periodContainer, { backgroundColor: colors.surface }]}>
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
        
        {/* Caret Icon to open detailed selector */}
        <TouchableOpacity
          style={styles.caretButton}
          onPress={onOpenDetailedSelector}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  noMargin: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  periodContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    alignItems: 'center',
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
  caretButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
