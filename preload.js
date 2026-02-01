// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Config files
  readConfigFile: () => ipcRenderer.invoke('read-config'),
  writeConfigFile: (content) => ipcRenderer.invoke('write-config', content),
  writeResumeFile: (content) => ipcRenderer.invoke('write-resume', content),
  
  // Bot controls
  launchBot: (token, apiUrl) => ipcRenderer.invoke('launch-bot', { token, apiUrl }),
  stopBot: () => ipcRenderer.invoke('stop-bot'),
  forceStopBot: () => ipcRenderer.invoke('force-stop-bot'),
  getBotStatus: () => ipcRenderer.invoke('get-bot-status'),
  getBotLogPath: () => ipcRenderer.invoke('get-bot-log-path'),
  
  // Browser management
  checkBrowser: () => ipcRenderer.invoke('check-browser'),
  installBrowser: () => ipcRenderer.invoke('install-browser'),
  onBrowserInstallProgress: (callback) => ipcRenderer.on('browser-install-progress', (event, data) => callback(data)),
  removeBrowserInstallProgressListeners: () => {
    ipcRenderer.removeAllListeners('browser-install-progress');
  },
  
  // Auth cache
  saveAuthCache: (tokens) => ipcRenderer.invoke('save-auth-cache', tokens),
  loadAuthCache: () => ipcRenderer.invoke('load-auth-cache'),
  clearAuthCache: () => ipcRenderer.invoke('clear-auth-cache'),
  
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowUnmaximize: () => ipcRenderer.invoke('window-unmaximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Bot status updates (main -> renderer)
  onBotStatus: (callback) => ipcRenderer.on('bot-status', (event, data) => callback(data)),
  removeBotStatusListeners: () => {
    ipcRenderer.removeAllListeners('bot-status');
  },
  
  // Auto-updater events
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, data) => callback(data)),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, data) => callback(data)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, data) => callback(data)),
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');
  },
  
  // Open external URL (for manual update download on Linux)
  openReleasesPage: () => ipcRenderer.invoke('open-releases-page'),
});
