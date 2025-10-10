-- Complete Database Schema for Cashflow Tracker
-- This SQL creates all necessary tables, indexes, RLS policies, and functions
-- Compatible with the existing React Native + Supabase codebase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (WARNING: This will delete all data)
DROP TABLE IF EXISTS public.budget_alerts CASCADE;
DROP TABLE IF EXISTS public.savings_goals CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;

-- ===============================
-- CORE TABLES
-- ===============================

-- User preferences table for app settings
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'KES',
  timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_parsing_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories table for transaction categorization
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, type)
);

-- Main transactions table - compatible with existing Transaction interface
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.categories(id),
  category TEXT, -- Legacy support for existing code
  description TEXT,
  sender TEXT, -- For SMS parsing (M-Pesa sender names)
  location JSONB, -- {lat, lng, address} for future features
  payment_method TEXT, -- 'cash', 'card', 'mobile_money', 'bank_transfer'
  reference_number TEXT, -- Transaction reference from SMS
  tags TEXT[], -- Array of tags for flexible categorization
  metadata JSONB, -- SMS parsing data and other metadata
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Budgets table for budget management
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Savings goals table for financial planning
CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Budget alerts table for notifications
CREATE TABLE public.budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_reached', 'budget_exceeded', 'period_ending')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================
-- PERFORMANCE INDEXES
-- ===============================

-- Critical indexes for transaction queries
CREATE INDEX idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX idx_transactions_user_type_date ON public.transactions (user_id, type, date DESC);
CREATE INDEX idx_transactions_category_id ON public.transactions (category_id);
CREATE INDEX idx_transactions_reference ON public.transactions (reference_number);
CREATE INDEX idx_transactions_date_only ON public.transactions (date);
CREATE INDEX idx_transactions_amount ON public.transactions (amount);

-- Indexes for categories
CREATE INDEX idx_categories_user_type ON public.categories (user_id, type);
CREATE INDEX idx_categories_name ON public.categories (name);

-- Indexes for budgets and goals
CREATE INDEX idx_budgets_user_active ON public.budgets (user_id, is_active);
CREATE INDEX idx_budgets_period ON public.budgets (period, start_date, end_date);
CREATE INDEX idx_savings_goals_user_active ON public.savings_goals (user_id, is_active);
CREATE INDEX idx_budget_alerts_user_unread ON public.budget_alerts (user_id, is_read);

-- ===============================
-- ROW LEVEL SECURITY (RLS)
-- ===============================

-- Enable RLS on all tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own transactions" ON public.transactions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own budgets" ON public.budgets
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own savings goals" ON public.savings_goals
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own budget alerts" ON public.budget_alerts
  FOR ALL USING (user_id = auth.uid());

-- ===============================
-- ANALYTICS FUNCTIONS
-- ===============================

