import { supabase } from './SupabaseClient';
import { AggregatePeriod, AggregatePoint, Transaction } from '../types';
import { cacheService } from './CacheService';
import { Logger } from '../utils/Logger';

export interface CreateTransactionParams {
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  description?: string;
  sender?: string;
  date?: string; // ISO string
}

// Exported wrapper so other modules (e.g., realtime hooks) can invalidate
// cached aggregates and lists when external changes occur (another device).
export async function invalidateUserCaches(userId: string): Promise<void> {
  try {
    await clearUserCaches(userId);
  } catch (e) {
    console.warn('invalidateUserCaches failed:', e);
  }
}

export interface GetTransactionsParams {
  limit?: number;
  offset?: number;
  from?: Date | string;
  to?: Date | string;
}

function toISO(d?: Date | string) {
  if (!d) return undefined;
  if (typeof d === 'string') return new Date(d).toISOString();
  return d.toISOString();
}

export async function getTransactions(userId: string, params: GetTransactionsParams = {}): Promise<Transaction[]> {
  const { limit = 50, offset = 0, from, to } = params;
  
  Logger.info('TransactionService', `Getting transactions for user ${userId}`, { limit, offset, from, to });
  
  // Create cache key based on parameters
  const cacheKey = `transactions_${userId}_${limit}_${offset}_${from?.toString()}_${to?.toString()}`;
  
  // Try cache first for non-real-time queries
  if (limit <= 100 && offset === 0) {
    const cached = await cacheService.get<Transaction[]>(cacheKey);
    if (cached) {
      Logger.info('TransactionService', `Returning ${cached.length} cached transactions`);
      return cached;
    }
  }

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1);

  if (from) query = query.gte('date', toISO(from)!);
  if (to) query = query.lte('date', toISO(to)!);

  const { data, error } = await query;
  if (error) {
    Logger.database('TransactionService', 'SELECT', 'transactions', false, error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
  
  Logger.database('TransactionService', 'SELECT', 'transactions', true);
  Logger.success('TransactionService', `Retrieved ${data?.length || 0} transactions`);
  
  // Filter out any null/undefined entries and map to Transaction type
  const transactions = (data || [])
    .filter((r) => r && r.id) // Ensure valid records
    .map((r) => ({
      id: r.id,
      user_id: r.user_id,
      type: r.type as 'income' | 'expense',
      amount: Number(r.amount),
      category: r.category,
      sender: r.sender,
      metadata: r.metadata,
      date: r.date,
      created_at: r.created_at,
    }));
  
  // Cache the result for 2 minutes
  if (limit <= 100 && offset === 0) {
    await cacheService.set(cacheKey, transactions, 2 * 60 * 1000);
  }
  
  return transactions;
}

/**
 * Create a new transaction
 */
export async function createTransaction(
  userId: string, 
  params: CreateTransactionParams
): Promise<{ success: boolean; transaction?: Transaction; error?: any }> {
  try {
    const payload = {
      user_id: userId,
      type: params.type,
      amount: params.amount,
      category: params.category || null,
      description: params.description || null,
      sender: params.sender || null,
      date: params.date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // Clear relevant caches
    await clearUserCaches(userId);

    const transaction: Transaction = {
      id: data.id,
      user_id: data.user_id,
      type: data.type,
      amount: Number(data.amount),
      category: data.category,
      sender: data.sender,
      metadata: data.metadata,
      date: data.date,
      created_at: data.created_at,
    };

    return { success: true, transaction };
  } catch (error) {
    console.error('Failed to create transaction:', error);
    return { success: false, error };
  }
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  updates: Partial<CreateTransactionParams>
): Promise<{ success: boolean; transaction?: Transaction; error?: any }> {
  try {
    const payload: any = {};
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.sender !== undefined) payload.sender = updates.sender;
    if (updates.date !== undefined) payload.date = updates.date;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', transactionId)
      .eq('user_id', userId) // Ensure user can only update their own transactions
      .select()
      .single();

    if (error) throw error;

    // Clear relevant caches
    await clearUserCaches(userId);

    const transaction: Transaction = {
      id: data.id,
      user_id: data.user_id,
      type: data.type,
      amount: Number(data.amount),
      category: data.category,
      sender: data.sender,
      metadata: data.metadata,
      date: data.date,
      created_at: data.created_at,
    };

    return { success: true, transaction };
  } catch (error) {
    console.error('Failed to update transaction:', error);
    return { success: false, error };
  }
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(
  userId: string,
  transactionId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId); // Ensure user can only delete their own transactions

    if (error) throw error;

    // Clear relevant caches
    await clearUserCaches(userId);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return { success: false, error };
  }
}

