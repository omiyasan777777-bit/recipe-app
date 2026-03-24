const { contextBridge } = require('electron');

// No IPC needed — webview tags manage their own sessions/navigation.
// Expose a minimal API for potential future use.
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform
});
