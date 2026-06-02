import "../css/settings.css";
import { LuArrowLeft, LuChevronRight } from "react-icons/lu";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import DeleteConfirmationModal from "../components/deleteConfirmationModal";

export default function SettingsPrivacy({ onBack }) {
    const [syncCalendar, setSyncCalendar] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingSync, setSavingSync] = useState(false);
    const [message, setMessage] = useState("");
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

    useEffect(() => {
        if (!message) return;
        const timeoutId = setTimeout(() => setMessage(""), 5000);
        return () => clearTimeout(timeoutId);
    }, [message]);

    async function handleExport() {
        setSaving(true);
        setMessage("");

        try {
            const warnings = [];
            let user = null;

            if (supabase?.auth?.getUser) {
                const { data, error } = await supabase.auth.getUser();
                if (error) {
                    warnings.push(`Kon gebruiker niet ophalen: ${error.message}`);
                } else {
                    user = data?.user || null;
                }
            }

            let workHours = null;
            let favoritePauses = [];

            if (supabase && user?.id) {
                const [{ data: workData, error: workError }, { data: favoriteData, error: favoriteError }] = await Promise.all([
                    supabase.from("work_hours").select("*").eq("user_id", user.id).maybeSingle(),
                    supabase.from("favorite_pauses").select("*").eq("user_id", user.id),
                ]);

                if (workError) {
                    warnings.push(`Kon werktijden niet ophalen: ${workError.message}`);
                } else {
                    workHours = workData || null;
                }

                if (favoriteError) {
                    warnings.push(`Kon favoriete pauzes niet ophalen: ${favoriteError.message}`);
                } else {
                    favoritePauses = favoriteData || [];
                }
            }

            const exportPayload = {
                exported_at: new Date().toISOString(),
                user: user
                    ? {
                        id: user.id,
                        email: user.email || null,
                    }
                    : null,
                privacy_settings: {
                    sync_calendar: syncCalendar,
                },
                work_hours: workHours,
                favorite_pauses: favoritePauses,
                technical_data: {
                    user_agent: navigator.userAgent,
                    language: navigator.language,
                    platform: navigator.platform,
                },
                warnings,
            };

            const serialized = JSON.stringify(exportPayload, null, 2);
            const blob = new Blob([serialized], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const datePrefix = new Date().toISOString().slice(0, 10);

            link.href = url;
            link.download = `re-mind-export-${datePrefix}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setMessage("Export voltooid.");
        } catch (e) {
            console.error(e);
            setMessage("Fout bij exporteren.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        setDeleteConfirmationOpen(true);
    }

    function closeDeleteConfirmation() {
        setDeleteConfirmationOpen(false);
    }

    function handleDeleteConfirmation() {
        setDeleteConfirmationOpen(false);
        setMessage("Verwijderen bevestigd. Koppeling volgt later.");
    }

    useEffect(() => {
        let mounted = true;
        async function loadSetting() {
            try {
                if (!supabase?.auth?.getUser) return;
                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError || !userData?.user) return;
                const user = userData.user;

                const { data, error } = await supabase
                    .from("settings")
                    .select("allow_agenda_sync")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (error) {
                    console.warn("Kon privacy-instelling niet ophalen:", error.message);
                    return;
                }

                if (mounted && data && typeof data.allow_agenda_sync === "boolean") {
                    setSyncCalendar(Boolean(data.allow_agenda_sync));
                }
            } catch (e) {
                console.error(e);
            }
        }

        loadSetting();
        return () => { mounted = false; };
    }, []);

    async function handleToggleSync() {
        const previous = syncCalendar;
        const next = !previous;
        // optimistic UI
        setSyncCalendar(next);
        setSavingSync(true);
        setMessage("");

        try {
            if (!supabase?.auth?.getUser) throw new Error("Auth not available");
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) throw new Error(userError?.message || "Geen ingelogde gebruiker");
            const user = userData.user;

            const payload = {
                user_id: user.id,
                allow_agenda_sync: next,
            };

            const { error: upsertError } = await supabase
                .from("settings")
                .upsert(payload, { onConflict: "user_id" });

            if (upsertError) {
                throw upsertError;
            }

            setMessage("Instellingen opgeslagen.");
        } catch (e) {
            console.error(e);
            setSyncCalendar(previous); // revert
            setMessage("Fout bij opslaan. Probeer het opnieuw.");
        } finally {
            setSavingSync(false);
        }
    }

    const accordionItems = [
        {
            key: "collected",
            title: "Welke gegevens worden verzameld?",
            detailsList: [
                "Identiteit: naam, e‑mailadres",
                "Werk‑ en pauzestatistieken: start‑/eindtijd van timers, aantal pauzes, check‑in‑scores",
                "Agenda‑informatie (alleen lezen): tijdsblokken waarin je al vergaderingen of andere afspraken hebt (start‑/eindtijd en titel).",
                "App‑instellingen: favoriete pauzesuggesties, meldingsvoorkeuren, tijdsintervallen.",
                "Technische data: apparaat‑ID, IP‑adres, OS‑versie",
            ]
        },
        {
            key: "why",
            title: "Waarom zijn de gegevens nodig?",
            detailsList: [
                "Timer‑ & rapportfunctie: berekenen en visualiseren van werk‑ en pauzetijden.",
                "Persoonlijk advies: op basis van check‑in‑scores en pauzepatronen.",
                "Agenda‑inzicht: we lezen je agenda om deze toe te voegen in het dagrapport zodat je die netjes kan zien naast de andere data die die dag werd verzameld.",
                "Verbeteren van de app: anonieme aggregatie van gebruiksstatistieken voor productontwikkeling.",
            ]
        },
        {
            key: "protected",
            title: "Hoe worden de gegevens bewaard en beschermd",
            detailsList: [
                "Alle persoonsgegevens worden versleuteld opgeslagen, lokaal of in een beveiligde cloud.",
                "Voor agenda‑toegang vragen we alleen een **read‑only** OAuth‑token (https://www.googleapis.com/auth/calendar.readonly of Microsoft Calendars.Read). Er wordt geen schrijfrechten verleend.",
                "Rapport‑data worden maximaal 12 maanden bewaard; je kunt ze zelf op elk moment verwijderen."
            ]
        },
    ];

    const [openKeys, setOpenKeys] = useState({});

    function toggleKey(key) {
        setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    return (
        <main className="privacyPage">
            <header className="settingsHeader">
                <button className="settingsBack" type="button" onClick={onBack} aria-label="Terug">
                    <LuArrowLeft />
                </button>
                <h1 className="settingsTitle">Privacy-instellingen</h1>
            </header>

            <section className="privacyContent">
                <div className="privacyAccordion">
                    {accordionItems.map((item) => {
                        const isOpen = Boolean(openKeys[item.key]);
                        return (
                            <div key={item.key}>
                                <button
                                    className={`accordionRow ${isOpen ? "open" : ""}`}
                                    type="button"
                                    aria-expanded={isOpen}
                                    aria-controls={`panel-${item.key}`}
                                    onClick={() => toggleKey(item.key)}
                                >
                                    <LuChevronRight className="accordionChevron" />
                                    {item.title}
                                </button>

                                <div
                                    id={`panel-${item.key}`}
                                    className={`accordionPanel ${isOpen ? "open" : ""}`}
                                    role="region"
                                    aria-hidden={!isOpen}
                                >
                                    <ul className="accordionList">
                                        {(item.detailsList || []).map((line, i) => (
                                            <li key={i}>{line}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="row toggleRow">
                    <div className="label">Synchronisatie met agenda toestaan</div>
                    <div className="value">
                        <button
                            className="toggle"
                            type="button"
                            aria-pressed={syncCalendar}
                            aria-busy={savingSync}
                            onClick={handleToggleSync}
                            disabled={savingSync}
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>

                <div className="privacyActions">
                    <button className="exportButton" type="button" onClick={handleExport} disabled={saving}>
                        {saving ? "Bezig met exporteren..." : "Exporteer data"}
                    </button>
                    <p className="privacyHint">Exporteer al je gegevens met één klik (JSON)</p>

                    <button className="deletePersonalDataButton" type="button" onClick={handleDelete}>
                        Verwijder data
                    </button> {/* zal alle data (op profiles tabel na, moeten verwijderen/resetten naar default states) */}
                    <p className="privacyHint">Verwijder je persoonlijke gegevens uit de database</p>
                </div>
                {deleteConfirmationOpen ? (
                    <DeleteConfirmationModal
                        description="Je staat op het punt je data te verwijderen. Als je dit doet zul je je vorige dag- en weekrapporten niet meer kunnen bekijken. Wil je doorgaan?"
                        onClose={closeDeleteConfirmation}
                        deleteConfirmationButtonLabel="Ja, verwijder mijn gegevens"
                        cancelButtonLabel="Nee, behoud mijn gegevens"
                        onConfirm={handleDeleteConfirmation}
                    />
                ) : null}
                <div className={`savedMessage ${message ? "visible" : ""}`}>{message}</div>
            </section>
        </main>
    );
}
