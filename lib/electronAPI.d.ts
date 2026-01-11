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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
