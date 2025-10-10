import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const expoExtra = (Constants.expoConfig as any)?.extra || {};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || expoExtra.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || expoExtra.SUPABASE_ANON_KEY;

console.log('🔧 Supabase Configuration:');
console.log('URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('Key:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'cashflow-tracker-mobile',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

export async function pingSupabase(timeoutMs = 3000): Promise<boolean> {
  try {
    const base = (SUPABASE_URL || '').replace(/\/$/, '');
    if (!base) return false;
    const url = `${base}/auth/v1/health`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch (e) {
    console.warn('Supabase health check failed:', (e as any)?.message || e);
    return false;
  }
}
