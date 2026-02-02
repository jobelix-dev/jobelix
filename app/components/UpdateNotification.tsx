'use client';

import { useEffect, useState } from 'react';
import { Terminal, Copy, Check, X } from 'lucide-react';

/** Linux install command - one-liner that auto-detects distro */
const LINUX_INSTALL_COMMAND = 'curl -fsSL https://jobelix.fr/install.sh | bash';

/**
 * Update info received from main process when a new version is available
 */
interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
  manualDownload?: boolean;  // Linux: user must download manually
  downloadUrl?: string;      // Direct download URL (Linux: distro-specific AppImage)
  distroLabel?: string;      // Linux: human-readable distro name (e.g., "Arch Linux")
}

/**
 * Download progress info received during update download
 */
interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

/**
 * Error info received when update fails
 */
interface UpdateError {
  message: string;
  error?: string;
}

/**
 * UpdateNotification Component
 * 
 * ============================================================================
 * OVERVIEW
 * ============================================================================
 * Displays auto-updater notifications in the Electron app's renderer process.
 * Receives IPC events from update-manager.js (main process) via preload.js bridge.
 * 
 * ============================================================================
 * WHEN THIS COMPONENT SHOWS
 * ============================================================================
 * 1. Update Available (Linux): Toast with "Download for {distro}" button → opens direct AppImage URL
 * 2. Update Available (Win/Mac): Toast showing "Downloading..." with version
 * 3. Download Progress: Progress bar with percentage, bytes, speed
 * 4. Update Ready: Success toast (dialog shown in main process asks to install)
 * 5. Update Error: Error toast with dismiss option
 * 
 * ============================================================================
 * IPC EVENTS LISTENED TO (from preload.js → update-manager.js)
 * ============================================================================
 * - 'update-available'        → setUpdateAvailable() - show available toast
 * - 'update-download-progress' → setDownloadProgress() - update progress bar
 * - 'update-downloaded'       → setUpdateDownloaded() - show ready toast
 * - 'update-error'            → setUpdateError() - show error toast
 * 
 * ============================================================================
 * USED IN
 * ============================================================================
 * app/layout.tsx → Rendered at root level so it appears on all pages
 */
