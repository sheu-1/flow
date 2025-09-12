import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as darkColors } from './colors';

export type ThemeName = 'dark' | 'light';

const lightColors = {
  // Background colors
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  // Text colors
  text: '#111111',
  textSecondary: '#333333',
  textMuted: '#666666',

  // Accent colors
  primary: '#2563EB',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',

  // Transaction colors
  income: '#10B981',
  expense: '#EF4444',

  // Border and divider
  border: '#E5E7EB',
  divider: '#ECECEC',

  // Status colors
  active: '#2563EB',
  inactive: '#999999',
};

export interface ThemeContextValue {
  theme: ThemeName;
  colors: typeof darkColors;
  toggleTheme: () => Promise<void>;
  setTheme: (t: ThemeName) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = 'app_theme_v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>('dark');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setThemeState(saved);
    })();
  }, []);

  const colors = useMemo(() => (theme === 'light' ? lightColors : darkColors), [theme]);

  const setTheme = async (t: ThemeName) => {
    setThemeState(t);
    await AsyncStorage.setItem(STORAGE_KEY, t);
  };

  const toggleTheme = async () => {
    await setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const value: ThemeContextValue = { theme, colors: colors as any, toggleTheme, setTheme };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useThemeColors() {
  return useTheme().colors;
}
