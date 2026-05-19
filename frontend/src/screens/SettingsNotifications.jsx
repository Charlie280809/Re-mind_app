import "../css/settings.css";
import { LuArrowLeft } from "react-icons/lu";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SettingsNotifications({ onBack }) {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [checkInEnabled, setCheckInEnabled] = useState(true);
    const [suggestFavoritesEnabled, setSuggestFavoritesEnabled] = useState(false);
    const [endOfDayNoteEnabled, setEndOfDayNoteEnabled] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        let isCancelled = false;

        const loadNotificationSettings = async () => {
            if (!supabase?.auth?.getUser) {
                return;
            }

            const { data, error } = await supabase.auth.getUser();

            if (error || !data?.user?.id || isCancelled) {
                return;
            }

            const { data: settingsRow, error: settingsError } = await supabase
                .from("settings")
                .select("checkin_notifications_on, werktimer_autostart, favorite_pauses_suggest_on, afsluitnotitie_popup_on")
                .eq("user_id", data.user.id)
                .maybeSingle();

            if (settingsError || isCancelled || !settingsRow) {
                return;
            }

            if (typeof settingsRow.checkin_notifications_on === "boolean") {
                setNotificationsEnabled(settingsRow.checkin_notifications_on);
            }
            if (typeof settingsRow.werktimer_autostart === "boolean") {
                setCheckInEnabled(settingsRow.werktimer_autostart);
            }
            if (typeof settingsRow.favorite_pauses_suggest_on === "boolean") {
                setSuggestFavoritesEnabled(settingsRow.favorite_pauses_suggest_on);
            }
            if (typeof settingsRow.afsluitnotitie_popup_on === "boolean") {
                setEndOfDayNoteEnabled(settingsRow.afsluitnotitie_popup_on);
            }
        };

        loadNotificationSettings();

        return () => {
            isCancelled = true;
        };
    }, []);

    async function handleSave() {
        setSaving(true);
        setMessage("");

        try {
            let uid = null;

            if (supabase?.auth?.getUser) {
                const { data, error } = await supabase.auth.getUser();
                if (!error && data?.user?.id) {
                    uid = data.user.id;
                }
            }

            if (!uid) {
                setMessage("Geen gebruiker gevonden.");
                setSaving(false);
                return;
            }

            const payload = {
                user_id: uid,
                checkin_notifications_on: notificationsEnabled,
                werktimer_autostart: checkInEnabled,
                favorite_pauses_suggest_on: suggestFavoritesEnabled,
                afsluitnotitie_popup_on: endOfDayNoteEnabled,
            };

            const { error } = await supabase.from("settings").upsert(payload, { onConflict: "user_id" });

            if (error) {
                console.error("Supabase save error:", error);
                setMessage("Opslaan niet gelukt.");
            } else {
                setMessage("Instellingen opgeslagen.");
            }
        } catch (e) {
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
                        <div className="notificationTitle">Werktimer automatisch starten</div>
                        <div className="notificationDescription">Start de werktimer automatisch wanneer je werkdag begint.</div>
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
