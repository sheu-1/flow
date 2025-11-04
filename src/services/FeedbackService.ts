import { supabase } from './SupabaseClient';

export async function submitFeedback(userId: string, message: string): Promise<{ success: boolean; error?: any }> {
  try {
    const payload = {
      user_id: userId,
      message,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('feedback').insert([payload]);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
