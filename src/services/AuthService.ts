import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
// OAuth deep linking temporarily disabled
// import { makeRedirectUri } from 'expo-auth-session';
// import * as WebBrowser from 'expo-web-browser';
import { supabase, pingSupabase } from './SupabaseClient';
import { PermissionService } from './PermissionService';
import { startSmsListener, stopSmsListener } from './SmsService';
// OAuth deep linking temporarily disabled
// import { googleAuthService, GoogleAuthResult } from './GoogleAuthService';
import { GoogleAuthResult } from './GoogleAuthService';

// OAuth deep linking temporarily disabled
// WebBrowser.maybeCompleteAuthSession();

// Internal helpers (avoid name collision with context methods)
export async function signUpApi(email: string, password: string, username?: string, phoneNumber?: string, country?: string) {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // OAuth deep linking temporarily disabled
      // emailRedirectTo: makeRedirectUri({ scheme: 'cashflowtracker' }),
      data: {
        full_name: username || '',
        username: username || '',
        phone_number: phoneNumber || '',
        country: country || '',
      },
    },
  });

  if (error) {
    if (
      error.message.includes('already registered') ||
      error.message.includes('already in use') ||
      error.message.includes('User already registered')
    ) {
      throw new Error('A user with this email already exists');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function signInApi(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Incorrect email or password');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  // OAuth deep linking temporarily disabled
  throw new Error('Google OAuth is temporarily disabled. Please use email/password authentication.');
  
  /* Commented out OAuth flow
  try {
    // Use the new PKCE-based Google OAuth service
    const googleResult = await googleAuthService.signInWithGoogle();
    
    // Sign in to Supabase using the Google ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleResult.idToken || googleResult.accessToken,
      access_token: googleResult.accessToken,
    });
    
    if (error) throw error;
    
    return googleResult;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
  */
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
  signUp: (email: string, password: string, username?: string, phoneNumber?: string, country?: string) => Promise<void>;
  signInWithGoogle: () => Promise<GoogleAuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let subscription: any;
    let smsStarted = false;
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('[Auth] Timeout reached, stopping loading state');
        setLoading(false);
      }
    }, 3000); // 3 second timeout - faster response
    
    (async () => {
      try {
        console.log('[Auth] init: starting auth bootstrap');
        const reachable = await pingSupabase(2000); // Reduced timeout
        console.log('[Auth] health check reachable =', reachable);

        if (!isMounted) return;
        if (!reachable) {
          console.warn('[Auth] Supabase unreachable. Starting offline (no user).');
          setSession(null);
          setUser(null);
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(timeoutId);

        // Start persistent SMS listener when already authenticated
        if (session?.user && !smsStarted) {
          try {
            startSmsListener();
            smsStarted = true;
          } catch (e) {
            console.warn('[Auth] Failed to start SMS listener:', e);
          }
        }
      } catch (e) {
        console.error('[Auth] init error:', e);
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    })();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        console.log('[Auth] onAuthStateChange:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Any auth event means we have a definitive state; stop loading
        // This prevents the UI from being stuck on the loading screen when the initial
        // session arrives via the auth listener before the bootstrap getSession resolves.
        setLoading(false);
        try { clearTimeout(timeoutId); } catch {}
        
        // Initialize SMS permissions on first login
        if (event === 'SIGNED_IN' && newSession?.user) {
          try {
            await PermissionService.initializeSmsPermissions();
            // Start persistent SMS ingestion
            try { startSmsListener(); smsStarted = true; } catch {}
          } catch (error) {
            console.warn('Failed to initialize SMS permissions:', error);
          }
        }

        if (event === 'SIGNED_OUT') {
          try { stopSmsListener(); smsStarted = false; } catch {}
        }
      }
    );
    subscription = authListener;
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription?.subscription.unsubscribe();
      try { stopSmsListener(); } catch {}
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user,
    loading,
    signIn: async (email, password) => {
      setLoading(true);
      try {
        await signInApi(email, password);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        // Initialize SMS permissions on successful login
        if (session?.user) {
          try {
            await PermissionService.initializeSmsPermissions();
          } catch (error) {
            console.warn('Failed to initialize SMS permissions:', error);
          }
        }
      } catch (error) {
        const message = (error as any)?.message || 'Authentication failed';
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    signUp: async (email, password, username, phoneNumber, country) => {
      setLoading(true);
      try {
        await signUpApi(email, password, username, phoneNumber, country);
        // Ensure the user is NOT logged in after sign up
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } catch (error) {
        const message = (error as any)?.message || 'Account creation failed';
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    signInWithGoogle: async () => {
      setLoading(true);
      try {
        const googleResult = await signInWithGoogle();
        
        // Get the updated session after Google sign-in
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        // Initialize SMS permissions on successful login
        if (session?.user) {
          try {
            await PermissionService.initializeSmsPermissions();
          } catch (error) {
            console.warn('Failed to initialize SMS permissions:', error);
          }
        }
        
        return googleResult;
      } catch (error) {
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
