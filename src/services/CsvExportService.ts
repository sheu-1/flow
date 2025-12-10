/**
 * CSV Export Service
 * 
 * Exports transactions to CSV format with custom date filtering
 */

import * as Sharing from 'expo-sharing';
// Use legacy filesystem API to keep writeAsStringAsync working on SDK 54+
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Transaction } from '../types';
import { format } from 'date-fns';

export interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  type?: 'income' | 'expense' | 'all';
  category?: string;
}

/**
 * Convert transactions to CSV format
 */
function transactionsToCSV(transactions: Transaction[]): string {
  // Minimal CSV Header
  const header = 'Date,Category,Description,Amount\n';

  // CSV Rows (Date, Category, Description, Amount)
  const rows = transactions.map(transaction => {
    const date = format(new Date(transaction.date), 'yyyy-MM-dd HH:mm:ss');
    const category = `"${(transaction.category || 'Other').replace(/"/g, '""')}"`;
    const description = `"${(transaction.description || '').replace(/"/g, '""')}"`;
    const amount = transaction.amount.toFixed(2);

    return `${date},${category},${description},${amount}`;
  }).join('\n');

  return header + rows;
}

/**
 * Filter transactions based on export options
 */
function filterTransactions(transactions: Transaction[], options: ExportOptions): Transaction[] {
  let filtered = [...transactions];
  
  // Filter by date range
  if (options.startDate) {
    filtered = filtered.filter(t => new Date(t.date) >= options.startDate!);
  }
  if (options.endDate) {
    filtered = filtered.filter(t => new Date(t.date) <= options.endDate!);
  }
  
  // Filter by type
  if (options.type && options.type !== 'all') {
    filtered = filtered.filter(t => t.type === options.type);
  }
  
  // Filter by category
  if (options.category) {
    filtered = filtered.filter(t => t.category === options.category);
  }
  
  return filtered;
}

/**
 * Export transactions to CSV file
 */
export async function exportTransactionsToCSV(
  transactions: Transaction[],
  options: ExportOptions = {}
): Promise<void> {
  try {
    // Filter transactions
    const filtered = filterTransactions(transactions, options);
    
    if (filtered.length === 0) {
      throw new Error('No transactions to export');
    }
    
    // Convert to CSV and prepend UTF-8 BOM so Excel opens it correctly
    const csvContent = '\uFEFF' + transactionsToCSV(filtered);
    
    // Create a blob and share it
    // For web, create a download link
    // For mobile, use sharing
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `transactions_${timestamp}.csv`;

    // Check if we're on web
    if (typeof window !== 'undefined' && window.document) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      // Web: Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Mobile: Use expo-sharing with expo-file-system
      const fsAny = FileSystem as any;
      const baseDir: string = fsAny.documentDirectory || '';
      const fileUri = `${baseDir}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: fsAny.EncodingType?.UTF8 ?? 'utf8',
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Transactions',
      });
    }
    
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
}

/**
 * Get export summary
 */
export function getExportSummary(transactions: Transaction[], options: ExportOptions): {
  count: number;
  totalIncome: number;
  totalExpense: number;
  dateRange: string;
} {
  const filtered = filterTransactions(transactions, options);
  
  const totalIncome = filtered
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = filtered
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  let dateRange = 'All time';
  if (options.startDate && options.endDate) {
    dateRange = `${format(options.startDate, 'MMM d, yyyy')} - ${format(options.endDate, 'MMM d, yyyy')}`;
  } else if (options.startDate) {
    dateRange = `From ${format(options.startDate, 'MMM d, yyyy')}`;
  } else if (options.endDate) {
    dateRange = `Until ${format(options.endDate, 'MMM d, yyyy')}`;
  }
  
  return {
    count: filtered.length,
    totalIncome,
    totalExpense,
    dateRange,
  };
}
