/**
 * Export Service
 *
 * Exports transactions to CSV, XLS, or PDF formats with custom date filtering.
 * Supports two delivery modes:
 *   - "share"    → opens system share sheet
 *   - "download" → saves to device Downloads (Android) or Files app (iOS)
 *
 * Uses expo-file-system/legacy for writeAsStringAsync (fully supported on Expo SDK 54).
 * Uses expo-print for PDF generation.
 */

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { Transaction } from '../types';
import { format } from 'date-fns';

export type ExportFormat = 'csv' | 'xls' | 'pdf';
export type ExportDelivery = 'share' | 'download';

export interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  type?: 'income' | 'expense' | 'all';
  category?: string;
  exportFormat?: ExportFormat;
  delivery?: ExportDelivery;
}

// ─────────────────────────────────────────────────
// Filter Helper
// ─────────────────────────────────────────────────

function filterTransactions(transactions: Transaction[], options: ExportOptions): Transaction[] {
  let filtered = [...transactions];

  if (options.startDate) {
    const start = new Date(options.startDate);
    start.setHours(0, 0, 0, 0);
    filtered = filtered.filter(t => new Date(t.date) >= start);
  }

  if (options.endDate) {
    const end = new Date(options.endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(t => new Date(t.date) <= end);
  }

  if (options.type && options.type !== 'all') {
    filtered = filtered.filter(t => t.type === options.type);
  }

  if (options.category) {
    filtered = filtered.filter(t => t.category === options.category);
  }

  return filtered;
}

// ─────────────────────────────────────────────────
// CSV Generator
// ─────────────────────────────────────────────────

function transactionsToCSV(transactions: Transaction[]): string {
  const header = 'Date,Type,Category,Description,Sender,Amount\n';
  const rows = transactions.map(t => {
    const date = format(new Date(t.date), 'yyyy-MM-dd HH:mm:ss');
    const category = `"${(t.category || 'Other').replace(/"/g, '""')}"`;
    const description = `"${(t.description || '').replace(/"/g, '""')}"`;
    const sender = `"${(t.sender || '').replace(/"/g, '""')}"`;
    const amount = t.amount.toFixed(2);
    return `${date},${t.type},${category},${description},${sender},${amount}`;
  });
  return header + rows.join('\n');
}

// ─────────────────────────────────────────────────
// XLS (SpreadsheetML) Generator
// ─────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cell(value: string, type: 'String' | 'Number' = 'String'): string {
  return `<Cell><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
}

function transactionsToXLS(transactions: Transaction[]): string {
  const headerCells = ['Date', 'Type', 'Category', 'Description', 'Sender', 'Amount']
    .map(h => cell(h))
    .join('');

  const rows = transactions.map(t => {
    const date = format(new Date(t.date), 'yyyy-MM-dd HH:mm:ss');
    return `<Row>
      ${cell(date)}
      ${cell(t.type)}
      ${cell(t.category || 'Other')}
      ${cell(t.description || '')}
      ${cell(t.sender || '')}
      ${cell(t.amount.toFixed(2), 'Number')}
    </Row>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  <Styles>
    <Style ss:ID="header">
      <Interior ss:Color="#4F81BD" ss:Pattern="Solid"/>
      <Font ss:Color="#FFFFFF" ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Transactions">
    <Table>
      <Column ss:Width="140"/>
      <Column ss:Width="70"/>
      <Column ss:Width="100"/>
      <Column ss:Width="180"/>
      <Column ss:Width="140"/>
      <Column ss:Width="80"/>
      <Row ss:StyleID="header">${headerCells}</Row>
      ${rows.join('\n')}
    </Table>
  </Worksheet>
</Workbook>`;
}

// ─────────────────────────────────────────────────
// PDF (HTML) Generator
// ─────────────────────────────────────────────────

function transactionsToHTML(transactions: Transaction[], title: string): string {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const rowsHtml = transactions.map((t, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'}">
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${format(new Date(t.date), 'MMM d, yyyy HH:mm')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-transform: uppercase; font-weight: bold; color: ${t.type === 'income' ? '#27ae60' : '#e74c3c'}">${t.type}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${t.category || 'Other'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${t.description || ''}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${t.sender || ''}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">KES ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica', sans-serif; color: #333; line-height: 1.6; }
          .container { padding: 30px; }
          .header { border-bottom: 2px solid #1a73e8; margin-bottom: 20px; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 28px; color: #1a73e8; font-weight: bold; }
          .subtitle { font-size: 14px; color: #666; }
          .summary-box { display: flex; justify-content: space-between; background: #f1f3f4; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
          .summary-item { text-align: center; flex: 1; }
          .summary-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
          .summary-value { font-size: 20px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #1a73e8; color: white; text-align: left; padding: 12px 10px; font-size: 14px; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <div class="title">CashFlow Report</div>
              <div class="subtitle">${title}</div>
            </div>
            <div class="subtitle">Generated on ${format(new Date(), 'MMMM d, yyyy')}</div>
          </div>

          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">Total Income</div>
              <div class="summary-value" style="color: #27ae60">KES ${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-item" style="border-left: 1px solid #ccc; border-right: 1px solid #ccc;">
              <div class="summary-label">Total Expenses</div>
              <div class="summary-value" style="color: #e74c3c">KES ${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Net Balance</div>
              <div class="summary-value">KES ${netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Sender</th>
                <th style="text-align: right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            CashFlow Tracker App - Your Smart Personal Finance Companion
          </div>
        </div>
      </body>
    </html>
  `;
}

