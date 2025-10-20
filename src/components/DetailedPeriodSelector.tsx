/**
 * DetailedPeriodSelector Component
 * 
 * Compact dropdown with month-based period options and custom date range picker.
 * Opens as a small dropdown when the caret is tapped.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '../theme/ThemeProvider';
import { PresetRange } from '../hooks/useDateFilter';
import { spacing, fontSize, borderRadius } from '../theme/colors';

interface DetailedPeriodSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedPreset: PresetRange;
  onPresetSelect: (preset: PresetRange) => void;
  onCustomRangeSelect: (startDate: Date, endDate: Date) => void;
  onReset: () => void;
}

// New simplified month-based options
type MonthOption = '3months' | '6months' | '9months' | '12months' | 'custom';

const monthOptions: { key: MonthOption; label: string; preset?: PresetRange }[] = [
  { key: '3months', label: '3 Months', preset: 'last90Days' },
  { key: '6months', label: '6 Months', preset: 'last90Days' }, // Will calculate 6 months
  { key: '9months', label: '9 Months', preset: 'last90Days' }, // Will calculate 9 months
  { key: '12months', label: '12 Months', preset: 'thisYear' },
  { key: 'custom', label: 'Custom' },
];

// Helper to calculate date range for months
const getMonthsRange = (months: number): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  return { start, end };
};

export const DetailedPeriodSelector: React.FC<DetailedPeriodSelectorProps> = ({
  visible,
  onClose,
  selectedPreset,
  onPresetSelect,
  onCustomRangeSelect,
  onReset,
}) => {
  const colors = useThemeColors();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [selectedOption, setSelectedOption] = useState<MonthOption>('3months');
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleOptionSelect = (option: MonthOption) => {
    setSelectedOption(option);
    
    if (option === 'custom') {
      setShowCustomPicker(true);
    } else {
      // Calculate date range based on months
      let months = 3;
      if (option === '6months') months = 6;
      else if (option === '9months') months = 9;
      else if (option === '12months') months = 12;
      
      const { start, end } = getMonthsRange(months);
      onCustomRangeSelect(start, end);
      onClose();
    }
  };

  const handleCustomApply = () => {
    if (customStartDate > customEndDate) {
      // Swap dates if start is after end
      onCustomRangeSelect(customEndDate, customStartDate);
    } else {
      onCustomRangeSelect(customStartDate, customEndDate);
    }
    setShowCustomPicker(false);
    onClose();
  };

  const handleClose = () => {
    setShowCustomPicker(false);
    onClose();
  };

  // Custom date picker modal
  if (showCustomPicker) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={[styles.customPickerContainer, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Date Range</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContent}>
              {/* Start Date */}
              <View style={styles.dateSection}>
                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Start Date</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {customStartDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* End Date */}
              <View style={styles.dateSection}>
                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>End Date</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {customEndDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Apply Button */}
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: colors.primary }]}
                onPress={handleCustomApply}
              >
                <Text style={styles.applyButtonText}>Apply Date Range</Text>
              </TouchableOpacity>
            </View>

            {/* Date Pickers */}
            {showStartPicker && (
              <DateTimePicker
                value={customStartDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (date) setCustomStartDate(date);
                }}
                maximumDate={new Date()}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={customEndDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (date) setCustomEndDate(date);
                }}
                maximumDate={new Date()}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // Main dropdown
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.dropdownContainer, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Select Period</Text>
          </View>
          
          {monthOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.dropdownOption,
                {
                  backgroundColor: selectedOption === option.key ? colors.primary + '15' : 'transparent',
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => handleOptionSelect(option.key)}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  {
                    color: selectedOption === option.key ? colors.primary : colors.text,
                    fontWeight: selectedOption === option.key ? '600' : '400',
                  },
                ]}
              >
                {option.label}
              </Text>
              {selectedOption === option.key && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: 240,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
  },
  dropdownOptionText: {
    fontSize: fontSize.md,
  },
  customPickerContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  datePickerContent: {
    padding: spacing.lg,
  },
  dateSection: {
    marginBottom: spacing.lg,
  },
  dateLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  dateButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  applyButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
