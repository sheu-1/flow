import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { Transaction } from '../types';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onPress }) => {
  const colors = useThemeColors();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryIcon = (category: string): any => {
    const iconMap: { [key: string]: any } = {
      'Salary': 'cash-outline',
      'Freelance': 'construct-outline',
      'Housing': 'home-outline',
      'Food': 'restaurant-outline',
      'Transportation': 'car-outline',
      'Utilities': 'flash-outline',
      'Entertainment': 'game-controller-outline',
      'Shopping': 'bag-outline',
    };
    return iconMap[category] || 'ellipse-outline';
  };

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.card }]} onPress={onPress} disabled={!onPress}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
        <Ionicons 
          name={getCategoryIcon(transaction.category)} 
          size={24} 
          color={transaction.type === 'income' ? colors.success : colors.danger} 
        />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.leftSection}>
          <Text style={[styles.description, { color: colors.text }]}>{transaction.description}</Text>
          <Text style={[styles.category, { color: colors.textSecondary }]}>{transaction.category}</Text>
        </View>
        
        <View style={styles.rightSection}>
          <Text style={[
            styles.amount,
            { color: transaction.type === 'income' ? colors.success : colors.danger }
          ]}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(transaction.date)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  description: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  category: {
    fontSize: fontSize.sm,
  },
  amount: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: fontSize.xs,
  },
});

export default TransactionCard;
