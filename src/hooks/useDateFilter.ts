/**
 * useDateFilter Hook
 * 
 * Reusable React hook for managing date range filtering state
 * across Dashboard and Reports screens.
 */

import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import {
  DateRange,
  filterTransactionsByDateRange,
  getPresetDateRanges,
  formatDateRange,
  isValidDateRange,
} from '../utils/dateFilter';

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

export interface UseDateFilterReturn {
  dateRange: DateRange;
  filteredTransactions: Transaction[];
  selectedPreset: PresetRange;
  setDateRange: (range: DateRange) => void;
  setPreset: (preset: PresetRange) => void;
  setCustomRange: (startDate: Date, endDate: Date) => void;
  resetFilter: () => void;
  formattedRange: string;
  isFiltered: boolean;
}

/**
 * Hook for managing date range filtering
 * @param transactions Array of transactions to filter
 * @returns Date filter state and methods
 */
export function useDateFilter(transactions: Transaction[]): UseDateFilterReturn {
  const presets = getPresetDateRanges();
  
  // Initialize with "allTime" preset
  const [dateRange, setDateRange] = useState<DateRange>(presets.allTime);
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>('allTime');

  // Filter transactions based on current date range
  const filteredTransactions = useMemo(() => {
    if (!isValidDateRange(dateRange)) {
      return transactions;
    }
    return filterTransactionsByDateRange(transactions, dateRange);
  }, [transactions, dateRange]);

  // Format current date range for display
  const formattedRange = useMemo(() => {
    return formatDateRange(dateRange);
  }, [dateRange]);

  // Check if filter is active (not showing all time)
  const isFiltered = useMemo(() => {
    return selectedPreset !== 'allTime';
  }, [selectedPreset]);

  /**
   * Set a preset date range
   */
  const setPreset = (preset: PresetRange) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const presetRange = presets[preset as keyof typeof presets];
      if (presetRange) {
        setDateRange(presetRange);
      }
    }
  };

  /**
   * Set a custom date range
   */
  const setCustomRange = (startDate: Date, endDate: Date) => {
    const customRange: DateRange = { startDate, endDate };
    if (isValidDateRange(customRange)) {
      setDateRange(customRange);
      setSelectedPreset('custom');
    }
  };

  /**
   * Reset filter to show all transactions
   */
  const resetFilter = () => {
    setPreset('allTime');
  };

  return {
    dateRange,
    filteredTransactions,
    selectedPreset,
    setDateRange,
    setPreset,
    setCustomRange,
    resetFilter,
    formattedRange,
    isFiltered,
  };
}
