-- Database Test Script for Cashflow Tracker
-- Run these queries in Supabase SQL Editor to verify setup and test data insertion

-- 1. Check if all tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('transactions', 'categories', 'user_preferences', 'budgets', 'savings_goals')
ORDER BY table_name;

-- 2. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('transactions', 'categories', 'user_preferences');

-- 3. Check if indexes exist
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'transactions'
ORDER BY indexname;

-- 4. Check if functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('create_default_categories_for_user', 'handle_new_user');

-- 5. Check if triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- 6. Test manual transaction insertion (replace USER_ID with actual user ID from auth.users)
-- First, get your user ID:
SELECT id, email FROM auth.users LIMIT 5;

-- Then insert a test transaction (replace 'YOUR_USER_ID_HERE' with actual ID):
/*
INSERT INTO public.transactions (
  user_id, 
  type, 
  amount, 
  category, 
  description, 
  date
) VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with your actual user ID
  'expense',
  1500,
  'Food & Dining',
  'Test transaction from SQL',
  NOW()
);
*/

-- 7. Check if transaction was inserted
-- SELECT * FROM public.transactions WHERE user_id = 'YOUR_USER_ID_HERE';

-- 8. Test category creation for a user
-- SELECT * FROM public.categories WHERE user_id = 'YOUR_USER_ID_HERE';

-- 9. Check user preferences
-- SELECT * FROM public.user_preferences WHERE user_id = 'YOUR_USER_ID_HERE';

-- 10. Test the analytics functions (replace USER_ID)
/*
SELECT * FROM get_spending_trends('YOUR_USER_ID_HERE', 'monthly', 6);
SELECT * FROM get_monthly_spending_by_category('YOUR_USER_ID_HERE');
SELECT get_savings_streak('YOUR_USER_ID_HERE');
*/
