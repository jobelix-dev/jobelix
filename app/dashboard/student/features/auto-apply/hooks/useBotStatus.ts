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

/**
 * Custom hook for managing bot status with real-time updates
 */
export function useBotStatus(options?: { onBotStopped?: () => void }): UseBotStatusReturn {
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
  
  // Use ref to always get latest session without recreating callback
  const sessionRef = useRef<BotSession | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  
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
    console.log('🛑 [STOP BOT] Function called - START');
    console.log('🛑 [STOP BOT] window:', typeof window);
    console.log('🛑 [STOP BOT] window.electronAPI:', window.electronAPI);
    console.log('🛑 [STOP BOT] window.electronAPI?.stopBot:', window.electronAPI?.stopBot);
    
    // Use ref to get latest session value (avoid stale closure)
    const currentSession = sessionRef.current;
    
    console.log('🛑 [STOP BOT] Current session:', currentSession);
    
    debugLog.botStatus('[stopBot] Called');
    debugLog.botStatus('[stopBot] Current session:', currentSession);
    debugLog.botStatus('[stopBot] window.electronAPI exists:', !!window.electronAPI);
    debugLog.botStatus('[stopBot] window.electronAPI.stopBot exists:', !!window.electronAPI?.stopBot);
    
    if (!currentSession) {
      console.log('🛑 [STOP BOT] No session, returning early');
      debugLog.warn('[stopBot] No active session, returning early');
      return { success: false, error: 'No active session' };
    }

    // Clear launch status UI immediately at the start
    if (options?.onBotStopped) {
      console.log('🛑 [STOP BOT] Calling onBotStopped callback (clearing launch UI)...');
      options.onBotStopped();
    }

    try {
      let processKilled = false;

      // First, kill the process via Electron IPC (if running in Electron)
      if (window.electronAPI?.stopBot) {
        console.log('🛑 [STOP BOT] Calling window.electronAPI.stopBot()...');
        debugLog.botStatus('[stopBot] Calling Electron IPC stopBot...');
        const electronResult = await window.electronAPI.stopBot();
        console.log('🛑 [STOP BOT] Electron result:', electronResult);
        debugLog.botStatus('[stopBot] Electron result:', electronResult);
        
        if (!electronResult.success) {
          console.log('🛑 [STOP BOT] Electron stop failed:', electronResult.error);
          debugLog.warn('[useBotStatus] Electron stop failed:', electronResult.error);
          // If no active process, it might have already stopped - continue to update DB
          if (electronResult.error && !electronResult.error.includes('No active bot process')) {
            console.log('🛑 [STOP BOT] Returning error immediately');
            debugLog.error('[stopBot] Returning error from Electron stop');
            return { success: false, error: electronResult.error };
          }
          console.log('🛑 [STOP BOT] No active process error, continuing to DB update');
        } else {
          console.log('🛑 [STOP BOT] Process killed successfully via Electron');
          debugLog.botStatus('[stopBot] Bot process stopped successfully via Electron');
          processKilled = true;
        }
      } else {
        console.log('🛑 [STOP BOT] window.electronAPI.stopBot NOT available - skipping Electron kill');
        debugLog.warn('[stopBot] Electron API not available, skipping process kill');
      }

      // Then update the session status in the database
      console.log('🛑 [STOP BOT] Calling API to update DB with session_id:', currentSession.id);
      debugLog.botStatus('[stopBot] Calling API to update DB...');
      const response = await fetch('/api/autoapply/bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSession.id })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to stop bot' };
      }

      // Force refresh to get updated status
      await fetchSession();

      return { 
        success: true,
        message: processKilled ? 'Bot stopped successfully' : 'Bot session stopped (process may have already ended)'
      };
      
    } catch (err: any) {
      debugLog.error('[useBotStatus] Stop error:', err);
      return { success: false, error: err.message || 'Failed to stop bot' };
    }
  }, [fetchSession]); // Removed 'session' dependency - using ref instead

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
