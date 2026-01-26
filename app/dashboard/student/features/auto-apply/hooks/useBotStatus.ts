/**
 * useBotStatus Hook
 * 
 * Subscribes to real-time bot session updates using Supabase Realtime.
 * Provides instant status updates without polling.
 * 
 * Features:
 * - Real-time subscription to bot_sessions table changes
 * - Automatic cleanup on unmount
 * - Manual refresh capability
 * - Stop bot functionality
 * - Fallback to HTTP fetch if Realtime fails
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/client/supabaseClient';
import { BotSession, HistoricalTotals } from '@/lib/shared/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { POLLING_INTERVAL_MS } from '@/lib/bot-status/constants';
import { debugLog } from '@/lib/bot-status/debug';

interface UseBotStatusReturn {
  session: BotSession | null;
  historicalTotals: HistoricalTotals;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  stopBot: () => Promise<{ success: boolean; error?: string }>;
}

export function useBotStatus(): UseBotStatusReturn {
  const [session, setSession] = useState<BotSession | null>(null);
  const [historicalTotals, setHistoricalTotals] = useState<HistoricalTotals>({
    jobs_found: 0,
    jobs_applied: 0,
    jobs_failed: 0,
    credits_used: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create supabase client once and reuse it
  const supabase = useMemo(() => createClient(), []);

  // Fetch current session from API
  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/autoapply/bot/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch bot status');
      }

      const data = await response.json();
      setSession(data.session);
      if (data.historicalTotals) {
        setHistoricalTotals(data.historicalTotals);
      }
      
    } catch (err: any) {
      debugLog.error('[useBotStatus] Fetch error:', err);
      setError(err.message || 'Failed to load bot status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Stop bot session
  const stopBot = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!session) {
      return { success: false, error: 'No active session' };
    }

    try {
      const response = await fetch('/api/autoapply/bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to stop bot' };
      }

      // Force refresh to get updated status
      await fetchSession();

      return { success: true };
      
    } catch (err: any) {
      debugLog.error('[useBotStatus] Stop error:', err);
      return { success: false, error: err.message || 'Failed to stop bot' };
    }
  }, [session, fetchSession]);

  // Set up Realtime subscription
  useEffect(() => {
    // Initial fetch
    fetchSession();

    // Subscribe to bot_sessions changes for current user
    const channel = supabase
      .channel('bot-status', {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bot_sessions',
          // Filter handled by RLS - only user's own sessions visible
        },
        (payload) => {
          debugLog.botStatus('Realtime update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setSession(payload.new as BotSession);
          } else if (payload.eventType === 'DELETE') {
            setSession(null);
          }
        }
      )
      .subscribe((status, err) => {
        debugLog.botStatus('Subscription status:', status);
        if (err) {
          debugLog.error('[useBotStatus] Subscription error:', err);
        }
        
        if (status === 'SUBSCRIBED') {
          debugLog.botStatus('Real-time subscription active');
          setError(null); // Clear any previous errors
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          debugLog.warn('[useBotStatus] Subscription failed, falling back to polling');
          // Don't set error - polling will handle updates
          
          // Set up polling as fallback
          pollIntervalRef.current = setInterval(() => {
            fetchSession();
          }, POLLING_INTERVAL_MS);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      debugLog.botStatus('Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchSession, supabase]);

  return {
    session,
    historicalTotals,
    loading,
    error,
    refresh: fetchSession,
    stopBot
  };
}
