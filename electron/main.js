const { app, BrowserWindow } = require("electron");
const path = require("path");

let mainWindow = null;

const createWindow = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1078,
    height: 700,
    icon: path.join(__dirname, "assets/favicon.ico"),
  });

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL("http://localhost:5173"); //local vite dev server, will be replaced with production build in the future
  return mainWindow;
};

app.on("window-all-closed", (event) => {
  if (!app.isQuitting) {
    event.preventDefault();
  }
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("activate", () => {
  createWindow();
});

app.whenReady().then(createWindow);
