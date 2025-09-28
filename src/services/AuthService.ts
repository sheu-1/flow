import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './SupabaseClient';
import { PermissionService } from './PermissionService';
import { googleAuthService, GoogleAuthResult } from './GoogleAuthService';

WebBrowser.maybeCompleteAuthSession();

// Internal helpers (avoid name collision with context methods)
export async function signUpApi(email: string, password: string, username?: string) {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: makeRedirectUri({ scheme: 'cashflowtracker' }),
      data: {
        full_name: username || '',
        username: username || '',
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
  signUp: (email: string, password: string, username?: string) => Promise<void>;
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
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Initialize SMS permissions on first login
        if (event === 'SIGNED_IN' && newSession?.user) {
          try {
            await PermissionService.initializeSmsPermissions();
          } catch (error) {
            console.warn('Failed to initialize SMS permissions:', error);
          }
        }
      }
    );

    return () => subscription.subscription.unsubscribe();
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
    signUp: async (email, password, username) => {
      setLoading(true);
      try {
        await signUpApi(email, password, username);
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
