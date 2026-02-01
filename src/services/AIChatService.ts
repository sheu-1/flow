import { supabase } from './SupabaseClient';
import { ChatMessage } from './LLM';

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const AIChatService = {
  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<AIConversation[]> {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title: string = 'New Conversation'): Promise<AIConversation> {
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert([{ user_id: userId, title }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<AIMessage[]> {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as AIMessage[];
  },

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<AIMessage> {
    const { data, error } = await supabase
      .from('ai_messages')
      .insert([{
        conversation_id: conversationId,
        role,
        content,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
  },

  /**
   * Save a single message to conversation
   */
  async saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
    // Only save user and assistant messages, filter out system messages
    const role = message.role === 'system' ? 'user' : message.role as 'user' | 'assistant';
    await this.addMessage(conversationId, role, message.content);
  },

  /**
   * Get prompt status for a user
   */
  async getPromptStatus(userId: string): Promise<{ count: number; isPremium: boolean }> {
    const { data, error } = await supabase
      .from('ai_usage')
      .select('prompt_count, is_premium')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching prompt status:', error);
    }

    if (!data) {
      // Create initial usage record
      const { data: newData, error: createError } = await supabase
        .from('ai_usage')
        .insert([{ user_id: userId, prompt_count: 0, is_premium: false }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating usage record:', createError);
        return { count: 0, isPremium: false };
      }
      return { count: newData.prompt_count, isPremium: newData.is_premium };
    }

    return { count: data.prompt_count, isPremium: data.is_premium };
  },

  /**
   * Increment prompt count for a user
   */
  async incrementPromptCount(userId: string): Promise<number> {
    // First get current count
    const { count, isPremium } = await this.getPromptStatus(userId);
    const newCount = count + 1;

    const { error } = await supabase
      .from('ai_usage')
      .update({ prompt_count: newCount, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('Error incrementing prompt count:', error);
      return count;
    }

    return newCount;
  },

  async updateTitle(conversationId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('ai_conversations')
      .update({ title })
      .eq('id', conversationId);

    if (error) throw error;
  },

  /**
   * DAILY LIMIT LOGIC (Client-side enforcement)
   */
  async checkDailyLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      // 1. Check if user is premium (skip limit)
      const { isPremium } = await this.getPromptStatus(userId);
      if (isPremium) return { allowed: true, remaining: 999 };

      // 2. Check daily unlocked status
      const today = new Date().toISOString().split('T')[0];
      const unlockedKey = `chat_unlocked_${userId}_${today}`;
      const isUnlocked = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem(unlockedKey));
      if (isUnlocked === 'true') return { allowed: true, remaining: 999 };

      // 3. Check daily usage
      const countKey = `chat_count_${userId}_${today}`;
      const countStr = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem(countKey));
      const count = countStr ? parseInt(countStr, 10) : 0;
      const LIMIT = 3; // "e chats" -> 3 chats

      if (count >= LIMIT) {
        return { allowed: false, remaining: 0 };
      }

      return { allowed: true, remaining: LIMIT - count };
    } catch (error) {
      console.error('Error checking daily limit:', error);
      // Default to allow if error, to avoid blocking user due to cache error
      return { allowed: true, remaining: 3 };
    }
  },

  async incrementDailyCount(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const countKey = `chat_count_${userId}_${today}`;
      const countStr = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem(countKey));
      const count = countStr ? parseInt(countStr, 10) : 0;

      await import('@react-native-async-storage/async-storage').then(m => m.default.setItem(countKey, (count + 1).toString()));

      // Also increment global count (existing logic)
      await this.incrementPromptCount(userId);
    } catch (error) {
      console.error('Error incrementing daily count:', error);
    }
  },

  async unlockDailyLimit(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const unlockedKey = `chat_unlocked_${userId}_${today}`;
      await import('@react-native-async-storage/async-storage').then(m => m.default.setItem(unlockedKey, 'true'));
    } catch (error) {
      console.error('Error unlocking daily limit:', error);
    }
  }
};

// Legacy exports for backward compatibility
export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export async function createNewConversation(userId: string, title: string): Promise<Conversation | null> {
  try {
    return await AIChatService.createConversation(userId, title);
  } catch (error) {
    console.error('Error creating new conversation:', error);
    return null;
  }
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  try {
    const conversations = await AIChatService.getConversations(userId);
    return conversations.map(conv => ({
      id: conv.id,
      user_id: conv.user_id,
      title: conv.title,
      created_at: conv.created_at
    }));
  } catch (error) {
    console.error('Error listing conversations:', error);
    return [];
  }
}

export async function saveChatHistory(conversationId: string, messages: ChatMessage[]): Promise<void> {
  try {
    // Clear existing messages
    await supabase
      .from('ai_messages')
      .delete()
      .eq('conversation_id', conversationId);

    // Add all messages
    for (const message of messages) {
      await AIChatService.addMessage(conversationId, message.role as 'user' | 'assistant', message.content);
    }
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
}

export async function loadChatHistory(conversationId: string): Promise<ChatMessage[]> {
  try {
    const messages = await AIChatService.getMessages(conversationId);
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
}
