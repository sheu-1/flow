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
    async createConversation(userId: string, title: string): Promise<AIConversation> {
        const { data, error } = await supabase
            .from('ai_conversations')
            .insert({
                user_id: userId,
                title,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
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
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Add a message to a conversation
     */
    async addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<AIMessage> {
        const { data, error } = await supabase
            .from('ai_messages')
            .insert({
                conversation_id: conversationId,
                role,
                content,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Update conversation's updated_at
        await supabase
            .from('ai_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        return data;
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

    /**
     * Update conversation title (e.g., from first message)
     */
    async updateTitle(conversationId: string, title: string): Promise<void> {
        const { error } = await supabase
            .from('ai_conversations')
            .update({ title })
            .eq('id', conversationId);

        if (error) throw error;
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
      await AIChatService.addMessage(conversationId, message.role, message.content);
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
