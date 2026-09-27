const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAgent', {
  askClaude: (prompt, context = '') => ipcRenderer.invoke('ask-agent', { prompt, context }),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  shareEmail: (text) => ipcRenderer.invoke('share-email', text),
  shareSlack: (text) => ipcRenderer.invoke('share-slack', text),
  toggleWindow: () => ipcRenderer.invoke('toggle-window'),
});
