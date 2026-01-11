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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
