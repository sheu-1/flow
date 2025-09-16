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
    .range(offset, offset + limit - 1);

  if (from) query = query.gte('date', toISO(from)!);
  if (to) query = query.lte('date', toISO(to)!);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r) => ({
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
  if (period === 'daily') d.setDate(d.getDate() + 1 * count);
  if (period === 'weekly') d.setDate(d.getDate() + 7 * count);
  if (period === 'monthly') d.setMonth(d.getMonth() + count);
  if (period === 'yearly') d.setFullYear(d.getFullYear() + count);
  return d;
}

function formatLabel(date: Date, period: AggregatePeriod) {
  if (period === 'daily') {
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  }
  if (period === 'weekly') {
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
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
  if (period === 'daily') start = addPeriod(startOfDay(now), 'daily', -rangeCount + 1);
  else if (period === 'weekly') start = addPeriod(startOfWeek(now), 'weekly', -rangeCount + 1);
  else if (period === 'monthly') start = addPeriod(startOfMonth(now), 'monthly', -rangeCount + 1);
  else start = addPeriod(startOfYear(now), 'yearly', -rangeCount + 1);

  const txns = await getTransactions(userId, { from: start, to: now, limit: 10000, offset: 0 });

  const buckets: AggregatePoint[] = [];
  let cursor = new Date(start);
  for (let i = 0; i < rangeCount; i++) {
    const bucketStart = new Date(cursor);
    const bucketEnd = addPeriod(bucketStart, period, 1);
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