const { contextBridge, ipcRenderer } = require("electron");

let pendingNotificationClickHandler = null;

ipcRenderer.on("re-mind:debug", (_event, payload) => {
    console.log("[Re:Mind debug][main]", payload?.message, payload?.details || {});
});

ipcRenderer.on("re-mind:notification-clicked", (_event, payload) => {
    console.log("[Re:Mind debug] notification-clicked payload received in renderer", payload);

    if (typeof pendingNotificationClickHandler === "function") {
        const handler = pendingNotificationClickHandler;
        pendingNotificationClickHandler = null;
        handler(payload);
    }
});

contextBridge.exposeInMainWorld("reMindNotifications", {
    show(payload) {
        return ipcRenderer.invoke("re-mind:show-notification", payload);
    },

    setClickHandler(handler) {
        pendingNotificationClickHandler = typeof handler === "function" ? handler : null;
    },
    // request the main process to close the last shown notification
    close() {
        return ipcRenderer.invoke("re-mind:close-notification");
    },
});

contextBridge.exposeInMainWorld("reMindDiagnostics", {
    log(message, details = {}) {
        console.log(`[Re:Mind debug] ${message}`, details);
        return ipcRenderer.invoke("re-mind:log", { message, details });
    },
    getLogPath() {
        return ipcRenderer.invoke("re-mind:get-debug-log-path");
    },
    openLogFolder() {
        return ipcRenderer.invoke("re-mind:open-debug-log-folder");
    },
});

contextBridge.exposeInMainWorld("reMindPlatform", {
    openExternal(url) {
        return ipcRenderer.invoke("re-mind:open-external", url);
    }
});