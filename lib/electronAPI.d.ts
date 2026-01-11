export interface ElectronAPI {
  readSecretsFile: () => Promise<{ success: boolean; email: string; password: string }>;
  writeSecretsFile: (content: string) => Promise<{ success: boolean; error?: string }>;
  readConfigFile: () => Promise<{ success: boolean; content: string }>;
  writeConfigFile: (content: string) => Promise<{ success: boolean; error?: string }>;
  launchBot: (token: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    message?: string;
    pid?: number;
    platform?: string;
  }>;
  
  // Auto-updater events
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string; releaseDate?: string }) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: { 
    bytesPerSecond: number; 
    percent: number; 
    transferred: number; 
    total: number 
  }) => void) => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => void;
  removeUpdateListeners: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
