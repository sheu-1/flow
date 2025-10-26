import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { Transaction } from '../types';
import { useCurrency } from '../services/CurrencyProvider';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
  onEditCategory?: () => void;
  onDelete?: () => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onPress, onEditCategory, onDelete }) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();
  const [showMenu, setShowMenu] = useState(false);

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
    <>
      <TouchableOpacity style={[styles.container, { backgroundColor: colors.card }]} onPress={onPress} disabled={!onPress}>
        {/* Ellipsis Menu Button - Top Right */}
        {(onEditCategory || onDelete) && (
          <TouchableOpacity 
            style={styles.ellipsisButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        
        <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
          <Ionicons 
            name={getCategoryIcon(transaction.category || '')} 
            size={24} 
            color={transaction.type === 'income' ? colors.success : colors.danger} 
          />
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.leftSection}>
            <Text style={[styles.description, { color: colors.text }]}>{transaction.description}</Text>
            {onEditCategory ? (
              <TouchableOpacity style={styles.categoryRow} onPress={onEditCategory}>
                <Text style={[styles.category, { color: colors.textSecondary }]}>{transaction.category}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.category, { color: colors.textSecondary }]}>{transaction.category}</Text>
            )}
          </View>
          
          <View style={styles.rightSection}>
            <Text style={[
              styles.amount,
              { color: transaction.type === 'income' ? colors.success : colors.danger }
            ]}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Options Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="none"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowMenu(false)}
        >
          <Animated.View 
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[styles.menuContainer, { backgroundColor: colors.surface }]}
          >
            {onEditCategory && (
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowMenu(false);
                  onEditCategory();
                }}
              >
                <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
                <Text style={[styles.menuText, { color: colors.text }]}>Recategorize Transaction</Text>
              </TouchableOpacity>
            )}
            
            {onDelete && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onDelete();
                }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuText, { color: colors.danger }]}>Delete Transaction</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
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
    // Subtle shadow for light mode
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: fontSize.xs,
  },
  ellipsisButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    padding: spacing.xs,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    borderRadius: borderRadius.md,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  menuText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});

export default TransactionCard;
