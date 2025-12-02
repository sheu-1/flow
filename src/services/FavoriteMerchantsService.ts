/**
 * FavoriteMerchantsService
 * 
 * Manages favorite merchants for quick transaction creation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './SupabaseClient';

export interface FavoriteMerchant {
  id: string;
  name: string;
  category: string;
  averageAmount: number;
  frequency: number;
  lastUsed: Date;
  icon?: string;
  color?: string;
}

export interface QuickExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  icon: string;
  color: string;
}

export class FavoriteMerchantsService {
  private static readonly STORAGE_KEY = 'favorite_merchants';
  private static readonly QUICK_EXPENSES_KEY = 'quick_expenses';

  /**
   * Get user's favorite merchants
   */
  static async getFavoriteMerchants(userId: string): Promise<FavoriteMerchant[]> {
    try {
      // Try to get from Supabase first
      const { data, error } = await supabase
        .from('favorite_merchants')
        .select('*')
        .eq('user_id', userId)
        .order('frequency', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map(item => ({
          ...item,
          lastUsed: new Date(item.last_used)
        }));
      }

      // Fallback to local storage
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      if (stored) {
        const merchants = JSON.parse(stored);
        return merchants.map((m: any) => ({
          ...m,
          lastUsed: new Date(m.lastUsed)
        }));
      }

      return [];
    } catch (error) {
      console.error('Error getting favorite merchants:', error);
      return [];
    }
  }

  /**
   * Add or update favorite merchant
   */
  static async addFavoriteMerchant(
    userId: string, 
    merchantName: string, 
    category: string, 
    amount: number
  ): Promise<void> {
    try {
      const merchants = await this.getFavoriteMerchants(userId);
      const existingIndex = merchants.findIndex(m => m.name.toLowerCase() === merchantName.toLowerCase());

      if (existingIndex >= 0) {
        // Update existing merchant
        const existing = merchants[existingIndex];
        existing.frequency += 1;
        existing.averageAmount = (existing.averageAmount + amount) / 2;
        existing.lastUsed = new Date();
      } else {
        // Add new merchant
        const newMerchant: FavoriteMerchant = {
          id: Date.now().toString(),
          name: merchantName,
          category,
          averageAmount: amount,
          frequency: 1,
          lastUsed: new Date(),
          icon: this.getCategoryIcon(category),
          color: this.getCategoryColor(category)
        };
        merchants.push(newMerchant);
      }

      // Sort by frequency and keep top 20
      merchants.sort((a, b) => b.frequency - a.frequency);
      const topMerchants = merchants.slice(0, 20);

      // Save to Supabase
      await this.saveMerchantsToSupabase(userId, topMerchants);

      // Save to local storage as backup
      await AsyncStorage.setItem(
        `${this.STORAGE_KEY}_${userId}`, 
        JSON.stringify(topMerchants)
      );
    } catch (error) {
      console.error('Error adding favorite merchant:', error);
    }
  }

  /**
   * Save merchants to Supabase
   */
  private static async saveMerchantsToSupabase(userId: string, merchants: FavoriteMerchant[]): Promise<void> {
    try {
      // Delete existing merchants for user
      await supabase
        .from('favorite_merchants')
        .delete()
        .eq('user_id', userId);

      // Insert updated merchants
      const merchantsToInsert = merchants.map(merchant => ({
        user_id: userId,
        id: merchant.id,
        name: merchant.name,
        category: merchant.category,
        average_amount: merchant.averageAmount,
        frequency: merchant.frequency,
        last_used: merchant.lastUsed.toISOString(),
        icon: merchant.icon,
        color: merchant.color
      }));

      const { error } = await supabase
        .from('favorite_merchants')
        .insert(merchantsToInsert);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving merchants to Supabase:', error);
    }
  }

  /**
   * Get quick expense buttons
   */
  static async getQuickExpenses(userId: string): Promise<QuickExpense[]> {
    try {
      const stored = await AsyncStorage.getItem(`${this.QUICK_EXPENSES_KEY}_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }

      // Return default quick expenses
      return this.getDefaultQuickExpenses();
    } catch (error) {
      console.error('Error getting quick expenses:', error);
      return this.getDefaultQuickExpenses();
    }
  }

  /**
   * Save quick expenses
   */
  static async saveQuickExpenses(userId: string, expenses: QuickExpense[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.QUICK_EXPENSES_KEY}_${userId}`, 
        JSON.stringify(expenses)
      );
    } catch (error) {
      console.error('Error saving quick expenses:', error);
    }
  }

  /**
   * Get default quick expense buttons
   */
  private static getDefaultQuickExpenses(): QuickExpense[] {
    return [
      {
        id: 'coffee',
        name: 'Coffee',
        amount: 5,
        category: 'Food & Dining',
        icon: 'cafe-outline',
        color: '#8B4513'
      },
      {
        id: 'lunch',
        name: 'Lunch',
        amount: 12,
        category: 'Food & Dining',
        icon: 'restaurant-outline',
        color: '#FF6B35'
      },
      {
        id: 'gas',
        name: 'Gas',
        amount: 40,
        category: 'Transportation',
        icon: 'car-outline',
        color: '#4285F4'
      },
      {
        id: 'groceries',
        name: 'Groceries',
        amount: 75,
        category: 'Groceries',
        icon: 'basket-outline',
        color: '#34A853'
      },
      {
        id: 'parking',
        name: 'Parking',
        amount: 8,
        category: 'Transportation',
        icon: 'car-sport-outline',
        color: '#9AA0A6'
      },
      {
        id: 'snack',
        name: 'Snack',
        amount: 3,
        category: 'Food & Dining',
        icon: 'fast-food-outline',
        color: '#FBBC04'
      }
    ];
  }

  /**
   * Get category icon
   */
  private static getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Food & Dining': 'restaurant-outline',
      'Groceries': 'basket-outline',
      'Transportation': 'car-outline',
      'Shopping': 'bag-outline',
      'Entertainment': 'game-controller-outline',
      'Health & Fitness': 'fitness-outline',
      'Bills & Utilities': 'receipt-outline',
      'Gas & Fuel': 'car-outline',
      'Pharmacy': 'medical-outline',
      'Other': 'ellipsis-horizontal-outline'
    };

    return icons[category] || 'ellipsis-horizontal-outline';
  }

  /**
   * Get category color
   */
  private static getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Food & Dining': '#FF6B35',
      'Groceries': '#34A853',
      'Transportation': '#4285F4',
      'Shopping': '#EA4335',
      'Entertainment': '#9C27B0',
      'Health & Fitness': '#FF9800',
      'Bills & Utilities': '#607D8B',
      'Gas & Fuel': '#795548',
      'Pharmacy': '#E91E63',
      'Other': '#9E9E9E'
    };

    return colors[category] || '#9E9E9E';
  }

  /**
   * Get top merchants for suggestions
   */
  static async getTopMerchants(userId: string, limit: number = 5): Promise<FavoriteMerchant[]> {
    const merchants = await this.getFavoriteMerchants(userId);
    return merchants.slice(0, limit);
  }

  /**
   * Search merchants by name
   */
  static async searchMerchants(userId: string, query: string): Promise<FavoriteMerchant[]> {
    const merchants = await this.getFavoriteMerchants(userId);
    const lowerQuery = query.toLowerCase();
    
    return merchants.filter(merchant => 
      merchant.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Remove favorite merchant
   */
  static async removeFavoriteMerchant(userId: string, merchantId: string): Promise<void> {
    try {
      const merchants = await this.getFavoriteMerchants(userId);
      const filteredMerchants = merchants.filter(m => m.id !== merchantId);
      
      await this.saveMerchantsToSupabase(userId, filteredMerchants);
      await AsyncStorage.setItem(
        `${this.STORAGE_KEY}_${userId}`, 
        JSON.stringify(filteredMerchants)
      );
    } catch (error) {
      console.error('Error removing favorite merchant:', error);
    }
  }
}
