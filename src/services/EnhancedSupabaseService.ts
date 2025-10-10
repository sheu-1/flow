import { supabase } from './SupabaseClient';
import type { ParsedTransaction } from '../utils/SMSParser';

export type EnhancedSupabaseInsertPayload = {
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id?: string;
  category?: string; // Legacy fallback
  description?: string;
  sender?: string;
  payment_method?: string;
  reference_number?: string;
  tags?: string[];
  metadata: Record<string, any>;
  date: string; // ISO
};

interface CategoryMapping {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

// Cache for user categories to avoid repeated DB calls
const categoryCache = new Map<string, CategoryMapping[]>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastCacheUpdate = 0;

/**
 * Get or create appropriate category for SMS transaction
 */
async function getOrCreateCategory(
  userId: string, 
  parsed: ParsedTransaction
): Promise<string | null> {
  try {
    // Check cache first
    const now = Date.now();
    if (now - lastCacheUpdate > CACHE_DURATION) {
      categoryCache.clear();
    }

    let userCategories = categoryCache.get(userId);
    if (!userCategories) {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', userId);
      
      if (error) throw error;
      userCategories = data || [];
      categoryCache.set(userId, userCategories);
      lastCacheUpdate = now;
    }

    const transactionType = parsed.type === 'credit' ? 'income' : 'expense';
    
    // Smart category mapping based on sender and transaction patterns
    const categoryName = determineCategoryFromSms(parsed, transactionType);
    
    // Find existing category
    let category = userCategories.find(c => 
      c.name.toLowerCase() === categoryName.toLowerCase() && c.type === transactionType
    );

    // Create category if it doesn't exist
    if (!category) {
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          user_id: userId,
          name: categoryName,
          type: transactionType,
          icon: getCategoryIcon(categoryName, transactionType),
          color: getCategoryColor(categoryName, transactionType),
          is_default: false
        }])
        .select('id, name, type')
        .single();

      if (error) {
        console.warn('Failed to create category:', error);
        return null;
      }

      category = data;
      // Update cache
      userCategories.push(category);
      categoryCache.set(userId, userCategories);
    }

    return category.id;
  } catch (error) {
    console.warn('Error getting/creating category:', error);
    return null;
  }
}

/**
 * Intelligent category determination from SMS content
 */
function determineCategoryFromSms(parsed: ParsedTransaction, type: 'income' | 'expense'): string {
  const message = parsed.message?.toLowerCase() || '';
  const sender = parsed.sender?.toLowerCase() || '';

  if (type === 'income') {
    if (sender.includes('salary') || message.includes('salary')) return 'Salary';
    if (sender.includes('mpesa') || message.includes('received')) return 'Mobile Money';
    if (message.includes('refund')) return 'Refund';
    return 'Other Income';
  }

  // Expense categorization
  if (sender.includes('mpesa') || message.includes('mpesa')) {
    if (message.includes('airtime') || message.includes('bundle')) return 'Airtime & Data';
    if (message.includes('paybill') || message.includes('till')) {
      // Further categorize based on merchant
      if (message.includes('supermarket') || message.includes('shop')) return 'Shopping';
      if (message.includes('fuel') || message.includes('petrol')) return 'Transportation';
      return 'Bills & Utilities';
    }
    if (message.includes('withdraw')) return 'Cash Withdrawal';
    return 'Mobile Money';
  }

  if (sender.includes('bank') || message.includes('debit')) {
    if (message.includes('atm')) return 'Cash Withdrawal';
    if (message.includes('transfer')) return 'Transfer';
    return 'Banking';
  }

  // Default categories
  if (message.includes('food') || message.includes('restaurant')) return 'Food & Dining';
  if (message.includes('transport') || message.includes('uber') || message.includes('taxi')) return 'Transportation';
  if (message.includes('shop') || message.includes('store')) return 'Shopping';
  if (message.includes('medical') || message.includes('hospital')) return 'Healthcare';
  
  return 'Other';
}

/**
 * Get appropriate icon for category
 */
function getCategoryIcon(categoryName: string, type: 'income' | 'expense'): string {
  const name = categoryName.toLowerCase();
  
  if (type === 'income') {
    if (name.includes('salary')) return 'card';
    if (name.includes('mobile') || name.includes('mpesa')) return 'phone-portrait';
    return 'trending-up';
  }

  // Expense icons
  if (name.includes('food') || name.includes('dining')) return 'restaurant';
  if (name.includes('transport')) return 'car';
  if (name.includes('shop')) return 'bag';
  if (name.includes('airtime') || name.includes('data')) return 'phone-portrait';
  if (name.includes('cash') || name.includes('withdraw')) return 'cash';
  if (name.includes('bill') || name.includes('utilities')) return 'receipt';
  if (name.includes('medical') || name.includes('health')) return 'medical';
  if (name.includes('mobile') || name.includes('mpesa')) return 'phone-portrait';
  
  return 'ellipse';
}

/**
 * Get appropriate color for category
 */
