import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { exportTransactionsToCSV, getExportSummary } from '../services/CsvExportService';
import { Transaction } from '../types';
import { useDateFilterContext } from '../contexts/DateFilterContext';

interface ExportDataModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

export default function ExportDataModal({
  visible,
  onClose,
  transactions,
}: ExportDataModalProps) {
  const colors = useThemeColors();
  const { dateRange, selectedPreset } = useDateFilterContext();
  const [exportType, setExportType] = useState<'all' | 'income' | 'expense'>('all');
  const [loading, setLoading] = useState(false);

  const summary = getExportSummary(transactions, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    type: exportType,
  });

  const handleExport = async () => {
    if (summary.count === 0) {
      Alert.alert('No Data', 'There are no transactions to export for the selected filters.');
      return;
    }

    setLoading(true);
    try {
      await exportTransactionsToCSV(transactions, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        type: exportType,
      });

      Alert.alert(
        'Export Successful',
        `${summary.count} transaction(s) exported successfully!`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', error.message || 'Failed to export transactions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Export Data</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Date Range Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {summary.dateRange}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {summary.count} transaction(s)
              </Text>
            </View>
          </View>

          {/* Export Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Export Type</Text>
            
            <TouchableOpacity
              style={[
                styles.typeOption,
                { backgroundColor: colors.surface, borderColor: exportType === 'all' ? colors.primary : colors.border },
                exportType === 'all' && styles.selectedOption
              ]}
              onPress={() => setExportType('all')}
              disabled={loading}
            >
              <View style={styles.typeContent}>
                <Ionicons
                  name={exportType === 'all' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={exportType === 'all' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.typeText, { color: colors.text }]}>All Transactions</Text>
              </View>
              <Text style={[styles.typeCount, { color: colors.textSecondary }]}>
                {getExportSummary(transactions, { startDate: dateRange.startDate, endDate: dateRange.endDate, type: 'all' }).count}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                { backgroundColor: colors.surface, borderColor: exportType === 'income' ? colors.primary : colors.border },
                exportType === 'income' && styles.selectedOption
              ]}
              onPress={() => setExportType('income')}
              disabled={loading}
            >
              <View style={styles.typeContent}>
                <Ionicons
                  name={exportType === 'income' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={exportType === 'income' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.typeText, { color: colors.text }]}>Income Only</Text>
              </View>
              <Text style={[styles.typeCount, { color: colors.income }]}>
                {getExportSummary(transactions, { startDate: dateRange.startDate, endDate: dateRange.endDate, type: 'income' }).count}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                { backgroundColor: colors.surface, borderColor: exportType === 'expense' ? colors.primary : colors.border },
                exportType === 'expense' && styles.selectedOption
              ]}
              onPress={() => setExportType('expense')}
              disabled={loading}
            >
              <View style={styles.typeContent}>
                <Ionicons
                  name={exportType === 'expense' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={exportType === 'expense' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.typeText, { color: colors.text }]}>Expenses Only</Text>
              </View>
              <Text style={[styles.typeCount, { color: colors.expense }]}>
                {getExportSummary(transactions, { startDate: dateRange.startDate, endDate: dateRange.endDate, type: 'expense' }).count}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Summary */}
          <View style={[styles.summaryCard, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.summaryTitle, { color: colors.primary }]}>Export Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Total Income:</Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>
                ${summary.totalIncome.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Total Expenses:</Text>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>
                ${summary.totalExpense.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: 'bold' }]}>Net:</Text>
              <Text style={[styles.summaryValue, { color: colors.text, fontWeight: 'bold' }]}>
                ${(summary.totalIncome - summary.totalExpense).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.surface }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.exportButton, { backgroundColor: colors.primary }]}
              onPress={handleExport}
              disabled={loading || summary.count === 0}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={[styles.buttonText, { color: '#fff' }]}>Export CSV</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  infoCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  typeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  selectedOption: {
    borderWidth: 2,
  },
  typeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },
  typeCount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryTotal: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  summaryLabel: {
    fontSize: fontSize.sm,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  exportButton: {},
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