export default function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<UpdateError | null>(null);
  const [showLinuxModal, setShowLinuxModal] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * Set up IPC event listeners for update notifications
   * Only runs in Electron environment (window.electronAPI exists)
   */
  useEffect(() => {
    // Guard: Only run in Electron environment
    if (typeof window === 'undefined' || !window.electronAPI) {
      console.log('[UpdateNotification] Not in Electron environment, skipping listener setup');
      return;
    }

    console.log('[UpdateNotification] Setting up update listeners (Electron detected)');

    // Listen for 'update-available' IPC event
    window.electronAPI.onUpdateAvailable((info) => {
      console.log('[UpdateNotification] 📦 UPDATE AVAILABLE:', info);
      console.log('[UpdateNotification] manualDownload:', info.manualDownload);
      if (info.distroLabel) {
        console.log('[UpdateNotification] Detected distro:', info.distroLabel);
      }
      setUpdateAvailable(info);
      setDownloadProgress(null);
      setUpdateDownloaded(null);
      setUpdateError(null);
    });

    // Listen for 'update-download-progress' IPC event
    window.electronAPI.onUpdateDownloadProgress((progress) => {
      console.log('[UpdateNotification] Download progress:', progress.percent.toFixed(1) + '%');
      setDownloadProgress(progress);
    });

    // Listen for 'update-downloaded' IPC event
    window.electronAPI.onUpdateDownloaded((info) => {
      console.log('[UpdateNotification] ✅ Update downloaded:', info);
      setUpdateDownloaded(info.version);
      setDownloadProgress(null);
    });
    
    // Listen for update errors
    window.electronAPI.onUpdateError?.((error) => {
      console.error('[UpdateNotification] ❌ Update error:', error);
      setUpdateError(error);
      setDownloadProgress(null);
      // Auto-dismiss error after 15 seconds
      setTimeout(() => setUpdateError(null), 15000);
    });

    console.log('[UpdateNotification] All listeners registered');

    // Cleanup: Remove all update listeners when component unmounts
    return () => {
      console.log('[UpdateNotification] Cleaning up listeners');
      window.electronAPI?.removeUpdateListeners();
    };
  }, []);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  /**
   * Format bytes to human-readable size (KB, MB, GB)
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format download speed to human-readable (KB/s, MB/s)
   */
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  /**
   * Handle copy to clipboard for Linux install command
   */
  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(LINUX_INSTALL_COMMAND);
      setCopied(true);
      console.log('[UpdateNotification] Copied install command to clipboard');
    } catch (err) {
      console.error('[UpdateNotification] Failed to copy:', err);
    }
  };

  /**
   * Handle "Update" button click for Linux
   * Shows the install command modal instead of downloading directly
   */
  const handleLinuxUpdateClick = () => {
    console.log('[UpdateNotification] Showing Linux install modal');
    setShowLinuxModal(true);
  };

  /**
   * Handle "Download AppImage" fallback click (Linux)
   * Opens direct download URL in browser
   */
  const handleDirectDownload = () => {
    if (updateAvailable?.downloadUrl && window.electronAPI?.openExternalUrl) {
      console.log('[UpdateNotification] Opening direct download:', updateAvailable.downloadUrl);
      window.electronAPI.openExternalUrl(updateAvailable.downloadUrl);
    } else if (window.electronAPI?.openReleasesPage) {
      console.log('[UpdateNotification] Fallback: Opening releases page');
      window.electronAPI.openReleasesPage();
    }
    setShowLinuxModal(false);
  };

  /**
   * Handle "Later" button click - dismiss the notification
   */
  const handleDismiss = () => {
    setUpdateAvailable(null);
    setShowLinuxModal(false);
  };

  /**
   * Handle error dismiss
   */
  const handleErrorDismiss = () => {
    setUpdateError(null);
  };

  // Don't render if no update notifications to show (but allow modal to show)
  if (!updateAvailable && !downloadProgress && !updateDownloaded && !updateError && !showLinuxModal) {
    return null;
  }

  return (
    <>
      {/* Linux Install Command Modal */}
      {showLinuxModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowLinuxModal(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-surface rounded-xl shadow-2xl border border-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowLinuxModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-primary-subtle transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted" />
            </button>

            {/* Modal content */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-subtle rounded-lg">
                  <Terminal className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-default">Update to v{updateAvailable?.version}</h3>
                  <p className="text-sm text-muted">Run this command in your terminal</p>
                </div>
              </div>

              {/* Command box */}
              <div className="flex items-stretch bg-background border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 flex-1 min-w-0">
                  <Terminal className="w-4 h-4 text-muted flex-shrink-0" />
                  <code className="text-sm font-mono text-default truncate">
                    {LINUX_INSTALL_COMMAND}
                  </code>
                </div>
                <button
                  onClick={handleCopyCommand}
                  className={`px-4 py-3 transition-colors flex items-center gap-2 ${
                    copied 
                      ? 'bg-success text-white' 
                      : 'bg-primary hover:bg-primary-hover text-white'
                  }`}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm font-medium">Copy</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-muted">
                The install script will automatically detect your distro ({updateAvailable?.distroLabel || 'Linux'}) and update Jobelix.
              </p>

              {/* Fallback link */}
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted">
                  Prefer manual install?{' '}
                  <button 
                    onClick={handleDirectDownload}
                    className="text-primary hover:underline"
                  >
                    Download AppImage directly
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-2">
        {/* Update Error Notification */}
        {updateError && (
          <div className="bg-error text-white rounded-lg shadow-lg p-4 animate-slide-in">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium">Update Check Failed</h3>
                <p className="mt-1 text-sm opacity-90">
                  {updateError.message || 'Could not check for updates. Please try again later.'}
                </p>
                <button
                  onClick={handleErrorDismiss}
                  className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-white/20 hover:bg-white/30 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Available Notification */}
        {updateAvailable && !updateDownloaded && (
          <div className="bg-info text-white rounded-lg shadow-lg p-4 animate-slide-in">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium">Update Available</h3>
                {updateAvailable.manualDownload ? (
                  // Linux: Show install command modal
                  <>
                    <p className="mt-1 text-sm opacity-90">
                      Version {updateAvailable.version} is available!
                    </p>
                    {updateAvailable.distroLabel && (
                      <p className="mt-1 text-xs opacity-75">
                        Detected: {updateAvailable.distroLabel}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handleLinuxUpdateClick}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Terminal className="h-4 w-4 mr-1.5" />
                        How to Update
                      </button>
                      <button
                        onClick={handleDismiss}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        Later
                      </button>
                    </div>
                  </>
                ) : (
                  // Windows/macOS: Auto-downloading
                  <>
                    <p className="mt-1 text-sm opacity-90">
                      Version {updateAvailable.version} is downloading...
                    </p>
                    {updateAvailable.releaseNotes && (
                    <p className="mt-2 text-xs opacity-75 line-clamp-2">
                      {updateAvailable.releaseNotes}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Download Progress */}
      {downloadProgress && (
        <div className="bg-surface rounded-lg shadow-lg p-4 border border-border">
          <div className="flex items-center mb-2">
            <svg className="animate-spin h-5 w-5 text-info mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="text-sm font-medium text-default">
              Downloading Update
            </h3>
          </div>
          
          <div className="w-full bg-border rounded-full h-2.5 mb-2">
            <div 
              className="bg-info h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress.percent}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-muted">
            <span>{downloadProgress.percent.toFixed(1)}%</span>
            <span>
              {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
            </span>
            <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
          </div>
        </div>
      )}

      {/* Update Downloaded - Ready to Install */}
      {updateDownloaded && (
        <div className="bg-success text-white rounded-lg shadow-lg p-4 animate-slide-in">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium">Update Ready</h3>
              <p className="mt-1 text-sm opacity-90">
                Version {updateDownloaded} is ready to install.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
