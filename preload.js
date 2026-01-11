const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  readSecretsFile: () => ipcRenderer.invoke('read-secrets'),
  writeSecretsFile: (content) => ipcRenderer.invoke('write-secrets', content),
  readConfigFile: () => ipcRenderer.invoke('read-config'),
  writeConfigFile: (content) => ipcRenderer.invoke('write-config', content),
  launchBot: (token) => ipcRenderer.invoke('launch-bot', token),
});
