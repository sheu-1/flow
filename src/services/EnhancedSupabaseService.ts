import { supabase } from './SupabaseClient';
import type { ParsedTransaction } from '../utils/SMSParser';
import { getCategoryIcon, getCategoryColor } from './CategoryService';

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

// Category icon and color functions moved to CategoryService.ts

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
  // Check by reference number first (most reliable)
  if (parsed.reference) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount')
      .eq('user_id', userId)
      .or(
        `reference_number.eq.${parsed.reference},` +
        `metadata->>reference.eq.${parsed.reference}`
      );

    if (!error && data && data.length > 0) {
      // If reference matches, check if amount is also the same.
      // Fuliza fees often share the same Reference ID as the main transaction but have different amounts.
      // If amounts differ, we treat it as a separate (related) transaction.
      const exactMatch = data.find(t => Math.abs(t.amount - parsed.amount) < 0.01);
      if (exactMatch) {
        return exactMatch;
      }
      // If reference exists but amount is different, fall through to allow insertion (it's likely a fee).
    }
  }

  // Fallback: check by amount and time window, and try to match on original message
  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount, date, metadata, sender, description')
    .eq('user_id', userId)
    .eq('amount', parsed.amount)
    .gte('date', minus5)
    .lte('date', plus5)
    .limit(20);

  if (!error && data && data.length > 0) {
    const normalizedMsg = (parsed.message || '').trim().toLowerCase();
    const normalizedSender = (parsed.sender || '').trim().toLowerCase();
    const normalizedDescription = generateDescription(parsed).trim().toLowerCase();
    if (normalizedMsg) {
      const withSameMessage = data.find((row: any) => {
        const existingMsg = (row.metadata?.message || '').trim().toLowerCase();
        return existingMsg === normalizedMsg;
      });
      if (withSameMessage) return withSameMessage;
    }

    // Additional guard: match on sender or generated description within the same time/amount window
    const withSameSenderOrDescription = data.find((row: any) => {
      const rowSender = (row.sender || row.metadata?.original_sender || '').trim().toLowerCase();
      const rowDescription = (row.description || '').trim().toLowerCase();
      if (normalizedSender && rowSender && rowSender === normalizedSender) return true;
      if (normalizedDescription && rowDescription && rowDescription === normalizedDescription) return true;
      return false;
    });

    if (withSameSenderOrDescription) return withSameSenderOrDescription;
  }

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
