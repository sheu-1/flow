/**
 * Date Range Filtering Utility
 * 
 * Provides reusable date filtering functionality for transactions
 * across Dashboard and Reports screens.
 */

import { Transaction } from '../types';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Filter transactions by date range
 * @param transactions Array of transactions to filter
 * @param dateRange Date range to filter by
 * @returns Filtered transactions within the date range
 */
export function filterTransactionsByDateRange(
  transactions: Transaction[],
  dateRange: DateRange
): Transaction[] {
  const { startDate, endDate } = dateRange;
  
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    // Reset time to start of day for accurate comparison
    const txDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    return txDate >= start && txDate <= end;
  });
}

/**
 * Get preset date ranges for common filters
 */
export const getPresetDateRanges = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return {
    today: {
      startDate: today,
      endDate: today,
    },
    yesterday: {
      startDate: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() - 24 * 60 * 60 * 1000),
    },
    thisWeek: {
      startDate: new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    lastWeek: {
      startDate: new Date(today.getTime() - (today.getDay() + 7) * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() - (today.getDay() + 1) * 24 * 60 * 60 * 1000),
    },
    thisMonth: {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: today,
    },
    lastMonth: {
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDate: new Date(now.getFullYear(), now.getMonth(), 0),
    },
    last7Days: {
      startDate: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    last30Days: {
      startDate: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    last90Days: {
      startDate: new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    thisYear: {
      startDate: new Date(now.getFullYear(), 0, 1),
      endDate: today,
    },
    lastYear: {
      startDate: new Date(now.getFullYear() - 1, 0, 1),
      endDate: new Date(now.getFullYear() - 1, 11, 31),
    },
    allTime: {
      startDate: new Date(2000, 0, 1), // Far past date
      endDate: today,
    },
  };
};

/**
 * Format date range for display
 * @param dateRange Date range to format
 * @returns Formatted string representation
 */
export function formatDateRange(dateRange: DateRange): string {
  const { startDate, endDate } = dateRange;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  if (startDate.getTime() === endDate.getTime()) {
    return formatDate(startDate);
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Check if a date range is valid
 * @param dateRange Date range to validate
 * @returns true if valid, false otherwise
 */
export function isValidDateRange(dateRange: DateRange): boolean {
  const { startDate, endDate } = dateRange;
  
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    return false;
  }
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }
  
  return startDate <= endDate;
}

/**
 * Parse date string to Date object
 * Supports formats: YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY
 * @param dateString Date string to parse
 * @returns Date object or null if invalid
 */
export function parseDateString(dateString: string): Date | null {
  if (!dateString) return null;
  
  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try MM/DD/YYYY
  const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try DD-MM-YYYY
  const euMatch = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  return null;
}
