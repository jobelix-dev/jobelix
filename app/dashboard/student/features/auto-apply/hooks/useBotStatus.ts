/**
 * useBotStatus Hook
 * 
 * Manages bot session state using local Electron IPC communication.
 * Receives real-time status updates from the bot process via stdout parsing.
 * 
 * Features:
 * - Real-time updates via Electron IPC (no network dependency)
 * - Stop bot functionality
 * - Session state management
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BotSession, HistoricalTotals } from '@/lib/shared/types';

interface UseBotStatusReturn {
  session: BotSession | null;
  historicalTotals: HistoricalTotals;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  stopBot: () => Promise<{ success: boolean; error?: string }>;
}

// Local session state (not from database)
interface LocalBotSession {
  status: 'starting' | 'running' | 'completed' | 'failed' | 'stopped';
  current_activity: string | null;
  activity_details: Record<string, any> | null;
  jobs_found: number;
  jobs_applied: number;
  jobs_failed: number;
  credits_used: number;
  error_message: string | null;
  started_at: string;
}

/**
 * Custom hook for managing bot status with local IPC
 */
export function useBotStatus(options?: { onBotStopped?: () => void }): UseBotStatusReturn {
  const [session, setSession] = useState<BotSession | null>(null);
  const [historicalTotals, setHistoricalTotals] = useState<HistoricalTotals>({
    jobs_found: 0,
    jobs_applied: 0,
    jobs_failed: 0,
    credits_used: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track if we're in Electron
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Handle bot status updates from Electron IPC
  useEffect(() => {
    if (!isElectron) {
      console.log('[useBotStatus] Not running in Electron, IPC disabled');
      return;
    }

    console.log('[useBotStatus] Setting up Electron IPC listeners');

    // Listen for bot status updates
    const handleBotStatus = (data: any) => {
      console.log('[useBotStatus] Received bot status:', data);
      
      // Map IPC status to session format
      if (data.stage) {
        setSession(prev => {
          const now = new Date().toISOString();
          const base: BotSession = prev || {
            id: 'local-session',
            user_id: 'local',
            status: 'starting',
            started_at: now,
            last_heartbeat_at: now,
            completed_at: null,
            current_activity: null,
            activity_details: null,
            jobs_found: 0,
            jobs_applied: 0,
            jobs_failed: 0,
            credits_used: 0,
            error_message: null,
            error_details: null,
            bot_version: null,
            platform: null,
            created_at: now,
            updated_at: now
          };
          
          // Update based on stage
          let status: BotSession['status'] = base.status;
          if (data.stage === 'running') status = 'running';
          else if (data.stage === 'completed') status = 'completed';
          else if (data.stage === 'failed') status = 'failed';
          else if (data.stage === 'stopped') status = 'stopped';
          else if (data.stage === 'launching' || data.stage === 'checking' || data.stage === 'installing') status = 'starting';
          
          return {
            ...base,
            status,
            current_activity: data.activity || data.message || base.current_activity,
            activity_details: data.details || base.activity_details,
            jobs_found: data.stats?.jobs_found ?? base.jobs_found,
            jobs_applied: data.stats?.jobs_applied ?? base.jobs_applied,
            jobs_failed: data.stats?.jobs_failed ?? base.jobs_failed,
            credits_used: data.stats?.credits_used ?? base.credits_used,
            error_message: data.stage === 'failed' ? (data.message || 'Bot failed') : base.error_message,
            last_heartbeat_at: now,
            updated_at: now,
            completed_at: ['completed', 'failed', 'stopped'].includes(status) ? now : base.completed_at
          };
        });
        
        // Update historical totals
        if (data.stats) {
          setHistoricalTotals(prev => ({
            jobs_found: prev.jobs_found + (data.stats.jobs_found || 0),
            jobs_applied: prev.jobs_applied + (data.stats.jobs_applied || 0),
            jobs_failed: prev.jobs_failed + (data.stats.jobs_failed || 0),
            credits_used: prev.credits_used + (data.stats.credits_used || 0)
          }));
        }
        
        // Call onBotStopped if session ended
        if (['completed', 'failed', 'stopped'].includes(data.stage) && options?.onBotStopped) {
          options.onBotStopped();
        }
      }
    };

    // Register listener
    if (window.electronAPI?.onBotStatus) {
      window.electronAPI.onBotStatus(handleBotStatus);
    }

    // Cleanup on unmount
    return () => {
      console.log('[useBotStatus] Cleaning up IPC listeners');
      if (window.electronAPI?.removeBotStatusListeners) {
        window.electronAPI.removeBotStatusListeners();
      }
    };
  }, [isElectron, options]);

  // Refresh is a no-op for local IPC (state is pushed, not pulled)
  const refresh = useCallback(async () => {
    console.log('[useBotStatus] Refresh called (no-op for local IPC)');
  }, []);

  // Stop bot via Electron IPC
  const stopBot = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    console.log('[useBotStatus] Stop bot requested');
    
    if (!isElectron) {
      console.log('[useBotStatus] Not in Electron, cannot stop bot');
      return { success: false, error: 'Not running in Electron' };
    }

    try {
      // Kill the process via Electron IPC
      if (!window.electronAPI?.stopBot) {
        return { success: false, error: 'Electron API not available' };
      }
      
      const result = await window.electronAPI.stopBot();
      console.log('[useBotStatus] Stop bot result:', result);
      
      if (result.success) {
        // Update local session state
        setSession(prev => prev ? {
          ...prev,
          status: 'stopped',
          completed_at: new Date().toISOString()
        } : null);
        
        // Call onBotStopped callback
        if (options?.onBotStopped) {
          options.onBotStopped();
        }
      }
      
      return result;
    } catch (err: any) {
      console.error('[useBotStatus] Stop bot error:', err);
      return { success: false, error: err.message || 'Failed to stop bot' };
    }
  }, [isElectron, options]);

  return {
    session,
    historicalTotals,
    loading,
    error,
    refresh,
    stopBot
  };
}
