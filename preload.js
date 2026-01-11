const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  readConfigFile: () => ipcRenderer.invoke('read-config'),
  writeConfigFile: (content) => ipcRenderer.invoke('write-config', content),
  launchBot: (token) => ipcRenderer.invoke('launch-bot', token),
});
