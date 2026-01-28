/**
 * Custom hook for bot launch logic
 * Uses local Electron IPC - no backend API calls for session management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { exportPreferencesToYAML } from '@/lib/client/yamlConverter';
import { BotLaunchStatus } from '@/lib/shared/types';

// Constants
const ERROR_DISPLAY_DURATION_MS = 5000;
const MAX_LOGS_IN_MEMORY = 100;

// Simplified stage type that matches IPC
type BotStage = 'checking' | 'installing' | 'launching' | 'running' | 'completed' | 'failed' | 'stopped';

export function useBotLauncher() {
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launchStatus, setLaunchStatus] = useState<BotLaunchStatus | null>(null);
  const listenerAttachedRef = useRef(false);
  const launchingRef = useRef(false);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const launchBot = useCallback(async () => {
    // Prevent multiple simultaneous launches
    if (launchingRef.current) {
      console.warn('[useBotLauncher] Already launching, ignoring duplicate request');
      return { success: false, error: 'Launch already in progress' };
    }

    launchingRef.current = true;
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
        launchingRef.current = false;
        return { success: false, error: 'DESKTOP_REQUIRED' };
      }

      // Check if profile is published
      const profileCheckResponse = await fetch('/api/student/profile/published');
      if (!profileCheckResponse.ok) {
        const message = 'Profile not published. Go to Profile tab and click "Publish Profile" to generate your resume.';
        setErrorWithTimeout(message);
        setLaunching(false);
        launchingRef.current = false;
        return { success: false, error: message };
      }
      
      const profileData = await profileCheckResponse.json();
      
      // Verify essential profile data exists
      if (!profileData.student || !profileData.student.first_name || !profileData.student.last_name) {
        const message = 'Profile not published. Go to Profile tab and click "Publish Profile" to generate your resume.';
        setErrorWithTimeout(message);
        setLaunching(false);
        launchingRef.current = false;
        return { success: false, error: message };
      }

      // Ensure YAML config exists locally
      try {
        console.log('[useBotLauncher] Ensuring YAML config exists locally...');
        const prefsResponse = await fetch('/api/student/work-preferences');
        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          if (prefsData.preferences) {
            await exportPreferencesToYAML(prefsData.preferences);
            console.log('[useBotLauncher] YAML config ensured locally');
          }
        }
      } catch (yamlError) {
        console.error('[useBotLauncher] Failed to ensure YAML config:', yamlError);
        throw new Error('Failed to create local config file. Please save your job preferences again.');
      }

      // Fetch API token
      const tokenResponse = await fetch('/api/student/token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get API token');
      }
      const { token } = await tokenResponse.json();

      setLaunchStatus({
        stage: 'checking',
        message: 'Checking browser...',
        logs: [],
      });

      // Handle bot status updates from IPC
      const handleBotStatus = (payload: {
        stage: BotStage;
        message?: string;
        progress?: number;
        activity?: string;
        stats?: any;
      }) => {
        console.log('[useBotLauncher] Received bot status:', payload);
        
        // Map IPC stage to BotLaunchStatus
        const mappedStage = ['completed', 'failed', 'stopped'].includes(payload.stage) 
          ? 'running' as const 
          : payload.stage as BotLaunchStatus['stage'];
        
        setLaunchStatus((prev) => {
          const stageChanged = prev?.stage && mappedStage !== prev.stage;
          
          return {
            stage: mappedStage,
            message: payload.message ?? payload.activity ?? (stageChanged ? undefined : prev?.message),
            progress: payload.progress ?? (stageChanged ? undefined : prev?.progress),
            logs: prev?.logs ?? [],
          };
        });
      };

      // Register IPC listener
      if (window.electronAPI?.onBotStatus) {
        console.log('[useBotLauncher] Registering bot status listener');
        window.electronAPI.onBotStatus(handleBotStatus);
        listenerAttachedRef.current = true;
      } else {
        console.warn('[useBotLauncher] electronAPI.onBotStatus not available!');
      }

      // Launch the bot via Electron IPC
      console.log('[useBotLauncher] Calling electronAPI.launchBot...');
      const result = await window.electronAPI.launchBot(token);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to launch bot');
      }
      
      console.log('[useBotLauncher] Bot launched:', result);
      
      return { success: true };
    } catch (err) {
      console.error('[useBotLauncher] Launch error:', err);
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
      launchingRef.current = false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  const clearLaunchStatus = useCallback(() => {
    console.log('[useBotLauncher] Clearing launch status');
    setLaunchStatus(null);
    setLaunching(false);
    // Clean up listener if attached
    if (listenerAttachedRef.current && window.electronAPI?.removeBotStatusListeners) {
      window.electronAPI.removeBotStatusListeners();
      listenerAttachedRef.current = false;
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
    clearLaunchStatus,
  };
}
