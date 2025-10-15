/**
 * DateRangePicker Component
 * 
 * Reusable date range picker with preset options and custom date selection
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

interface DateRangePickerProps {
  selectedPreset: PresetRange;
  formattedRange: string;
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

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  selectedPreset,
  formattedRange,
  onPresetSelect,
  onCustomRangeSelect,
  onReset,
}) => {
  const colors = useThemeColors();
  const [showModal, setShowModal] = useState(false);
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
      setShowModal(false);
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
    setShowModal(false);
    setShowCustomInput(false);
    setStartDateInput('');
    setEndDateInput('');
    setError('');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.surface }]}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <View style={styles.buttonTextContainer}>
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>
            {presetOptions.find(p => p.key === selectedPreset)?.label || 'Filter'}
          </Text>
          <Text style={[styles.buttonRange, { color: colors.text }]} numberOfLines={1}>
            {formattedRange}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowModal(false);
          setShowCustomInput(false);
          setError('');
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {showCustomInput ? 'Custom Date Range' : 'Select Date Range'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowModal(false);
                setShowCustomInput(false);
                setError('');
              }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {!showCustomInput ? (
              <>
                {presetOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.presetOption,
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
                        styles.presetLabel,
                        {
                          color:
                            selectedPreset === option.key ? colors.primary : colors.text,
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
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: colors.surface }]}
                onPress={() => {
                  onReset();
                  setShowModal(false);
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  buttonRange: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  presetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  presetLabel: {
    fontSize: 16,
  },
  customInputContainer: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  dateInput: {
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
  },
  customButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  customButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  customButtonPrimary: {
    flex: 2,
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
