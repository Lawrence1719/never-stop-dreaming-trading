import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesFilter } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

type ConnectionState = 'INITIALIZING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

interface UseSupabaseRealtimeOptions<T> {
    channelName: string;
    table: string;
    schema?: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onData: (payload: any) => void;
    maxRetries?: number;
    baseBackoffMs?: number;
}

export function useSupabaseRealtime<T>({
    channelName,
    table,
    schema = 'public',
    event = '*',
    filter,
    onData,
    maxRetries = 10,
    baseBackoffMs = 1000,
}: UseSupabaseRealtimeOptions<T>) {
    const [status, setStatus] = useState<ConnectionState>('INITIALIZING');
    const channelRef = useRef<RealtimeChannel | null>(null);
    const retryCountRef = useRef(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Memoize the handler to prevent unnecessary sub resettings
    const handleData = useCallback(
        (payload: any) => {
            onData(payload);
        },
        [onData]
    );

    const subscribe = useCallback(() => {
        if (!isMountedRef.current) return;

        // Clean up existing channel if any
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        setStatus(retryCountRef.current > 0 ? 'RECONNECTING' : 'INITIALIZING');

        const filterOptions: Partial<RealtimePostgresChangesFilter<any>> = {
            event,
            schema,
            table,
        };

        if (filter) {
            filterOptions.filter = filter;
        }

        const channel = supabase.channel(channelName);

        channel
            .on(
                'postgres_changes',
                filterOptions as any, // Cast due to Supabase TS type quirks
                (payload) => handleData(payload)
            )
            .subscribe((status, error) => {
                if (!isMountedRef.current) return;

                if (status === 'SUBSCRIBED') {
                    setStatus('CONNECTED');
                    retryCountRef.current = 0; // Reset retries on successful connection
                } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setStatus('ERROR');
                    handleReconnect();
                }
            });

        channelRef.current = channel;
    }, [channelName, event, filter, handleData, schema, table]);

    const handleReconnect = useCallback(() => {
        if (!isMountedRef.current) return;

        if (retryCountRef.current >= maxRetries) {
            setStatus('DISCONNECTED');
            console.error(`[Supabase Realtime] Max retries reached for channel ${channelName}`);
            return;
        }

        // Exponential backoff
        const backoffTime = Math.min(
            baseBackoffMs * Math.pow(2, retryCountRef.current),
            30000 // Max 30 seconds wait
        );

        console.log(`[Supabase Realtime] Reconnecting channel ${channelName} in ${backoffTime}ms (Attempt ${retryCountRef.current + 1}/${maxRetries})`);

        setStatus('RECONNECTING');

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            retryCountRef.current += 1;
            subscribe();
        }, backoffTime);
    }, [baseBackoffMs, channelName, maxRetries, subscribe]);

    useEffect(() => {
        isMountedRef.current = true;
        subscribe();

        return () => {
            isMountedRef.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [subscribe]);

    return { status };
}
