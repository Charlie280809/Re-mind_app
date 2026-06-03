const { app, BrowserWindow, Notification, ipcMain, shell, dialog, Menu } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

Menu.setApplicationMenu(null)

const isDev = !app.isPackaged;

try {
  app.setAppUserModelId("be.remind.app");
} catch (e) {
  console.error(e);
}

if (isDev) {
  app.setPath("userData", path.join(app.getPath("appData"), "Re-Mind-dev"));
}

let mainWindow = null;
let lastNotification = null;
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  focusMainWindow();
});

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isMaximized()) mainWindow.maximize();

  mainWindow.show();
  mainWindow.focus();
};

function showSystemNotification({ title, body }) {
  const notification = new Notification({
    title,
    body,
    icon: path.join(__dirname, "assets/icon.ico"),
  });

  notification.on("click", () => {
    focusMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("re-mind:notification-clicked", { title, body });
    }
  });

  lastNotification = notification;

  notification.on("close", () => {
    if (lastNotification === notification) lastNotification = null;
  });
  notification.show();
};

ipcMain.handle("re-mind:show-notification", (_event, payload) => {
  if (!payload?.title || !payload?.body) return false;
  showSystemNotification(payload);
  return true;
});

ipcMain.handle("re-mind:close-notification", () => {
  if (!lastNotification) return false;

  try {
    lastNotification.close();
  } catch { }

  lastNotification = null;
  return true;
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
      app.quit();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL("https://re-mind-app-tjmo.vercel.app/");

  return mainWindow;
};

function setupAutoUpdates() {
  if (isDev) return;

  autoUpdater.on("update-available", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      showSystemNotification({
        title: "Update beschikbaar",
        body: "Een nieuwe versie van Re:Mind wordt gedownload.",
      });
    }
  });

  autoUpdater.on("update-downloaded", () => {
    dialog.showMessageBox({
      type: "info",
      title: "Update klaar om te installeren",
      message: "Een nieuwe versie van Re:Mind is klaar om te installeren.",
      detail: "Start de app opnieuw om de nieuwste versie van Re:Mind te gebruiken.",
      buttons: ["Opnieuw starten"],
    })
      .then(() => autoUpdater.quitAndInstall());
  });

  autoUpdater.on("error", console.error);

  autoUpdater.checkForUpdatesAndNotify();
};

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("activate", () => {
  createWindow();
});

app.whenReady().then(() => {
  try {
    app.setName("Re:Mind");
  } catch (e) {
    console.error(e);
  }

  createWindow();
  setupAutoUpdates();
});

app.on("window-all-closed", (event) => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});