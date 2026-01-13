/**
 * Custom hook for bot launch logic
 */

import { useState, useCallback } from 'react';

export function useBotLauncher() {
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launchBot = useCallback(async () => {
    setLaunching(true);
    setError(null);

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
        setError(message);
        setLaunching(false);
        setTimeout(() => setError(null), 5000);
        return { success: false, error: message };
      }
      
      const profileData = await profileCheckResponse.json();
      
      // Verify essential profile data exists
      if (!profileData.student || !profileData.student.first_name || !profileData.student.last_name) {
        const message = 'Profile not published. Go to Profile tab and click "Publish Profile" to generate your resume.';
        setError(message);
        setLaunching(false);
        setTimeout(() => setError(null), 5000);
        return { success: false, error: message };
      }

      // Fetch API token
      const tokenResponse = await fetch('/api/student/token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get API token');
      }
      const { token } = await tokenResponse.json();

      // Launch the bot via Electron IPC
      const result = await window.electronAPI.launchBot(token);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to launch bot');
      }
      
      console.log('Bot launched:', result);
      console.log('Platform:', result.platform, 'PID:', result.pid);
      
      return { success: true };
    } catch (err) {
      console.error('Launch error:', err);
      const message = err instanceof Error ? err.message : 'Failed to launch bot';
      setError(message);
      setTimeout(() => setError(null), 5000);
      return { success: false, error: message };
    } finally {
      setLaunching(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    launching,
    error,
    launchBot,
    clearError,
  };
}
