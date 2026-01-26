/**
 * Custom hook for bot launch logic
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { exportPreferencesToYAML } from '@/lib/client/yamlConverter';
import { BotLaunchStage, BotLaunchStatus } from '@/lib/shared/types';
import { ERROR_DISPLAY_DURATION_MS, MAX_LOGS_IN_MEMORY } from '@/lib/bot-status/constants';
import { debugLog } from '@/lib/bot-status/debug';

export function useBotLauncher() {
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launchStatus, setLaunchStatus] = useState<BotLaunchStatus | null>(null);
  const listenerAttachedRef = useRef(false);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const launchBot = useCallback(async () => {
    setLaunching(true);
    setError(null);
    setLaunchStatus(null);
    listenerAttachedRef.current = false;

    // Clear any existing error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    const setErrorWithTimeout = (message: string) => {
      setError(message);
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
        errorTimeoutRef.current = null;
      }, ERROR_DISPLAY_DURATION_MS);
    };

    try {
      // Check if running in Electron app
      if (!window.electronAPI) {
        setError('DESKTOP_REQUIRED');
        setLaunching(false);
        return { success: false, error: 'DESKTOP_REQUIRED' };
      }

      // Check if profile is published
      const profileCheckResponse = await fetch('/api/student/profile/published');
      if (!profileCheckResponse.ok) {
        const message = 'Profile not published. Go to Profile tab and click "Publish Profile" to generate your resume.';
        setErrorWithTimeout(message);
        setLaunching(false);
        return { success: false, error: message };
      }
      
      const profileData = await profileCheckResponse.json();
      
      // Verify essential profile data exists
      if (!profileData.student || !profileData.student.first_name || !profileData.student.last_name) {
        const message = 'Profile not published. Go to Profile tab and click "Publish Profile" to generate your resume.';
        setErrorWithTimeout(message);
        setLaunching(false);
        return { success: false, error: message };
      }

      // Ensure YAML config exists locally (important for users who filled data online first)
      try {
        debugLog.general('Ensuring YAML config exists locally...');
        const prefsResponse = await fetch('/api/student/work-preferences');
        if (!prefsResponse.ok) {
          throw new Error('Failed to fetch work preferences');
        }
        const prefsData = await prefsResponse.json();
        if (prefsData.preferences) {
          await exportPreferencesToYAML(prefsData.preferences);
          debugLog.general('YAML config ensured locally');
        }
      } catch (yamlError) {
        debugLog.error('Failed to ensure YAML config:', yamlError);
        throw new Error('Failed to create local config file. Please save your job preferences again.');
      }

      // Fetch API token
      const tokenResponse = await fetch('/api/student/token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get API token');
      }
      const { token } = await tokenResponse.json();

      // Create initial bot session on backend
      debugLog.general('Creating bot session...');
      const sessionResponse = await fetch('/api/autoapply/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          bot_version: '1.0.0', // TODO: Get from package.json or config
          platform: navigator.platform
        })
      });

      if (!sessionResponse.ok) {
        const sessionError = await sessionResponse.json();
        throw new Error(sessionError.error || 'Failed to create bot session');
      }

      const { session_id } = await sessionResponse.json();
      debugLog.general('Bot session created:', session_id);

      setLaunchStatus({
        stage: 'checking',
        message: 'Checking browser...',
        logs: [],
      });

      const handleBotStatus = (payload: {
        stage: BotLaunchStage;
        message?: string;
        progress?: number;
        log?: string;
      }) => {
        debugLog.botLauncher('Received bot status:', payload);
        setLaunchStatus((prev) => {
          const nextStage = payload.stage ?? prev?.stage ?? 'checking';
          const stageChanged = prev?.stage && nextStage !== prev.stage;
          const nextLogs = payload.log
            ? [...(prev?.logs ?? []), payload.log].slice(-MAX_LOGS_IN_MEMORY)
            : prev?.logs ?? [];

          const nextState = {
            stage: nextStage,
            message: payload.message ?? (stageChanged ? undefined : prev?.message),
            progress: payload.progress ?? (stageChanged ? undefined : prev?.progress),
            logs: nextLogs,
          };
          debugLog.botLauncher('Updated launchStatus:', nextState);
          return nextState;
        });
      };

      if (window.electronAPI?.onBotStatus) {
        debugLog.botLauncher('Registering bot status listener');
        window.electronAPI.onBotStatus(handleBotStatus);
        listenerAttachedRef.current = true;
      } else {
        debugLog.warn('[useBotLauncher] electronAPI.onBotStatus not available!');
      }

      // Launch the bot via Electron IPC
      debugLog.botLauncher('Calling electronAPI.launchBot...');
      const result = await window.electronAPI.launchBot(token);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to launch bot');
      }
      
      debugLog.general('Bot launched:', result);
      debugLog.general('Platform:', result.platform, 'PID:', result.pid);
      debugLog.general('Session ID:', session_id);
      
      return { success: true };
    } catch (err) {
      debugLog.error('Launch error:', err);
      const message = err instanceof Error ? err.message : 'Failed to launch bot';
      setErrorWithTimeout(message);
      setLaunchStatus((prev) =>
        prev
          ? { ...prev, message, stage: prev.stage === 'running' ? prev.stage : 'launching' }
          : null
      );
      return { success: false, error: message };
    } finally {
      setLaunching(false);
      // Clean up listener if it was attached
      if (listenerAttachedRef.current && window.electronAPI?.removeBotStatusListeners) {
        window.electronAPI.removeBotStatusListeners();
        listenerAttachedRef.current = false;
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (listenerAttachedRef.current && window.electronAPI?.removeBotStatusListeners) {
        window.electronAPI.removeBotStatusListeners();
        listenerAttachedRef.current = false;
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    launching,
    error,
    launchBot,
    launchStatus,
    clearError,
  };
}
