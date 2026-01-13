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
    async getMessages(conversationId: string): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('ai_messages')
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return (data || []) as ChatMessage[];
    },

    /**
     * Save a message to a conversation
     */
    async saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
        const { error } = await supabase
            .from('ai_messages')
            .insert([{
                conversation_id: conversationId,
                role: message.role,
                content: message.content
            }]);

        if (error) throw error;

        // Update conversation timestamp
        await supabase
            .from('ai_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);
    },

    /**
     * Get user's prompt count and premium status
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
