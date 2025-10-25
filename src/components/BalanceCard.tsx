import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';

interface BalanceCardProps {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  monthlyIncome,
  monthlyExpenses,
}) => {
  const colors = useThemeColors();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Total Balance</Text>
        <Text style={[styles.balanceAmount, { color: balance >= 0 ? colors.success : colors.danger }]}>
          {formatCurrency(balance)}
        </Text>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Money In</Text>
          <Text style={[styles.statAmount, { color: colors.success }]}>
            {formatCurrency(monthlyIncome)}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Money Out</Text>
          <Text style={[styles.statAmount, { color: colors.danger }]}>
            {formatCurrency(monthlyExpenses)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  statAmount: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
