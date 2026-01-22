export interface ElectronAPI {
  readConfigFile: () => Promise<{ success: boolean; content: string }>;
  writeConfigFile: (content: string) => Promise<{ success: boolean; error?: string }>;
  writeResumeFile: (content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  launchBot: (token: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    message?: string;
    pid?: number;
    platform?: string;
  }>;
  
  // Auth cache
  saveAuthCache: (tokens: { 
    access_token: string; 
    refresh_token: string; 
    expires_at?: number; 
    user_id: string 
  }) => Promise<{ success: boolean; error?: string }>;
  loadAuthCache: () => Promise<{ 
    access_token: string; 
    refresh_token: string; 
    expires_at?: number; 
    user_id: string 
  } | null>;
  clearAuthCache: () => Promise<{ success: boolean; error?: string }>;
  
  // Window controls
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowUnmaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  
  // Auto-updater events
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string; releaseDate?: string }) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: { 
    bytesPerSecond: number; 
    percent: number; 
    transferred: number; 
    total: number 
  }) => void) => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => void;
  onUpdateError: (callback: (error: { message: string; error?: string }) => void) => void;
  removeUpdateListeners: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
