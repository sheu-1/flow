/**
 * DateFilterContext
 * 
 * Shared context for date filtering across Dashboard and Reports screens
 * Ensures both screens stay in sync when date filters are applied
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DateRange, getPresetDateRanges } from '../utils/dateFilter';

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
}

const DateFilterContext = createContext<DateFilterContextValue | undefined>(undefined);

export const DateFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const presets = getPresetDateRanges();
  
  const [dateRange, setDateRange] = useState<DateRange>(presets.allTime);
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>('allTime');

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

  const value: DateFilterContextValue = {
    dateRange,
    selectedPreset,
    setDateRange,
    setPreset,
    setCustomRange,
    resetFilter,
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
