import "../css/settings.css";
import { LuArrowLeft } from "react-icons/lu";
import spinner from "../assets/images/loadingSpinner.svg";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function createDefaultNotificationState() {
    return {
        notificationsEnabled: true,
        checkInEnabled: true,
        suggestFavoritesEnabled: false,
        endOfDayNoteEnabled: true,
    };
}

export default function SettingsNotifications({ onBack }) {
    const [notificationSettings, setNotificationSettings] = useState(() => createDefaultNotificationState());
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [savedMessage, setSavedMessage] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!savedMessage) return;
        const timer = setTimeout(() => setSavedMessage(""), 5000);
        return () => clearTimeout(timer);
    }, [savedMessage]);

    useEffect(() => {
        let isCancelled = false;

        const loadNotificationSettings = async () => {
            if (!supabase?.auth?.getUser) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.auth.getUser();

            if (error || !data?.user?.id || isCancelled) {
                return;
            }

            const { data: settingsRow, error: settingsError } = await supabase
                .from("settings")
                .select("checkin_notifications_on, favorite_pauses_suggest_on, afsluitnotitie_popup_on")
                .eq("user_id", data.user.id)
                .maybeSingle();

            if (settingsError || isCancelled) {
                setLoading(false);
                return;
            }

            if (!settingsRow) {
                setNotificationSettings(createDefaultNotificationState());
                setLoading(false);
                return;
            }

            setNotificationSettings((prev) => ({
                notificationsEnabled: prev.notificationsEnabled,
                checkInEnabled:
                    typeof settingsRow.checkin_notifications_on === "boolean"
                        ? settingsRow.checkin_notifications_on
                        : prev.checkInEnabled,
                suggestFavoritesEnabled:
                    typeof settingsRow.favorite_pauses_suggest_on === "boolean"
                        ? settingsRow.favorite_pauses_suggest_on
                        : prev.suggestFavoritesEnabled,
                endOfDayNoteEnabled:
                    typeof settingsRow.afsluitnotitie_popup_on === "boolean"
                        ? settingsRow.afsluitnotitie_popup_on
                        : prev.endOfDayNoteEnabled,
            }));
            setLoading(false);
        };

        loadNotificationSettings();

        return () => {
            isCancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <main className="notificationsPage">
                <header className="settingsHeader">
                    <button className="settingsBack" type="button" onClick={onBack} aria-label="Terug">
                        <LuArrowLeft />
                    </button>
                    <h1 className="settingsTitle">Notificatie-voorkeuren</h1>
                </header>
                <div className="settingsLoading">
                    Bezig met laden...
                    <img src={spinner} alt="Bezig met laden" />
                </div>
            </main>
        );
    }

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
                checkin_notifications_on: notificationSettings.checkInEnabled,
                favorite_pauses_suggest_on: notificationSettings.suggestFavoritesEnabled,
                afsluitnotitie_popup_on: notificationSettings.endOfDayNoteEnabled,
            };

            const { error } = await supabase.from("settings").upsert(payload, { onConflict: "user_id" });

            if (error) {
                console.error("Supabase save error:", error);
                setMessage("Opslaan niet gelukt.");
            } else {
                setSavedMessage("Instellingen opgeslagen.");
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
                            aria-pressed={notificationSettings.notificationsEnabled}
                            onClick={() =>
                                setNotificationSettings((prev) => ({
                                    ...prev,
                                    notificationsEnabled: !prev.notificationsEnabled,
                                }))
                            }
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>

                <div className="row notificationRow">
                    <div className="label">
                        <div className="notificationTitle">Check-in meldingen inschakelen</div>
                        <div className="notificationDescription">Ontvange meldingen die doorheen de dag naar je stress en energie vragen. Deze meldingen zijn nodig om data te verzamelen voor het dag-/weekrapport.</div>
                    </div>
                    <div className="value">
                        <button
                            className="toggle"
                            type="button"
                            aria-pressed={notificationSettings.checkInEnabled}
                            onClick={() =>
                                setNotificationSettings((prev) => ({
                                    ...prev,
                                    checkInEnabled: !prev.checkInEnabled,
                                }))
                            }
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
                            aria-pressed={notificationSettings.suggestFavoritesEnabled}
                            onClick={() =>
                                setNotificationSettings((prev) => ({
                                    ...prev,
                                    suggestFavoritesEnabled: !prev.suggestFavoritesEnabled,
                                }))
                            }
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>

                <div className="row notificationRow">
                    <div className="label">
                        <div className="notificationTitle">Afsluitnotitie invullen</div>
                        <div className="notificationDescription">Op het einde van je werkdag kan je een ‘afsluitnotitie’ voor jezelf invullen.</div>
                    </div>
                    <div className="value">
                        <button
                            className="toggle"
                            type="button"
                            aria-pressed={notificationSettings.endOfDayNoteEnabled}
                            onClick={() =>
                                setNotificationSettings((prev) => ({
                                    ...prev,
                                    endOfDayNoteEnabled: !prev.endOfDayNoteEnabled,
                                }))
                            }
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>
            </section>

            <button className="saveButton" type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Opslaan..." : "Opslaan"}
            </button>
            <div className={`saveWarning ${message ? "visible" : ""}`}>{message}</div>
            <div className={`savedMessage ${savedMessage ? "visible" : ""}`}>{savedMessage}</div>
        </main>
    );
}