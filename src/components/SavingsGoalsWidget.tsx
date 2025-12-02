/**
 * SavingsGoalsWidget Component
 * 
 * Displays savings goals with progress and suggestions
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
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeProvider';
import { 
  SavingsGoalsService, 
  SavingsGoal, 
  GoalSuggestion 
} from '../services/SavingsGoalsService';
import { spacing, fontSize, borderRadius } from '../theme/colors';

interface SavingsGoalsWidgetProps {
  userId: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
}

export const SavingsGoalsWidget: React.FC<SavingsGoalsWidgetProps> = ({
  userId,
  monthlyIncome,
  monthlyExpenses,
  currentSavings,
}) => {
  const colors = useThemeColors();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<GoalSuggestion | null>(null);

  // Form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalMonths, setGoalMonths] = useState('12');

  useEffect(() => {
    loadGoals();
    loadSuggestions();
  }, [userId, monthlyIncome, monthlyExpenses, currentSavings]);

  const loadGoals = async () => {
    try {
      const userGoals = await SavingsGoalsService.getSavingsGoals(userId);
      setGoals(userGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const goalSuggestions = await SavingsGoalsService.getGoalSuggestions(
        userId,
        monthlyIncome,
        monthlyExpenses,
        currentSavings
      );
      setSuggestions(goalSuggestions.slice(0, 6)); // Show top 6 suggestions
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleCreateGoalFromSuggestion = (suggestion: GoalSuggestion) => {
    setSelectedSuggestion(suggestion);
    setGoalTitle(suggestion.title);
    setGoalAmount(suggestion.targetAmount.toString());
    setGoalMonths(suggestion.duration.toString());
    setShowSuggestions(false);
    setShowCreateGoal(true);
  };

  const handleCreateGoal = async () => {
    const amount = parseFloat(goalAmount);
    const months = parseInt(goalMonths);

    if (!goalTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a goal title.');
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid target amount.');
      return;
    }

    if (isNaN(months) || months <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration in months.');
      return;
    }

    try {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + months);

      const newGoal = await SavingsGoalsService.createSavingsGoal(userId, {
        title: goalTitle,
        description: selectedSuggestion?.description || `Save ${amount} in ${months} months`,
        targetAmount: amount,
        targetDate,
        category: selectedSuggestion?.category || 'General',
        icon: selectedSuggestion?.icon || 'flag-outline',
        color: selectedSuggestion?.color || colors.primary,
      });

      setGoals(prev => [newGoal, ...prev]);
      handleCloseCreateGoal();
      
      Alert.alert('Goal Created!', `Your ${goalTitle} goal has been created successfully.`);
    } catch (error) {
      console.error('Error creating goal:', error);
      Alert.alert('Error', 'Failed to create goal. Please try again.');
    }
  };

  const handleCloseCreateGoal = () => {
    setShowCreateGoal(false);
    setSelectedSuggestion(null);
    setGoalTitle('');
    setGoalAmount('');
    setGoalMonths('12');
  };

  const renderGoalCard = (goal: SavingsGoal, index: number) => {
    const progress = SavingsGoalsService.getGoalProgress(goal);
    const daysRemaining = SavingsGoalsService.getDaysRemaining(goal);
    const isOnTrack = SavingsGoalsService.isGoalOnTrack(goal);
    const motivationalMessage = SavingsGoalsService.getMotivationalMessage(goal);

    return (
      <Animated.View
        key={goal.id}
        entering={FadeInUp.delay(index * 100).springify()}
        style={[styles.goalCard, { backgroundColor: colors.surface }]}
      >
        <View style={styles.goalHeader}>
          <View style={[styles.goalIcon, { backgroundColor: goal.color + '20' }]}>
            <Ionicons name={goal.icon as any} size={24} color={goal.color} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={[styles.goalTitle, { color: colors.text }]}>
              {goal.title}
            </Text>
            <Text style={[styles.goalCategory, { color: colors.textSecondary }]}>
              {goal.category}
            </Text>
          </View>
          <View style={styles.goalAmount}>
            <Text style={[styles.currentAmount, { color: goal.color }]}>
              {goal.currentAmount.toLocaleString()}
            </Text>
            <Text style={[styles.targetAmount, { color: colors.textSecondary }]}>
              of {goal.targetAmount.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <Animated.View
              entering={FadeInRight.delay(index * 100 + 200).duration(800)}
              style={[
                styles.progressFill,
                {
                  backgroundColor: goal.color,
                  width: `${progress}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.text }]}>
            {progress.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.goalFooter}>
          <View style={styles.goalStats}>
            <View style={styles.statItem}>
              <Ionicons 
                name={isOnTrack ? 'checkmark-circle' : 'time'} 
                size={16} 
                color={isOnTrack ? colors.success : colors.warning} 
              />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {daysRemaining} days left
              </Text>
            </View>
            {goal.monthlyTarget && (
              <View style={styles.statItem}>
                <Ionicons name="calendar" size={16} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {goal.monthlyTarget}/month
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.motivationalText, { color: goal.color }]}>
          {motivationalMessage}
        </Text>
      </Animated.View>
    );
  };

  const renderSuggestionCard = (suggestion: GoalSuggestion, index: number) => (
    <Animated.View
      key={suggestion.id}
      entering={FadeInUp.delay(index * 50).springify()}
    >
      <TouchableOpacity
        style={[
          styles.suggestionCard,
          { 
            backgroundColor: colors.surface,
            borderLeftColor: suggestion.color,
          },
        ]}
        onPress={() => handleCreateGoalFromSuggestion(suggestion)}
      >
        <View style={styles.suggestionHeader}>
          <View style={[styles.suggestionIcon, { backgroundColor: suggestion.color + '20' }]}>
            <Ionicons name={suggestion.icon as any} size={20} color={suggestion.color} />
          </View>
          <View style={styles.suggestionInfo}>
            <Text style={[styles.suggestionTitle, { color: colors.text }]}>
              {suggestion.title}
            </Text>
            <Text style={[styles.suggestionDescription, { color: colors.textSecondary }]}>
              {suggestion.description}
            </Text>
          </View>
          <View style={styles.suggestionPriority}>
            <View style={[
              styles.priorityBadge,
              { 
                backgroundColor: suggestion.priority === 'high' ? colors.danger + '20' : 
                                suggestion.priority === 'medium' ? colors.warning + '20' : 
                                colors.textSecondary + '20'
              }
            ]}>
              <Text style={[
                styles.priorityText,
                { 
                  color: suggestion.priority === 'high' ? colors.danger : 
                         suggestion.priority === 'medium' ? colors.warning : 
                         colors.textSecondary
                }
              ]}>
                {suggestion.priority.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.suggestionDetails}>
          <Text style={[styles.suggestionAmount, { color: suggestion.color }]}>
            {suggestion.targetAmount.toLocaleString()}
          </Text>
          <Text style={[styles.suggestionDuration, { color: colors.textSecondary }]}>
            {suggestion.monthlyAmount}/month for {suggestion.duration} months
          </Text>
        </View>

        <Text style={[styles.suggestionReason, { color: colors.textSecondary }]}>
          💡 {suggestion.reason}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.widgetTitle, { color: colors.text }]}>
          Savings Goals
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowSuggestions(true)}
          >
            <Ionicons name="bulb-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateGoal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {goals.length === 0 ? (
        <Animated.View 
          entering={FadeInUp.springify()}
          style={[styles.emptyState, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="flag-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Goals Yet
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            Set your first savings goal to start building your financial future!
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowSuggestions(true)}
          >
            <Text style={[styles.emptyButtonText, { color: '#fff' }]}>
              Get Suggestions
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.goalsContainer}
        >
          {goals.map(renderGoalCard)}
        </ScrollView>
      )}

      {/* Suggestions Modal */}
      <Modal
        visible={showSuggestions}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Goal Suggestions
            </Text>
            <TouchableOpacity onPress={() => setShowSuggestions(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.suggestionsSubtitle, { color: colors.textSecondary }]}>
              Based on your income and expenses, here are some personalized goal suggestions:
            </Text>
            
            {suggestions.map(renderSuggestionCard)}
          </ScrollView>
        </View>
      </Modal>

      {/* Create Goal Modal */}
      <Modal
        visible={showCreateGoal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseCreateGoal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Create Savings Goal
            </Text>
            <TouchableOpacity onPress={handleCloseCreateGoal}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Goal Title</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="e.g., Emergency Fund, Vacation, New Car"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Target Amount</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={goalAmount}
                onChangeText={setGoalAmount}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Duration (months)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={goalMonths}
                onChangeText={setGoalMonths}
                placeholder="12"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {goalAmount && goalMonths && (
              <View style={[styles.calculationContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.calculationLabel, { color: colors.textSecondary }]}>
                  Monthly savings needed:
                </Text>
                <Text style={[styles.calculationAmount, { color: colors.primary }]}>
                  {(parseFloat(goalAmount) / parseInt(goalMonths)).toFixed(2)}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateGoal}
            >
              <Text style={[styles.createButtonText, { color: '#fff' }]}>
                Create Goal
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  widgetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  emptyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  goalsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  goalCard: {
    width: 280,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  goalCategory: {
    fontSize: fontSize.sm,
  },
  goalAmount: {
    alignItems: 'flex-end',
  },
  currentAmount: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  targetAmount: {
    fontSize: fontSize.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    minWidth: 35,
  },
  goalFooter: {
    marginBottom: spacing.sm,
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
  },
  motivationalText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  suggestionsSubtitle: {
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  suggestionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  suggestionDescription: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  suggestionPriority: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
  },
  suggestionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  suggestionAmount: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  suggestionDuration: {
    fontSize: fontSize.sm,
  },
  suggestionReason: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currencySymbol: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: fontSize.md,
  },
  calculationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  calculationLabel: {
    fontSize: fontSize.md,
  },
  calculationAmount: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  createButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
});