// ─────────────────────────────────────────────────
// Save to Device Helper
// ─────────────────────────────────────────────────

async function saveFileToDevice(
  data: string,
  filename: string,
  mimeType: string,
  isBase64: boolean = false
): Promise<string> {
  if (Platform.OS === 'android') {
    const SAF = FileSystem.StorageAccessFramework;
    const permission = await SAF.requestDirectoryPermissionsAsync();
    
    if (!permission.granted) {
      throw new Error('Permission to save file was denied');
    }

    const fileUri = await SAF.createFileAsync(
      permission.directoryUri,
      filename.split('.')[0],
      mimeType
    );

    await FileSystem.writeAsStringAsync(fileUri, data, {
      encoding: isBase64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
    });

    return 'File saved to your chosen folder successfully.';
  } else {
    // iOS: Save to Documents directory
    const dir = FileSystem.documentDirectory;
    if (!dir) throw new Error('Document directory not accessible');

    const fileUri = `${dir}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, data, {
      encoding: isBase64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
    });

    return `File saved to Files app → On My iPhone → CashFlow Tracker`;
  }
}

// ─────────────────────────────────────────────────
// Main Export Function
// ─────────────────────────────────────────────────

export async function exportTransactions(
  transactions: Transaction[],
  options: ExportOptions = {}
): Promise<string> {
  const filtered = filterTransactions(transactions, options);

  if (filtered.length === 0) {
    throw new Error('No transactions to export for the selected filters.');
  }

  const formatType = options.exportFormat ?? 'csv';
  const delivery = options.delivery ?? 'share';
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const filename = `cashflow_${timestamp}.${formatType}`;
  
  let mimeType = 'text/csv';
  let uti = 'public.comma-separated-values-text';

  if (formatType === 'xls') {
    mimeType = 'application/vnd.ms-excel';
    uti = 'com.microsoft.excel.xls';
  } else if (formatType === 'pdf') {
    mimeType = 'application/pdf';
    uti = 'com.adobe.pdf';
  }

  // Handle PDF Export separately
  if (formatType === 'pdf') {
    const summary = getExportSummary(transactions, options);
    const html = transactionsToHTML(filtered, summary.dateRange);
    
    // Generate PDF file
    const { uri, base64 } = await Print.printToFileAsync({
      html,
      base64: delivery === 'download',
    });

    if (delivery === 'download') {
      return await saveFileToDevice(base64!, filename, mimeType, true);
    } else {
      // Share PDF
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) throw new Error('Sharing is not available on this device');

      await Sharing.shareAsync(uri, {
        mimeType,
        UTI: uti,
        dialogTitle: 'Export PDF Report',
      });
      return 'Report shared successfully.';
    }
  }

  // Handle CSV and XLS Export
  const content = formatType === 'xls'
    ? transactionsToXLS(filtered)
    : '\uFEFF' + transactionsToCSV(filtered);

  // Web support
  if (typeof window !== 'undefined' && window.document) {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return 'File downloaded successfully.';
  }

  if (delivery === 'download') {
    return await saveFileToDevice(content, filename, mimeType);
  } else {
    // Share CSV/XLS
    const dir = FileSystem.documentDirectory;
    if (!dir) throw new Error('Directory error');

    const fileUri = `${dir}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new Error('Sharing not available');

    await Sharing.shareAsync(fileUri, {
      mimeType,
      UTI: uti,
      dialogTitle: `Export (${formatType.toUpperCase()})`,
    });
    return 'File shared successfully.';
  }
}

// Alias for backward compatibility
export const exportTransactionsToCSV = exportTransactions;

// ─────────────────────────────────────────────────
// Summary Helper
// ─────────────────────────────────────────────────

export function getExportSummary(
  transactions: Transaction[],
  options: ExportOptions
): {
  count: number;
  totalIncome: number;
  totalExpense: number;
  dateRange: string;
} {
  const filtered = filterTransactions(transactions, options);

  const totalIncome = filtered
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpense = filtered
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  let dateRange = 'All time';
  if (options.startDate && options.endDate) {
    dateRange = `${format(options.startDate, 'MMM d, yyyy')} – ${format(options.endDate, 'MMM d, yyyy')}`;
  } else if (options.startDate) {
    dateRange = `From ${format(options.startDate, 'MMM d, yyyy')}`;
  } else if (options.endDate) {
    dateRange = `Until ${format(options.endDate, 'MMM d, yyyy')}`;
  }

  return { count: filtered.length, totalIncome, totalExpense, dateRange };
}
