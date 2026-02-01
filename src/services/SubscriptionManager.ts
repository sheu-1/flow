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
  } catch { }
}

async function clearCachedSubscription(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${SUBSCRIPTION_CACHE_KEY}:${userId}`);
  } catch { }
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
  } catch { }
}

export async function cacheActiveSubscription(userId: string, plan: string, expiresAt: Date | null): Promise<void> {
  await setCachedSubscription(userId, plan, expiresAt);
  await markUserHasSubscribed(userId);
}

// Daily rewarded access via ads
const REWARDED_AD_KEY = 'rewarded_ad_expiry';
const REWARDED_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  trialEnded: boolean;
  daysRemaining: number;
  plan: string;
  expiresAt: Date | null;
  isRewarded?: boolean; // New field for rewarded ads
}

/**
 * Grant rewarded access for 24 hours
 */
export async function grantRewardedAccess(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + REWARDED_DURATION_MS);
  await AsyncStorage.setItem(`${REWARDED_AD_KEY}_${userId}`, expiresAt.toISOString());
}

/**
 * Check if user has active rewarded access
 */
async function getRewardedStatus(userId: string): Promise<{ active: boolean; expiresAt: Date | null }> {
  try {
    const expiryStr = await AsyncStorage.getItem(`${REWARDED_AD_KEY}_${userId}`);
    if (!expiryStr) return { active: false, expiresAt: null };

    const expiresAt = new Date(expiryStr);
    if (expiresAt > new Date()) {
      return { active: true, expiresAt };
    }
    return { active: false, expiresAt: null }; // Expired
  } catch {
    return { active: false, expiresAt: null };
  }
}

/**
 * Get user's subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  try {
    // 1. Check for active paid subscription in database
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
          isRewarded: false,
        };
      }

      // If the DB still says "active" but the expiry has passed, mark it expired (best-effort).
      try {
        await clearCachedSubscription(userId);
        await supabase
          .from('subscriptions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', subscription.id);
      } catch { }
    }

    // 2. Fallback: Local Cache (Paid)
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
          isRewarded: false,
        };
      }
    }

    // 3. Check Free Trial Status
    const trialStatus = await getTrialStatus(userId);
    if (!trialStatus.ended) {
      return {
        isActive: true,
        isTrial: true,
        trialEnded: false,
        daysRemaining: trialStatus.daysRemaining,
        plan: 'free_trial',
        expiresAt: null,
        isRewarded: false,
      };
    }

    // 4. Check Rewarded Ad Status (NEW)
    const rewardedStatus = await getRewardedStatus(userId);
    if (rewardedStatus.active) {
      return {
        isActive: true, // Grants access to features
        isTrial: false,
        trialEnded: true, // Trial is technically over
        daysRemaining: 1,
        plan: 'rewarded',
        expiresAt: rewardedStatus.expiresAt,
        isRewarded: true, // Specific flag for UI to show banner
      };
    }

    // 5. Expired / Free
    return {
      isActive: false, // No access to premium features (unless we want 'free' to have some?)
      isTrial: true,
      trialEnded: true, // Trial ended
      daysRemaining: 0,
      plan: 'free',
      expiresAt: null,
      isRewarded: false,
    };

  } catch (error) {
    console.error('Error getting subscription status:', error);
    // Default to trial active in case of error (safety net)
    return {
      isActive: true,
      isTrial: true,
      trialEnded: false,
      daysRemaining: TRIAL_DURATION_DAYS,
      plan: 'free',
      expiresAt: null,
      isRewarded: false,
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
