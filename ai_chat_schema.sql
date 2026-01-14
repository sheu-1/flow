-- AI Chat History and Prompt Tracking Schema
-- Run this in your Supabase SQL Editor

-- 1. Create AI Conversations table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create AI Messages table
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create AI Usage table for prompt tracking
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_count INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
CREATE POLICY "Users can manage own conversations" ON public.ai_conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own messages" ON public.ai_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view/update own usage" ON public.ai_usage
  FOR ALL USING (user_id = auth.uid());

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages (conversation_id, created_at ASC);

-- 7. Trigger for updating updated_at on conversations
CREATE OR REPLACE FUNCTION update_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ai_conversation_timestamp ON public.ai_conversations;
CREATE TRIGGER trigger_update_ai_conversation_timestamp
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_ai_conversation_timestamp();

DROP TRIGGER IF EXISTS trigger_update_ai_usage_timestamp ON public.ai_usage;
CREATE TRIGGER trigger_update_ai_usage_timestamp
  BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW EXECUTE FUNCTION update_ai_conversation_timestamp();
