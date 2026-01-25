import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { supabase, pingSupabase } from './SupabaseClient';
import { PermissionService } from './PermissionService';
import { startSmsListener, stopSmsListener } from './SmsService';
import { registerBackgroundSmsTask, unregisterBackgroundSmsTask } from './BackgroundSms';
import { notificationService } from './NotificationService';
import { scheduleDailySummaryNotification, cancelDailySummaryNotification } from './DailySummaryNotifications';

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
  requestPasswordReset: (email: string) => Promise<void>;
  needsPasswordReset: boolean;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let subscription: any;
    let smsStarted = false;

    const handleAuthCallbackUrl = async (url: string) => {
      try {
        console.log('[Auth] Handling callback URL:', url);
        const parsed = Linking.parse(url);
        const rawPath = (parsed.path || parsed.hostname || '').toString();

        // More robust detection: check for 'reset-password' anywhere in path or host, OR type=recovery param
        const urlObj = new URL(url);
        const hash = urlObj.hash ? urlObj.hash.replace(/^#/, '') : '';
        const hashParams = new URLSearchParams(hash);
        const type = hashParams.get('type') || urlObj.searchParams.get('type');

        const isResetPath = rawPath.includes('reset-password');
        const isRecoveryType = type === 'recovery';

        if (!isResetPath && !isRecoveryType) {
          console.log('[Auth] URL is not for password reset (path:', rawPath, 'type:', type, ')');
          return;
        }

        const code = urlObj.searchParams.get('code');
        const accessToken = hashParams.get('access_token') || urlObj.searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || urlObj.searchParams.get('refresh_token');

        // Supabase recovery can arrive either as a PKCE `code` or as implicit tokens in the hash.
        if (code) {
          console.log('[Auth] Exchange code for session...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn('[Auth] Failed to exchange recovery code for session:', error);
            // Even if exchange fails, we might want to let them try if we have a session? 
            // But usually this means invalid link.
            return;
          }
        } else if (accessToken) {
          console.log('[Auth] Set session from tokens...');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? '',
          });
          if (error) {
            console.warn('[Auth] Failed to set recovery session from tokens:', error);
            return;
          }
        } else {
          console.warn('[Auth] reset-password link opened but no code/access_token found');
          return;
        }

        // Force reset mode if we detected it's a recovery flow
        console.log('[Auth] Recovery flow detected, setting needsPasswordReset=true');
        setNeedsPasswordReset(true);
      } catch (e) {
        console.warn('[Auth] Error handling auth callback URL:', e);
      }
    };

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
        // Always restore cached session from AsyncStorage first, regardless of network.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(timeoutId);

        // Optionally ping Supabase for logging only (never clear session on failure)
        try {
          const reachable = await pingSupabase(2000);
          console.log('[Auth] health check reachable =', reachable);
        } catch { }

        if (session?.user && !smsStarted) {
          try {
            startSmsListener();
            smsStarted = true;
          } catch (e) {
            console.warn('[Auth] Failed to start SMS listener:', e);
          }
          try { await registerBackgroundSmsTask(); } catch { }
          // Register Expo push token for this user
          try { await notificationService.registerPushToken(session.user.id); } catch { }
        }
      } catch (e) {
        console.error('[Auth] init error:', e);
      }
    })();

    // Handle incoming deep links (especially password recovery)
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthCallbackUrl(url);
    });
    const urlSubscription = Linking.addEventListener('url', (event) => {
      handleAuthCallbackUrl(event.url);
    });

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        console.log('[Auth] onAuthStateChange:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') {
          console.log('[Auth] PASSWORD_RECOVERY event received');
          setNeedsPasswordReset(true);
        }
        setLoading(false);
        try { clearTimeout(timeoutId); } catch { }
        if (event === 'SIGNED_IN' && newSession?.user) {
          try {
            await PermissionService.initializeSmsPermissions();
            try { startSmsListener(); smsStarted = true; } catch { }
          } catch (error) {
            console.warn('Failed to initialize SMS permissions:', error);
          }
          try { await registerBackgroundSmsTask(); } catch { }
          // Schedule daily notifications whenever user signs in
          try { await scheduleDailySummaryNotification(newSession.user.id); } catch { }
          // Register Expo push token whenever user signs in
          try { await notificationService.registerPushToken(newSession.user.id); } catch { }
        }
        if (event === 'SIGNED_OUT') {
          try { stopSmsListener(); smsStarted = false; } catch { }
          try { await unregisterBackgroundSmsTask(); } catch { }
          // Cancel daily notifications when user signs out
          try { await cancelDailySummaryNotification(newSession?.user?.id); } catch { }
          setNeedsPasswordReset(false);
        }
      }
    );
    subscription = authListener;

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription?.subscription.unsubscribe();
      try { urlSubscription.remove(); } catch { }
      try { stopSmsListener(); } catch { }
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) {
        try { startSmsListener(); } catch { }
      }
    });
    return () => {
      try { sub.remove(); } catch { }
    };
  }, [user]);

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
          try { await registerBackgroundSmsTask(); } catch { }
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
          try { await registerBackgroundSmsTask(); } catch { }
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
        try { await unregisterBackgroundSmsTask(); } catch { }
      } finally {
        setLoading(false);
      }
    },
    requestPasswordReset: async (email: string) => {
      // Do not flip global loading spinner; show local feedback in the UI instead
      try {
        const redirectTo = makeRedirectUri({
          // Use the same scheme family as other auth flows (see signInWithGoogle above)
          scheme: 'cashflowtracker',
          path: 'reset-password',
        });

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });
        if (error) throw error;
      } catch (error) {
        const message = (error as any)?.message || 'Failed to send reset email';
        throw new Error(message);
      }
    },
    needsPasswordReset,
    updatePassword: async (newPassword: string) => {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        // Force header-based redirect to Auth screen by signing out
        // The user must sign in again with the new password
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.warn('Error signing out after password update:', signOutError);

        setSession(null);
        setUser(null);
        setNeedsPasswordReset(false);
      } catch (error) {
        const message = (error as any)?.message || 'Failed to update password';
        throw new Error(message);
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
