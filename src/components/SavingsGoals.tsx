import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
import { useCurrency } from '../services/CurrencyProvider';
import { SavingsGoalsService } from '../services/SavingsGoalsService';

interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  category: 'emergency' | 'vacation' | 'purchase' | 'investment' | 'other';
  emoji: string;
  color: string;
  createdAt: Date;
}

interface Props {
  userId: string;
  totalSavings: number;
}

const goalCategories = [
  { key: 'emergency', label: 'Emergency Fund', emoji: '🛡️', color: '#FF6B6B' },
  { key: 'vacation', label: 'Vacation', emoji: '✈️', color: '#4ECDC4' },
  { key: 'purchase', label: 'Big Purchase', emoji: '🛍️', color: '#45B7D1' },
  { key: 'investment', label: 'Investment', emoji: '📈', color: '#96CEB4' },
  { key: 'other', label: 'Other', emoji: '🎯', color: '#FFEAA7' },
];

export const SavingsGoals: React.FC<Props> = ({ userId, totalSavings }) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: '',
    deadline: '',
    category: 'other' as SavingsGoal['category'],
  });

  const mapBackendGoalToUi = (g: any): SavingsGoal => {
    const categoryMeta =
      goalCategories.find(c => c.label === g.category) ||
      goalCategories.find(c => c.key === 'other')!;

    const fallbackDeadline = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const rawTargetDate = g.targetDate || g.target_date || g.deadline;
    const parsedDeadline = rawTargetDate ? new Date(rawTargetDate) : fallbackDeadline;
    const safeDeadline = isNaN(parsedDeadline.getTime()) ? fallbackDeadline : parsedDeadline;

    const rawCreatedAt = g.createdAt || g.created_at;
    const parsedCreated = rawCreatedAt ? new Date(rawCreatedAt) : new Date();
    const safeCreated = isNaN(parsedCreated.getTime()) ? new Date() : parsedCreated;

    return {
      id: g.id,
      title: g.title,
      targetAmount: g.targetAmount ?? g.target_amount ?? 0,
      currentAmount: g.currentAmount ?? g.current_amount ?? 0,
      deadline: safeDeadline,
      category: (categoryMeta.key as SavingsGoal['category']),
      emoji: categoryMeta.emoji,
      color: g.color || categoryMeta.color,
      createdAt: safeCreated,
    };
  };

  // Load goals from Supabase/AsyncStorage via service
  useEffect(() => {
    loadGoals();
  }, [userId]);

  const loadGoals = async () => {
    try {
      if (!userId) {
        setGoals([]);
        return;
      }
      const backendGoals = await SavingsGoalsService.getSavingsGoals(userId);
      const mapped: SavingsGoal[] = backendGoals.map(mapBackendGoalToUi);

      setGoals(mapped);
    } catch (error) {
      console.error('Failed to load savings goals:', error);
      setGoals([]);
    }
  };

  const addGoal = async () => {
    if (!newGoal.title || !newGoal.targetAmount) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (!userId) {
      Alert.alert('Not Logged In', 'Please log in to create a savings goal.');
      return;
    }

    const amount = parseFloat(newGoal.targetAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid target amount.');
      return;
    }

    const categoryMeta = goalCategories.find(c => c.key === newGoal.category)!;

    try {
      // Parse deadline safely; fall back to 12 months from now if invalid or empty
      let targetDate: Date;
      if (newGoal.deadline) {
        const parsed = new Date(newGoal.deadline);
        if (isNaN(parsed.getTime())) {
          targetDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        } else {
          targetDate = parsed;
        }
      } else {
        targetDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      const createdBackend = await SavingsGoalsService.createSavingsGoal(userId, {
        title: newGoal.title,
        description: `Save ${amount} for ${categoryMeta.label}`,
        targetAmount: amount,
        targetDate,
        category: categoryMeta.label,
        icon: 'flag-outline',
        color: categoryMeta.color,
      });

      const created = mapBackendGoalToUi(createdBackend);

      setGoals(prev => [created, ...prev]);
      setShowAddModal(false);
      setNewGoal({ title: '', targetAmount: '', deadline: '', category: 'other' });
    } catch (error) {
      console.error('Error creating savings goal:', error);
      Alert.alert('Error', 'Failed to create savings goal. Please try again.');
    }
  };

  const updateGoalProgress = async (goalId: string, amount: number) => {
    if (!userId) {
      Alert.alert('Not Logged In', 'Please log in to update a savings goal.');
      return;
    }

    const existing = goals.find(g => g.id === goalId);
    if (!existing) return;

    const newAmount = Math.min(existing.targetAmount, existing.currentAmount + amount);

    try {
      const updatedBackend = await SavingsGoalsService.updateGoalProgress(userId, goalId, newAmount);
      if (updatedBackend) {
        const updated = mapBackendGoalToUi(updatedBackend);
        setGoals(prev => prev.map(g => (g.id === goalId ? updated : g)));
      }
    } catch (error) {
      console.error('Error updating goal progress:', error);
      Alert.alert('Error', 'Failed to update goal progress. Please try again.');
    }
  };

  const deleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this savings goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            if (userId) {
              await SavingsGoalsService.deleteSavingsGoal(userId, goalId);
            }
            setGoals(prev => prev.filter(g => g.id !== goalId));
          } catch (error) {
            console.error('Error deleting savings goal:', error);
            Alert.alert('Error', 'Failed to delete savings goal. Please try again.');
          }
        }},
      ]
    );
  };

  const GoalCard = ({ goal, index }: { goal: SavingsGoal; index: number }) => {
    const progress = goal.currentAmount / goal.targetAmount;
    const progressWidth = useSharedValue(0);
    const cardScale = useSharedValue(1);

    useEffect(() => {
      progressWidth.value = withTiming(progress, { duration: 1000 });
    }, [progress]);

    const animatedProgressStyle = useAnimatedStyle(() => ({
      width: `${progressWidth.value * 100}%`,
    }));

    const animatedCardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cardScale.value }],
    }));

    const daysLeft = Math.ceil((goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft < 0;
    const isNearDeadline = daysLeft <= 30 && daysLeft > 0;

    const handlePress = () => {
      cardScale.value = withSpring(0.95, {}, () => {
        cardScale.value = withSpring(1);
      });
    };

    return (
      <Animated.View
        entering={SlideInRight.delay(index * 100).springify()}
        style={[animatedCardStyle]}
      >
        <TouchableOpacity
          style={[styles.goalCard, { backgroundColor: colors.background }]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <View style={styles.goalHeader}>
            <View style={styles.goalInfo}>
              <Text style={styles.goalEmoji}>{goal.emoji}</Text>
              <View style={styles.goalText}>
                <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                <Text style={[styles.goalProgress, { color: colors.textSecondary }]}>
                  {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteGoal(goal.id)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: goal.color },
                  animatedProgressStyle,
                ]}
              />
            </View>
            <Text style={[styles.progressPercent, { color: goal.color }]}>
              {(progress * 100).toFixed(0)}%
            </Text>
          </View>

          <View style={styles.goalFooter}>
            <View style={styles.deadlineContainer}>
              <Ionicons 
                name="time-outline" 
                size={14} 
                color={isOverdue ? colors.danger : isNearDeadline ? colors.warning : colors.textMuted} 
              />
              <Text style={[
                styles.deadlineText,
                { 
                  color: isOverdue ? colors.danger : isNearDeadline ? colors.warning : colors.textMuted 
                }
              ]}>
                {isOverdue 
                  ? `${Math.abs(daysLeft)} days overdue`
                  : `${daysLeft} days left`
                }
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: goal.color + '20' }]}
              onPress={() => {
                Alert.prompt(
                  'Add to Goal',
                  `How much would you like to add to "${goal.title}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Add', 
                      onPress: async (amount?: string) => {
                        const numAmount = parseFloat(amount || '0');
                        if (numAmount > 0) {
                          await updateGoalProgress(goal.id, numAmount);
                        }
                      }
                    },
                  ],
                  'plain-text',
                  '',
                  'numeric'
                );
              }}
            >
              <Ionicons name="add" size={16} color={goal.color} />
              <Text style={[styles.addButtonText, { color: goal.color }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {progress >= 1 && (
            <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={16} color={colors.background} />
              <Text style={[styles.completedText, { color: colors.background }]}>
                Goal Achieved! 🎉
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Savings Goals</Text>
        <TouchableOpacity
          style={[styles.addGoalButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      {goals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Coming Soon</Text>
          <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>
            Goal setting feature will be available soon!
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {goals.map((goal, index) => (
            <GoalCard key={goal.id} goal={goal} index={index} />
          ))}
        </ScrollView>
      )}

      {/* Add Goal Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Savings Goal</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Goal Title</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="e.g., Emergency Fund, New Car"
              placeholderTextColor={colors.textMuted}
              value={newGoal.title}
              onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Target Amount</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={newGoal.targetAmount}
              onChangeText={(text) => setNewGoal({ ...newGoal, targetAmount: text })}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {goalCategories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryButton,
                    { 
                      backgroundColor: newGoal.category === category.key ? category.color + '20' : colors.surface,
                      borderColor: newGoal.category === category.key ? category.color : colors.border,
                    }
                  ]}
                  onPress={() => setNewGoal({ ...newGoal, category: category.key as SavingsGoal['category'] })}
                >
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                  <Text style={[
                    styles.categoryLabel,
                    { color: newGoal.category === category.key ? category.color : colors.text }
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Deadline (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={newGoal.deadline}
              onChangeText={(text) => setNewGoal({ ...newGoal, deadline: text })}
            />
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={addGoal}
            >
              <Text style={[styles.createButtonText, { color: colors.background }]}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addGoalButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  goalText: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  goalProgress: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 35,
    textAlign: 'right',
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: 12,
    marginLeft: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  completedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryScroll: {
    marginVertical: 8,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    minWidth: 100,
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
