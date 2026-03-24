const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');

// Handle node-pty carefully — it's a native module
let pty;
try {
  pty = require('node-pty');
} catch (e) {
  console.error('node-pty not available:', e.message);
}

// Map of id -> pty process
const ptyProcesses = new Map();
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0d1117',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#161b22',
      symbolColor: '#c9d1d9',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in dev — uncomment when debugging:
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    for (const [, proc] of ptyProcesses) {
      try { proc.kill(); } catch (_) {}
    }
    ptyProcesses.clear();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: Create PTY ──────────────────────────────────────────────────────────
ipcMain.handle('pty:create', (event, { id, cols, rows }) => {
  if (!pty) return { success: false, error: 'node-pty not available' };

  try {
    const shell = process.platform === 'win32'
      ? 'cmd.exe'
      : (process.env.SHELL || '/bin/bash');

    const proc = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: os.homedir(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      }
    });

    ptyProcesses.set(id, proc);

    proc.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty:data', { id, data });
      }
    });

    proc.onExit(({ exitCode }) => {
      ptyProcesses.delete(id);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty:exit', { id, exitCode });
      }
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to create pty:', err);
    return { success: false, error: err.message };
  }
});

// ── IPC: Write to PTY ────────────────────────────────────────────────────────
ipcMain.on('pty:write', (event, { id, data }) => {
  const proc = ptyProcesses.get(id);
  if (proc) {
    try { proc.write(data); } catch (e) { console.error('pty write error:', e); }
  }
});

// ── IPC: Resize PTY ──────────────────────────────────────────────────────────
ipcMain.on('pty:resize', (event, { id, cols, rows }) => {
  const proc = ptyProcesses.get(id);
  if (proc) {
    try { proc.resize(cols, rows); } catch (e) { console.error('pty resize error:', e); }
  }
});

// ── IPC: Kill PTY ────────────────────────────────────────────────────────────
ipcMain.on('pty:kill', (event, { id }) => {
  const proc = ptyProcesses.get(id);
  if (proc) {
    try { proc.kill(); } catch (_) {}
    ptyProcesses.delete(id);
  }
});
