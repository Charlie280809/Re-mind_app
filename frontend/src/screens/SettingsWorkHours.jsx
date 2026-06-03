import "../css/settings.css";
import { LuArrowLeft, LuPencil } from "react-icons/lu";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import SmallLoader from "../components/SmallLoader";
import { createDefaultWorkdaySelection, isValidOptionalTimeWithinWorkday, normalizeDuration, parseIntegerValue } from "../lib/workHours";

function settingsStateFromRow(row) {
    if (!row) {
        return createEmptySettingsState();
    }

    const selectedWorkdays = createDefaultWorkdaySelection();
    const workdayMap = {
        mon: row.mon_isworkday,
        tue: row.tue_isworkday,
        wed: row.wed_isworkday,
        thu: row.thu_isworkday,
        fri: row.fri_isworkday,
        sat: row.sat_isworkday,
        sun: row.sun_isworkday,
    };

    Object.entries(workdayMap).forEach(([dayKey, isWorkday]) => {
        if (typeof isWorkday === "boolean") {
            selectedWorkdays[dayKey] = isWorkday;
        }
    });

    const totalMinutes = Number(row.pause_reminder);
    const hasTotalMinutes = Number.isFinite(totalMinutes) && totalMinutes >= 0;

    return {
        selectedWorkdays,
        checkinHours: hasTotalMinutes ? Math.floor(totalMinutes / 60) : 0,
        checkinMinutes: hasTotalMinutes ? totalMinutes % 60 : 50,
        startTime: row.werk_startuur || "09:00",
        endTime: row.werk_einduur || "17:00",
        lunchPauseEnabled: typeof row.lunch_enabled === "boolean" ? row.lunch_enabled : Boolean(row.middag_startuur),
        lunchStart: row.middag_startuur || "12:00",
    };
}

function buildSettingsPayload(userId, settings) {
    const normalizedDuration = normalizeDuration(settings.checkinHours, settings.checkinMinutes);

    return {
        user_id: userId,
        pause_reminder: normalizedDuration.totalMinutes,
        werk_startuur: settings.startTime,
        werk_einduur: settings.endTime,
        lunch_enabled: Boolean(settings.lunchPauseEnabled),
        middag_startuur: settings.lunchPauseEnabled ? settings.lunchStart : null,
        mon_isworkday: Boolean(settings.selectedWorkdays?.mon),
        tue_isworkday: Boolean(settings.selectedWorkdays?.tue),
        wed_isworkday: Boolean(settings.selectedWorkdays?.wed),
        thu_isworkday: Boolean(settings.selectedWorkdays?.thu),
        fri_isworkday: Boolean(settings.selectedWorkdays?.fri),
        sat_isworkday: Boolean(settings.selectedWorkdays?.sat),
        sun_isworkday: Boolean(settings.selectedWorkdays?.sun),
    };
}

function createEmptySettingsState() {
    return {
        selectedWorkdays: null,
        checkinMinutes: null,
        startTime: "",
        endTime: "",
        checkinHours: null,
        lunchStart: "",
        lunchPauseEnabled: null,
    };
}

function isValidWorkdayTimeRange(startTime, endTime) {
    return Boolean(startTime && endTime && startTime < endTime);
}

