-- Clean Installation Script for Enhanced Cashflow Tracker Database
-- This script drops existing tables and creates the new enhanced schema

-- Step 1: Drop all existing tables and functions (WARNING: This deletes all data!)
DROP TABLE IF EXISTS public.budget_alerts CASCADE;
DROP TABLE IF EXISTS public.savings_goals CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS get_spending_trends CASCADE;
DROP FUNCTION IF EXISTS get_monthly_spending_by_category CASCADE;
DROP FUNCTION IF EXISTS get_savings_streak CASCADE;
DROP FUNCTION IF EXISTS create_default_categories_for_user CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Drop any existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Create the enhanced schema
-- (Copy the entire content of supabase_enhanced_migration.sql below, starting from line after this comment)

-- Create user preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'KES',
  timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_parsing_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create categories table for better organization
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, type)
);

-- Enhanced transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.categories(id),
  category TEXT, -- Legacy support, will be deprecated
  description TEXT,
  sender TEXT,
  location JSONB, -- {lat, lng, address}
  payment_method TEXT, -- 'cash', 'card', 'mobile_money', 'bank_transfer'
  reference_number TEXT, -- Transaction reference from SMS or manual entry
  tags TEXT[], -- Array of tags for flexible categorization
  metadata JSONB, -- Additional data like SMS parsing info
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  alert_threshold NUMERIC DEFAULT 0.8 CHECK (alert_threshold BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create savings goals table
CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  category TEXT NOT NULL CHECK (category IN ('emergency', 'vacation', 'purchase', 'investment', 'other')),
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  emoji TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#4ECDC4',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create budget alerts table for notifications
CREATE TABLE public.budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_reached', 'budget_exceeded', 'period_ending')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create performance indexes
CREATE INDEX idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX idx_transactions_category ON public.transactions (category_id);
CREATE INDEX idx_transactions_type_date ON public.transactions (user_id, type, date DESC);
CREATE INDEX idx_transactions_reference ON public.transactions (reference_number);
CREATE INDEX idx_budgets_user_active ON public.budgets (user_id, is_active);
CREATE INDEX idx_savings_goals_user_active ON public.savings_goals (user_id, is_active);
CREATE INDEX idx_budget_alerts_user_unread ON public.budget_alerts (user_id, is_read);

-- Enable Row Level Security on all tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for categories
CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for transactions
CREATE POLICY "Users can manage own transactions" ON public.transactions
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for budgets
CREATE POLICY "Users can manage own budgets" ON public.budgets
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for savings_goals
CREATE POLICY "Users can manage own savings goals" ON public.savings_goals
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for budget_alerts
CREATE POLICY "Users can manage own budget alerts" ON public.budget_alerts
  FOR ALL USING (user_id = auth.uid());

-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories_for_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert default expense categories
  INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
  (p_user_id, 'Food & Dining', 'expense', 'restaurant', '#FF6B6B', true),
  (p_user_id, 'Transportation', 'expense', 'car', '#4ECDC4', true),
  (p_user_id, 'Shopping', 'expense', 'bag', '#45B7D1', true),
  (p_user_id, 'Entertainment', 'expense', 'game-controller', '#96CEB4', true),
  (p_user_id, 'Bills & Utilities', 'expense', 'receipt', '#FFEAA7', true),
  (p_user_id, 'Healthcare', 'expense', 'medical', '#DDA0DD', true),
  (p_user_id, 'Education', 'expense', 'school', '#98D8C8', true),
  -- Default income categories
  (p_user_id, 'Salary', 'income', 'card', '#2ECC71', true),
  (p_user_id, 'Freelance', 'income', 'laptop', '#3498DB', true),
  (p_user_id, 'Investment', 'income', 'trending-up', '#9B59B6', true),
  (p_user_id, 'Business', 'income', 'briefcase', '#E67E22', true);
  
  -- Insert default user preferences
  INSERT INTO public.user_preferences (user_id, currency, timezone, theme)
  VALUES (p_user_id, 'KES', 'Africa/Nairobi', 'dark')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default categories and preferences for the new user
  PERFORM create_default_categories_for_user(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create default data when a user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Enhanced Cashflow Tracker database installed successfully!' as status;
