import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// TODO: Provide these via env or app config
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Internal helpers (avoid name collision with context methods)
export async function signUpApi(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInApi(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithGoogle() {
  const redirectTo = makeRedirectUri({
    path: '/auth/callback',
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) throw error;
  return data;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// Auth Context to expose session across the app
export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthProvider] Initializing auth state...');
    let isMounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isMounted) return;
      console.log('[AuthProvider] Initial session:', session?.user?.id ? 'User logged in' : 'No user');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, newSession: Session | null) => {
      console.log('[AuthProvider] Auth state change:', event, newSession?.user?.id ? 'User present' : 'No user');
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    session,
    user,
    loading,
    signIn: async (email, password) => {
      console.log('[AuthProvider] Sign in attempt for:', email);
      setLoading(true);
      try {
        await signInApi(email, password);
        console.log('[AuthProvider] Sign in API call successful');
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log('[AuthProvider] Session after sign in:', session?.user?.id ? `User ID: ${session.user.id}` : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('[AuthProvider] Sign in error:', error);
        // Don't expose raw error details to UI
        const message = (error as any)?.message || 'Authentication failed';
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    signUp: async (email, password) => {
      console.log('[AuthProvider] Sign up attempt for:', email);
      setLoading(true);
      try {
        await signUpApi(email, password);
        console.log('[AuthProvider] Sign up API call successful');
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log('[AuthProvider] Session after sign up:', session?.user?.id ? `User ID: ${session.user.id}` : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('[AuthProvider] Sign up error:', error);
        // Don't expose raw error details to UI
        const message = (error as any)?.message || 'Account creation failed';
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    signInWithGoogle: async () => {
      console.log('[AuthProvider] Google sign in attempt');
      setLoading(true);
      try {
        await signInWithGoogle();
        console.log('[AuthProvider] Google sign in initiated');
        // Session will be updated via onAuthStateChange when OAuth completes
      } catch (error) {
        console.error('[AuthProvider] Google sign in error:', error);
        const message = (error as any)?.message || 'Google sign in failed';
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    signOut: async () => {
      setLoading(true);
      try {
        await signOut();
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    },
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