export default function SettingsWorkHours({ onBack, userId, onSaved }) {
    const [settings, setSettings] = useState(() => createEmptySettingsState());
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

        const loadWorkHours = async () => {
            if (!supabase?.auth?.getUser) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.auth.getUser();

            if (error || !data?.user?.id || isCancelled) {
                return;
            }

            const { data: workHoursRow, error: workHoursError } = await supabase
                .from("settings")
                .select("*")
                .eq("user_id", data.user.id)
                .maybeSingle();

            if (isCancelled) {
                return;
            }

            if (workHoursError || !workHoursRow) {
                setSettings(createEmptySettingsState());
                setLoading(false);
                return;
            }

            setSettings(settingsStateFromRow(workHoursRow));
            setLoading(false);
        };

        loadWorkHours();

        return () => {
            isCancelled = true;
        };
    }, []);

    const weekdayOptions = [
        { key: "mon", label: "Ma" },
        { key: "tue", label: "Di" },
        { key: "wed", label: "Wo" },
        { key: "thu", label: "Do" },
        { key: "fri", label: "Vr" },
        { key: "sat", label: "Za" },
        { key: "sun", label: "Zo" },
    ];

    const updateSetting = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            [key]: typeof value === "function" ? value(prev[key]) : value,
        }));
    };

    const handleWorkdayToggle = (dayKey) => {
        setSettings((prev) => {
            const selectedWorkdays = prev.selectedWorkdays || createDefaultWorkdaySelection();
            return {
                ...prev,
                selectedWorkdays: {
                    ...selectedWorkdays,
                    [dayKey]: !Boolean(selectedWorkdays[dayKey]),
                },
            };
        });
    };

    if (loading) {
        return (
            <main className="workhoursPage">
                <header className="settingsHeader">
                    <button className="settingsBack" type="button" onClick={onBack} aria-label="Terug">
                        <LuArrowLeft />
                    </button>
                    <h1 className="settingsTitle">Werktijden en pauzes</h1>
                </header>
                <SmallLoader message="Bezig met laden..." />
            </main>
        );
    }

    return (
        <main className="workhoursPage">
            <header className="settingsHeader">
                <button className="settingsBack" type="button" onClick={onBack} aria-label="Terug">
                    <LuArrowLeft />
                </button>
                <h1 className="settingsTitle">Werktijden en pauzes</h1>
            </header>

            <section className="workhoursContent">
                <div className="row">
                    <div className="label">Frequentie van pauzeherinneringen:</div>
                    <div className="value">
                        <span className="telkensNa">Telkens na</span>
                        <input
                            aria-label="Frequentie uren"
                            type="number"
                            min={0}
                            step={1}
                            value={settings.checkinHours ?? ""}
                            onChange={(e) => updateSetting("checkinHours", parseIntegerValue(e.target.value))}
                        />
                        <span className="durationUnit">uur</span>
                        <input
                            aria-label="Frequentie minuten"
                            type="number"
                            min={1}
                            max={59}
                            step={1}
                            value={settings.checkinMinutes ?? ""}
                            onChange={(e) => handleCheckinMinutesChange(e.target.value)}
                        />
                        <span className="durationUnit">min</span>
                        <LuPencil className="iconEdit" />
                    </div>
                </div>

                <div className="row weekdaysRow">
                    <div className="label">Werkdagen:</div>
                    <div className="weekdays" role="group" aria-label="Selecteer werkdagen">
                        {weekdayOptions.map((day) => {
                            const isChecked = Boolean(settings.selectedWorkdays?.[day.key]);

                            return (
                                <label key={day.key} className="weekdayOption">
                                    <span className="weekdayLabel">{day.label}</span>
                                    <input
                                        type="checkbox"
                                        className="weekdayCheckbox"
                                        checked={isChecked}
                                        onChange={() => handleWorkdayToggle(day.key)}
                                    />
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="row">
                    <div className="label">Officieel startuur op werkdagen:</div>
                    <div className="value">
                        <input
                            aria-label="Officieel startuur"
                            type="time"
                            value={settings.startTime ?? ""}
                            onChange={(e) => updateSetting("startTime", e.target.value)}
                        />
                        <LuPencil className="iconEdit" />
                    </div>
                </div>

                <div className="row">
                    <div className="label">Officieel einduur op werkdagen:</div>
                    <div className="value">
                        <input
                            aria-label="Officieel einduur"
                            type="time"
                            value={settings.endTime ?? ""}
                            onChange={(e) => updateSetting("endTime", e.target.value)}
                        />
                        <LuPencil className="iconEdit" />
                    </div>
                </div>

                <div className="row toggleRow">
                    <div className="label">Middagpauze instellen:</div>
                    <div className="value">
                        <button
                            className="toggle"
                            type="button"
                            aria-pressed={Boolean(settings.lunchPauseEnabled)}
                            onClick={() => updateSetting("lunchPauseEnabled", (currentValue) => !Boolean(currentValue))}
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>

                <div className={`row ${!settings.lunchPauseEnabled ? "rowDisabled" : ""}`}>
                    <div className="label">Officiële start middagpauze op werkdagen:</div>
                    <div className="value">
                        <input
                            aria-label="Start middagpauze"
                            type="time"
                            value={settings.lunchStart ?? ""}
                            disabled={!settings.lunchPauseEnabled}
                            onChange={(e) => updateSetting("lunchStart", e.target.value)}
                        />
                        <LuPencil className="iconEdit" />
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

    async function handleSave() {
        setSaving(true);
        setMessage("");
        setSavedMessage("");

        // determine user id: prefer prop, otherwise try supabase auth
        let uid = userId || null;
        if (!uid && supabase) {
            try {
                if (supabase.auth && supabase.auth.getUser) {
                    const { data, error } = await supabase.auth.getUser();
                    if (data && data.user && data.user.id) uid = data.user.id;
                } else if (supabase.auth && supabase.auth.user) {
                    const user = supabase.auth.user();
                    if (user && user.id) uid = user.id;
                }
            } catch (e) {
                // ignore - we'll still prepare payload
            }
        }

        const normalizedDuration = normalizeDuration(settings.checkinHours, settings.checkinMinutes);

        // validation: require a positive duration and valid times
        if (normalizedDuration.totalMinutes <= 0) {
            setMessage("❗Voer een geldige duur voor pauzeherinnering in.");
            setSaving(false);
            return;
        }

        if (!isValidWorkdayTimeRange(settings.startTime, settings.endTime)) {
            setMessage("❗Het startuur moet vroeger zijn dan het einduur.");
            setSaving(false);
            return;
        }

        if (!isValidOptionalTimeWithinWorkday(settings.startTime, settings.endTime, settings.lunchStart)) {
            setMessage("❗Het startuur van je middagpauze moet binnen de werkuren vallen.");
            setSaving(false);
            return;
        }

        const payload = buildSettingsPayload(uid, {
            selectedWorkdays: settings.selectedWorkdays || createDefaultWorkdaySelection(),
            checkinHours: normalizedDuration.hours,
            checkinMinutes: normalizedDuration.minutes,
            startTime: settings.startTime,
            endTime: settings.endTime,
            lunchPauseEnabled: Boolean(settings.lunchPauseEnabled),
            lunchStart: settings.lunchStart,
        });

        try {
            if (supabase && uid) {
                const { error } = await supabase.from("settings").upsert(payload, { onConflict: "user_id" });
                if (error) {
                    console.error("Supabase save error:", error);
                    setMessage("Opslaan niet gelukt.");
                } else {
                    setSavedMessage("Instellingen opgeslagen!");
                    try {
                        // notify parent (App) that settings changed so it can update immediately
                        if (typeof onSaved === "function") {
                            onSaved(payload);
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            } else {
                console.log("Prepared work hours payload:", payload);
                setMessage("Instellingen klaargemaakt (niet geüpload).");
            }
        } catch (e) {
            console.error(e);
            setMessage("Fout bij opslaan.");
        }

        setSaving(false);
    }

    function handleCheckinMinutesChange(value) {
        const safeMinutes = parseIntegerValue(value);
        const carriedHours = Math.floor(safeMinutes / 60);
        const normalizedMinutes = safeMinutes % 60;

        updateSetting("checkinHours", (currentValue) => (Number.isFinite(currentValue) ? currentValue : 0) + carriedHours);
        updateSetting("checkinMinutes", normalizedMinutes);
    }
}