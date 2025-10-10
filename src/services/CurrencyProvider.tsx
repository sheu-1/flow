import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CurrencyCode = 'KES' | 'USD' | 'UGX' | 'TZS' | 'GHS' | 'NGN' | 'ZAR';

export interface CurrencyContextValue {
  currency: CurrencyCode;
  availableCurrencies: CurrencyCode[];
  setCurrency: (c: CurrencyCode) => Promise<void>;
  formatCurrency: (
    amount: number,
    opts?: { maximumFractionDigits?: number; showSymbol?: boolean; showCode?: boolean }
  ) => string;
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

  const formatCurrency = (
    amount: number,
    opts?: { maximumFractionDigits?: number; showSymbol?: boolean; showCode?: boolean }
  ) => {
    try {
      // Default: neutral numeric formatting with group separators, no currency symbol
      if (!opts?.showSymbol && !opts?.showCode) {
        return new Intl.NumberFormat(undefined, {
          style: 'decimal',
          maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
        }).format(amount ?? 0);
      }

      // If showCode is requested, render with currency code (e.g., USD 1,234.56)
      if (opts?.showCode) {
        const num = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          currencyDisplay: 'code',
          maximumFractionDigits: opts?.maximumFractionDigits,
        }).format(amount ?? 0);
        return num;
      }

      // Else show the local symbol
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: opts?.maximumFractionDigits,
      }).format(amount ?? 0);
    } catch {
      // Fallback if Intl doesn't support currency
      const n = Number(amount ?? 0).toFixed(opts?.maximumFractionDigits ?? 2);
      if (opts?.showSymbol || opts?.showCode) return `${currency} ${n}`;
      return `${n}`;
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
