import "../css/settings.css";
import { LuChevronRight, LuArrowLeft } from "react-icons/lu";

export default function Settings({
    onBack,
    onNavigateToWorkHours,
    onNavigateToNotifications,
    onNavigateToPersonalData,
    onNavigateToPrivacy,
    onNavigateToUpgrade,
    onLogout,
}) {

    const items = [
        { key: "workhours", label: "Werktijden en pauzes" },
        { key: "notifications", label: "Notificatie-voorkeuren" },
        { key: "personal", label: "Persoonlijke gegevens" },
        { key: "upgrade", label: "Upgrade plan" },
        { key: "privacy", label: "Privacy" },
    ];

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
                                    } else if (item.key === "workhours") {
                                        if (onNavigateToWorkHours) onNavigateToWorkHours();
                                    } else if (item.key === "notifications") {
                                        if (onNavigateToNotifications) onNavigateToNotifications();
                                    } else if (item.key === "personal") {
                                        if (onNavigateToPersonalData) onNavigateToPersonalData();
                                    } else if (item.key === "privacy") {
                                        if (onNavigateToPrivacy) onNavigateToPrivacy();
                                    } else {
                                        // no-op
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
