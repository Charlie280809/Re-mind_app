export function showNativeNotification({ title, body, onClick }) {
    const log = (message, details = {}) => {
        console.log(`[Re:Mind debug] ${message}`, details);

        if (typeof window !== "undefined" && window.reMindDiagnostics?.log) {
            void window.reMindDiagnostics.log(message, details);
        }
    };

    log("renderer-show-native-notification", { title, body, hasOnClick: typeof onClick === "function" });

    if (typeof window !== "undefined" && window.reMindNotifications?.show) {
        if (typeof window.reMindNotifications.setClickHandler === "function") {
            window.reMindNotifications.setClickHandler(
                typeof onClick === "function"
                    ? () => {
                        log("renderer-notification-click-handler", { title, body });

                        if (typeof window.focus === "function") {
                            window.focus();
                        }

                        // ask the host (Electron main) to close the native notification
                        if (typeof window.reMindNotifications.close === "function") {
                            try {
                                void window.reMindNotifications.close();
                            } catch (e) {
                                // ignore
                            }
                        }

                        onClick();
                    }
                    : null
            );
        }

        void window.reMindNotifications.show({ title, body });

        return null;
    }

    if (typeof window === "undefined" || typeof window.Notification !== "function") {
        return null;
    }

    try {
        const notification = new window.Notification(title, { body });

        if (typeof onClick === "function") {
            notification.onclick = () => {
                log("browser-notification-click-handler", { title, body });

                if (typeof window.focus === "function") {
                    window.focus();
                }

                // explicitly close the notification so it is removed from the panel
                try {
                    notification.close();
                } catch (e) {
                    // ignore
                }

                onClick();
            };
        }

        return notification;
    } catch (error) {
        console.error("Failed to show native notification:", error);
        return null;
    }
}