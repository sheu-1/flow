import { useEffect, useRef } from 'react';
import { supabase } from '../services/SupabaseClient';

export type TxnChange = {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  record: any | null;
  old_record?: any | null;
};

/**
 * Subscribe to realtime changes in the `transactions` table for a specific user.
 * Invokes the provided callback when any INSERT/UPDATE/DELETE occurs.
 */
export function useRealtimeTransactions(userId?: string, onChange?: (change: TxnChange) => void) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`realtime:transactions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          callbackRef.current?.({
            event: payload.eventType,
            record: payload.new || null,
            old_record: payload.old || null,
          });
        }
      )
      .subscribe((status) => {
        // Optional logging
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to transactions for user', userId);
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [userId]);
}
