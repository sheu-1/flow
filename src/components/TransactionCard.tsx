import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { Transaction } from '../types';
import { useCurrency } from '../services/CurrencyProvider';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
  onEditCategory?: () => void;
  onSelectCategory?: (category: string) => void;
  onDelete?: () => void;
  showInlineCategories?: boolean;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onPress, onEditCategory, onSelectCategory, onDelete, showInlineCategories }) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Show scrollview by default

  const isIncome = transaction.type === 'income';


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getCategoryIcon = (category: string): any => {
    const iconMap: { [key: string]: any } = {
      'Salary': 'cash-outline',
      'Freelance': 'construct-outline',
      'Housing': 'home-outline',
      'Food': 'restaurant-outline',
      'Food & Dining': 'restaurant-outline',
      'Transportation': 'car-outline',
      'Utilities': 'flash-outline',
      'Bills & Utilities': 'flash-outline',
      'Entertainment': 'game-controller-outline',
      'Shopping': 'bag-outline',
      'Fees & Charges': 'card-outline',
      'Airtime & Data': 'phone-portrait-outline',
      'Healthcare': 'medical-outline',
      'Education': 'school-outline',
    };
    return iconMap[category] || 'ellipse-outline';
  };

  const gradientColors = isIncome
    ? ['#10b981', '#059669'] as const // Green gradient for income
    : ['#ef4444', '#dc2626'] as const; // Red gradient for expense

  // Common Category definitions
  const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gifts', 'Tips', 'Investments', 'Mobile Money', 'Other Income'];
  const EXPENSE_CATEGORIES = ['Food & Dining', 'Transportation', 'Housing', 'Bills & Utilities', 'Entertainment', 'Shopping', 'Healthcare', 'Education', 'Phone & Airtime', 'Subscriptions', 'Fees & Charges', 'Other'];

  const categoryOptions = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        {/* Gradient accent bar on left */}
        <LinearGradient
          colors={gradientColors}
          style={styles.accentBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Ellipsis Menu Button - Top Right */}
        {(onEditCategory || onDelete) && (
          <TouchableOpacity
            style={styles.ellipsisButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onPress}
          disabled={!onPress}
          activeOpacity={0.7}
        >
          {/* Header wrapper to contain the icon + details row */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Icon with gradient background */}
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={isIncome ? ['#10b98120', '#05966920'] : ['#ef444420', '#dc262620']}
                style={styles.iconContainer}
              >
                <Ionicons
                  name={getCategoryIcon(transaction.category || '')}
                  size={24}
                  color={isIncome ? colors.success : colors.danger}
                />
              </LinearGradient>
            </View>

            {/* Moved original content setup here */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {/* Main content */}
              <View style={styles.contentContainer}>
                <View style={styles.leftSection}>
                  <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
                    {transaction.description}
                  </Text>
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
                    { color: isIncome ? colors.success : colors.danger }
                  ]}>
                    {isIncome ? '+' : '-'}{Math.abs(transaction.amount).toFixed(2)}
                  </Text>
                  <View style={styles.dateTimeContainer}>
                    <Text style={[styles.date, { color: colors.textSecondary }]}>
                      {formatDate(typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date)}
                    </Text>
                    <Text style={[styles.timeSeparator, { color: colors.textMuted }]}> • </Text>
                    <Text style={[styles.time, { color: colors.textMuted }]}>
                      {formatTime(typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Inline Category Chips */}
        {showInlineCategories && onSelectCategory && (
          <View style={styles.chipsContainer}>
            {isExpanded ? (
              <Animated.View entering={FadeIn}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {categoryOptions.map((cat) => {
                    const isSelected = transaction.category === cat;
                    const activeColor = isIncome ? colors.success : colors.danger;
                    const activeBg = isIncome ? '#10b98120' : '#ef444420';

                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.chip,
                          { backgroundColor: isSelected ? activeBg : colors.background },
                          isSelected && { borderColor: activeColor, borderWidth: 1 }
                        ]}
                        onPress={() => {
                          onSelectCategory(cat);
                          setIsExpanded(false);
                        }}
                      >
                        <Text 
                          style={[
                            styles.chipText, 
                            { color: isSelected ? activeColor : colors.textSecondary },
                            isSelected && { fontWeight: '600' }
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn} style={[styles.chip, { backgroundColor: isIncome ? '#10b98120' : '#ef444420', alignSelf: 'flex-start', paddingRight: spacing.sm }]}>
                 <TouchableOpacity onPress={() => setIsExpanded(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <Text style={[styles.chipText, { color: isIncome ? colors.success : colors.danger, fontWeight: '600', marginRight: 6 }]}>
                     {transaction.category || 'Categorize'}
                   </Text>
                   <Ionicons name="caret-down" size={14} color={isIncome ? colors.success : colors.danger} />
                 </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        )}
      </View>

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
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.xs,
    // Add vertical flexDirection block wrapper
    flexDirection: 'column',
    // Enhanced shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconWrapper: {
    marginRight: spacing.md,
    marginLeft: spacing.xs,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  chipsContainer: {
    marginTop: spacing.sm,
    marginLeft: 60, // Align with left edge of description text (skip the icon width + margin)
  },
  chipsScrollContent: {
    paddingRight: spacing.md, // padding to allow scroll to end nicely
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 9999,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#f5f5f5', 
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  description: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  category: {
    fontSize: fontSize.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.xs / 2,
    letterSpacing: 0.5,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  timeSeparator: {
    fontSize: fontSize.xs,
  },
  time: {
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

