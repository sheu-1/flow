import { supabase } from './SupabaseClient';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export async function createNewConversation(userId: string, title: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: userId, title, messages: [] })
    .select()
    .single();

  if (error) {
    console.error('Error creating new conversation:', error);
    return null;
  }
  return data;
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, user_id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing conversations:', error);
  }
  return data || [];
}

export async function saveChatHistory(conversationId: string, messages: ChatMessage[]): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .update({ messages, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) {
    console.error('Error saving chat history:', error);
  }
}

export async function loadChatHistory(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('messages')
    .eq('id', conversationId)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore 'No rows found' error
    console.error('Error loading chat history:', error);
  }

  return data?.messages || [];
}
