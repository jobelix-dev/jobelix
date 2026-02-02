export interface BrowserInstallProgress {
  stage: 'downloading' | 'completed' | 'failed';
  progress: number;
  message: string;
}

export interface BrowserStatus {
  success: boolean;
  installed: boolean;
  path: string | null;
  version: string | null;
  error?: string;
}

export interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>;
  
  readConfigFile: () => Promise<{ success: boolean; content: string }>;
  writeConfigFile: (content: string) => Promise<{ success: boolean; error?: string }>;
  writeResumeFile: (content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  launchBot: (token: string, apiUrl?: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    message?: string;
    pid?: number;
    platform?: string;
  }>;
  stopBot: () => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  forceStopBot: () => Promise<{
    success: boolean;
    error?: string;
    killed?: boolean;
  }>;
  getBotStatus: () => Promise<{
    success: boolean;
    running: boolean;
    pid: number | null;
    startedAt: number | null;
    stats?: {
      jobs_found: number;
      jobs_applied: number;
      jobs_failed: number;
      credits_used: number;
    } | null;
  }>;
  getBotLogPath: () => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  
  // Browser management
  checkBrowser: () => Promise<BrowserStatus>;
  installBrowser: () => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  onBrowserInstallProgress: (callback: (progress: BrowserInstallProgress) => void) => void;
  removeBrowserInstallProgressListeners: () => void;
  
  saveAuthCache: (tokens: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    user_id: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loadAuthCache: () => Promise<{ 
    access_token: string; 
    refresh_token: string; 
    expires_at?: number; 
    user_id: string 
  } | null>;
  clearAuthCache: () => Promise<{ success: boolean; error?: string }>;
  
  // Auto-updater events
  onUpdateAvailable: (callback: (info: { 
    version: string; 
    releaseNotes?: string; 
    releaseDate?: string;
    manualDownload?: boolean;
    downloadUrl?: string;
    distroLabel?: string; // Linux only: human-readable distro name
  }) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: { 
    bytesPerSecond: number; 
    percent: number; 
    transferred: number; 
    total: number 
  }) => void) => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => void;
  onUpdateError: (callback: (error: { message: string; error?: string }) => void) => void;
  removeUpdateListeners: () => void;
  
  // Open releases page for manual update download (Linux)
  openReleasesPage: () => Promise<{ success: boolean }>;
  
  // Open any external URL (for direct download links)
  openExternalUrl: (url: string) => Promise<{ success: boolean }>;

  // Bot status updates (from stdout IPC)
  onBotStatus: (callback: (payload: { 
    stage: 'checking' | 'installing' | 'launching' | 'running' | 'completed' | 'failed' | 'stopped'; 
    message?: string; 
    progress?: number; 
    activity?: string;
    details?: Record<string, unknown>;
    stats?: {
      jobs_found: number;
      jobs_applied: number;
      jobs_failed: number;
      credits_used: number;
    };
  }) => void) => void;
  removeBotStatusListeners: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
