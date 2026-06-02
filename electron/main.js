const { app, BrowserWindow, Notification, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

const isDev = !app.isPackaged;

app.setName("Re:Mind");
app.setAppUserModelId("be.remind.app");

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}


let mainWindow = null;
let lastNotification = null;

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isMaximized()) {
    mainWindow.maximize();
  }

  mainWindow.show();
  mainWindow.focus();
};

const showSystemNotification = ({ title, body }) => {
  const notification = new Notification({
    icon: path.join(__dirname, "assets/icon.ico"),
    title,
    body,
  });

  notification.on("click", () => {
    focusMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("re-mind:notification-clicked", { title, body });
    }
  });
  lastNotification = notification;
  notification.on("close", () => {
    if (lastNotification === notification) {
      lastNotification = null;
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

ipcMain.handle("re-mind:close-notification", () => {
  try {
    if (lastNotification) {
      try {
        lastNotification.close();
      } catch (e) {
        // ignore
      }
      lastNotification = null;
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
});

ipcMain.handle("re-mind:open-external", async (_event, url) => {
  try {
    if (!url) return false;
    await shell.openExternal(url);
    return true;
  } catch (e) {
    return false;
  }
});

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    focusMainWindow();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1078,
    height: 700,
    icon: path.join(__dirname, "assets/icon.ico"),
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

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadURL("https://re-mind-app-tjmo.vercel.app/");
  }
  return mainWindow;
};

function setupAutoUpdates() {
  if (isDev) {
    return;
  }

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update geïnstalleerd",
        message: "Een nieuwe versie van Re:Mind is geïnstalleerd.",
        // detail: "De app wordt opnieuw opgestart om de update te installeren.",
        buttons: ["OK"],
      })
      .then(() => {
        autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto-update error:", error);
  });

  autoUpdater.on("update-available", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      showSystemNotification({
        title: "Update beschikbaar",
        body: "Er is een nieuwe versie van Re:Mind beschikbaar.",
      });
    }
  });

  autoUpdater.checkForUpdatesAndNotify();
};

app.on("before-quit", () => {
  app.isQuitting = true;
});

autoUpdater.on("error", (error) => {
  console.error("Auto-update error:", error);
});

app.on("second-instance", () => {
  focusMainWindow();
});

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdates();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      focusMainWindow();
    }
  });
});

app.on("window-all-closed", (event) => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});