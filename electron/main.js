const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1078,
    height: 700,
    icon: path.join(__dirname, "assets/favicon.ico")
  });

  win.loadURL("http://localhost:5173"); //local vite dev server, will be replaced with production build in the future
}

app.whenReady().then(createWindow);
