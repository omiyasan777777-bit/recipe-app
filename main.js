const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Map of id -> child process
const processes = new Map();
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

  mainWindow.on('closed', () => {
    for (const [, proc] of processes) {
      try { proc.kill(); } catch (_) {}
    }
    processes.clear();
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

// ── IPC: Create process ───────────────────────────────────────────────────────
ipcMain.handle('pty:create', (event, { id }) => {
  try {
    const isWin = process.platform === 'win32';
    const shell = isWin ? 'cmd.exe' : (process.env.SHELL || '/bin/bash');
    const args = isWin ? [] : [];

    const proc = spawn(shell, args, {
      cwd: os.homedir(),
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    processes.set(id, proc);

    proc.stdout.on('data', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty:data', { id, data: data.toString() });
      }
    });

    proc.stderr.on('data', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty:data', { id, data: data.toString() });
      }
    });

    proc.on('exit', (exitCode) => {
      processes.delete(id);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty:exit', { id, exitCode });
      }
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to create process:', err);
    return { success: false, error: err.message };
  }
});

// ── IPC: Write to process ─────────────────────────────────────────────────────
ipcMain.on('pty:write', (event, { id, data }) => {
  const proc = processes.get(id);
  if (proc && proc.stdin) {
    try { proc.stdin.write(data); } catch (e) { console.error('write error:', e); }
  }
});

// ── IPC: Resize (no-op without pty, kept for API compatibility) ───────────────
ipcMain.on('pty:resize', () => {});

// ── IPC: Kill process ─────────────────────────────────────────────────────────
ipcMain.on('pty:kill', (event, { id }) => {
  const proc = processes.get(id);
  if (proc) {
    try { proc.kill(); } catch (_) {}
    processes.delete(id);
  }
});
