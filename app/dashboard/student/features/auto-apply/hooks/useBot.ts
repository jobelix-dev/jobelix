/**
 * useBot Hook - Unified Bot Control
 * 
 * Single hook for all bot operations:
 * - Launch bot with token
 * - Stop bot (force kills browser PID)
 * - Receive real-time status updates via IPC
 * - Track session state and stats
 * 
 * Consolidates useBotLauncher + useBotStatus to eliminate duplicate code.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { exportPreferencesToYAML } from '@/lib/client/yamlConverter';
import { BotLaunchStatus, BotSession, HistoricalTotals } from '@/lib/shared/types';

// Constants
const ERROR_DISPLAY_DURATION_MS = 5000;
const BOT_STATUS_POLL_INTERVAL_MS = 2000;

// Bot stage type from IPC
type BotStage = 'checking' | 'installing' | 'launching' | 'running' | 'completed' | 'failed' | 'stopped';

// Bot process status from main process
interface BotProcessStatus {
  running: boolean;
  pid: number | null;
  startedAt: number | null;
}

// IPC payload from main process
interface BotStatusPayload {
  stage: BotStage;
  message?: string;
  progress?: number;
  activity?: string;
  details?: Record<string, unknown>;
  stats?: {
    jobs_found?: number;
    jobs_applied?: number;
    jobs_failed?: number;
    credits_used?: number;
  };
}

export interface UseBotReturn {
  // Launch state
  launching: boolean;
  launchStatus: BotLaunchStatus | null;
  launchBot: () => Promise<{ success: boolean; error?: string }>;
  
  // Session state  
  session: BotSession | null;
  historicalTotals: HistoricalTotals;
  
  // Process state
  botProcess: BotProcessStatus | null;
  
  // Stop control (always force kills PID)
  stopping: boolean;
  stopBot: () => Promise<{ success: boolean; error?: string }>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
  
  // Cleanup
  clearSession: () => void;
  
  // Electron detection
  isElectron: boolean;
}

/**
 * Unified hook for bot control and status
 */
