import "../css/settings.css";
import { LuArrowLeft } from "react-icons/lu";
import { useState } from "react";

export default function SettingsNotifications({ onBack }) {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [checkInEnabled, setCheckInEnabled] = useState(false);
    const [suggestFavoritesEnabled, setSuggestFavoritesEnabled] = useState(true);
    const [endOfDayNoteEnabled, setEndOfDayNoteEnabled] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    async function handleSave() {
        setSaving(true);
        setMessage("");

        // For now keep this local; integration can be added later if desired.
        try {
            const payload = {
                notificationsEnabled,
                checkInEnabled,
                suggestFavoritesEnabled,
                endOfDayNoteEnabled,
            };

            // eslint-disable-next-line no-console
            console.log("Prepared notification preferences:", payload);
            setMessage("Instellingen opgeslagen.");
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            setMessage("Fout bij opslaan.");
        }

        setSaving(false);
    }

    return (
        <main className="notificationsPage">
            <header className="settingsHeader">
                <button className="settingsBack" type="button" onClick={onBack} aria-label="Terug">
                    <LuArrowLeft />
                </button>
                <h1 className="settingsTitle">Notificatie-voorkeuren</h1>
            </header>

            <section className="notificationsContent">
                <div className="row notificationRow">
                    <div className="label">
                        <div className="notificationTitle">Notificaties inschakelen</div>
                        <div className="notificationDescription">Ontvang herinneringen en updates over Re:Mind.</div>
                    </div>
                    <div className="value">
                        <button
                            className="toggle"
                            type="button"
                            aria-pressed={notificationsEnabled}
                            onClick={() => setNotificationsEnabled((v) => !v)}
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>

                <div className="row notificationRow">
                    <div className="label">
                        <div className="notificationTitle">Check-in meldingen inschakelen</div>
                        <div className="notificationDescription">Ontvang meldingen die doorheen de dag naar je stress en energie vragen.</div>
                    </div>
                    <div className="value">
                        <button
                            className="toggle"
                            type="button"
                            aria-pressed={checkInEnabled}
                            onClick={() => setCheckInEnabled((v) => !v)}
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>

                <div className="row notificationRow">
                    <div className="label">
                        <div className="notificationTitle">Favoriete pauzesuggesties voorstellen</div>
                        <div className="notificationDescription">Bij pauzeherinneringen worden je favoriete pauzes voorgesteld.</div>
                    </div>
                    <div className="value">
                        <button
                            className="toggle"
                            type="button"
                            aria-pressed={suggestFavoritesEnabled}
                            onClick={() => setSuggestFavoritesEnabled((v) => !v)}
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>

                <div className="row notificationRow">
                    <div className="label">
                        <div className="notificationTitle">Afsluitnotitie invullen</div>
                        <div className="notificationDescription">Op het einde van je werkdag krijg je de optie om een ‘afsluitnotitie’ in te vullen.</div>
                    </div>
                    <div className="value">
                        <button
                            className="toggle"
                            type="button"
                            aria-pressed={endOfDayNoteEnabled}
                            onClick={() => setEndOfDayNoteEnabled((v) => !v)}
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>
            </section>

            <div className="saveRow">
                <button className="saveButton" type="button" onClick={handleSave} disabled={saving}>
                    {saving ? "Opslaan..." : "Opslaan"}
                </button>
                {message && <div className="saveMessage">{message}</div>}
            </div>
        </main>
    );
}
