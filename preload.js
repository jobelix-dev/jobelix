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
});
