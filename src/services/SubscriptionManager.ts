/**
 * Subscription Manager
 * 
 * Handles free trial detection and subscription enforcement
 */

import { supabase } from './SupabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRIAL_DURATION_DAYS = 14; // 2 weeks free trial
const TRIAL_START_KEY = 'trial_start_date';
const SUBSCRIPTION_CACHE_KEY = 'subscription_cache_v1';
const HAS_SUBSCRIBED_KEY = 'has_subscribed_v1';

export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  trialEnded: boolean;
  daysRemaining: number;
  plan: string;
  expiresAt: Date | null;
}

async function getCachedSubscription(userId: string): Promise<{ plan: string; expiresAt: Date | null } | null> {
  try {
    const raw = await AsyncStorage.getItem(`${SUBSCRIPTION_CACHE_KEY}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const expiresAt = parsed?.expiresAt ? new Date(parsed.expiresAt) : null;
    const plan = String(parsed?.plan || '');
    if (!plan) return null;
    return { plan, expiresAt };
  } catch {
    return null;
  }
}

async function setCachedSubscription(userId: string, plan: string, expiresAt: Date | null): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${SUBSCRIPTION_CACHE_KEY}:${userId}`,
      JSON.stringify({ plan, expiresAt: expiresAt ? expiresAt.toISOString() : null })
    );
  } catch {}
}

async function clearCachedSubscription(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${SUBSCRIPTION_CACHE_KEY}:${userId}`);
  } catch {}
}

async function getHasSubscribed(userId: string): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(`${HAS_SUBSCRIBED_KEY}:${userId}`);
    return v === '1';
  } catch {
    return false;
  }
}

export async function markUserHasSubscribed(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${HAS_SUBSCRIBED_KEY}:${userId}`, '1');
  } catch {}
}

export async function cacheActiveSubscription(userId: string, plan: string, expiresAt: Date | null): Promise<void> {
  await setCachedSubscription(userId, plan, expiresAt);
  await markUserHasSubscribed(userId);
}

/**
 * Get user's subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  try {
    // Check for active paid subscription in database
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && subscription) {
      // User has active paid subscription
      const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
      const isExpired = expiresAt ? expiresAt < new Date() : false;

      if (!isExpired) {
        await cacheActiveSubscription(userId, subscription.plan, expiresAt);
        return {
          isActive: true,
          isTrial: false,
          trialEnded: false,
          daysRemaining: expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999,
          plan: subscription.plan,
          expiresAt,
        };
      }

      // If the DB still says "active" but the expiry has passed, mark it expired (best-effort).
      // This keeps the subscriptions table accurate even without a server-side cron.
      try {
        await clearCachedSubscription(userId);
        await supabase
          .from('subscriptions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', subscription.id);
      } catch {}
    }

    // Fallback: if DB read fails or returns nothing, honor locally cached subscription until it expires.
    // This prevents repeatedly prompting a user who has already paid when the device is offline or RLS blocks reads.
    const cached = await getCachedSubscription(userId);
    if (cached) {
      const expiresAt = cached.expiresAt;
      const isExpired = expiresAt ? expiresAt < new Date() : false;
      if (!isExpired) {
        return {
          isActive: true,
          isTrial: false,
          trialEnded: false,
          daysRemaining: expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999,
          plan: cached.plan,
          expiresAt,
        };
      }
    }

    // Check free trial status
    const trialStatus = await getTrialStatus(userId);

    return {
      isActive: !trialStatus.ended,
      isTrial: true,
      trialEnded: trialStatus.ended,
      daysRemaining: trialStatus.daysRemaining,
      plan: 'free_trial',
      expiresAt: null,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    // Default to trial active in case of error
    return {
      isActive: true,
      isTrial: true,
      trialEnded: false,
      daysRemaining: TRIAL_DURATION_DAYS,
      plan: 'free',
      expiresAt: null,
    };
  }
}

/**
 * Get trial status for a user
 */
async function getTrialStatus(userId: string): Promise<{ started: Date; ended: boolean; daysRemaining: number }> {
  try {
    // Get trial start date from AsyncStorage
    const trialStartStr = await AsyncStorage.getItem(`${TRIAL_START_KEY}_${userId}`);
    
    let trialStart: Date;
    
    if (trialStartStr) {
      trialStart = new Date(trialStartStr);
    } else {
      // First time user - start trial now
      trialStart = new Date();
      await AsyncStorage.setItem(`${TRIAL_START_KEY}_${userId}`, trialStart.toISOString());
    }

    // Calculate days since trial started
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, TRIAL_DURATION_DAYS - daysSinceStart);
    const ended = daysSinceStart >= TRIAL_DURATION_DAYS;

    return {
      started: trialStart,
      ended,
      daysRemaining,
    };
  } catch (error) {
    console.error('Error getting trial status:', error);
    return {
      started: new Date(),
      ended: false,
      daysRemaining: TRIAL_DURATION_DAYS,
    };
  }
}

/**
 * Check if user should be shown subscription prompt
 */
export async function shouldShowSubscriptionPrompt(userId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(userId);
  if (status.isActive) return false;
  const hasSubscribed = await getHasSubscribed(userId);
  return status.trialEnded || hasSubscribed;
}

/**
 * Reset trial (for testing purposes only)
 */
export async function resetTrial(userId: string): Promise<void> {
  await AsyncStorage.removeItem(`${TRIAL_START_KEY}_${userId}`);
}

/**
 * Get trial days remaining message
 */
export function getTrialMessage(daysRemaining: number): string {
  if (daysRemaining === 0) {
    return 'Your free trial has ended';
  } else if (daysRemaining === 1) {
    return '1 day left in your free trial';
  } else {
    return `${daysRemaining} days left in your free trial`;
  }
}

/**
 * Get trial status description
 */
export function getTrialStatusDescription(status: SubscriptionStatus): string {
  if (!status.isTrial) {
    return 'Subscription active';
  }
  
  if (status.trialEnded) {
    return 'Free trial ended';
  } else {
    const daysRemaining = status.daysRemaining;
    return `${daysRemaining} days left in your free trial`;
  }
}

// Daily rewarded access via ads has been removed.