-- Function to get monthly spending by category (used by AnalyticsService)
CREATE OR REPLACE FUNCTION get_monthly_spending_by_category(
  p_user_id UUID,
  p_start_date DATE DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_end_date DATE DEFAULT (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date
)
RETURNS TABLE (
  category TEXT,
  total_amount NUMERIC,
  transaction_count INTEGER,
  avg_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(c.name, t.category, 'Uncategorized') as category,
    SUM(t.amount) as total_amount,
    COUNT(*)::INTEGER as transaction_count,
    AVG(t.amount) as avg_amount
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = p_user_id 
    AND t.type = 'expense'
    AND t.date::date BETWEEN p_start_date AND p_end_date
  GROUP BY COALESCE(c.name, t.category, 'Uncategorized')
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate savings streak (used by AnalyticsService)
CREATE OR REPLACE FUNCTION get_savings_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  month_date DATE;
  monthly_savings NUMERIC;
BEGIN
  -- Start from current month and go backwards
  month_date := date_trunc('month', CURRENT_DATE)::date;
  
  LOOP
    -- Calculate net savings for this month (income - expenses)
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
    INTO monthly_savings
    FROM transactions 
    WHERE user_id = p_user_id 
      AND date >= month_date 
      AND date < month_date + interval '1 month';
    
    -- If savings are positive, increment streak
    IF monthly_savings > 0 THEN
      streak := streak + 1;
      month_date := month_date - interval '1 month';
    ELSE
      EXIT; -- Break the streak
    END IF;
    
    -- Safety check to avoid infinite loop (max 2 years)
    IF streak > 24 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get spending trends (used by AnalyticsService)
CREATE OR REPLACE FUNCTION get_spending_trends(
  p_user_id UUID,
  p_period TEXT DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly'
  p_months_back INTEGER DEFAULT 12
)
RETURNS TABLE (
  period_start DATE,
  period_end DATE,
  income NUMERIC,
  expenses NUMERIC,
  net_savings NUMERIC,
  transaction_count INTEGER
) AS $$
BEGIN
  IF p_period = 'daily' THEN
    RETURN QUERY
    SELECT 
      d.day::date as period_start,
      d.day::date as period_end,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0) as income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) as expenses,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net_savings,
      COUNT(t.id)::INTEGER as transaction_count
    FROM generate_series(
      CURRENT_DATE - interval '30 days',
      CURRENT_DATE,
      '1 day'::interval
    ) d(day)
    LEFT JOIN transactions t ON t.user_id = p_user_id AND t.date::date = d.day::date
    GROUP BY d.day
    ORDER BY d.day;
    
  ELSIF p_period = 'weekly' THEN
    RETURN QUERY
    SELECT 
      date_trunc('week', w.week)::date as period_start,
      (date_trunc('week', w.week) + interval '6 days')::date as period_end,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0) as income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) as expenses,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net_savings,
      COUNT(t.id)::INTEGER as transaction_count
    FROM generate_series(
      date_trunc('week', CURRENT_DATE - interval '12 weeks'),
      date_trunc('week', CURRENT_DATE),
      '1 week'::interval
    ) w(week)
    LEFT JOIN transactions t ON t.user_id = p_user_id 
      AND date_trunc('week', t.date) = date_trunc('week', w.week)
    GROUP BY w.week
    ORDER BY w.week;
    
  ELSE -- monthly (default)
    RETURN QUERY
    SELECT 
      date_trunc('month', m.month)::date as period_start,
      (date_trunc('month', m.month) + interval '1 month - 1 day')::date as period_end,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0) as income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) as expenses,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net_savings,
      COUNT(t.id)::INTEGER as transaction_count
    FROM generate_series(
      date_trunc('month', CURRENT_DATE - (p_months_back || ' months')::interval),
      date_trunc('month', CURRENT_DATE),
      '1 month'::interval
    ) m(month)
    LEFT JOIN transactions t ON t.user_id = p_user_id 
      AND date_trunc('month', t.date) = date_trunc('month', m.month)
    GROUP BY m.month
    ORDER BY m.month;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- USER SETUP FUNCTIONS
-- ===============================

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
  (p_user_id, 'Other', 'expense', 'more-horizontal', '#95A5A6', true),
  -- Default income categories
  (p_user_id, 'Salary', 'income', 'card', '#2ECC71', true),
  (p_user_id, 'Freelance', 'income', 'laptop', '#3498DB', true),
  (p_user_id, 'Investment', 'income', 'trending-up', '#9B59B6', true),
  (p_user_id, 'Business', 'income', 'briefcase', '#E67E22', true),
  (p_user_id, 'Other', 'income', 'more-horizontal', '#27AE60', true);
  
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

-- ===============================
-- TRIGGERS
-- ===============================

-- Trigger to automatically create default data when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at 
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at 
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- PERMISSIONS
-- ===============================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===============================
-- COMMENTS FOR DOCUMENTATION
-- ===============================

COMMENT ON TABLE public.transactions IS 'Main transactions table compatible with React Native app Transaction interface';
COMMENT ON COLUMN public.transactions.metadata IS 'JSONB field for SMS parsing data and other flexible metadata';
COMMENT ON COLUMN public.transactions.category IS 'Legacy category field for backward compatibility';
COMMENT ON COLUMN public.transactions.sender IS 'Sender name from SMS parsing (e.g., M-Pesa sender)';

COMMENT ON FUNCTION get_monthly_spending_by_category(UUID, DATE, DATE) IS 'Analytics function used by AnalyticsService.getCategoryBreakdown()';
COMMENT ON FUNCTION get_savings_streak(UUID) IS 'Analytics function used by AnalyticsService.getSavingsStreak()';
COMMENT ON FUNCTION get_spending_trends(UUID, TEXT, INTEGER) IS 'Analytics function used by AnalyticsService.getSpendingTrends()';

-- ===============================
-- COMPLETION MESSAGE
-- ===============================

DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Tables created: user_preferences, categories, transactions, budgets, savings_goals, budget_alerts';
  RAISE NOTICE 'Analytics functions: get_monthly_spending_by_category, get_savings_streak, get_spending_trends';
  RAISE NOTICE 'RLS policies enabled for all tables';
  RAISE NOTICE 'Default categories will be created automatically for new users';
END $$;
