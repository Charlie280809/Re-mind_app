import "../css/settings.css";
import { LuChevronRight, LuArrowLeft } from "react-icons/lu";
import { useState, useEffect } from "react";
import SettingsWorkHours from "./SettingsWorkHours";
import SettingsNotifications from "./SettingsNotifications";
import SettingsPersonalData from "./SettingsPersonalData";
import SettingsPrivacy from "./SettingsPrivacy";

export default function Settings({ onBack, resetKey, isPremium, initialView, clearInitialView, onNavigateToUpgrade, onLogout, profile }) {
    const [view, setView] = useState("list");

    useEffect(() => {
        // when resetKey changes (e.g., user clicked Settings in side-nav), set view to initialView or list
        setView(initialView ?? "list");
        if (clearInitialView) clearInitialView();
    }, [resetKey]);

    const items = [
        { key: "workhours", label: "Werktijden en pauzes" },
        { key: "notifications", label: "Notificatie-voorkeuren" },
        { key: "personal", label: "Persoonlijke gegevens" },
        { key: "upgrade", label: "Upgrade plan" },
        { key: "privacy", label: "Privacy" },
    ];

    if (view === "workhours") {
        return <SettingsWorkHours onBack={() => setView("list")} />;
    }

    if (view === "notifications") {
        return <SettingsNotifications onBack={() => setView("list")} />;
    }

    if (view === "personal") {
        return <SettingsPersonalData onBack={() => setView("list")} profile={profile} />;
    }

    if (view === "privacy") {
        return <SettingsPrivacy onBack={() => setView("list")} />;
    }

    return (
        <main className="settingsPage">
            <header className="settingsHeader">
                <button className="settingsBack" type="button" onClick={onBack} aria-label="Terug">
                    <LuArrowLeft />
                </button>
                <h1 className="settingsTitle">Alle instellingen</h1>
            </header>

            <section className="settingsListWrap">
                <ul className="settingsList" role="list">
                    {items.map((item) => (
                        <li key={item.key} className="settingsListItem">
                            <button
                                className="settingsRow"
                                type="button"
                                onClick={() => {
                                    if (item.key === "upgrade") {
                                        if (onNavigateToUpgrade) onNavigateToUpgrade();
                                    } else {
                                        setView(item.key);
                                    }
                                }}
                            >
                                <span className="settingsLabel">{item.label}</span>
                                <LuChevronRight className="settingsChevron" />
                            </button>
                        </li>
                    ))}
                </ul>
            </section>

            <button className="logoutBtn" type="button" onClick={onLogout}>
                Afmelden
            </button>
        </main>
    );
}
