-- Fix for Feedback Table Schema Cache Issue
-- Run this in your Supabase SQL Editor

-- 1. Create feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS (Row Level Security)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
-- Allow users to insert their own feedback
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
CREATE POLICY "Users can insert their own feedback" 
ON public.feedback FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own feedback (optional)
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
CREATE POLICY "Users can view their own feedback" 
ON public.feedback FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT, SELECT ON public.feedback TO authenticated;

-- 5. Refresh the schema cache (this helps with the cache issue)
NOTIFY pgrst, 'reload schema';

-- 6. Verify the table exists and is accessible
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'feedback'
ORDER BY ordinal_position;
