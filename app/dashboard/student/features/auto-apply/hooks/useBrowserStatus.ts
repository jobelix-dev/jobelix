/**
 * useBrowserStatus - Hook for managing Playwright browser installation status
 * 
 * Checks if the browser is installed and handles installation with progress tracking.
 * Auto-installs browser if not present (in Electron environment).
 * Used by AutoApplyTab to ensure browser is ready before allowing bot launch.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BrowserInstallProgress } from '@/lib/client/electronAPI';
import { getElectronAPI } from '@/lib/client/runtime';

export interface UseBrowserStatusReturn {
  /** Whether we're currently checking browser status */
  checking: boolean;
  /** Whether the browser is installed and ready */
  installed: boolean;
  /** Whether installation is in progress */
  installing: boolean;
  /** Installation progress (0-100) */
  progress: number;
  /** Current status message */
  message: string;
  /** Error message if installation failed */
  error: string | null;
  /** Browser version if installed */
  version: string | null;
  /** Check browser status */
  checkBrowser: () => Promise<void>;
  /** Start browser installation */
  installBrowser: () => Promise<void>;
}

export function useBrowserStatus(): UseBrowserStatusReturn {
  const [checking, setChecking] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Checking browser...');
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  
  // Track if we've already triggered auto-install to prevent duplicates
  const autoInstallTriggered = useRef(false);

  // Check browser status
  const checkBrowser = useCallback(async () => {
    const electronAPI = getElectronAPI();
    if (!electronAPI?.checkBrowser) {
      // Not in Electron - browser check not applicable
      setChecking(false);
      setInstalled(true); // Assume ready in browser context
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const result = await electronAPI.checkBrowser();
      
      if (result.success && result.installed) {
        setInstalled(true);
        setVersion(result.version);
        setMessage('Browser ready');
      } else {
        setInstalled(false);
        setMessage('Browser not installed');
      }
    } catch (err) {
      console.error('Failed to check browser:', err);
      setError(err instanceof Error ? err.message : 'Failed to check browser');
      setInstalled(false);
    } finally {
      setChecking(false);
    }
  }, []);

  // Install browser with progress tracking
  const installBrowser = useCallback(async () => {
    const electronAPI = getElectronAPI();
    if (!electronAPI?.installBrowser) {
      setError('Browser installation not available');
      return;
    }

    if (installing) {
      return; // Already installing
    }

    setInstalling(true);
    setProgress(0);
    setError(null);
    setMessage('Starting browser installation...');

    try {
      const result = await electronAPI.installBrowser();
      
      if (result.success) {
        setInstalled(true);
        setMessage('Browser installed successfully!');
        setProgress(100);
        // Re-check to get version
        await checkBrowser();
      } else {
        setError(result.error || 'Installation failed');
        setMessage('Installation failed');
      }
    } catch (err) {
      console.error('Failed to install browser:', err);
      setError(err instanceof Error ? err.message : 'Installation failed');
      setMessage('Installation failed');
    } finally {
      setInstalling(false);
    }
  }, [installing, checkBrowser]);

  // Set up progress listener
  useEffect(() => {
    const electronAPI = getElectronAPI();
    if (!electronAPI?.onBrowserInstallProgress) {
      return;
    }

    const handleProgress = (data: BrowserInstallProgress) => {
      setProgress(data.progress);
      setMessage(data.message);

      if (data.stage === 'completed') {
        setInstalled(true);
        setInstalling(false);
      } else if (data.stage === 'failed') {
        setError(data.message);
        setInstalling(false);
      }
    };

    electronAPI.onBrowserInstallProgress(handleProgress);

    return () => {
      electronAPI.removeBrowserInstallProgressListeners?.();
    };
  }, []);

  // Check browser status on mount
  useEffect(() => {
    checkBrowser();
  }, [checkBrowser]);

  // Auto-install browser if not installed (after initial check completes)
  useEffect(() => {
    // Only run in Electron environment
    if (!getElectronAPI()?.installBrowser) {
      return;
    }
    
    // Wait for initial check to complete
    if (checking) {
      return;
    }
    
    // Only trigger auto-install once
    if (autoInstallTriggered.current) {
      return;
    }
    
    // If not installed and not already installing, start installation automatically
    if (!installed && !installing && !error) {
      console.log('[useBrowserStatus] Browser not installed, starting auto-installation...');
      autoInstallTriggered.current = true;
      installBrowser();
    }
  }, [checking, installed, installing, error, installBrowser]);

  return {
    checking,
    installed,
    installing,
    progress,
    message,
    error,
    version,
    checkBrowser,
    installBrowser,
  };
}
