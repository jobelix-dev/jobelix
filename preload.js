const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  readConfigFile: () => ipcRenderer.invoke('read-config'),
  writeConfigFile: (content) => ipcRenderer.invoke('write-config', content),
  writeResumeFile: (content) => ipcRenderer.invoke('write-resume', content),
  launchBot: (token) => ipcRenderer.invoke('launch-bot', token),
  
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
  
  // Auto-updater listeners
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (event, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, error) => callback(error)),
  
  // Remove listeners
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');
  }
});
