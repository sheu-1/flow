import NetInfo from '@react-native-community/netinfo';
import { supabase } from './AuthService';
import {
  insertTransaction,
  getUnsyncedTransactions,
  markTransactionsSynced,
  SQLiteTransactionRow,
} from './Database';

export type NewTransactionInput = {
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date?: Date; // default now
  sender?: string | null;
};

export async function saveToSQLite(tx: NewTransactionInput) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const row: Omit<SQLiteTransactionRow, 'synced'> & { synced?: number } = {
    id,
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    sender: tx.sender ?? null,
    description: tx.description,
    date: (tx.date ?? new Date()).toISOString(),
  } as any;
  await insertTransaction(row);
  return id;
}

export async function getUnsyncedFromSQLite() {
  return getUnsyncedTransactions();
}

export async function syncTransactions(userId: string) {
  // Check connectivity
  const state = await NetInfo.fetch();
  if (!state.isConnected || !state.isInternetReachable) return { synced: 0 };

  const unsynced = await getUnsyncedTransactions();
  if (unsynced.length === 0) return { synced: 0 };

  const payload = unsynced.map((t) => ({
    id: t.id,
    user_id: userId,
    type: t.type,
    amount: t.amount,
    category: t.category,
    sender: t.sender,
    date: t.date,
  }));

  const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
  if (error) throw error;

  await markTransactionsSynced(unsynced.map((t) => t.id));
  return { synced: unsynced.length };
}