export function useBot(): UseBotReturn {
  // Launch state
  const [launching, setLaunching] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<BotLaunchStatus | null>(null);
  
  // Session state (populated from IPC updates)
  const [session, setSession] = useState<BotSession | null>(null);
  const [historicalTotals, setHistoricalTotals] = useState<HistoricalTotals>({
    jobs_found: 0,
    jobs_applied: 0,
    jobs_failed: 0,
    credits_used: 0,
  });
  
  // Process state
  const [botProcess, setBotProcess] = useState<BotProcessStatus | null>(null);
  
  // Stop state
  const [stopping, setStopping] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup and preventing duplicate listeners
  const listenerAttachedRef = useRef(false);
  const launchingRef = useRef(false);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusPollRef = useRef<NodeJS.Timeout | null>(null);
  
  // Electron detection
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Helper: Set error with auto-clear timeout
  const setErrorWithTimeout = useCallback((message: string) => {
    setError(message);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
      errorTimeoutRef.current = null;
    }, ERROR_DISPLAY_DURATION_MS);
  }, []);

  // Clear error manually
  const clearError = useCallback(() => {
    setError(null);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  // Clear session (for starting fresh)
  const clearSession = useCallback(() => {
    setSession(null);
    setLaunchStatus(null);
    setLaunching(false);
    setBotProcess(null);
    if (listenerAttachedRef.current && window.electronAPI?.removeBotStatusListeners) {
      window.electronAPI.removeBotStatusListeners();
      listenerAttachedRef.current = false;
    }
  }, []);

  // Handle bot status updates from IPC
  const handleBotStatus = useCallback((payload: BotStatusPayload) => {
    console.log('[useBot] Received status:', payload);
    
    // Update launch status for UI banners
    const mappedStage = ['completed', 'failed', 'stopped'].includes(payload.stage)
      ? 'running' as const
      : payload.stage as BotLaunchStatus['stage'];
    
    setLaunchStatus((prev) => ({
      stage: mappedStage,
      message: payload.message ?? payload.activity ?? prev?.message,
      progress: payload.progress ?? prev?.progress,
      logs: prev?.logs ?? [],
    }));
    
    // Update session from IPC data
    setSession((prev) => {
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
        updated_at: now,
      };
      
      // Map IPC stage to session status
      let status: BotSession['status'] = base.status;
      if (payload.stage === 'running') status = 'running';
      else if (payload.stage === 'completed') status = 'completed';
      else if (payload.stage === 'failed') status = 'failed';
      else if (payload.stage === 'stopped') status = 'stopped';
      else if (['launching', 'checking', 'installing'].includes(payload.stage)) status = 'starting';
      
      return {
        ...base,
        status,
        current_activity: payload.activity || payload.message || base.current_activity,
        activity_details: payload.details || base.activity_details,
        jobs_found: payload.stats?.jobs_found ?? base.jobs_found,
        jobs_applied: payload.stats?.jobs_applied ?? base.jobs_applied,
        jobs_failed: payload.stats?.jobs_failed ?? base.jobs_failed,
        credits_used: payload.stats?.credits_used ?? base.credits_used,
        error_message: payload.stage === 'failed' ? (payload.message || 'Bot failed') : base.error_message,
        last_heartbeat_at: now,
        updated_at: now,
        completed_at: ['completed', 'failed', 'stopped'].includes(status) ? now : base.completed_at,
      };
    });
    
    // Update historical totals when session ends
    if (['completed', 'failed', 'stopped'].includes(payload.stage) && payload.stats) {
      setHistoricalTotals((prev) => ({
        jobs_found: prev.jobs_found + (payload.stats?.jobs_found || 0),
        jobs_applied: prev.jobs_applied + (payload.stats?.jobs_applied || 0),
        jobs_failed: prev.jobs_failed + (payload.stats?.jobs_failed || 0),
        credits_used: prev.credits_used + (payload.stats?.credits_used || 0),
      }));
    }
  }, []);

  // Register IPC listener on mount (single listener for entire component)
  useEffect(() => {
    if (!isElectron || listenerAttachedRef.current) {
      return;
    }

    if (window.electronAPI?.onBotStatus) {
      console.log('[useBot] Registering bot status listener');
      window.electronAPI.onBotStatus(handleBotStatus);
      listenerAttachedRef.current = true;
    }

    return () => {
      if (listenerAttachedRef.current && window.electronAPI?.removeBotStatusListeners) {
        console.log('[useBot] Removing bot status listener');
        window.electronAPI.removeBotStatusListeners();
        listenerAttachedRef.current = false;
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
      }
    };
  }, [isElectron, handleBotStatus]);

  // Poll bot process status periodically when running
  const refreshBotStatus = useCallback(async () => {
    if (!window.electronAPI?.getBotStatus) return;
    
    try {
      const status = await window.electronAPI.getBotStatus();
      setBotProcess(status.success ? {
        running: status.running,
        pid: status.pid,
        startedAt: status.startedAt,
      } : null);
    } catch (err) {
      console.error('[useBot] Failed to get bot status:', err);
    }
  }, []);

  // Start/stop polling based on session state
  useEffect(() => {
    const isActive = session?.status === 'starting' || session?.status === 'running';
    
    if (isActive && !statusPollRef.current) {
      refreshBotStatus(); // Initial fetch
      statusPollRef.current = setInterval(refreshBotStatus, BOT_STATUS_POLL_INTERVAL_MS);
    } else if (!isActive && statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
    
    return () => {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
    };
  }, [session?.status, refreshBotStatus]);

  // Launch bot
  const launchBot = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // Prevent duplicate launches
    if (launchingRef.current) {
      console.warn('[useBot] Already launching, ignoring');
      return { success: false, error: 'Launch already in progress' };
    }

    launchingRef.current = true;
    setLaunching(true);
    setError(null);
    setLaunchStatus(null);
    setSession(null);

    try {
      // Check Electron
      if (!window.electronAPI) {
        setError('DESKTOP_REQUIRED');
        return { success: false, error: 'DESKTOP_REQUIRED' };
      }

      // Check if profile is published
      const profileResponse = await fetch('/api/student/profile/published');
      if (!profileResponse.ok) {
        const message = 'Profile not published. Go to Profile tab and click "Publish Profile".';
        setErrorWithTimeout(message);
        return { success: false, error: message };
      }
      
      const profileData = await profileResponse.json();
      if (!profileData.student?.first_name || !profileData.student?.last_name) {
        const message = 'Profile not published. Go to Profile tab and click "Publish Profile".';
        setErrorWithTimeout(message);
        return { success: false, error: message };
      }

      // Ensure YAML config exists
      try {
        const prefsResponse = await fetch('/api/student/work-preferences');
        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          if (prefsData.preferences) {
            await exportPreferencesToYAML(prefsData.preferences);
          }
        }
      } catch (yamlError) {
        console.error('[useBot] Failed to ensure YAML config:', yamlError);
        throw new Error('Failed to create local config file.');
      }

      // Get API token
      const tokenResponse = await fetch('/api/student/token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get API token');
      }
      const { token } = await tokenResponse.json();

      // Set initial launch status
      setLaunchStatus({
        stage: 'checking',
        message: 'Checking browser...',
        logs: [],
      });

      // Launch via IPC
      console.log('[useBot] Calling electronAPI.launchBot...');
      const result = await window.electronAPI.launchBot(token);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to launch bot');
      }
      
      console.log('[useBot] Bot launched:', result);
      return { success: true };

    } catch (err) {
      console.error('[useBot] Launch error:', err);
      const message = err instanceof Error ? err.message : 'Failed to launch bot';
      setErrorWithTimeout(message);
      return { success: false, error: message };

    } finally {
      setLaunching(false);
      launchingRef.current = false;
    }
  }, [setErrorWithTimeout]);

  // Stop bot - ALWAYS force kills browser PID
  const stopBot = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isElectron) {
      return { success: false, error: 'Not running in Electron' };
    }

    if (!window.electronAPI?.forceStopBot) {
      return { success: false, error: 'Electron API not available' };
    }

    setStopping(true);
    console.log('[useBot] Force stopping bot...');

    try {
      // Always use force stop to kill browser PID
      const result = await window.electronAPI.forceStopBot();
      console.log('[useBot] Force stop result:', result);
      
      if (result.success) {
        setBotProcess(null);
        // Session will be updated via IPC 'stopped' event
      }
      
      return result;

    } catch (err) {
      console.error('[useBot] Stop error:', err);
      const message = err instanceof Error ? err.message : 'Failed to stop bot';
      return { success: false, error: message };

    } finally {
      setStopping(false);
    }
  }, [isElectron]);

  return {
    // Launch
    launching,
    launchStatus,
    launchBot,
    
    // Session
    session,
    historicalTotals,
    
    // Process
    botProcess,
    
    // Stop
    stopping,
    stopBot,
    
    // Error
    error,
    clearError,
    
    // Cleanup
    clearSession,
    
    // Detection
    isElectron,
  };
}
