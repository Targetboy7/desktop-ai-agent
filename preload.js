const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAgent', {
  initDatabase: () => ipcRenderer.invoke('init-database'),
  getHistory: () => ipcRenderer.invoke('list-conversations'),
  newConversation: () => ipcRenderer.invoke('new-conversation'),
  loadConversation: (conversationId) => ipcRenderer.invoke('load-conversation', conversationId),
  askAgent: (payload) => ipcRenderer.invoke('ask-agent', payload),
  listPrompts: () => ipcRenderer.invoke('list-prompts'),
  saveSetting: (key, value) => ipcRenderer.invoke('save-setting', { key, value }),
  getSetting: (key, fallback = '') => ipcRenderer.invoke('get-setting', key, fallback),
  getConversations: () => ipcRenderer.invoke('list-conversations'),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  shareEmail: (text) => ipcRenderer.invoke('share-email', text),
  shareSlack: (text) => ipcRenderer.invoke('share-slack', text),
  toggleWindow: () => ipcRenderer.invoke('toggle-window'),
});
