/**
 * QuickExpenseButtons Component
 * 
 * Quick action buttons for common expenses
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeProvider';
import { FavoriteMerchantsService, QuickExpense } from '../services/FavoriteMerchantsService';
import { spacing, fontSize, borderRadius } from '../theme/colors';

interface QuickExpenseButtonsProps {
  userId: string;
  onExpenseCreated: (expense: {
    amount: number;
    description: string;
    category: string;
  }) => void;
}

export const QuickExpenseButtons: React.FC<QuickExpenseButtonsProps> = ({
  userId,
  onExpenseCreated,
}) => {
  const colors = useThemeColors();
  const [quickExpenses, setQuickExpenses] = useState<QuickExpense[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<QuickExpense | null>(null);

  useEffect(() => {
    loadQuickExpenses();
  }, [userId]);

  const loadQuickExpenses = async () => {
    try {
      const expenses = await FavoriteMerchantsService.getQuickExpenses(userId);
      setQuickExpenses(expenses);
    } catch (error) {
      console.error('Error loading quick expenses:', error);
    }
  };

  const handleQuickExpense = (expense: QuickExpense) => {
    setSelectedExpense(expense);
    setCustomAmount(expense.amount.toString());
    setShowCustomModal(true);
  };

  const handleConfirmExpense = () => {
    if (!selectedExpense) return;

    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    onExpenseCreated({
      amount,
      description: selectedExpense.name,
      category: selectedExpense.category,
    });

    setShowCustomModal(false);
    setSelectedExpense(null);
    setCustomAmount('');
  };

  const handleCloseModal = () => {
    setShowCustomModal(false);
    setSelectedExpense(null);
    setCustomAmount('');
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Quick Expenses</Text>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {quickExpenses.map((expense, index) => (
          <Animated.View
            key={expense.id}
            entering={FadeInUp.delay(index * 100).springify()}
          >
            <TouchableOpacity
              style={[
                styles.expenseButton,
                {
                  backgroundColor: expense.color + '15',
                  borderColor: expense.color,
                },
              ]}
              onPress={() => handleQuickExpense(expense)}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: expense.color },
                ]}
              >
                <Ionicons
                  name={expense.icon as any}
                  size={20}
                  color="#fff"
                />
              </View>
              <Text style={[styles.expenseName, { color: colors.text }]}>
                {expense.name}
              </Text>
              <Text style={[styles.expenseAmount, { color: expense.color }]}>
                ${expense.amount}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Custom Amount Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedExpense?.name}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View
                style={[
                  styles.modalIconContainer,
                  { backgroundColor: selectedExpense?.color + '15' },
                ]}
              >
                <Ionicons
                  name={selectedExpense?.icon as any}
                  size={40}
                  color={selectedExpense?.color}
                />
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                Amount
              </Text>
              <View style={[styles.amountInputContainer, { borderColor: colors.border }]}>
                <Text style={[styles.currencySymbol, { color: colors.text }]}>$</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  selectTextOnFocus
                />
              </View>

              <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                Category: {selectedExpense?.category}
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: selectedExpense?.color || colors.primary },
                ]}
                onPress={handleConfirmExpense}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  Add Expense
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  scrollContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  expenseButton: {
    width: 100,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  expenseName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  expenseAmount: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modalLabel: {
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    width: '100%',
  },
  currencySymbol: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  categoryText: {
    fontSize: fontSize.sm,
    alignSelf: 'flex-start',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
