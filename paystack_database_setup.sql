-- Paystack Integration Database Setup
-- Run this SQL in your Supabase SQL Editor to add payment and subscription tables

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
  paystack_customer_code TEXT, -- For recurring payments
  paystack_subscription_code TEXT, -- For recurring payments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view own payment transactions" 
ON payment_transactions FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payment transactions" 
ON payment_transactions FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can update payment transactions" 
ON payment_transactions FOR UPDATE 
USING (true); -- Allow service role to update for webhook processing

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

CREATE POLICY "Service role can manage subscriptions" 
ON subscriptions FOR ALL 
USING (true); -- Allow service role for webhook processing

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_record RECORD;
BEGIN
  SELECT * INTO subscription_record
  FROM subscriptions 
  WHERE user_id = p_user_id 
    AND status = 'active' 
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current subscription plan
CREATE OR REPLACE FUNCTION get_user_subscription_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_plan TEXT;
BEGIN
  SELECT plan INTO user_plan
  FROM subscriptions 
  WHERE user_id = p_user_id 
    AND status = 'active' 
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(user_plan, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire subscriptions (run this periodically)
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE subscriptions 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to both tables
CREATE TRIGGER update_payment_transactions_updated_at 
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON payment_transactions TO authenticated;
GRANT ALL ON subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_plan(UUID) TO authenticated;

-- Insert default free subscription for existing users (optional)
-- Uncomment the following if you want to give all existing users a free subscription
/*
INSERT INTO subscriptions (user_id, plan, status, started_at)
SELECT id, 'free', 'active', NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;
*/

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Paystack database setup completed successfully!';
  RAISE NOTICE 'Tables created: payment_transactions, subscriptions';
  RAISE NOTICE 'Functions created: has_active_subscription, get_user_subscription_plan, expire_subscriptions';
  RAISE NOTICE 'RLS policies enabled for data security';
  RAISE NOTICE 'Remember to set up your Paystack API keys in environment variables';
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT
  cron.schedule(
    'expire_subscriptions_hourly',
    '0 * * * *',
    $$select public.expire_subscriptions();$$
  );
