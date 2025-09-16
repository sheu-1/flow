import { supabase } from './SupabaseClient';

export type SmsTransactionRow = {
  transaction_type: 'income' | 'expense' | null;
  amount: number | null;
  service_provider: string | null;
  time: Date | null;
  reference_id: string | null;
  raw_message: string;
};

export async function saveSmsTransaction(row: SmsTransactionRow) {
  try {
    const payload = {
      transaction_type: row.transaction_type,
      amount: row.amount,
      service_provider: row.service_provider,
      time: row.time ? row.time.toISOString() : new Date().toISOString(),
      reference_id: row.reference_id,
      raw_message: row.raw_message,
    };
    const { error } = await supabase.from('sms_transactions').insert(payload);
    if (error) throw error;
  } catch (e) {
    console.warn('[SMS] Failed to save to Supabase', e);
  }
}
