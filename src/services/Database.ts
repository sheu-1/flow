import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_NAME = 'cashflow.db';

// Conditionally require expo-sqlite only on native to avoid web bundling of wa-sqlite
let SQLite: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SQLite = require('expo-sqlite');
}

type SQLiteDatabase = any;

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDB(): Promise<SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not used on web');
  }
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise!;
}

export async function initDB() {
  if (Platform.OS === 'web') return;
  const database = await getDB();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      sender TEXT,
      description TEXT,
      date TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);
}

export interface SQLiteTransactionRow {
  id: string;
  type: string; // 'income' | 'expense' | 'credit' | 'debit'
  amount: number;
  category: string | null;
  sender: string | null;
  description?: string | null;
  date: string; // ISO string
  synced: number; // 0 or 1
}

const WEB_STORE_KEY = 'db_transactions_v1';

export async function insertTransaction(row: Omit<SQLiteTransactionRow, 'synced'> & { synced?: number }) {
  if (Platform.OS === 'web') {
    const synced = row.synced ?? 0;
    const raw = await AsyncStorage.getItem(WEB_STORE_KEY);
    const arr: SQLiteTransactionRow[] = raw ? JSON.parse(raw) : [];
    const next: SQLiteTransactionRow = {
      id: row.id,
      type: row.type,
      amount: row.amount,
      category: row.category ?? null,
      sender: row.sender ?? null,
      description: (row as any).description ?? null,
      date: row.date,
      synced,
    };
    const idx = arr.findIndex(t => t.id === next.id);
    if (idx >= 0) arr[idx] = next; else arr.unshift(next);
    await AsyncStorage.setItem(WEB_STORE_KEY, JSON.stringify(arr));
    return;
  }

  const database = await getDB();
  const synced = row.synced ?? 0;
  await database.runAsync(
    `INSERT OR REPLACE INTO transactions (id, type, amount, category, sender, description, date, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [row.id, row.type, row.amount, row.category ?? null, row.sender ?? null, (row as any).description ?? null, row.date, synced]
  );
}

export async function getUnsyncedTransactions(): Promise<SQLiteTransactionRow[]> {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem(WEB_STORE_KEY);
    const arr: SQLiteTransactionRow[] = raw ? JSON.parse(raw) : [];
    return arr.filter(t => t.synced === 0);
  }
  const database = await getDB();
  const result = await database.getAllAsync(
    `SELECT id, type, amount, category, sender, date, synced FROM transactions WHERE synced = 0;`
  );
  return result as SQLiteTransactionRow[];
}

export async function markTransactionsSynced(ids: string[]) {
  if (ids.length === 0) return;
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem(WEB_STORE_KEY);
    const arr: SQLiteTransactionRow[] = raw ? JSON.parse(raw) : [];
    for (const id of ids) {
      const idx = arr.findIndex(t => t.id === id);
      if (idx >= 0) arr[idx].synced = 1;
    }
    await AsyncStorage.setItem(WEB_STORE_KEY, JSON.stringify(arr));
    return;
  }
  const database = await getDB();
  const placeholders = ids.map(() => '?').join(',');
  await database.runAsync(`UPDATE transactions SET synced = 1 WHERE id IN (${placeholders});`, ids);
}

export async function getAllTransactions(): Promise<SQLiteTransactionRow[]> {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem(WEB_STORE_KEY);
    const arr: SQLiteTransactionRow[] = raw ? JSON.parse(raw) : [];
    // Sort newest first
    arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return arr;
  }
  const database = await getDB();
  const result = await database.getAllAsync(
    `SELECT id, type, amount, category, sender, date, synced FROM transactions ORDER BY date DESC;`
  );
  return result as SQLiteTransactionRow[];
}
