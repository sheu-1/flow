/**
 * EnhancedAddTransactionModal Component
 * 
 * Enhanced transaction creation modal with voice input, receipt scanning, and quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeProvider';
import { VoiceInputModal } from './VoiceInputModal';
import { ReceiptScannerModal } from './ReceiptScannerModal';
import { QuickExpenseButtons } from './QuickExpenseButtons';
import { MilestoneCelebrationModal } from './MilestoneCelebrationModal';
import { VoiceTransactionData } from '../services/VoiceService';
import { ReceiptData } from '../services/ReceiptScanService';
import { FavoriteMerchantsService, FavoriteMerchant } from '../services/FavoriteMerchantsService';
import { MilestoneService, Milestone } from '../services/MilestoneService';
import { spacing, fontSize, borderRadius } from '../theme/colors';

interface EnhancedAddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onTransactionAdded: (transaction: {
    amount: number;
    description: string;
    category: string;
    type: 'income' | 'expense';
  }) => void;
  userId: string;
  currentBalance: number;
  totalTransactions: number;
}

const CATEGORIES = [
  { name: 'Food & Dining', icon: 'restaurant-outline', color: '#FF6B35' },
  { name: 'Transportation', icon: 'car-outline', color: '#4285F4' },
  { name: 'Shopping', icon: 'bag-outline', color: '#EA4335' },
  { name: 'Entertainment', icon: 'game-controller-outline', color: '#9C27B0' },
  { name: 'Bills & Utilities', icon: 'receipt-outline', color: '#607D8B' },
  { name: 'Health & Fitness', icon: 'fitness-outline', color: '#FF9800' },
  { name: 'Groceries', icon: 'basket-outline', color: '#34A853' },
  { name: 'Other', icon: 'ellipsis-horizontal-outline', color: '#9E9E9E' },
];

export const EnhancedAddTransactionModal: React.FC<EnhancedAddTransactionModalProps> = ({
  visible,
  onClose,
  onTransactionAdded,
  userId,
  currentBalance,
  totalTransactions,
}) => {
  const colors = useThemeColors();
  
  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  
  // Modal states
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  
  // Data states
  const [favoriteMerchants, setFavoriteMerchants] = useState<FavoriteMerchant[]>([]);
  const [completedMilestone, setCompletedMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (visible) {
      loadFavoriteMerchants();
    }
  }, [visible, userId]);

  const loadFavoriteMerchants = async () => {
    try {
      const merchants = await FavoriteMerchantsService.getTopMerchants(userId, 5);
      setFavoriteMerchants(merchants);
    } catch (error) {
      console.error('Error loading favorite merchants:', error);
    }
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please enter a description.');
      return;
    }

    try {
      // Add to favorite merchants if it's an expense
      if (transactionType === 'expense') {
        await FavoriteMerchantsService.addFavoriteMerchant(
          userId,
          description.trim(),
          selectedCategory,
          numAmount
        );
      }

      // Check for milestone completions
      const completedMilestones = await MilestoneService.checkMilestonesAfterTransaction(
        userId,
        numAmount,
        transactionType,
        selectedCategory,
        totalTransactions + 1,
        transactionType === 'income' ? currentBalance + numAmount : currentBalance - numAmount
      );

      // Create transaction
      onTransactionAdded({
        amount: numAmount,
        description: description.trim(),
        category: selectedCategory,
        type: transactionType,
      });

      // Show milestone celebration if any milestones were completed
      if (completedMilestones.length > 0) {
        setCompletedMilestone(completedMilestones[0]); // Show first completed milestone
        setShowMilestoneCelebration(true);
      }

      // Reset form
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to create transaction. Please try again.');
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCategory('Other');
    setTransactionType('expense');
  };

  const handleVoiceTransactionCreated = (data: VoiceTransactionData) => {
    setAmount(data.amount.toString());
    setDescription(data.description);
    setTransactionType(data.type);
    if (data.category) {
      setSelectedCategory(data.category);
    }
    setShowVoiceInput(false);
  };

  const handleReceiptScanned = (data: ReceiptData) => {
    setAmount(data.amount.toString());
    setDescription(data.merchant);
    setTransactionType('expense');
    
    // Auto-categorize as Shopping
    const category = 'Shopping';
    setSelectedCategory(category);
    setShowReceiptScanner(false);
  };

  const handleQuickExpenseCreated = (expense: {
    amount: number;
    description: string;
    category: string;
  }) => {
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setSelectedCategory(expense.category);
    setTransactionType('expense');
  };

  const handleFavoriteMerchantSelected = (merchant: FavoriteMerchant) => {
    setAmount(merchant.averageAmount.toString());
    setDescription(merchant.name);
    setSelectedCategory(merchant.category);
    setTransactionType('expense');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Add Transaction
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Quick Action Buttons */}
            <Animated.View entering={FadeInUp.delay(100).springify()}>
              <View style={styles.quickActionsContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Quick Actions
                </Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={[styles.quickActionButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowVoiceInput(true)}
                  >
                    <Ionicons name="mic" size={24} color="#fff" />
                    <Text style={[styles.quickActionText, { color: '#fff' }]}>
                      Voice
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickActionButton, { backgroundColor: colors.success }]}
                    onPress={() => setShowReceiptScanner(true)}
                  >
                    <Ionicons name="camera" size={24} color="#fff" />
                    <Text style={[styles.quickActionText, { color: '#fff' }]}>
                      Scan
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            {/* Quick Expense Buttons */}
            <Animated.View entering={FadeInUp.delay(200).springify()}>
              <QuickExpenseButtons
                userId={userId}
                onExpenseCreated={handleQuickExpenseCreated}
              />
            </Animated.View>

            {/* Favorite Merchants */}
            {favoriteMerchants.length > 0 && (
              <Animated.View entering={FadeInUp.delay(300).springify()}>
                <View style={styles.favoriteMerchantsContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Recent Places
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.merchantsScroll}
                  >
                    {favoriteMerchants.map((merchant, index) => (
                      <Animated.View
                        key={merchant.id}
                        entering={FadeInRight.delay(index * 50).springify()}
                      >
                        <TouchableOpacity
                          style={[
                            styles.merchantButton,
                            {
                              backgroundColor: merchant.color + '15',
                              borderColor: merchant.color,
                            },
                          ]}
                          onPress={() => handleFavoriteMerchantSelected(merchant)}
                        >
                          <Ionicons
                            name={merchant.icon as any}
                            size={20}
                            color={merchant.color}
                          />
                          <Text style={[styles.merchantName, { color: colors.text }]}>
                            {merchant.name}
                          </Text>
                          <Text style={[styles.merchantAmount, { color: merchant.color }]}>
                            ${merchant.averageAmount.toFixed(0)}
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </ScrollView>
                </View>
              </Animated.View>
            )}

            {/* Transaction Type Toggle */}
            <Animated.View entering={FadeInUp.delay(400).springify()}>
              <View style={styles.typeToggleContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Transaction Type
                </Text>
                <View style={[styles.typeToggle, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      transactionType === 'expense' && {
                        backgroundColor: colors.danger,
                      },
                    ]}
                    onPress={() => setTransactionType('expense')}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        {
                          color:
                            transactionType === 'expense' ? '#fff' : colors.text,
                        },
                      ]}
                    >
                      Money Out
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      transactionType === 'income' && {
                        backgroundColor: colors.success,
                      },
                    ]}
                    onPress={() => setTransactionType('income')}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        {
                          color:
                            transactionType === 'income' ? '#fff' : colors.text,
                        },
                      ]}
                    >
                      Money In
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            {/* Amount Input */}
            <Animated.View entering={FadeInUp.delay(500).springify()}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Amount
                </Text>
                <View
                  style={[
                    styles.amountInputContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </Animated.View>

            {/* Description Input */}
            <Animated.View entering={FadeInUp.delay(600).springify()}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Description
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What was this for?"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </Animated.View>

            {/* Category Selection */}
            <Animated.View entering={FadeInUp.delay(700).springify()}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Category
                </Text>
                <View style={styles.categoriesGrid}>
                  {CATEGORIES.map((category, index) => (
                    <Animated.View
                      key={category.name}
                      entering={FadeInUp.delay(700 + index * 50).springify()}
                    >
                      <TouchableOpacity
                        style={[
                          styles.categoryButton,
                          {
                            backgroundColor:
                              selectedCategory === category.name
                                ? category.color + '20'
                                : colors.surface,
                            borderColor:
                              selectedCategory === category.name
                                ? category.color
                                : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedCategory(category.name)}
                      >
                        <Ionicons
                          name={category.icon as any}
                          size={20}
                          color={
                            selectedCategory === category.name
                              ? category.color
                              : colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.categoryButtonText,
                            {
                              color:
                                selectedCategory === category.name
                                  ? category.color
                                  : colors.text,
                            },
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                </View>
              </View>
            </Animated.View>

            {/* Submit Button */}
            <Animated.View entering={FadeInUp.delay(900).springify()}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      transactionType === 'income' ? colors.success : colors.danger,
                  },
                ]}
                onPress={handleSubmit}
              >
                <Text style={[styles.submitButtonText, { color: '#fff' }]}>
                  Add {transactionType === 'income' ? 'Income' : 'Expense'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </View>
      </Modal>

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={showVoiceInput}
        onClose={() => setShowVoiceInput(false)}
        onTransactionCreated={handleVoiceTransactionCreated}
      />

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        visible={showReceiptScanner}
        onClose={() => setShowReceiptScanner(false)}
        onReceiptScanned={handleReceiptScanned}
      />

      {/* Milestone Celebration Modal */}
      <MilestoneCelebrationModal
        visible={showMilestoneCelebration}
        milestone={completedMilestone}
        onClose={() => {
          setShowMilestoneCelebration(false);
          setCompletedMilestone(null);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  quickActionsContainer: {
    padding: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  quickActionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  favoriteMerchantsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  merchantsScroll: {
    gap: spacing.sm,
  },
  merchantButton: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 80,
  },
  merchantName: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  merchantAmount: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    marginTop: 2,
  },
  typeToggleContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  typeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  formGroup: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  categoryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  submitButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
});
