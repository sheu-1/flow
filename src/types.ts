export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  user_id?: string;
  type: TransactionType;
  amount: number;
  category?: string;
  sender?: string;
  metadata?: Record<string, any> | null;
  date: Date | string;
  created_at?: Date | string;
  description?: string;
}

export type AggregatePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface AggregatePoint {
  periodLabel: string;
  start: Date;
  end: Date;
  income: number;
  expense: number;
}

export interface User {
  id: string;
  email?: string | null;
  full_name?: string | null;
}