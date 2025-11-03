/**
 * useFilteredTransactions Hook
 * 
 * Fetches transactions from Supabase filtered by date range
 * Automatically refetches when date filter changes
 */

import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../types';
import { getTransactions } from '../services/TransactionService';
import { useDateFilterContext } from '../contexts/DateFilterContext';
import { useAuth } from './useAuth';

export function useFilteredTransactions() {
  const { user } = useAuth();
  const { dateRange } = useDateFilterContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Normalize start to start-of-day, end to end-of-day (inclusive)
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);

      // Fetch transactions with date filter from Supabase
      const txns = await getTransactions(user.id, {
        limit: 1000,
        from: start,
        to: end,
      });

      // Map and sort transactions
      const mapped: Transaction[] = txns.map(r => ({
        ...r,
        date: new Date(r.date),
        description: (r as any).description || (r as any).sender || r.category || '',
        category: r.category || 'Other',
        type: (r.type === 'income' || r.type === 'expense') ? r.type : (r.amount >= 0 ? 'income' : 'expense'),
      }));

      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(mapped);
    } catch (err) {
      console.error('Error fetching filtered transactions:', err);
      setError(err as Error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, dateRange]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  };
}
