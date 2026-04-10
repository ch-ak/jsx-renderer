const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  watchFile: (filePath) => ipcRenderer.invoke('file:watch', filePath),
  unwatchFile: (filePath) => ipcRenderer.invoke('file:unwatch', filePath),

  // File change events
  onFileChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('file:changed', handler);
    return () => ipcRenderer.removeListener('file:changed', handler);
  },

  // PDF export
  exportPDF: (options) => ipcRenderer.invoke('pdf:export', options),
  exportWebviewPDF: (options) => ipcRenderer.invoke('pdf:exportWebview', options),

  // PPTX GIF export
  exportWebviewPPT: (options) => ipcRenderer.invoke('ppt:exportWebview', options),


  // Menu events
  onMenuOpenFile: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu:openFile', handler);
    return () => ipcRenderer.removeListener('menu:openFile', handler);
  },
  onMenuExportPDF: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu:exportPDF', handler);
    return () => ipcRenderer.removeListener('menu:exportPDF', handler);
  },

  // Status updates from main process
  onStatusUpdate: (callback) => {
    const handler = (_e, msg) => callback(msg);
    ipcRenderer.on('status', handler);
    return () => ipcRenderer.removeListener('status', handler);
  },

  // Platform info
  platform: process.platform,
});
