'use client';

import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

/**
 * UpdateNotification Component
 * 
 * Displays auto-updater notifications and progress in Electron app
 * - Shows when new update is available
 * - Displays download progress
 * - Notifies when update is ready to install
 */
export default function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<string | null>(null);

  useEffect(() => {
    // Only run in Electron environment
    if (typeof window === 'undefined' || !window.electronAPI) {
      return;
    }

    // Listen for update available
    window.electronAPI.onUpdateAvailable((info) => {
      console.log('[UpdateNotification] Update available:', info);
      setUpdateAvailable(info);
      setDownloadProgress(null); // Reset progress when new update detected
      setUpdateDownloaded(null); // Reset download complete state
    });

    // Listen for download progress
    window.electronAPI.onUpdateDownloadProgress((progress) => {
      console.log('[UpdateNotification] Download progress:', progress.percent.toFixed(1) + '%');
      setDownloadProgress(progress);
    });

    // Listen for update downloaded
    window.electronAPI.onUpdateDownloaded((info) => {
      console.log('[UpdateNotification] Update downloaded:', info);
      setUpdateDownloaded(info.version);
      setDownloadProgress(null); // Clear progress when download completes
    });

    // Cleanup listeners on unmount
    return () => {
      if (window.electronAPI?.removeUpdateListeners) {
        window.electronAPI.removeUpdateListeners();
      }
    };
  }, []);

  // Format bytes to human-readable size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format speed to human-readable
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  // Don't render anything if no updates
  if (!updateAvailable && !downloadProgress && !updateDownloaded) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {/* Update Available Notification */}
      {updateAvailable && !updateDownloaded && (
        <div className="bg-info text-white rounded-lg shadow-lg p-4 mb-2 animate-slide-in">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium">Update Available</h3>
              <p className="mt-1 text-sm text-info">
                Version {updateAvailable.version} is downloading...
              </p>
              {updateAvailable.releaseNotes && (
                <p className="mt-2 text-xs text-info line-clamp-2">
                  {updateAvailable.releaseNotes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Download Progress */}
      {downloadProgress && (
        <div className="bg-surface rounded-lg shadow-lg p-4 mb-2 border border-border">
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
              <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium">Update Ready</h3>
              <p className="mt-1 text-sm text-success">
                Version {updateDownloaded} has been downloaded and will be installed when you restart the app.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