/**
 * Clear all cached data for a user (call after mutations)
 */
async function clearUserCaches(userId: string): Promise<void> {
  try {
    // Clear transaction caches
    const patterns = [
      `transactions_${userId}_*`,
      `aggregates_${userId}_*`,
      `category_breakdown_${userId}_*`,
      `income_breakdown_${userId}_*`,
      `categories_breakdown_${userId}_*`
    ];
    
    for (const pattern of patterns) {
      await cacheService.invalidatePattern(pattern);
    }
  } catch (error) {
    console.warn('Failed to clear caches:', error);
  }
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day; // week starts on Sunday
  return new Date(date.getFullYear(), date.getMonth(), diff, 0, 0, 0, 0);
}

function startOfDay(d: Date) {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

function addPeriod(date: Date, period: AggregatePeriod, count = 1) {
  const d = new Date(date);
  if (period === 'daily') d.setHours(d.getHours() + 1 * count); // For hourly aggregation
  if (period === 'weekly') d.setDate(d.getDate() + 1 * count); // For daily aggregation within week
  if (period === 'monthly') d.setMonth(d.getMonth() + count);
  if (period === 'yearly') d.setFullYear(d.getFullYear() + count);
  return d;
}

function formatLabel(date: Date, period: AggregatePeriod) {
  if (period === 'daily') {
    // For daily: return hour (0, 1, 2, ... 23)
    return `${date.getHours()}`;
  }
  if (period === 'weekly') {
    // For weekly: return day name (Mon, Tue, Wed, etc.)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[date.getDay()];
  }
  if (period === 'monthly') {
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }
  return `${date.getFullYear()}`;
}

export async function getAggregatesByPeriod(
  userId: string,
  period: AggregatePeriod,
  rangeCount: number
): Promise<AggregatePoint[]> {
  // Cache aggregates for better performance
  const cacheKey = `aggregates_${userId}_${period}_${rangeCount}`;
  const cached = await cacheService.get<AggregatePoint[]>(cacheKey);
  if (cached) {
    return cached;
  }
  const now = new Date();
  let start: Date;
  let end: Date;
  
  if (period === 'daily') {
    // Today: 24 hours from midnight to midnight
    start = startOfDay(now);
    end = addPeriod(start, 'weekly', 1); // Add 1 day (using weekly logic for day increment)
  } else if (period === 'weekly') {
    // Last 28 days (4 weeks): stretching back from today
    end = addPeriod(startOfDay(now), 'weekly', 1); // End of today
    start = addPeriod(end, 'weekly', -rangeCount); // rangeCount days back
  } else if (period === 'monthly') {
    // This year: show months of current year
    start = startOfYear(now);
    end = addPeriod(start, 'yearly', 1);
  } else {
    // Last 5 years
    start = addPeriod(startOfYear(now), 'yearly', -rangeCount + 1);
    end = addPeriod(startOfYear(now), 'yearly', 1);
  }

  const txns = await getTransactions(userId, { from: start, to: end, limit: 10000, offset: 0 });

  const buckets: AggregatePoint[] = [];
  
  if (period === 'daily') {
    // For daily: create 24 hourly buckets
    for (let hour = 0; hour < 24; hour++) {
      const bucketStart = new Date(start);
      bucketStart.setHours(hour, 0, 0, 0);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setHours(hour + 1, 0, 0, 0);
      
      const inBucket = txns.filter((t) => {
        const dt = new Date(t.date);
        return dt >= bucketStart && dt < bucketEnd;
      });
      const income = inBucket.filter((t) => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const expense = inBucket.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
      buckets.push({
        periodLabel: `${hour}`,
        start: bucketStart,
        end: bucketEnd,
        income,
        expense,
      });
    }
  } else if (period === 'weekly') {
    // For weekly: create daily buckets for the specified range
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    for (let day = 0; day < daysDiff; day++) {
      const bucketStart = new Date(start);
      bucketStart.setDate(start.getDate() + day);
      bucketStart.setHours(0, 0, 0, 0);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + 1);
      
      const inBucket = txns.filter((t) => {
        const dt = new Date(t.date);
        return dt >= bucketStart && dt < bucketEnd;
      });
      const income = inBucket.filter((t) => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const expense = inBucket.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Use standard day label formatting
      const label = formatLabel(bucketStart, period);
      
      buckets.push({
        periodLabel: label,
        start: bucketStart,
        end: bucketEnd,
        income,
        expense,
      });
    }
  } else {
    // For monthly and yearly: use the original logic
    let cursor = new Date(start);
    let actualRangeCount = rangeCount;
    if (period === 'monthly') actualRangeCount = 12; // Always 12 months for this year
    
    for (let i = 0; i < actualRangeCount; i++) {
      const bucketStart = new Date(cursor);
      const bucketEnd = addPeriod(bucketStart, period, 1);
      
      // Stop if we've gone past the end date
      if (bucketStart >= end) break;
      
      const inBucket = txns.filter((t) => {
        const dt = new Date(t.date);
        return dt >= bucketStart && dt < bucketEnd;
      });
      const income = inBucket.filter((t) => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const expense = inBucket.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
      buckets.push({
        periodLabel: formatLabel(bucketStart, period),
        start: bucketStart,
        end: bucketEnd,
        income,
        expense,
      });
      cursor = bucketEnd;
    }
  }
  
  // Cache the result for 5 minutes
  await cacheService.set(cacheKey, buckets, 5 * 60 * 1000);
  
  return buckets;
}

export async function getCategoryBreakdown(
  userId: string,
  from?: Date | string,
  to?: Date | string
): Promise<Record<string, number>> {
  const cacheKey = `category_breakdown_${userId}_${from?.toString()}_${to?.toString()}`;
  const cached = await cacheService.get<Record<string, number>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const txns = await getTransactions(userId, { from, to, limit: 10000, offset: 0 });
  const out = txns.filter((t) => t.type === 'expense');
  const breakdown = out.reduce((acc, t) => {
    const key = t.category || 'Other';
    acc[key] = (acc[key] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);
  
  // Cache for 3 minutes
  await cacheService.set(cacheKey, breakdown, 3 * 60 * 1000);
  return breakdown;
}

export async function getIncomeCategoryBreakdown(
  userId: string,
  from?: Date | string,
  to?: Date | string
): Promise<Record<string, number>> {
  const cacheKey = `income_breakdown_${userId}_${from?.toString()}_${to?.toString()}`;
  const cached = await cacheService.get<Record<string, number>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const txns = await getTransactions(userId, { from, to, limit: 10000, offset: 0 });
  const income = txns.filter((t) => t.type === 'income');
  const breakdown = income.reduce((acc, t) => {
    const key = t.category || 'Other';
    acc[key] = (acc[key] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);
  
  // Cache for 3 minutes
  await cacheService.set(cacheKey, breakdown, 3 * 60 * 1000);
  return breakdown;
}

export async function getCategoriesBreakdown(
  userId: string,
  from?: Date | string,
  to?: Date | string
): Promise<{ income: Record<string, number>; expense: Record<string, number> }> {
  const cacheKey = `categories_breakdown_${userId}_${from?.toString()}_${to?.toString()}`;
  const cached = await cacheService.get<{ income: Record<string, number>; expense: Record<string, number> }>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const txns = await getTransactions(userId, { from, to, limit: 10000, offset: 0 });
  
  const income = txns.filter((t) => t.type === 'income').reduce((acc, t) => {
    const key = t.category || 'Other';
    acc[key] = (acc[key] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);
  
  const expense = txns.filter((t) => t.type === 'expense').reduce((acc, t) => {
    const key = t.category || 'Other';
    acc[key] = (acc[key] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);
  
  const result = { income, expense };
  
  // Cache for 3 minutes
  await cacheService.set(cacheKey, result, 3 * 60 * 1000);
  return result;
}