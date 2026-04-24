const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 585
  });

  win.loadURL("http://localhost:5173");
}

app.whenReady().then(createWindow);
