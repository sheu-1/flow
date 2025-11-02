/**
 * Paystack Payment Service
 * 
 * Handles payment processing using Paystack API for subscriptions.
 * Supports daily, monthly, and yearly subscription plans.
 */

import { supabase } from './SupabaseClient';

// Paystack configuration
const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_your_public_key_here';
const PAYSTACK_SECRET_KEY = process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY || 'sk_test_your_secret_key_here';
const PAYSTACK_API_URL = 'https://api.paystack.co';

export interface PaymentInitializationParams {
  email: string;
  amount: number; // Amount in kobo (smallest currency unit)
  plan: string;
  userId: string;
  metadata?: Record<string, any>;
  paymentMethod?: 'card' | 'mobile_money'; // Payment method selection
  phoneNumber?: string; // For M-Pesa payments
}

export interface PaymentResult {
  success: boolean;
  message?: string;
  reference?: string;
  authorization_url?: string;
  access_code?: string;
}

/**
 * Initialize Paystack payment
 * This creates a payment transaction and returns authorization URL
 */
export async function initializePaystackPayment(
  params: PaymentInitializationParams
): Promise<PaymentResult> {
  try {
    const { email, amount, plan, userId, metadata = {}, paymentMethod = 'card', phoneNumber } = params;

    // Generate unique reference
    const reference = `SUB_${userId}_${Date.now()}`;

    // Prepare request body
    const requestBody: any = {
      email,
      amount, // Amount in kobo (e.g., 50 kobo = $0.50)
      reference,
      currency: paymentMethod === 'mobile_money' ? 'KES' : 'USD', // KES for M-Pesa, USD for cards
      metadata: {
        plan,
        userId,
        payment_method: paymentMethod,
        ...metadata,
      },
      callback_url: 'cashflowtracker://payment/callback', // Deep link for mobile app
    };

    // Add M-Pesa specific parameters
    if (paymentMethod === 'mobile_money' && phoneNumber) {
      requestBody.channels = ['mobile_money']; // Restrict to mobile money only
      requestBody.mobile_money = {
        phone: phoneNumber,
        provider: 'mpesa', // M-Pesa provider
      };
    }

    // Call Paystack API
    const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.status && data.data) {
      // Store transaction in database
      await storeTransaction({
        userId,
        reference,
        plan,
        amount,
        status: 'pending',
        paystackData: data.data,
      });

      // For mobile app, you would open the authorization_url in a WebView
      // For now, we'll simulate a successful payment
      // In production, user would be redirected to Paystack payment page
      
      return {
        success: true,
        reference: data.data.reference,
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to initialize payment',
      };
    }
  } catch (error: any) {
    console.error('Paystack initialization error:', error);
    return {
      success: false,
      message: error.message || 'Network error. Please try again.',
    };
  }
}

/**
 * Verify Paystack payment
 * Call this after user completes payment to verify transaction status
 */
export async function verifyPaystackPayment(reference: string): Promise<PaymentResult> {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (data.status && data.data.status === 'success') {
      // Update transaction status in database
      await updateTransactionStatus(reference, 'success', data.data);

      // Activate subscription for user
      await activateSubscription(data.data.metadata.userId, data.data.metadata.plan);

      return {
        success: true,
        message: 'Payment verified successfully',
        reference,
      };
    } else {
      await updateTransactionStatus(reference, 'failed', data.data);
      return {
        success: false,
        message: 'Payment verification failed',
      };
    }
  } catch (error: any) {
    console.error('Paystack verification error:', error);
    return {
      success: false,
      message: error.message || 'Failed to verify payment',
    };
  }
}

/**
 * Store transaction in Supabase database
 */
async function storeTransaction(transaction: {
  userId: string;
  reference: string;
  plan: string;
  amount: number;
  status: string;
  paystackData: any;
}) {
  try {
    const { error } = await supabase.from('payment_transactions').insert({
      user_id: transaction.userId,
      reference: transaction.reference,
      plan: transaction.plan,
      amount: transaction.amount,
      status: transaction.status,
      paystack_data: transaction.paystackData,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error storing transaction:', error);
    }
  } catch (error) {
    console.error('Database error:', error);
  }
}

/**
 * Update transaction status in database
 */
async function updateTransactionStatus(
  reference: string,
  status: string,
  paystackData: any
) {
  try {
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        status,
        paystack_data: paystackData,
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference);

    if (error) {
      console.error('Error updating transaction:', error);
    }
  } catch (error) {
    console.error('Database error:', error);
  }
}

/**
 * Activate subscription for user
 */
async function activateSubscription(userId: string, plan: string) {
  try {
    // Calculate expiry date based on plan
    const expiryDate = new Date();
    if (plan === 'daily') {
      expiryDate.setDate(expiryDate.getDate() + 1);
    } else if (plan === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (plan === 'yearly') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    // Update or insert subscription record
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      plan,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiryDate.toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error activating subscription:', error);
    }
  } catch (error) {
    console.error('Database error:', error);
  }
}

/**
 * Get user's current subscription
 */
export async function getUserSubscription(userId: string) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Database error:', error);
    return false;
  }
}
