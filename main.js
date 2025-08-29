const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backend;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  // Start backend
  backend = spawn(process.execPath, [path.join(__dirname, 'backend','server.js')], {
    stdio: 'inherit',
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backend) backend.kill();
    app.quit();
  }
});
