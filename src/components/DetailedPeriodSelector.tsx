/**
 * DetailedPeriodSelector Component
 * 
 * Full-screen modal with all period options including custom date ranges.
 * This is the detailed period selection page that opens when the caret is tapped.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
import { PresetRange } from '../hooks/useDateFilter';
import { parseDateString } from '../utils/dateFilter';
import { spacing, fontSize, borderRadius } from '../theme/colors';

interface DetailedPeriodSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedPreset: PresetRange;
  onPresetSelect: (preset: PresetRange) => void;
  onCustomRangeSelect: (startDate: Date, endDate: Date) => void;
  onReset: () => void;
}

const presetOptions: { key: PresetRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7Days', label: 'Last 7 Days' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'lastWeek', label: 'Last Week' },
  { key: 'last30Days', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'last90Days', label: 'Last 90 Days' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'allTime', label: 'All Time' },
  { key: 'custom', label: 'Custom Range' },
];

export const DetailedPeriodSelector: React.FC<DetailedPeriodSelectorProps> = ({
  visible,
  onClose,
  selectedPreset,
  onPresetSelect,
  onCustomRangeSelect,
  onReset,
}) => {
  const colors = useThemeColors();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [error, setError] = useState('');

  const handlePresetSelect = (preset: PresetRange) => {
    if (preset === 'custom') {
      setShowCustomInput(true);
      setError('');
    } else {
      onPresetSelect(preset);
      onClose();
      setShowCustomInput(false);
    }
  };

  const handleCustomSubmit = () => {
    const startDate = parseDateString(startDateInput);
    const endDate = parseDateString(endDateInput);

    if (!startDate || !endDate) {
      setError('Invalid date format. Use YYYY-MM-DD');
      return;
    }

    if (startDate > endDate) {
      setError('Start date must be before end date');
      return;
    }

    onCustomRangeSelect(startDate, endDate);
    onClose();
    setShowCustomInput(false);
    setStartDateInput('');
    setEndDateInput('');
    setError('');
  };

  const handleClose = () => {
    setShowCustomInput(false);
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {showCustomInput ? 'Custom Date Range' : 'Select Period'}
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {!showCustomInput ? (
            <>
              {presetOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.option,
                    {
                      backgroundColor:
                        selectedPreset === option.key ? colors.primary + '15' : 'transparent',
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => handlePresetSelect(option.key)}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: selectedPreset === option.key ? colors.primary : colors.text,
                        fontWeight: selectedPreset === option.key ? '600' : '400',
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedPreset === option.key && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={styles.customInputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Start Date</Text>
              <TextInput
                style={[
                  styles.dateInput,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={startDateInput}
                onChangeText={setStartDateInput}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>End Date</Text>
              <TextInput
                style={[
                  styles.dateInput,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={endDateInput}
                onChangeText={setEndDateInput}
              />

              {error ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              ) : null}

              <View style={styles.customButtonsContainer}>
                <TouchableOpacity
                  style={[styles.customButton, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setShowCustomInput(false);
                    setError('');
                  }}
                >
                  <Text style={[styles.customButtonText, { color: colors.text }]}>
                    Back
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.customButton, styles.customButtonPrimary, { backgroundColor: colors.primary }]}
                  onPress={handleCustomSubmit}
                >
                  <Text style={[styles.customButtonText, { color: colors.background }]}>
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {!showCustomInput && selectedPreset !== 'allTime' && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                onReset();
                onClose();
              }}
            >
              <Ionicons name="refresh" size={18} color={colors.text} />
              <Text style={[styles.resetButtonText, { color: colors.text }]}>
                Reset to All Time
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  optionLabel: {
    fontSize: fontSize.md,
  },
  customInputContainer: {
    padding: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dateInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    borderWidth: 1,
  },
  errorText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  customButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  customButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  customButtonPrimary: {
    flex: 2,
  },
  customButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  resetButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
