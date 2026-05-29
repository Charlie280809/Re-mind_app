const { contextBridge, ipcRenderer } = require("electron");

let pendingNotificationClickHandler = null;

ipcRenderer.on("re-mind:notification-clicked", (_event, payload) => {
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
});