-- Enhanced Supabase Migration for Cashflow Tracker
-- This creates a comprehensive database schema for advanced analytics and insights

-- Drop existing tables if they exist (WARNING: This will delete all data)
DROP TABLE IF EXISTS public.budget_alerts CASCADE;
DROP TABLE IF EXISTS public.savings_goals CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;

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

-- Create functions for analytics and insights

-- Function to calculate monthly spending by category
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

-- Function to get savings streak
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
    -- Calculate savings for this month
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
    
    -- Safety check to avoid infinite loop
    IF streak > 24 THEN -- Max 2 years
      EXIT;
    END IF;
  END LOOP;
  
  RETURN streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get spending trends (time series data)
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
    
  ELSE -- monthly
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
