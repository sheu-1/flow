/**
 * DateFilterContext
 * 
 * Shared context for date filtering across Dashboard and Reports screens
 * Ensures both screens stay in sync when date filters are applied
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { DateRange, getPresetDateRanges } from '../utils/dateFilter';
import { Transaction } from '../types';
import { getTransactions, invalidateUserCaches } from '../services/TransactionService';
import { useAuth } from '../hooks/useAuth';
import { useRealtimeTransactions } from '../hooks/useRealtimeTransactions';

export type PresetRange = 
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'last7Days'
  | 'last30Days'
  | 'last90Days'
  | 'thisYear'
  | 'lastYear'
  | 'allTime'
  | 'custom';

interface DateFilterContextValue {
  dateRange: DateRange;
  selectedPreset: PresetRange;
  setDateRange: (range: DateRange) => void;
  setPreset: (preset: PresetRange) => void;
  setCustomRange: (startDate: Date, endDate: Date) => void;
  resetFilter: () => void;
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const DateFilterContext = createContext<DateFilterContextValue | undefined>(undefined);

export const DateFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const presets = getPresetDateRanges();
  const { user } = useAuth();
  
  const [dateRange, setDateRange] = useState<DateRange>(presets.allTime);
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>('allTime');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setPreset = useCallback((preset: PresetRange) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const presetRange = presets[preset as keyof typeof presets];
      if (presetRange) {
        setDateRange(presetRange);
      }
    }
  }, [presets]);

  const setCustomRange = useCallback((startDate: Date, endDate: Date) => {
    const customRange: DateRange = { startDate, endDate };
    setDateRange(customRange);
    setSelectedPreset('custom');
  }, []);

  const resetFilter = useCallback(() => {
    setPreset('allTime');
  }, [setPreset]);

  const refetch = useCallback(async () => {
    if (!user?.id) {
      setTransactions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);

      const txns = await getTransactions(user.id, { from: start, to: end, limit: 10000, offset: 0 });
      const mapped: Transaction[] = txns.map(r => ({
        ...r,
        date: new Date(r.date),
      }));
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(mapped);
    } catch (e: any) {
      setError(e as Error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, dateRange]);

  // Fetch when user or date range changes
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime subscription: single place to invalidate and refetch
  useRealtimeTransactions(user?.id, async () => {
    if (!user?.id) return;
    await invalidateUserCaches(user.id);
    refetch();
  });

  const value: DateFilterContextValue = {
    dateRange,
    selectedPreset,
    setDateRange,
    setPreset,
    setCustomRange,
    resetFilter,
    transactions,
    loading,
    error,
    refetch,
  };

  return (
    <DateFilterContext.Provider value={value}>
      {children}
    </DateFilterContext.Provider>
  );
};

export const useDateFilterContext = () => {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error('useDateFilterContext must be used within DateFilterProvider');
  }
  return context;
};
