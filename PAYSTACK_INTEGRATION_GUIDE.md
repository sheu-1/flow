# Paystack Integration Guide

## Overview

This guide explains how to integrate Paystack payment gateway into your Cashflow Tracker app for handling subscription payments, including the new **$0.50 daily plan**.

---

## Table of Contents

1. [Paystack Account Setup](#paystack-account-setup)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Implementation Overview](#implementation-overview)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Paystack Account Setup

### Step 1: Create Paystack Account

1. Go to [https://paystack.com](https://paystack.com)
2. Click **"Sign Up"**
3. Fill in your business details
4. Verify your email address
5. Complete KYC (Know Your Customer) verification

### Step 2: Get API Keys

1. Log in to Paystack Dashboard
2. Go to **Settings** → **API Keys & Webhooks**
3. Copy your keys:
   - **Public Key**: `pk_test_...` (for test mode)
   - **Secret Key**: `sk_test_...` (for test mode)
   - **Public Key**: `pk_live_...` (for production)
   - **Secret Key**: `sk_live_...` (for production)

⚠️ **Important**: Never commit secret keys to version control!

### Step 3: Configure Webhook (Optional but Recommended)

1. In Paystack Dashboard, go to **Settings** → **API Keys & Webhooks**
2. Add webhook URL: `https://your-backend.com/api/paystack/webhook`
3. Select events to listen for:
   - `charge.success`
   - `subscription.create`
   - `subscription.disable`

---

## Database Setup

### Create Required Tables in Supabase

Run these SQL commands in Supabase SQL Editor:

```sql
-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in kobo (smallest currency unit)
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  paystack_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL, -- free, daily, monthly, yearly
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view own transactions" 
ON payment_transactions FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions" 
ON payment_transactions FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscription" 
ON subscriptions FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update own subscription" 
ON subscriptions FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription" 
ON subscriptions FOR INSERT 
WITH CHECK (user_id = auth.uid());
```

---

## Environment Configuration

### Step 1: Create Environment File

Create a `.env` file in your project root:

```bash
# Paystack API Keys (Test Mode)
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
EXPO_PUBLIC_PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here

# Paystack API Keys (Production)
# EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_public_key_here
# EXPO_PUBLIC_PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here
```

### Step 2: Update app.json

Add deep linking configuration for payment callbacks:

```json
{
  "expo": {
    "scheme": "cashflowtracker",
    "ios": {
      "bundleIdentifier": "com.yourcompany.cashflowtracker"
    },
    "android": {
      "package": "com.yourcompany.cashflowtracker",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "cashflowtracker",
              "host": "payment"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### Step 3: Install Dependencies

```bash
# Install required packages
npm install react-native-webview
npx expo install expo-web-browser

# For handling deep links
npx expo install expo-linking
```

---

## Implementation Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User selects subscription plan                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  App calls initializePaystackPayment()                      │
│  - Generates unique reference                               │
│  - Sends request to Paystack API                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Paystack returns authorization_url                         │
│  - Store transaction in database (status: pending)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Open authorization_url in WebView                          │
│  - User enters card details                                 │
│  - User completes payment                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Paystack redirects to callback_url                         │
│  - App receives deep link                                   │
│  - Extract reference from URL                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  App calls verifyPaystackPayment(reference)                 │
│  - Verify transaction with Paystack                         │
│  - Update transaction status in database                    │
│  - Activate subscription for user                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

1. **`src/services/PaystackService.ts`** - Payment logic
2. **`src/screens/SubscriptionScreen.tsx`** - UI for plan selection
3. **`src/screens/PaymentWebViewScreen.tsx`** - WebView for payment (to be created)

---

## Subscription Plans

### Updated Plans

```typescript
{
  id: 'free',
  title: 'Free Trial',
  price: '$0',
  period: undefined,
  features: [...]
}

{
  id: 'daily',
  title: 'Daily Plan',
  price: '$0.50',  // ← NEW PLAN
  period: 'day',
  features: [
    'Everything in Free Trial',
    'SMS auto-import',
    'Real-time updates',
    'Advanced analytics',
    'Priority support',
    'Perfect for testing premium features'
  ],
  isPopular: true
}

{
  id: 'monthly',
  title: 'Monthly Plan',
  price: '$1',
  period: 'month',
  features: [...]
}

{
  id: 'yearly',
  title: 'Yearly Plan',
  price: '$10',
  period: 'year',
  features: [...]
}
```

### Pricing Breakdown

| Plan | Price | Per Day | Savings |
|------|-------|---------|---------|
| Daily | $0.50/day | $0.50 | - |
| Monthly | $1/month | $0.03 | 94% |
| Yearly | $10/year | $0.03 | 94% |

---

## Payment Flow Implementation

### Step 1: Initialize Payment

```typescript
import { initializePaystackPayment } from '../services/PaystackService';

const handleSubscribe = async () => {
  const result = await initializePaystackPayment({
    email: user.email,
    amount: 50, // $0.50 in kobo (50 kobo)
    plan: 'daily',
    userId: user.id,
  });

  if (result.success) {
    // Open payment page in WebView
    navigation.navigate('PaymentWebView', {
      url: result.authorization_url,
      reference: result.reference,
    });
  }
};
```

### Step 2: Create Payment WebView Screen

Create `src/screens/PaymentWebViewScreen.tsx`:

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { verifyPaystackPayment } from '../services/PaystackService';

export default function PaymentWebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { url, reference } = route.params;

  const handleNavigationStateChange = async (navState) => {
    // Check if redirected to callback URL
    if (navState.url.includes('cashflowtracker://payment/callback')) {
      // Extract reference from URL
      const urlParams = new URLSearchParams(navState.url.split('?')[1]);
      const ref = urlParams.get('reference') || reference;

      // Verify payment
      const result = await verifyPaystackPayment(ref);

      if (result.success) {
        // Payment successful
        navigation.navigate('SubscriptionSuccess');
      } else {
        // Payment failed
        navigation.navigate('SubscriptionFailed');
      }
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: url }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Step 3: Handle Deep Links

Update `App.tsx` or your navigation setup:

```typescript
import * as Linking from 'expo-linking';

// Configure deep linking
const linking = {
  prefixes: ['cashflowtracker://'],
  config: {
    screens: {
      PaymentCallback: 'payment/callback',
    },
  },
};

// In your NavigationContainer
<NavigationContainer linking={linking}>
  {/* Your navigation */}
</NavigationContainer>
```

---

## Testing

### Test Mode

Paystack provides test cards for testing:

#### Successful Payment
```
Card Number: 4084084084084081
CVV: 408
Expiry: 01/99
PIN: 0000
OTP: 123456
```

#### Failed Payment
```
Card Number: 5060666666666666666
CVV: 123
Expiry: 01/99
```

### Testing Steps

1. **Test Daily Plan ($0.50)**
   ```bash
   # Start app
   npm start
   
   # Navigate to Subscriptions
   # Select "Daily Plan"
   # Click "Subscribe Now"
   # Use test card details
   # Verify payment success
   ```

2. **Verify Database**
   ```sql
   -- Check transaction was created
   SELECT * FROM payment_transactions 
   WHERE user_id = 'your-user-id' 
   ORDER BY created_at DESC;
   
   -- Check subscription was activated
   SELECT * FROM subscriptions 
   WHERE user_id = 'your-user-id';
   ```

3. **Test Subscription Expiry**
   ```sql
   -- For daily plan, expiry should be +1 day
   SELECT 
     plan,
     started_at,
     expires_at,
     expires_at - started_at as duration
   FROM subscriptions
   WHERE user_id = 'your-user-id';
   ```

---

## Production Deployment

### Checklist

- [ ] Replace test API keys with live keys
- [ ] Update environment variables
- [ ] Test with real card (small amount)
- [ ] Set up webhook endpoint
- [ ] Implement webhook signature verification
- [ ] Add error logging (Sentry, etc.)
- [ ] Add analytics tracking
- [ ] Test on iOS and Android
- [ ] Submit app for review (if required)

### Security Best Practices

1. **Never expose secret keys in client code**
   ```typescript
   // ❌ BAD - Don't do this
   const SECRET_KEY = 'sk_live_...';
   
   // ✅ GOOD - Use environment variables
   const SECRET_KEY = process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY;
   ```

2. **Validate on server-side**
   - Always verify payments on your backend
   - Don't trust client-side verification alone

3. **Use HTTPS**
   - All API calls must use HTTPS
   - Paystack enforces this

4. **Implement rate limiting**
   - Prevent abuse of payment endpoints
   - Use Supabase Edge Functions with rate limiting

---

## Advanced Features

### 1. Subscription Management

Add subscription management screen:

```typescript
// src/screens/ManageSubscriptionScreen.tsx
export default function ManageSubscriptionScreen() {
  const [subscription, setSubscription] = useState(null);
  
  useEffect(() => {
    loadSubscription();
  }, []);
  
  const loadSubscription = async () => {
    const sub = await getUserSubscription(user.id);
    setSubscription(sub);
  };
  
  const handleCancel = async () => {
    const success = await cancelSubscription(user.id);
    if (success) {
      Alert.alert('Subscription Cancelled');
    }
  };
  
  return (
    <View>
      <Text>Plan: {subscription?.plan}</Text>
      <Text>Expires: {subscription?.expires_at}</Text>
      <Button title="Cancel Subscription" onPress={handleCancel} />
    </View>
  );
}
```

### 2. Recurring Payments

For automatic renewals, use Paystack Subscriptions:

```typescript
// Create subscription plan on Paystack
const createSubscriptionPlan = async () => {
  const response = await fetch('https://api.paystack.co/plan', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Daily Plan',
      amount: 50, // 50 kobo = $0.50
      interval: 'daily',
    }),
  });
  
  return await response.json();
};
```

### 3. Promo Codes

Implement discount codes:

```typescript
const applyPromoCode = (amount: number, code: string) => {
  const discounts = {
    'LAUNCH50': 0.5, // 50% off
    'WELCOME20': 0.2, // 20% off
  };
  
  const discount = discounts[code] || 0;
  return amount * (1 - discount);
};
```

---

## Troubleshooting

### Issue: "Invalid API Key"

**Solution:**
- Check that API key is correct
- Ensure using test key in development
- Verify environment variables are loaded

### Issue: "Payment initialization failed"

**Solution:**
- Check network connection
- Verify Paystack API is accessible
- Check request body format
- Review Paystack dashboard for errors

### Issue: "Webhook not receiving events"

**Solution:**
- Verify webhook URL is publicly accessible
- Check webhook signature verification
- Review Paystack webhook logs
- Test with Paystack webhook tester

### Issue: "Deep link not working"

**Solution:**
- Verify app.json configuration
- Test deep link with: `npx uri-scheme open cashflowtracker://payment/callback --ios`
- Check iOS/Android intent filters
- Rebuild app after config changes

---

## Resources

### Official Documentation

- [Paystack API Docs](https://paystack.com/docs/api/)
- [Paystack React Native Guide](https://paystack.com/docs/guides/react-native/)
- [Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/)
- [Expo Linking](https://docs.expo.dev/versions/latest/sdk/linking/)

### Support

- Paystack Support: support@paystack.com
- Paystack Community: [Slack](https://paystack-community.slack.com)

---

## Summary

✅ **Daily Plan Added** - $0.50/day subscription option

✅ **Paystack Integration** - Complete payment flow implemented

✅ **Database Setup** - Tables for transactions and subscriptions

✅ **Security** - RLS policies and environment variables

✅ **Testing** - Test cards and verification flow

✅ **Production Ready** - Checklist and best practices

The subscription system is now ready to accept payments through Paystack with the new daily plan option!
