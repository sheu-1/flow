import { supabase } from './SupabaseClient';
import type { ParsedTransaction } from '../utils/SMSParser';

export type SupabaseInsertPayload = {
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string | null;
  sender: string | null;
  metadata: Record<string, any> | null;
  date: string; // ISO
};

// Duplicate if same reference for user OR same amount and date within 5 minutes for user
async function detectDuplicate(userId: string, parsed: ParsedTransaction) {
  const dateISO = parsed.dateISO || new Date().toISOString();
  const date = new Date(dateISO);
  const minus5 = new Date(date.getTime() - 5 * 60 * 1000).toISOString();
  const plus5 = new Date(date.getTime() + 5 * 60 * 1000).toISOString();

  if (parsed.reference) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .filter('metadata->>reference', 'eq', parsed.reference)
      .limit(1);
    if (!error && data && data.length > 0) return data[0];
  }
  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount, date')
    .eq('user_id', userId)
    .eq('amount', parsed.amount)
    .gte('date', minus5)
    .lte('date', plus5)
    .limit(1);
  if (!error && data && data.length > 0) return data[0];
  return null;
}

export async function clearUserTransactions(userId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from('transactions').delete().eq('user_id', userId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function insertTransactionSupabase(
  parsed: ParsedTransaction,
  userId: string
): Promise<{ success: boolean; error?: any; skipped?: boolean }> {
  try {
    const duplicate = await detectDuplicate(userId, parsed);
    if (duplicate) {
      return { success: true, skipped: true };
    }

    const payload: SupabaseInsertPayload = {
      user_id: userId,
      type: parsed.type === 'credit' ? 'income' : 'expense',
      amount: parsed.amount,
      category: 'SMS Import', // Default category for SMS transactions
      sender: parsed.sender ?? null,
      metadata: {
        reference: parsed.reference,
        message: parsed.message,
        source: 'sms',
        parsed_at: new Date().toISOString()
      },
      date: parsed.dateISO || new Date().toISOString(),
    };

    const { error } = await supabase.from('transactions').insert([payload]);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
