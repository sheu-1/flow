import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { supabase, pingSupabase } from './SupabaseClient';
import { PermissionService } from './PermissionService';
import { startSmsListener, stopSmsListener } from './SmsService';

WebBrowser.maybeCompleteAuthSession();

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
        is_new_user: true, // Flag to show subscription screen first
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

export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
    // Determine the correct redirect URI based on environment
    const isExpoGo = Constants.appOwnership === 'expo';
    
    const redirectTo = makeRedirectUri({
      scheme: isExpoGo ? undefined : 'cashflowtracker',
      path: 'auth-callback',
    });
    
    console.log('=== GOOGLE AUTH DEBUG ===');
    console.log('Environment:', isExpoGo ? 'Expo Go' : 'Standalone');
    console.log('Redirect URI:', redirectTo);
    console.log('========================');
    console.log('⚠️ IMPORTANT: Add this URL to Supabase Dashboard:');
    console.log('   Authentication > URL Configuration > Redirect URLs');
    console.log('   Add:', redirectTo);
    console.log('========================');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Auth.signInWithGoogle error:', error);
      return { error: error.message };
    }

    if (!data?.url) {
      return { error: 'Unable to start Google sign-in' };
    }

    console.log('Opening OAuth URL:', data.url);
    console.log('Expected redirect URI:', redirectTo);

    // Open the OAuth URL and handle the response
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo,
      {
        showInRecents: true,
        preferEphemeralSession: false,
      }
    );
    
    console.log('WebBrowser result type:', result.type);
    if (result.type === 'success') {
      console.log('WebBrowser result URL:', result.url);
    }
    
    if (result.type === 'cancel' || result.type === 'dismiss') {
      console.log('User cancelled or dismissed the sign-in');
      return { error: 'Google sign-in was cancelled' };
    }

    if (result.type === 'success') {
      console.log('Processing OAuth response...');
      
      const url = new URL(result.url);
      
      // With PKCE flow, look for authorization code
      const code = url.searchParams.get('code');
      
      // With implicit flow (fallback), look for tokens directly
      const accessToken = url.searchParams.get('access_token') || 
                         url.hash.match(/access_token=([^&]+)/)?.[1];
      const refreshToken = url.searchParams.get('refresh_token') || 
                          url.hash.match(/refresh_token=([^&]+)/)?.[1];
      
      if (code) {
        // PKCE flow: exchange code for session
        console.log('PKCE flow: Got authorization code, exchanging for session...');
        
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (sessionError) {
          console.error('Error exchanging code for session:', sessionError);
          return { error: sessionError.message };
        }

        if (sessionData?.session) {
          console.log('✅ Google session created successfully (PKCE):', sessionData.session.user?.id);
          console.log('Session expires at:', new Date(sessionData.session.expires_at! * 1000).toISOString());
          return {};
        }
      } else if (accessToken && refreshToken) {
        // Implicit flow: set session directly with tokens
        console.log('Implicit flow: Setting session with tokens...');
        
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (sessionError) {
          console.error('Error setting session:', sessionError);
          return { error: sessionError.message };
        }

        if (sessionData?.session) {
          console.log('✅ Google session created successfully (Implicit):', sessionData.session.user?.id);
          console.log('Session expires at:', new Date(sessionData.session.expires_at! * 1000).toISOString());
          return {};
        }
      } else if (accessToken && !refreshToken) {
        console.warn('⚠️ Access token found but no refresh token - session may not persist');
        console.log('Attempting to set session with access token only...');
        
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: '',
        });
        
        if (sessionError) {
          console.error('Error setting session:', sessionError);
          return { error: sessionError.message };
        }

        if (sessionData?.session) {
          console.log('✅ Google session created (no refresh token):', sessionData.session.user?.id);
          return {};
        }
      } else {
        console.error('❌ No authorization code or access token in OAuth response');
        console.log('URL params:', Array.from(url.searchParams.entries()));
        console.log('URL hash:', url.hash);
        return { error: 'Failed to get authentication credentials from Google' };
      }
    }
    
    return { error: 'Authentication flow incomplete' };
  } catch (error) {
    console.error('Auth.signInWithGoogle network/unknown error:', error);
    return { error: error instanceof Error ? error.message : 'Network error during Google sign in' };
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
  signIn: (email: string, password: string) => Promise<{ success: boolean }>;
  signUp: (email: string, password: string, username?: string, phoneNumber?: string, country?: string) => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
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
        
        return { success: true };
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
        const result = await signInWithGoogle();
        
        if (result.error) {
          return result;
        }
        
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
        
        return {};
      } catch (error) {
        const message = (error as any)?.message || 'Google sign in failed';
        return { error: message };
      } finally {
        setLoading(false);
      }
    },
    signOut: async () => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
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
