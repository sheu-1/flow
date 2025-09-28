import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useCurrency } from '../services/CurrencyProvider';

interface MoneyCardProps {
  title: string;
  amount: number;
  type: 'in' | 'out' | 'net';
  period: string;
  icon: any;
}

export const MoneyCard: React.FC<MoneyCardProps> = ({
  title,
  amount,
  type,
  period,
  icon,
}) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();

  const getCardColor = () => {
    switch (type) {
      case 'in':
        return colors.success;
      case 'out':
        return colors.danger;
      case 'net':
        return amount >= 0 ? colors.success : colors.danger;
      default:
        return colors.primary;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'in':
        return colors.card;
      case 'out':
        return colors.card;
      case 'net':
        return colors.card;
      default:
        return colors.card;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${getCardColor()}20` }]}>
          <Ionicons name={icon} size={24} color={getCardColor()} />
        </View>
        <Text style={styles.period}>{period}</Text>
      </View>
      
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      
      <Text style={[styles.amount, { color: getCardColor() }]}>
        {type === 'out' && amount > 0 ? '-' : ''}
        {formatCurrency(Math.abs(amount))}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.sm,
    flex: 1,
    minHeight: 120,
    // Subtle shadow for light mode
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  period: {
    fontSize: fontSize.xs,
    color: '#999999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  amount: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
});
