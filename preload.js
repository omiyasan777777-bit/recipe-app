const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Create a new pty process
  ptyCreate: (options) => ipcRenderer.invoke('pty:create', options),

  // Write data to a pty
  ptyWrite: (id, data) => ipcRenderer.send('pty:write', { id, data }),

  // Resize a pty
  ptyResize: (id, cols, rows) => ipcRenderer.send('pty:resize', { id, cols, rows }),

  // Kill a pty process
  ptyKill: (id) => ipcRenderer.send('pty:kill', { id }),

  // Listen for pty output data; returns unsubscribe fn
  onPtyData: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('pty:data', handler);
    return () => ipcRenderer.removeListener('pty:data', handler);
  },

  // Listen for pty exit events; returns unsubscribe fn
  onPtyExit: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('pty:exit', handler);
    return () => ipcRenderer.removeListener('pty:exit', handler);
  }
});
