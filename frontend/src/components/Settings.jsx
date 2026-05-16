import "../css/settings.css";
import { LuChevronRight, LuArrowLeft } from "react-icons/lu";
import { useState } from "react";
import SettingsWorkHours from "./SettingsWorkHours";

export default function Settings({ onBack }) {
    const [view, setView] = useState("list");

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
                                onClick={() => item.key === "workhours" && setView("workhours")}
                            >
                                <span className="settingsLabel">{item.label}</span>
                                <LuChevronRight className="settingsChevron" />
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
