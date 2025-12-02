/**
 * SavingsGoalsService
 * 
 * Manages savings goals and provides goal suggestions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './SupabaseClient';

export interface SavingsGoal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  createdAt: Date;
  category: string;
  icon: string;
  color: string;
  completed: boolean;
  completedAt?: Date;
  monthlyTarget?: number;
}

export interface GoalSuggestion {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  duration: number; // months
  monthlyAmount: number;
  category: string;
  icon: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export class SavingsGoalsService {
  private static readonly STORAGE_KEY = 'savings_goals';

  /**
   * Get user's savings goals
   */
  static async getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
    try {
      // Try Supabase first
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map(item => ({
          ...item,
          targetDate: new Date(item.target_date),
          createdAt: new Date(item.created_at),
          completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
          targetAmount: item.target_amount,
          currentAmount: item.current_amount
        }));
      }

      // Fallback to local storage
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      if (stored) {
        const goals = JSON.parse(stored);
        return goals.map((g: any) => ({
          ...g,
          targetDate: new Date(g.targetDate),
          createdAt: new Date(g.createdAt),
          completedAt: g.completedAt ? new Date(g.completedAt) : undefined
        }));
      }

      return [];
    } catch (error) {
      console.error('Error getting savings goals:', error);
      return [];
    }
  }

  /**
   * Create new savings goal
   */
  static async createSavingsGoal(userId: string, goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'completed' | 'currentAmount'>): Promise<SavingsGoal> {
    try {
      const newGoal: SavingsGoal = {
        ...goal,
        id: `goal_${Date.now()}`,
        createdAt: new Date(),
        currentAmount: 0,
        completed: false,
        monthlyTarget: this.calculateMonthlyTarget(goal.targetAmount, goal.targetDate)
      };

      // Save to Supabase
      const { error } = await supabase.from('savings_goals').insert({
        user_id: userId,
        id: newGoal.id,
        title: newGoal.title,
        description: newGoal.description,
        target_amount: newGoal.targetAmount,
        current_amount: newGoal.currentAmount,
        target_date: newGoal.targetDate.toISOString(),
        created_at: newGoal.createdAt.toISOString(),
        category: newGoal.category,
        icon: newGoal.icon,
        color: newGoal.color,
        completed: newGoal.completed,
        monthly_target: newGoal.monthlyTarget
      });

      if (error) throw error;

      // Save to local storage
      const goals = await this.getSavingsGoals(userId);
      goals.unshift(newGoal);
      await AsyncStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(goals));

      return newGoal;
    } catch (error) {
      console.error('Error creating savings goal:', error);
      throw error;
    }
  }

  /**
   * Update goal progress
   */
  static async updateGoalProgress(userId: string, goalId: string, amount: number): Promise<SavingsGoal | null> {
    try {
      const goals = await this.getSavingsGoals(userId);
      const goalIndex = goals.findIndex(g => g.id === goalId);
      
      if (goalIndex === -1) return null;

      const goal = goals[goalIndex];
      goal.currentAmount = Math.max(0, amount);
      
      // Check if goal is completed
      if (goal.currentAmount >= goal.targetAmount && !goal.completed) {
        goal.completed = true;
        goal.completedAt = new Date();
      } else if (goal.currentAmount < goal.targetAmount && goal.completed) {
        goal.completed = false;
        goal.completedAt = undefined;
      }

      // Update in Supabase
      await supabase
        .from('savings_goals')
        .update({
          current_amount: goal.currentAmount,
          completed: goal.completed,
          completed_at: goal.completedAt?.toISOString()
        })
        .eq('id', goalId)
        .eq('user_id', userId);

      // Update local storage
      await AsyncStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(goals));

      return goal;
    } catch (error) {
      console.error('Error updating goal progress:', error);
      return null;
    }
  }

  /**
   * Delete savings goal
   */
  static async deleteSavingsGoal(userId: string, goalId: string): Promise<void> {
    try {
      // Delete from Supabase
      await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', userId);

      // Update local storage
      const goals = await this.getSavingsGoals(userId);
      const filteredGoals = goals.filter(g => g.id !== goalId);
      await AsyncStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(filteredGoals));
    } catch (error) {
      console.error('Error deleting savings goal:', error);
    }
  }

  /**
   * Get goal suggestions based on user's financial data
   */
  static async getGoalSuggestions(
    userId: string,
    monthlyIncome: number,
    monthlyExpenses: number,
    currentSavings: number
  ): Promise<GoalSuggestion[]> {
    try {
      const monthlySurplus = monthlyIncome - monthlyExpenses;
      const suggestions: GoalSuggestion[] = [];

      // Emergency fund suggestion
      if (currentSavings < monthlyExpenses * 3) {
        suggestions.push({
          id: 'emergency_fund',
          title: 'Emergency Fund',
          description: 'Build a safety net for unexpected expenses',
          targetAmount: monthlyExpenses * 6,
          duration: 12,
          monthlyAmount: (monthlyExpenses * 6) / 12,
          category: 'Emergency',
          icon: 'shield-outline',
          color: '#FF5722',
          priority: 'high',
          reason: 'Financial security is essential for peace of mind'
        });
      }

      // Vacation fund
      if (monthlySurplus > 200) {
        suggestions.push({
          id: 'vacation_fund',
          title: 'Dream Vacation',
          description: 'Save for that perfect getaway',
          targetAmount: 2500,
          duration: 10,
          monthlyAmount: 250,
          category: 'Travel',
          icon: 'airplane-outline',
          color: '#2196F3',
          priority: 'medium',
          reason: 'You deserve a break! Start planning your dream trip'
        });
      }

      // Car fund
      if (monthlySurplus > 300) {
        suggestions.push({
          id: 'car_fund',
          title: 'New Car',
          description: 'Save for a reliable vehicle',
          targetAmount: 15000,
          duration: 24,
          monthlyAmount: 625,
          category: 'Transportation',
          icon: 'car-outline',
          color: '#4CAF50',
          priority: 'medium',
          reason: 'A reliable car is a great investment'
        });
      }

      // Home down payment
      if (monthlySurplus > 500) {
        suggestions.push({
          id: 'home_fund',
          title: 'Home Down Payment',
          description: 'Save for your first home',
          targetAmount: 50000,
          duration: 60,
          monthlyAmount: 833,
          category: 'Housing',
          icon: 'home-outline',
          color: '#FF9800',
          priority: 'high',
          reason: 'Homeownership builds long-term wealth'
        });
      }

      // Retirement fund
      suggestions.push({
        id: 'retirement_fund',
        title: 'Retirement Savings',
        description: 'Secure your future with retirement savings',
        targetAmount: 100000,
        duration: 120,
        monthlyAmount: 833,
        category: 'Retirement',
        icon: 'time-outline',
        color: '#9C27B0',
        priority: 'high',
        reason: 'The earlier you start, the more time your money has to grow'
      });

      // Education fund
      suggestions.push({
        id: 'education_fund',
        title: 'Education Fund',
        description: 'Invest in learning and skill development',
        targetAmount: 5000,
        duration: 12,
        monthlyAmount: 417,
        category: 'Education',
        icon: 'school-outline',
        color: '#607D8B',
        priority: 'medium',
        reason: 'Education is the best investment in yourself'
      });

      // Tech upgrade fund
      if (monthlySurplus > 100) {
        suggestions.push({
          id: 'tech_fund',
          title: 'Tech Upgrade',
          description: 'Save for new laptop, phone, or gadgets',
          targetAmount: 1500,
          duration: 6,
          monthlyAmount: 250,
          category: 'Technology',
          icon: 'laptop-outline',
          color: '#795548',
          priority: 'low',
          reason: 'Stay current with technology for work and life'
        });
      }

      // Filter suggestions based on affordability
      return suggestions.filter(s => s.monthlyAmount <= monthlySurplus * 0.8);
    } catch (error) {
      console.error('Error getting goal suggestions:', error);
      return [];
    }
  }

  /**
   * Calculate monthly target amount
   */
  private static calculateMonthlyTarget(targetAmount: number, targetDate: Date): number {
    const now = new Date();
    const monthsUntilTarget = Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    return Math.ceil(targetAmount / monthsUntilTarget);
  }

  /**
   * Get goal progress percentage
   */
  static getGoalProgress(goal: SavingsGoal): number {
    if (goal.completed) return 100;
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  /**
   * Get days remaining for goal
   */
  static getDaysRemaining(goal: SavingsGoal): number {
    const now = new Date();
    const timeDiff = goal.targetDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Check if goal is on track
   */
  static isGoalOnTrack(goal: SavingsGoal): boolean {
    const daysRemaining = this.getDaysRemaining(goal);
    const totalDays = Math.ceil((goal.targetDate.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = totalDays - daysRemaining;
    
    if (daysPassed <= 0) return true;
    
    const expectedProgress = (daysPassed / totalDays) * goal.targetAmount;
    return goal.currentAmount >= expectedProgress * 0.9; // 90% of expected progress
  }

  /**
   * Get motivational message for goal
   */
  static getMotivationalMessage(goal: SavingsGoal): string {
    const progress = this.getGoalProgress(goal);
    const isOnTrack = this.isGoalOnTrack(goal);
    const daysRemaining = this.getDaysRemaining(goal);

    if (goal.completed) {
      return `🎉 Congratulations! You've reached your ${goal.title} goal!`;
    }

    if (progress >= 75) {
      return `🔥 Almost there! You're ${Math.round(100 - progress)}% away from your ${goal.title}!`;
    }

    if (progress >= 50) {
      return `💪 Halfway there! Keep up the great work on your ${goal.title}!`;
    }

    if (progress >= 25) {
      return `🚀 Great start! You're making solid progress on your ${goal.title}!`;
    }

    if (isOnTrack) {
      return `✅ You're on track! ${daysRemaining} days left to reach your ${goal.title}!`;
    }

    return `⏰ ${daysRemaining} days remaining for your ${goal.title}. You can do it!`;
  }
}
