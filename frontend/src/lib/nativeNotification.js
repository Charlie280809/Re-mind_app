export function showNativeNotification({ title, body, onClick }) {
    if (typeof window !== "undefined" && window.reMindNotifications?.show) {
        if (typeof window.reMindNotifications.setClickHandler === "function") {
            window.reMindNotifications.setClickHandler(
                typeof onClick === "function"
                    ? () => {
                        if (typeof window.focus === "function") {
                            window.focus();
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
                if (typeof window.focus === "function") {
                    window.focus();
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