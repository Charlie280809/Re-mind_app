const { app, BrowserWindow, Notification, ipcMain, shell } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { dialog } = require("electron");

const isDev = !app.isPackaged;

// Set the Windows app identity as early as possible so taskbar grouping and
// notification/icon behavior stay stable across launches.
app.setName("Re:Mind");
app.setAppUserModelId("be.remind.app");

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

if (isDev) {
  // Keep dev profile/cache separate from the installed app to avoid lock and
  // access-denied issues when both versions were run on the same machine.
  app.setPath("userData", path.join(app.getPath("appData"), "Re-Mind-dev"));
}

let mainWindow = null;
let lastNotification = null;

const focusMainWindow = () => {
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
    title,
    body,
  });

  notification.on("click", () => {
    console.log("Notification clicked");

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

const createWindow = () => {
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

const setupAutoUpdates = () => {
  if (isDev) {
    return;
  }

  autoUpdater.autoDownload = false;

  autoUpdater.on("update-downloaded", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      showSystemNotification({
        title: "Update gedownload",
        body: "Re:Mind is bijgewerkt naar de nieuwste versie en klaar voor gebruik.",
      });
    }

    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 4000);
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto-update error:", error);
  });

  autoUpdater.on("update-available", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Update beschikbaar",
        message: "Klik op 'Nu updaten' om Re:Mind bij te werken naar de nieuwste versie.",
        buttons: ["Nu updaten"],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      }).then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate().catch((error) => {
            console.error("Failed to download update:", error);
          });
        }
      });
    }
  });

  autoUpdater.checkForUpdates().catch((error) => {
    console.error("Failed to check for updates:", error);
  });
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

app.on("second-instance", () => {
  focusMainWindow();
});

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) {
    return;
  }

  createWindow();
  setupAutoUpdates();
});
