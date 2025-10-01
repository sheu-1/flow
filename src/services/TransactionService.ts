import { supabase } from './SupabaseClient';
import { AggregatePeriod, AggregatePoint, Transaction } from '../types';

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
  if (error) throw error;
  
  // Filter out any null/undefined entries and map to Transaction type
  return (data || [])
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
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // week starts on Monday
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
  
  return buckets;
}

export async function getCategoryBreakdown(
  userId: string,
  from?: Date | string,
  to?: Date | string
): Promise<Record<string, number>> {
  const txns = await getTransactions(userId, { from, to, limit: 10000, offset: 0 });
  const out = txns.filter((t) => t.type === 'expense');
  return out.reduce((acc, t) => {
    const key = t.category || 'Other';
    acc[key] = (acc[key] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);
}

export async function getIncomeCategoryBreakdown(
  userId: string,
  from?: Date | string,
  to?: Date | string
): Promise<Record<string, number>> {
  const txns = await getTransactions(userId, { from, to, limit: 10000, offset: 0 });
  const income = txns.filter((t) => t.type === 'income');
  return income.reduce((acc, t) => {
    const key = t.category || 'Other';
    acc[key] = (acc[key] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);
}

export async function getCategoriesBreakdown(
  userId: string,
  from?: Date | string,
  to?: Date | string
): Promise<{ income: Record<string, number>; expense: Record<string, number> }> {
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
  
  return { income, expense };
}