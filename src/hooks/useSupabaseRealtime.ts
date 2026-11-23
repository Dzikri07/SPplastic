import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

interface UseRealtimeOptions {
  tables: Array<'orders' | 'routes' | 'delivery_confirmations'>;
  onDataChange: () => void;
  debounceMs?: number;
}

/**
 * Custom hook untuk mengelola langganan Supabase Realtime secara aman:
 * - Menangani status koneksi (connected / disconnected)
 * - Mencegah refetch berlebihan dengan debounce
 * - Menjamin pelepasan channel (supabase.removeChannel) saat komponen unmount
 */
export function useSupabaseRealtime({
  tables,
  onDataChange,
  debounceMs = 500,
}: UseRealtimeOptions) {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const debounceTimerRef = useRef<any>(null);
  const onDataChangeRef = useRef(onDataChange);

  // Pastikan callback selalu merujuk versi terbaru
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  const triggerDebouncedChange = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onDataChangeRef.current();
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    setStatus('connecting');

    const channelName = `realtime-pub-${tables.join('-')}-${Date.now()}`;
    let channel: RealtimeChannel = supabase.channel(channelName);

    // Daftarkan listener postgres_changes untuk setiap tabel yang diminta
    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table,
        },
        () => {
          triggerDebouncedChange();
        }
      );
    });

    channel.subscribe((subscriptionStatus) => {
      if (subscriptionStatus === 'SUBSCRIBED') {
        setStatus('connected');
      } else if (
        subscriptionStatus === 'CLOSED' ||
        subscriptionStatus === 'CHANNEL_ERROR' ||
        subscriptionStatus === 'TIMED_OUT'
      ) {
        setStatus('disconnected');
      }
    });

    // Cleanup saat unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [tables, triggerDebouncedChange]);

  return { status };
}