function getCategoryColor(categoryName: string, type: 'income' | 'expense'): string {
  const name = categoryName.toLowerCase();
  
  if (type === 'income') {
    return '#2ECC71'; // Green for income
  }

  // Expense colors
  if (name.includes('food')) return '#FF6B6B';
  if (name.includes('transport')) return '#4ECDC4';
  if (name.includes('shop')) return '#45B7D1';
  if (name.includes('airtime')) return '#9B59B6';
  if (name.includes('cash')) return '#E67E22';
  if (name.includes('bill')) return '#FFEAA7';
  if (name.includes('medical')) return '#DDA0DD';
  if (name.includes('mobile')) return '#3498DB';
  
  return '#95A5A6'; // Default gray
}

/**
 * Detect payment method from SMS content
 */
function detectPaymentMethod(parsed: ParsedTransaction): string {
  const message = parsed.message?.toLowerCase() || '';
  const sender = parsed.sender?.toLowerCase() || '';

  if (sender.includes('mpesa') || message.includes('mpesa')) return 'mobile_money';
  if (sender.includes('bank') || message.includes('bank')) return 'bank_transfer';
  if (message.includes('card') || message.includes('visa') || message.includes('mastercard')) return 'card';
  if (message.includes('cash') || message.includes('withdraw')) return 'cash';
  
  return 'mobile_money'; // Default for Kenya
}

/**
 * Enhanced duplicate detection with reference number support
 */
async function detectDuplicate(userId: string, parsed: ParsedTransaction) {
  const dateISO = parsed.dateISO || new Date().toISOString();
  const date = new Date(dateISO);
  const minus5 = new Date(date.getTime() - 5 * 60 * 1000).toISOString();
  const plus5 = new Date(date.getTime() + 5 * 60 * 1000).toISOString();

  // Check by reference number first (most reliable)
  if (parsed.reference) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('reference_number', parsed.reference)
      .limit(1);
    if (!error && data && data.length > 0) return data[0];
  }

  // Fallback: check by amount and time window
  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount, date')
    .eq('user_id', userId)
    .eq('amount', parsed.amount)
    .gte('date', minus5)
    .lte('date', plus5)
    .limit(1);
  if (!error && data && data.length > 0) return data[0];
  
  return null;
}

/**
 * Enhanced transaction insertion with smart categorization
 */
export async function insertTransactionEnhanced(
  parsed: ParsedTransaction,
  userId: string
): Promise<{ success: boolean; error?: any; skipped?: boolean; categoryCreated?: boolean }> {
  try {
    const duplicate = await detectDuplicate(userId, parsed);
    if (duplicate) {
      return { success: true, skipped: true };
    }

    const categoryId = await getOrCreateCategory(userId, parsed);
    const paymentMethod = detectPaymentMethod(parsed);
    
    const payload: EnhancedSupabaseInsertPayload = {
      user_id: userId,
      type: parsed.type === 'credit' ? 'income' : 'expense',
      amount: parsed.amount,
      category_id: categoryId || undefined,
      category: categoryId ? undefined : 'SMS Import', // Legacy fallback
      description: generateDescription(parsed),
      sender: parsed.sender || undefined,
      payment_method: paymentMethod,
      reference_number: parsed.reference || undefined,
      tags: generateTags(parsed),
      metadata: {
        reference: parsed.reference,
        message: parsed.message,
        source: 'sms',
        parsed_at: new Date().toISOString(),
        original_sender: parsed.sender,
        auto_categorized: !!categoryId
      },
      date: parsed.dateISO || new Date().toISOString(),
    };

    const { error } = await supabase.from('transactions').insert([payload]);
    if (error) throw error;
    
    return { 
      success: true, 
      categoryCreated: !!categoryId 
    };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Generate human-readable description from SMS
 */
function generateDescription(parsed: ParsedTransaction): string {
  const { sender, message, amount, type } = parsed;
  
  if (type === 'credit') {
    return `Received ${amount} from ${sender || 'Unknown'}`;
  } else {
    // Try to extract merchant/purpose from message
    const msg = message?.toLowerCase() || '';
    if (msg.includes('paybill')) {
      const match = msg.match(/paybill\s+(\w+)/);
      if (match) return `Payment to ${match[1]}`;
    }
    if (msg.includes('till')) {
      const match = msg.match(/till\s+(\w+)/);
      if (match) return `Payment at Till ${match[1]}`;
    }
    if (msg.includes('airtime')) return 'Airtime purchase';
    if (msg.includes('withdraw')) return 'Cash withdrawal';
    
    return `Payment via ${sender || 'SMS'}`;
  }
}

/**
 * Generate relevant tags from SMS content
 */
function generateTags(parsed: ParsedTransaction): string[] {
  const tags: string[] = ['sms-import'];
  const message = parsed.message?.toLowerCase() || '';
  
  if (message.includes('mpesa')) tags.push('mpesa');
  if (message.includes('paybill')) tags.push('paybill');
  if (message.includes('till')) tags.push('till-number');
  if (message.includes('airtime')) tags.push('airtime');
  if (message.includes('withdraw')) tags.push('withdrawal');
  if (parsed.reference) tags.push('has-reference');
  
  return tags;
}

/**
 * Clear user transactions (for testing/reset)
 */
export async function clearUserTransactions(userId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from('transactions').delete().eq('user_id', userId);
    if (error) throw error;
    
    // Clear category cache for user
    categoryCache.delete(userId);
    
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// Backward compatibility - update the existing service
export const insertTransactionSupabase = insertTransactionEnhanced;
