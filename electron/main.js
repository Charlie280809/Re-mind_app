const { app, BrowserWindow, Notification, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");

const isDev = !app.isPackaged;
const APP_USER_MODEL_ID = isDev ? "be.remind.app.dev" : "be.remind.app";

try {
  app.setAppUserModelId(APP_USER_MODEL_ID);
} catch (e) {
  console.error(e);
}

if (isDev) {
  app.setPath("userData", path.join(app.getPath("appData"), "Re-Mind-dev"));
}

let mainWindow = null;
let lastNotification = null;

function getLogFilePath() {
  return path.join(app.getPath("userData"), "notification-debug.log");
}

function logDebug(message, details = {}) {
  const line = `${new Date().toISOString()} ${message}${Object.keys(details).length ? ` ${JSON.stringify(details)}` : ""}\n`;

  try {
    fs.appendFileSync(getLogFilePath(), line, "utf8");
  } catch (error) {
    console.error("Failed to write debug log:", error);
  }

  console.log(`[Re:Mind debug] ${message}`, details);
}

const gotTheLock = app.requestSingleInstanceLock();

logDebug("app-start", {
  pid: process.pid,
  isPackaged: app.isPackaged,
  isDev,
  appId: APP_USER_MODEL_ID,
  argv: process.argv,
});

if (!gotTheLock) {
  logDebug("single-instance-lock-failed");
  app.quit();
}

app.on("second-instance", (_event, argv, workingDirectory) => {
  logDebug("second-instance", { argv, workingDirectory });

  if (!mainWindow || mainWindow.isDestroyed()) {
    logDebug("second-instance-create-window");
    createWindow();
    return;
  }

  focusMainWindow();
});

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    logDebug("focus-main-window-skipped", { reason: "missing-window" });
    return;
  }

  logDebug("focus-main-window", {
    minimized: mainWindow.isMinimized(),
    maximized: mainWindow.isMaximized(),
    visible: mainWindow.isVisible(),
  });

  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isMaximized()) mainWindow.maximize();

  mainWindow.showInactive();
  mainWindow.show();
  mainWindow.focus();
};

function showSystemNotification({ title, body }) {
  logDebug("show-notification", { title, body });

  const notification = new Notification({
    title,
    body,
    icon: path.join(__dirname, "assets/icon.ico"),
  });

  notification.on("click", () => {
    logDebug("notification-click", {
      title,
      body,
      hasWindow: Boolean(mainWindow && !mainWindow.isDestroyed()),
    });

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

ipcMain.handle("re-mind:log", (_event, payload) => {
  if (!payload?.message) return false;

  logDebug(payload.message, payload.details ?? {});
  return true;
});

ipcMain.handle("re-mind:get-debug-log-path", () => {
  return getLogFilePath();
});

ipcMain.handle("re-mind:open-debug-log-folder", async () => {
  try {
    await shell.showItemInFolder(getLogFilePath());
    return true;
  } catch (error) {
    logDebug("open-debug-log-folder-failed", { message: error.message });
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
    logDebug("create-window-reuse-existing");
    focusMainWindow();
    return mainWindow;
  }

  logDebug("create-window-new");

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
    logDebug("window-close", { isQuitting: Boolean(app.isQuitting) });
    if (!app.isQuitting) {
      app.quit();
    }
  });

  mainWindow.on("closed", () => {
    logDebug("window-closed");
    mainWindow = null;
  });

  mainWindow.webContents.on("did-start-loading", () => {
    logDebug("window-did-start-loading");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    logDebug("window-did-finish-load", { url: mainWindow.webContents.getURL() });
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logDebug("window-did-fail-load", { errorCode, errorDescription, validatedURL });
  });

  if (isDev) {
    logDebug("load-dev-url", { url: "http://localhost:5173" });
    mainWindow.loadURL("http://localhost:5173");
  } else {
    logDebug("load-prod-url", { url: "https://re-mind-app-tjmo.vercel.app/" });
    mainWindow.loadURL("https://re-mind-app-tjmo.vercel.app/");
  }
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
  logDebug("before-quit");
  app.isQuitting = true;
});

app.on("activate", () => {
  logDebug("activate");
  createWindow();
});

app.whenReady().then(() => {
  logDebug("app-ready");

  try {
    app.setName("Re:Mind");
  } catch (e) {
    console.error(e);
    logDebug("set-name-failed", { message: e.message });
  }

  createWindow();
  setupAutoUpdates();
});

app.on("window-all-closed", (event) => {
  logDebug("window-all-closed", { platform: process.platform });
  if (process.platform !== "darwin") {
    app.quit();
  }
});