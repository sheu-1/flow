/**
 * Subscription Manager
 * 
 * Handles free trial detection and subscription enforcement
 */

import { supabase } from './SupabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRIAL_DURATION_DAYS = 14; // 2 weeks free trial
const TRIAL_START_KEY = 'trial_start_date';

export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  trialEnded: boolean;
  daysRemaining: number;
  plan: string;
  expiresAt: Date | null;
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
      .single();

    if (!error && subscription) {
      // User has active paid subscription
      const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
      const isExpired = expiresAt ? expiresAt < new Date() : false;

      if (!isExpired) {
        return {
          isActive: true,
          isTrial: false,
          trialEnded: false,
          daysRemaining: expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999,
          plan: subscription.plan,
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
      plan: 'free',
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
  return status.trialEnded && !status.isActive;
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
