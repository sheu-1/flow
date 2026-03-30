import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { exportTransactionsToCSV, getExportSummary, ExportFormat } from '../services/CsvExportService';
import { Transaction } from '../types';
import { useDateFilterContext } from '../contexts/DateFilterContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInUp, FadeIn, SlideInDown, useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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
  const { dateRange } = useDateFilterContext();
  const [exportType, setExportType] = useState<'all' | 'income' | 'expense'>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Animation values for interactive feedback
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    setStartDate(dateRange.startDate);
    setEndDate(dateRange.endDate);
  }, [visible, dateRange.startDate, dateRange.endDate]);

  const summary = getExportSummary(transactions, {
    startDate,
    endDate,
    type: exportType,
  });

  const handleAction = async (delivery: 'share' | 'download') => {
    if (summary.count === 0) {
      Alert.alert('No Data', 'There are no transactions to export for the selected filters.');
      return;
    }

    setLoading(true);
    try {
      const message = await exportTransactionsToCSV(transactions, {
        startDate,
        endDate,
        type: exportType,
        exportFormat,
        delivery,
      });

      const title = delivery === 'download' ? 'Saved! 📁' : 'Exported! 🎉';
      Alert.alert(title, `${summary.count} record(s) — ${message}`, [
        { text: 'Done', onPress: onClose },
      ]);
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const getGradientForType = (type: 'all' | 'income' | 'expense') => {
    switch(type) {
      case 'income': return [colors.success + '20', colors.success + '05'];
      case 'expense': return [colors.danger + '20', colors.danger + '05'];
      default: return [colors.primary + '20', colors.primary + '05'];
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }],
    };
  });

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.96);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Animated.View style={styles.overlay} entering={FadeIn.duration(300)}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        
        <Animated.View 
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          entering={SlideInDown.springify().damping(20).stiffness(150)}
        >
          {/* Header Card with Gradient */}
          <LinearGradient
            colors={[colors.primary, colors.primary + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Export Data</Text>
                <Text style={styles.subtitle}>Download your transactions as CSV</Text>
              </View>
              <TouchableOpacity onPress={onClose} disabled={loading} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Live Summary Chips */}
            <View style={styles.chipsContainer}>
              <View style={styles.chip}>
                <Ionicons name="documents" size={14} color="#FFF" />
                <Text style={styles.chipText}>{summary.count} Records</Text>
              </View>
              <View style={styles.chip}>
                <Ionicons name="calendar" size={14} color="#FFF" />
                <Text style={styles.chipText}>{summary.dateRange}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            {/* Filter Group: Date */}
            <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Date Range</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: colors.surface }]}
                  onPress={() => setShowStartPicker(true)}
                  disabled={loading}
                >
                  <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.dateTextGroup}>
                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>From</Text>
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
                      {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: colors.surface }]}
                  onPress={() => setShowEndPicker(true)}
                  disabled={loading}
                >
                  <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.dateTextGroup}>
                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>To</Text>
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
                      {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (!date) return;
                  setStartDate(date);
                  if (date > endDate) setEndDate(date);
                }}
                maximumDate={new Date()}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, date) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (!date) return;
                  const next = date < startDate ? startDate : date;
                  setEndDate(next);
                }}
                maximumDate={new Date()}
                minimumDate={startDate}
              />
            )}

            {/* Filter Group: Transaction Type */}
            <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Record Type</Text>
              <View style={styles.typeGrid}>
                {[ 
                  { id: 'all', icon: 'layers', label: 'All', color: colors.primary },
                  { id: 'income', icon: 'arrow-down', label: 'Income', color: colors.success },
                  { id: 'expense', icon: 'arrow-up', label: 'Expense', color: colors.danger }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.typeOptionCard,
                      { backgroundColor: colors.surface },
                      exportType === item.id && { borderColor: item.color, borderWidth: 2 }
                    ]}
                    onPress={() => setExportType(item.id as any)}
                    disabled={loading}
                  >
                    <Ionicons name={item.icon as any} size={24} color={exportType === item.id ? item.color : colors.textMuted} />
                    <Text style={[styles.typeOptionText, { color: exportType === item.id ? colors.text : colors.textMuted }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* Dynamic Summary Overview */}
            <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.summarySection}>
              <LinearGradient
                colors={getGradientForType(exportType) as any}
                style={styles.summaryCard}
              >
                <View style={styles.summaryHeader}>
                  <Ionicons name="pie-chart" size={20} color={exportType === 'expense' ? colors.danger : exportType === 'income' ? colors.success : colors.primary} />
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>Export Preview</Text>
                </View>
                
                <View style={styles.summaryStatsRow}>
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Money In</Text>
                    <Text style={[styles.summaryStatValue, { color: colors.success }]}>
                      KES {summary.totalIncome.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Money Out</Text>
                    <Text style={[styles.summaryStatValue, { color: colors.danger }]}>
                      KES {summary.totalExpense.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {exportType === 'all' && (
                  <View style={styles.netBalanceRow}>
                    <Text style={[styles.netBalanceText, { color: colors.textSecondary }]}>Net Balance:</Text>
                    <Text style={[styles.netBalanceAmount, { color: colors.text }]}>
                      KES {(summary.totalIncome - summary.totalExpense).toFixed(2)}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>

            {/* Format Selector */}
            <Animated.View entering={FadeInUp.delay(380).springify()} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>File Format</Text>
              <View style={styles.typeGrid}>
                {[
                  { id: 'csv', icon: 'document-text', label: 'CSV', desc: 'Universal' },
                  { id: 'xls', icon: 'grid', label: 'XLS', desc: 'Excel / Sheets' },
                  { id: 'pdf', icon: 'document', label: 'PDF', desc: 'Report' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.typeOptionCard,
                      { backgroundColor: colors.surface },
                      exportFormat === item.id && { borderColor: colors.primary, borderWidth: 2 }
                    ]}
                    onPress={() => setExportFormat(item.id as ExportFormat)}
                    disabled={loading}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={exportFormat === item.id ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.typeOptionText, { color: exportFormat === item.id ? colors.text : colors.textMuted }]}>
                      {item.label}
                    </Text>
                    <Text style={[{ fontSize: 10, color: exportFormat === item.id ? colors.textSecondary : colors.textMuted, marginTop: 2 }]}>
                      {item.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View entering={FadeInUp.delay(420).springify()} style={styles.actionContainer}>
              {/* Save to Device */}
              <TouchableOpacity
                onPress={() => handleAction('download')}
                disabled={loading || summary.count === 0}
                style={[
                  styles.downloadButton,
                  { borderColor: summary.count === 0 ? colors.textMuted : colors.primary }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color={summary.count === 0 ? colors.textMuted : colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.downloadButtonText, { color: summary.count === 0 ? colors.textMuted : colors.primary }]}>
                      Save {exportFormat.toUpperCase()} to Device
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => handleAction('share')}
                disabled={loading || summary.count === 0}
                style={styles.exportButtonWrapper}
              >
                <Animated.View style={[
                  styles.exportButton,
                  { backgroundColor: summary.count === 0 ? colors.textMuted : colors.primary },
                  buttonAnimatedStyle
                ]}>
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="share-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.exportButtonText}>Share {exportFormat.toUpperCase()}</Text>
                    </>
                  )}
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  dateTextGroup: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOptionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeOptionText: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  summarySection: {
    marginBottom: spacing.xl,
  },
  summaryCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryStat: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: spacing.md,
  },
  summaryStatLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryStatValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  netBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  netBalanceText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  netBalanceAmount: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  actionContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  exportButtonWrapper: {
    width: '100%',
  },
  downloadButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 24,
    borderWidth: 2,
  },
  downloadButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});

