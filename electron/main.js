const { app, BrowserWindow, Notification, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;

const focusMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
};

const showSystemNotification = ({ title, body }) => {
  const notification = new Notification({
    title,
    body,
  });

  notification.on("click", () => {
    focusMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("re-mind:notification-clicked", { title, body });
    }
  });
  notification.show();
};

ipcMain.handle("re-mind:show-notification", (_event, payload) => {
  if (!payload?.title || !payload?.body) {
    return false;
  }

  showSystemNotification(payload);
  return true;
});

const createWindow = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    focusMainWindow();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1078,
    height: 700,
    icon: path.join(__dirname, "assets/favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
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

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId(app.isPackaged ? "com.remind.app" : process.execPath);
  }

  createWindow();
});
