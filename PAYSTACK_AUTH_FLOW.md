# 🔐 Auth Flow & Paystack Integration Guide

## 📋 Recommended User Journey

### 1. **Sign Up Flow**
```
User Opens App
    ↓
Sign Up Screen (Email/Password or Google)
    ↓
Account Created ✓
    ↓
Welcome Screen with Subscription Options
    ↓
[Option A] Start Free Trial (1 month) → Dashboard
[Option B] Choose Paid Plan → Payment → Dashboard
[Option C] Skip for Now → Limited Features
```

### 2. **Where to Place Subscription Screen**

**Best Practice: After Sign Up, Before Full Access**

#### Flow:
1. **User signs up** → Account created
2. **Navigate to `SubscriptionWelcomeScreen`** (NEW)
   - Show benefits of premium
   - Offer 1-month free trial
   - Show pricing plans
3. **User chooses:**
   - **Free Trial** → Activate trial, go to Dashboard
   - **Paid Plan** → Paystack payment → Dashboard
   - **Skip** → Dashboard with limited features (show banner)

---

## 💳 Paystack Integration Steps

### Step 1: Install Paystack Package
```bash
npm install react-native-paystack-webview
```

### Step 2: Get Paystack Keys
1. Sign up at https://paystack.com/
2. Go to **Settings** → **API Keys & Webhooks**
3. Copy your **Public Key** and **Secret Key**

### Step 3: Add Keys to Environment
Create `.env` file:
```env
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxx
```

### Step 4: Create Paystack Service

**File: `src/services/PaystackService.ts`**
```typescript
import { Paystack } from 'react-native-paystack-webview';
import { supabase } from './SupabaseClient';

export interface PaystackPaymentResult {
  success: boolean;
  reference?: string;
  message?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    price: 999, // KES 999
    currency: 'KES',
    interval: 'monthly',
    features: [
      'Unlimited transactions',
      'Advanced analytics',
      'Export to Excel',
      'Priority support',
      'AI-powered insights'
    ]
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    price: 9990, // KES 9,990 (save 17%)
    currency: 'KES',
    interval: 'yearly',
    features: [
      'All Premium Monthly features',
      'Save 17% compared to monthly',
      'Priority feature requests'
    ]
  }
];

/**
 * Initialize a Paystack payment
 */
export async function initiatePayment(
  email: string,
  amount: number,
  planId: string
): Promise<PaystackPaymentResult> {
  try {
    // Amount should be in kobo/pesewas (multiply by 100)
    const amountInKobo = amount * 100;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        currency: 'KES',
        metadata: {
          plan_id: planId,
          custom_fields: [
            {
              display_name: 'Plan',
              variable_name: 'plan_id',
              value: planId,
            },
          ],
        },
      }),
    });

    const data = await response.json();

    if (data.status) {
      return {
        success: true,
        reference: data.data.reference,
      };
    }

    return {
      success: false,
      message: data.message || 'Payment initialization failed',
    };
  } catch (error) {
    console.error('Paystack payment error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

/**
 * Verify payment status
 */
export async function verifyPayment(reference: string): Promise<PaystackPaymentResult> {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (data.status && data.data.status === 'success') {
      return {
        success: true,
        reference: data.data.reference,
        message: 'Payment verified successfully',
      };
    }

    return {
      success: false,
      message: 'Payment verification failed',
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Save subscription to database after successful payment
 */
export async function saveSubscription(
  userId: string,
  planId: string,
  reference: string
): Promise<boolean> {
  try {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) return false;

    const startDate = new Date();
    const endDate = new Date();
    if (plan.interval === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      payment_reference: reference,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      amount: plan.price,
      currency: plan.currency,
    });

    return !error;
  } catch (error) {
    console.error('Save subscription error:', error);
    return false;
  }
}

/**
 * Start free trial
 */
export async function startFreeTrial(userId: string): Promise<boolean> {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month trial

    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan_id: 'free_trial',
      status: 'trial',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      amount: 0,
      currency: 'KES',
    });

    return !error;
  } catch (error) {
    console.error('Start trial error:', error);
    return false;
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .gte('end_date', new Date().toISOString())
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}
```

### Step 5: Update AuthService to Redirect to Subscription

**File: `src/services/AuthService.ts`**
Add this after successful sign up:
```typescript
// After user signs up successfully
navigation.navigate('SubscriptionWelcome');
```

### Step 6: Create Database Table

Run this SQL in Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  payment_reference TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 🎯 Implementation Checklist

- [ ] Install `react-native-paystack-webview`
- [ ] Create Paystack account and get API keys
- [ ] Create `PaystackService.ts`
- [ ] Create `subscriptions` table in Supabase
- [ ] Create `SubscriptionWelcomeScreen.tsx`
- [ ] Update `AuthService.ts` to redirect after signup
- [ ] Add subscription check on app launch
- [ ] Test free trial flow
- [ ] Test payment flow
- [ ] Test subscription expiry handling

---

## 🔗 Navigation Flow

```typescript
// In your navigation stack
<Stack.Screen name="SubscriptionWelcome" component={SubscriptionWelcomeScreen} />

// After sign up in AuthService.ts
if (signUpSuccess) {
  navigation.replace('SubscriptionWelcome', { userId: user.id });
}
```

---

## 📱 Testing Paystack

1. **Test Mode**: Use `pk_test_...` key during development
2. **Test Cards**: 
   - Success: `4084084084084081`
   - Decline: `5060666666666666666`
3. **Go Live**: Switch to `pk_live_...` when ready

---

## 💰 Pricing Recommendations

- **Free Trial**: 1 month, full features
- **Premium Monthly**: KES 999/month (~$7.50)
- **Premium Yearly**: KES 9,990/year (~$75, save 17%)

---

## 🛡️ Security Notes

1. **Never expose** `PAYSTACK_SECRET_KEY` in client code
2. Use Supabase Edge Functions for server-side payment verification
3. Validate all payments server-side before activating subscriptions
4. Set up webhooks to handle payment events

---

For detailed Paystack documentation: https://paystack.com/docs
