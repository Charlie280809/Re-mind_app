const { app, BrowserWindow, Notification, ipcMain, shell } = require("electron");
const path = require("path");
const { autoUpdater }=require("electron-updater");
const { dialog }=require("electron");

const isDev = !app.isPackaged;

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

  // autoUpdater.on("update-downloaded", () => {
  //   dialog
  //     .showMessageBox({
  //       type: "info",
  //       title: "Update beschikbaar",
  //       message: "Een nieuwe versie van Re:Mind is gedownload.",
  //       detail: "De app wordt opnieuw opgestart om de update te installeren.",
  //       buttons: ["Nu updaten"],
  //     })
  //     .then(() => {
  //       autoUpdater.quitAndInstall();
  //     });
  // });

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update gedownload",
        message: "Een nieuwe versie van Re:Mind is gedownload.",
        buttons: ["OK"],
      })
      .then(() => {
        autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto-update error:", error);
  });

  // autoUpdater.on("update-available", () => {
  //   if (mainWindow && !mainWindow.isDestroyed()) {
  //     showSystemNotification({
  //       title: "Update beschikbaar",
  //       body: "Er wordt een nieuwe versie van Re:Mind gedownload.",
  //     });
  //   }
  // });

  autoUpdater.on("update-available", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      showMessageBox({
        type: "info",
        title: "Update beschikbaar",
        message: "Klik op 'Nu updaten' om Re:Mind bij te werken naar de nieuwste versie.",
        buttons: ["Nu updaten"],
      }).then(() => {
        autoUpdater.quitAndInstall();
      });
    }
  });

  autoUpdater.checkForUpdatesAndNotify();
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

  // Set a stable app identity for Windows notifications. The installer will
  // create a Start Menu shortcut that ties this AppUserModelID to the app,
  // which makes Action Center show the correct app name and icon.
  try {
    app.setName("Re:Mind");
    app.setAppUserModelId("be.remind.app");
  } catch (e) {
  }

  createWindow();
  setupAutoUpdates();
});
