import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CurrencyCode = 'KES' | 'USD' | 'UGX' | 'TZS' | 'GHS' | 'NGN' | 'ZAR';

export interface CurrencyContextValue {
  currency: CurrencyCode;
  availableCurrencies: CurrencyCode[];
  setCurrency: (c: CurrencyCode) => Promise<void>;
  formatCurrency: (amount: number, opts?: { maximumFractionDigits?: number }) => string;
}

const STORAGE_KEY = 'app_currency_v1';
const DEFAULT: CurrencyCode = 'KES';
const CURRENCIES: CurrencyCode[] = ['KES', 'USD', 'UGX', 'TZS', 'GHS', 'NGN', 'ZAR'];

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && CURRENCIES.includes(saved as CurrencyCode)) setCurrencyState(saved as CurrencyCode);
      } catch {}
    })();
  }, []);

  const setCurrency = async (c: CurrencyCode) => {
    setCurrencyState(c);
    await AsyncStorage.setItem(STORAGE_KEY, c);
  };

  const formatCurrency = (amount: number, opts?: { maximumFractionDigits?: number }) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: opts?.maximumFractionDigits,
      }).format(amount ?? 0);
    } catch {
      // Fallback if Intl doesn't support currency
      return `${currency} ${Number(amount ?? 0).toFixed(opts?.maximumFractionDigits ?? 2)}`;
    }
  };

  const value = useMemo<CurrencyContextValue>(() => ({
    currency,
    availableCurrencies: CURRENCIES,
    setCurrency,
    formatCurrency,
  }), [currency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
