/**
 * useBot Hook - Bot Control State Machine
 *
 * Single source of truth for bot state. Uses a finite state machine
 * to eliminate conflicting states and simplify UI rendering.
 *
 * State Machine:
 *   IDLE ─────► LAUNCHING ─────► RUNNING ─────► STOPPED/COMPLETED
 *     ▲              │              │                  │
 *     │              ▼              ▼                  │
 *     │           FAILED ◄──── STOPPING               │
 *     │              │                                │
 *     └──────────────┴────────────────────────────────┘
 *
 * Button Logic:
 *   - "Start Bot": visible in IDLE, STOPPED, COMPLETED, FAILED
 *   - "Stop Bot": visible in LAUNCHING, RUNNING
 *   - "Stopping...": visible in STOPPING (disabled)
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { exportPreferencesToYAML } from '@/lib/client/yamlConverter';
import type {
  BotState,
  LaunchProgress,
  SessionStats,
  HistoricalTotals,
  BotStatusPayload,
  UseBotReturn,
} from './useBot.types';
import { EMPTY_STATS } from './useBot.types';

// Re-export types for consumers
export type { BotState, LaunchProgress, SessionStats, HistoricalTotals, UseBotReturn };
export { EMPTY_STATS };

// =============================================================================
// Hook Implementation
// =============================================================================

export function useBot(): UseBotReturn {
  // ---------------------------------------------------------------------------
  // State Machine (single source of truth)
  // ---------------------------------------------------------------------------
  const [botState, setBotState] = useState<BotState>('idle');

  // ---------------------------------------------------------------------------
  // Supporting State
  // ---------------------------------------------------------------------------
  const [launchProgress, setLaunchProgress] = useState<LaunchProgress | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>(EMPTY_STATS);
  const [currentActivity, setCurrentActivity] = useState<string | null>(null);
  const [activityDetails, setActivityDetails] = useState<Record<string, unknown> | null>(null);
  const [botPid, setBotPid] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historicalTotals, setHistoricalTotals] = useState<HistoricalTotals>(EMPTY_STATS);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const ipcListenerAttached = useRef(false);
  const launchInProgress = useRef(false);
  const sessionCounted = useRef(false); // Prevent double-counting historical totals

  // ---------------------------------------------------------------------------
  // Electron Detection
  // ---------------------------------------------------------------------------
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // ---------------------------------------------------------------------------
  // State Transition Helper
  // ---------------------------------------------------------------------------
  const transition = useCallback((newState: BotState, reason?: string) => {
    setBotState((prev) => {
      console.log(`[useBot] State: ${prev} → ${newState}${reason ? ` (${reason})` : ''}`);
      return newState;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // IPC Status Handler
  // ---------------------------------------------------------------------------

  /**
   * Add session stats to historical totals (only once per session).
   * Inlined to avoid circular dependency with handleBotStatus.
   */
  const addToHistoricalTotals = (stats?: BotStatusPayload['stats']) => {
    if (sessionCounted.current || !stats) return;
    sessionCounted.current = true;

    setHistoricalTotals((prev) => ({
      jobs_found: prev.jobs_found + (stats.jobs_found ?? 0),
      jobs_applied: prev.jobs_applied + (stats.jobs_applied ?? 0),
      jobs_failed: prev.jobs_failed + (stats.jobs_failed ?? 0),
      credits_used: prev.credits_used + (stats.credits_used ?? 0),
    }));
  };

  const handleBotStatus = useCallback((payload: BotStatusPayload) => {
    console.log('[useBot] IPC status:', payload);

    const { stage, message, progress, activity, details, stats } = payload;

    // Update stats if provided
    if (stats) {
      setSessionStats({
        jobs_found: stats.jobs_found ?? 0,
        jobs_applied: stats.jobs_applied ?? 0,
        jobs_failed: stats.jobs_failed ?? 0,
        credits_used: stats.credits_used ?? 0,
      });
    }

    // Update activity
    if (activity) setCurrentActivity(activity);
    if (details) setActivityDetails(details);

    // State machine transitions based on IPC stage
    switch (stage) {
      case 'checking':
      case 'installing':
      case 'launching':
        // These are all 'launching' sub-stages
        transition('launching', stage);
        setLaunchProgress({ stage, message, progress });
        break;

      case 'running':
        // Bot is now actively running
        transition('running', 'bot started');
        setLaunchProgress(null);
        break;

      case 'stopped':
        // Bot was stopped (by user or externally)
        transition('stopped', message || 'user requested');
        setLaunchProgress(null);
        addToHistoricalTotals(stats);
        break;

      case 'completed':
        // Bot finished successfully
        transition('completed', message || 'success');
        setLaunchProgress(null);
        addToHistoricalTotals(stats);
        break;

      case 'failed':
        // Bot encountered an error
        transition('failed', message || 'error');
        setLaunchProgress(null);
        setErrorMessage(message || 'Bot encountered an error');
        addToHistoricalTotals(stats);
        break;
    }
  }, [transition]);

  // ---------------------------------------------------------------------------
  // Setup: IPC Listener & Restore State on Mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isElectron) return;

    // Attach IPC listener (only once)
    if (!ipcListenerAttached.current && window.electronAPI?.onBotStatus) {
      console.log('[useBot] Attaching IPC listener');
      window.electronAPI.onBotStatus(handleBotStatus);
      ipcListenerAttached.current = true;
    }

    // Check if bot is already running (page reload scenario)
    const restoreRunningBot = async () => {
      if (!window.electronAPI?.getBotStatus) return;

      try {
        const status = await window.electronAPI.getBotStatus();
        console.log('[useBot] Initial status check:', status);

        if (status.success && status.running && status.pid) {
          // Bot is running - restore state
          console.log('[useBot] Restoring running bot session');
          setBotPid(status.pid);

          // Restore stats if available (fixes page reload losing stats)
          if (status.stats) {
            console.log('[useBot] Restoring stats:', status.stats);
            setSessionStats({
              jobs_found: status.stats.jobs_found ?? 0,
              jobs_applied: status.stats.jobs_applied ?? 0,
              jobs_failed: status.stats.jobs_failed ?? 0,
              credits_used: status.stats.credits_used ?? 0,
            });
          }

          transition('running', 'restored from reload');
          sessionCounted.current = false; // New session context
        }
      } catch (err) {
        console.error('[useBot] Failed to check bot status:', err);
      }
    };

    restoreRunningBot();

    // Cleanup
    return () => {
      if (ipcListenerAttached.current && window.electronAPI?.removeBotStatusListeners) {
        console.log('[useBot] Removing IPC listener');
        window.electronAPI.removeBotStatusListeners();
        ipcListenerAttached.current = false;
      }
    };
  }, [isElectron, handleBotStatus, transition]);

  // ---------------------------------------------------------------------------
  // Periodic Status Check (detects externally closed browser)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Only poll when bot should be running
    if (!isElectron || !['launching', 'running'].includes(botState)) return;

    const checkStatus = async () => {
      if (!window.electronAPI?.getBotStatus) return;

      try {
        const status = await window.electronAPI.getBotStatus();

        // Update PID
        if (status.pid) setBotPid(status.pid);

        // Detect externally closed browser
        if (!status.running && botState === 'running') {
          console.log('[useBot] Bot process no longer running');
          transition('stopped', 'browser closed externally');
        }
      } catch (err) {
        console.error('[useBot] Status poll failed:', err);
      }
    };

    // Initial check + interval
    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [isElectron, botState, transition]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Launch the bot
   * Valid from: idle, stopped, completed, failed
   */
  const launchBot = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // Prevent duplicate launches
    if (launchInProgress.current) {
      return { success: false, error: 'Launch already in progress' };
    }

    // Validate state
    if (!['idle', 'stopped', 'completed', 'failed'].includes(botState)) {
      return { success: false, error: `Cannot launch from state: ${botState}` };
    }

    // Check Electron
    if (!window.electronAPI) {
      setErrorMessage('Desktop app required');
      transition('failed', 'not in electron');
      return { success: false, error: 'DESKTOP_REQUIRED' };
    }

    launchInProgress.current = true;

    // Reset state for new session
    setSessionStats(EMPTY_STATS);
    setCurrentActivity(null);
    setActivityDetails(null);
    setErrorMessage(null);
    setBotPid(null);
    sessionCounted.current = false;

    // Transition to launching
    transition('launching', 'user initiated');
    setLaunchProgress({ stage: 'checking', message: 'Checking requirements...' });

    try {
      // 1. Check profile is published
      const profileResponse = await fetch('/api/student/profile/published');
      if (!profileResponse.ok) {
        throw new Error('Profile not published. Go to Profile tab and click "Publish Profile".');
      }

      const profileData = await profileResponse.json();
      if (!profileData.student?.first_name || !profileData.student?.last_name) {
        throw new Error('Profile not published. Go to Profile tab and click "Publish Profile".');
      }

      // 2. Ensure YAML config exists
      setLaunchProgress({ stage: 'checking', message: 'Preparing configuration...' });
      try {
        const prefsResponse = await fetch('/api/student/work-preferences');
        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          if (prefsData.preferences) {
            await exportPreferencesToYAML(prefsData.preferences);
          }
        }
      } catch (yamlError) {
        console.error('[useBot] YAML config error:', yamlError);
        throw new Error('Failed to create local config file.');
      }

      // 3. Get API token
      setLaunchProgress({ stage: 'checking', message: 'Authenticating...' });
      const tokenResponse = await fetch('/api/student/token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get API token');
      }
      const { token } = await tokenResponse.json();

      // Launch via IPC with API URL
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/autoapply/gpt4`
        : undefined; // Let Electron use its fallback
      
      // 4. Launch via IPC
      setLaunchProgress({ stage: 'launching', message: 'Starting bot...' });
      console.log('[useBot] Calling electronAPI.launchBot...');
      console.log('[useBot] API URL:', apiUrl || 'Using Electron default');

      const result = await window.electronAPI.launchBot(token, apiUrl);

      if (!result.success) {
        throw new Error(result.error || 'Failed to launch bot');
      }

      // Success - IPC events will handle further state transitions
      console.log('[useBot] Launch initiated:', result);
      if (result.pid) setBotPid(result.pid);

      return { success: true };

    } catch (err) {
      console.error('[useBot] Launch error:', err);
      const message = err instanceof Error ? err.message : 'Failed to launch bot';

      setErrorMessage(message);
      transition('failed', message);
      setLaunchProgress(null);

      return { success: false, error: message };

    } finally {
      launchInProgress.current = false;
    }
  }, [botState, transition]);

  /**
   * Stop the bot
   * Valid from: launching, running
   */
  const stopBot = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // Validate state
    if (!['launching', 'running'].includes(botState)) {
      return { success: false, error: `Cannot stop from state: ${botState}` };
    }

    // Check Electron
    if (!window.electronAPI?.forceStopBot) {
      return { success: false, error: 'Electron API not available' };
    }

    // Transition to stopping
    transition('stopping', 'user requested');

    try {
      console.log('[useBot] Calling forceStopBot...');
      const result = await window.electronAPI.forceStopBot();
      console.log('[useBot] Force stop result:', result);

      if (result.success) {
        // IPC 'stopped' event will confirm, but set state immediately for UI
        transition('stopped', 'force stop successful');
        setBotPid(null);
      } else {
        // Stop failed - return to previous state
        transition('running', 'stop failed');
      }

      return result;

    } catch (err) {
      console.error('[useBot] Stop error:', err);
      const message = err instanceof Error ? err.message : 'Failed to stop bot';

      // Return to running state on error
      transition('running', 'stop error');
      return { success: false, error: message };
    }
  }, [botState, transition]);

  /**
   * Reset to idle state (clear session data)
   * Useful for starting fresh
   */
  const resetToIdle = useCallback(() => {
    if (['launching', 'running', 'stopping'].includes(botState)) {
      console.warn('[useBot] Cannot reset while bot is active');
      return;
    }

    transition('idle', 'user reset');
    setLaunchProgress(null);
    setSessionStats(EMPTY_STATS);
    setCurrentActivity(null);
    setActivityDetails(null);
    setErrorMessage(null);
    setBotPid(null);
    sessionCounted.current = false;
  }, [botState, transition]);

  // ---------------------------------------------------------------------------
  // Return Interface
  // ---------------------------------------------------------------------------
  return {
    // State machine
    botState,

    // Launch progress
    launchProgress,

    // Session data
    sessionStats,
    currentActivity,
    activityDetails,

    // Process info
    botPid,

    // Error
    errorMessage,

    // Historical
    historicalTotals,

    // Actions
    launchBot,
    stopBot,
    resetToIdle,

    // Detection
    isElectron,
  };
}
