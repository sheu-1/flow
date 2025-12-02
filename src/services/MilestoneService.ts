/**
 * MilestoneService
 * 
 * Handles milestone tracking and celebration animations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './SupabaseClient';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  type: 'savings' | 'transactions' | 'budget' | 'streak' | 'category';
  target: number;
  current: number;
  completed: boolean;
  completedAt?: Date;
  icon: string;
  color: string;
  reward?: string;
}

export interface Achievement {
  id: string;
  milestoneId: string;
  title: string;
  description: string;
  unlockedAt: Date;
  icon: string;
  color: string;
}

export class MilestoneService {
  private static readonly STORAGE_KEY = 'user_milestones';
  private static readonly ACHIEVEMENTS_KEY = 'user_achievements';

  /**
   * Get user's milestones
   */
  static async getUserMilestones(userId: string): Promise<Milestone[]> {
    try {
      // Try Supabase first
      const { data, error } = await supabase
        .from('user_milestones')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map(item => ({
          ...item,
          completedAt: item.completed_at ? new Date(item.completed_at) : undefined
        }));
      }

      // Fallback to local storage and initialize default milestones
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }

      // Initialize default milestones
      const defaultMilestones = this.getDefaultMilestones();
      await this.saveMilestones(userId, defaultMilestones);
      return defaultMilestones;
    } catch (error) {
      console.error('Error getting user milestones:', error);
      return this.getDefaultMilestones();
    }
  }

  /**
   * Update milestone progress
   */
  static async updateMilestoneProgress(
    userId: string, 
    milestoneType: string, 
    value: number
  ): Promise<Milestone[]> {
    try {
      const milestones = await this.getUserMilestones(userId);
      const newlyCompleted: Milestone[] = [];

      for (const milestone of milestones) {
        if (milestone.type === milestoneType && !milestone.completed) {
          milestone.current = Math.min(value, milestone.target);
          
          if (milestone.current >= milestone.target && !milestone.completed) {
            milestone.completed = true;
            milestone.completedAt = new Date();
            newlyCompleted.push(milestone);
            
            // Create achievement
            await this.createAchievement(userId, milestone);
          }
        }
      }

      await this.saveMilestones(userId, milestones);
      return newlyCompleted;
    } catch (error) {
      console.error('Error updating milestone progress:', error);
      return [];
    }
  }

  /**
   * Check for milestone completions after transaction
   */
  static async checkMilestonesAfterTransaction(
    userId: string,
    transactionAmount: number,
    transactionType: 'income' | 'expense',
    category: string,
    totalTransactions: number,
    currentBalance: number
  ): Promise<Milestone[]> {
    const completedMilestones: Milestone[] = [];

    try {
      // Check transaction count milestones
      const transactionMilestones = await this.updateMilestoneProgress(
        userId, 
        'transactions', 
        totalTransactions
      );
      completedMilestones.push(...transactionMilestones);

      // Check savings milestones (for positive balance)
      if (currentBalance > 0) {
        const savingsMilestones = await this.updateMilestoneProgress(
          userId, 
          'savings', 
          currentBalance
        );
        completedMilestones.push(...savingsMilestones);
      }

      // Check category-specific milestones
      const categoryMilestones = await this.updateMilestoneProgress(
        userId, 
        `category_${category.toLowerCase().replace(/\s+/g, '_')}`, 
        transactionAmount
      );
      completedMilestones.push(...categoryMilestones);

      return completedMilestones;
    } catch (error) {
      console.error('Error checking milestones:', error);
      return [];
    }
  }

  /**
   * Create achievement for completed milestone
   */
  private static async createAchievement(userId: string, milestone: Milestone): Promise<void> {
    try {
      const achievement: Achievement = {
        id: `achievement_${Date.now()}`,
        milestoneId: milestone.id,
        title: milestone.title,
        description: milestone.description,
        unlockedAt: new Date(),
        icon: milestone.icon,
        color: milestone.color
      };

      // Save to Supabase
      await supabase.from('user_achievements').insert({
        user_id: userId,
        ...achievement,
        unlocked_at: achievement.unlockedAt.toISOString()
      });

      // Save to local storage
      const achievements = await this.getUserAchievements(userId);
      achievements.push(achievement);
      await AsyncStorage.setItem(
        `${this.ACHIEVEMENTS_KEY}_${userId}`, 
        JSON.stringify(achievements)
      );
    } catch (error) {
      console.error('Error creating achievement:', error);
    }
  }

  /**
   * Get user achievements
   */
  static async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const stored = await AsyncStorage.getItem(`${this.ACHIEVEMENTS_KEY}_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Error getting achievements:', error);
      return [];
    }
  }

  /**
   * Save milestones to storage
   */
  private static async saveMilestones(userId: string, milestones: Milestone[]): Promise<void> {
    try {
      // Save to local storage
      await AsyncStorage.setItem(
        `${this.STORAGE_KEY}_${userId}`, 
        JSON.stringify(milestones)
      );

      // Save to Supabase
      const milestonesToSave = milestones.map(m => ({
        user_id: userId,
        id: m.id,
        title: m.title,
        description: m.description,
        type: m.type,
        target: m.target,
        current: m.current,
        completed: m.completed,
        completed_at: m.completedAt?.toISOString(),
        icon: m.icon,
        color: m.color,
        reward: m.reward
      }));

      // Delete existing and insert new
      await supabase.from('user_milestones').delete().eq('user_id', userId);
      await supabase.from('user_milestones').insert(milestonesToSave);
    } catch (error) {
      console.error('Error saving milestones:', error);
    }
  }

  /**
   * Get default milestones for new users
   */
  private static getDefaultMilestones(): Milestone[] {
    return [
      {
        id: 'first_transaction',
        title: 'Getting Started',
        description: 'Log your first transaction',
        type: 'transactions',
        target: 1,
        current: 0,
        completed: false,
        icon: 'rocket-outline',
        color: '#4285F4',
        reward: 'Welcome to your financial journey!'
      },
      {
        id: 'ten_transactions',
        title: 'Building Habits',
        description: 'Log 10 transactions',
        type: 'transactions',
        target: 10,
        current: 0,
        completed: false,
        icon: 'trending-up-outline',
        color: '#34A853'
      },
      {
        id: 'fifty_transactions',
        title: 'Transaction Master',
        description: 'Log 50 transactions',
        type: 'transactions',
        target: 50,
        current: 0,
        completed: false,
        icon: 'star-outline',
        color: '#FBBC04'
      },
      {
        id: 'first_hundred',
        title: 'First $100',
        description: 'Save your first $100',
        type: 'savings',
        target: 100,
        current: 0,
        completed: false,
        icon: 'cash-outline',
        color: '#34A853'
      },
      {
        id: 'five_hundred_saved',
        title: 'Savings Champion',
        description: 'Save $500',
        type: 'savings',
        target: 500,
        current: 0,
        completed: false,
        icon: 'trophy-outline',
        color: '#FF6B35'
      },
      {
        id: 'first_thousand',
        title: 'Thousand Club',
        description: 'Save $1,000',
        type: 'savings',
        target: 1000,
        current: 0,
        completed: false,
        icon: 'diamond-outline',
        color: '#9C27B0'
      },
      {
        id: 'budget_week',
        title: 'Budget Keeper',
        description: 'Stay under budget for a week',
        type: 'budget',
        target: 7,
        current: 0,
        completed: false,
        icon: 'checkmark-circle-outline',
        color: '#4CAF50'
      },
      {
        id: 'streak_month',
        title: 'Consistency King',
        description: 'Log transactions for 30 days',
        type: 'streak',
        target: 30,
        current: 0,
        completed: false,
        icon: 'flame-outline',
        color: '#FF5722'
      }
    ];
  }

  /**
   * Get milestone progress percentage
   */
  static getMilestoneProgress(milestone: Milestone): number {
    if (milestone.completed) return 100;
    return Math.min((milestone.current / milestone.target) * 100, 100);
  }

  /**
   * Get next milestone to complete
   */
  static async getNextMilestone(userId: string): Promise<Milestone | null> {
    const milestones = await this.getUserMilestones(userId);
    const incomplete = milestones.filter(m => !m.completed);
    
    if (incomplete.length === 0) return null;
    
    // Sort by progress (closest to completion first)
    incomplete.sort((a, b) => {
      const progressA = this.getMilestoneProgress(a);
      const progressB = this.getMilestoneProgress(b);
      return progressB - progressA;
    });
    
    return incomplete[0];
  }

  /**
   * Get celebration message for milestone
   */
  static getCelebrationMessage(milestone: Milestone): string {
    const messages = [
      `🎉 Congratulations! You've ${milestone.title}!`,
      `🌟 Amazing! ${milestone.description} completed!`,
      `🚀 You did it! ${milestone.title} unlocked!`,
      `💪 Fantastic! You've achieved ${milestone.title}!`,
      `🎊 Well done! ${milestone.description} milestone reached!`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
}
