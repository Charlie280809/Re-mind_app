import "../css/settings.css";
import { LuArrowLeft, LuPencil } from "react-icons/lu";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SettingsWorkHours({ onBack, userId }) {
    const weekdayOptions = [
        { key: "mon", label: "Ma" },
        { key: "tue", label: "Di" },
        { key: "wed", label: "Wo" },
        { key: "thu", label: "Do" },
        { key: "fri", label: "Vr" },
        { key: "sat", label: "Za" },
        { key: "sun", label: "Zo" },
    ];

    const [selectedWorkdays, setSelectedWorkdays] = useState({
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: false,
        sun: false,
    });

    const [breakMinutes, setBreakMinutes] = useState(50);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [breakHours, setBreakHours] = useState(0);
    const [lunchStart, setLunchStart] = useState("12:00");
    const [lunchEnd, setLunchEnd] = useState("13:00");
    const [autoStartWorkTimer, setAutoStartWorkTimer] = useState(true);
    const [lunchPauseEnabled, setLunchPauseEnabled] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const handleWorkdayToggle = (dayKey) => {
        setSelectedWorkdays((prev) => ({
            ...prev,
            [dayKey]: !prev[dayKey],
        }));
    };

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
                            value={breakHours}
                            onChange={(e) => setBreakHours(parseIntegerValue(e.target.value))}
                        />
                        <span className="durationUnit">uur</span>
                        <input
                            aria-label="Frequentie minuten"
                            type="number"
                            min={0}
                            step={1}
                            value={breakMinutes}
                            onChange={(e) => handleBreakMinutesChange(e.target.value)}
                        />
                        <span className="durationUnit">min</span>
                        <LuPencil className="iconEdit" />
                    </div>
                </div>

                <div className="row weekdaysRow">
                    <div className="label">Werkdagen:</div>
                    <div className="weekdays" role="group" aria-label="Selecteer werkdagen">
                        {weekdayOptions.map((day) => {
                            const isChecked = selectedWorkdays[day.key];

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
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
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
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                        <LuPencil className="iconEdit" />
                    </div>
                </div>

                <div className="row toggleRow">
                    <div className="label">Werktimer automatisch starten op startuur:</div>
                    <div className="value">
                        <button
                            className="toggle"
                            type="button"
                            aria-pressed={autoStartWorkTimer}
                            onClick={() => setAutoStartWorkTimer((currentValue) => !currentValue)}
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>



                <div className="row toggleRow">
                    <div className="label">Middagpauze instellen:</div>
                    <div className="value">
                        <button
                            className="toggle"
                            type="button"
                            aria-pressed={lunchPauseEnabled}
                            onClick={() => setLunchPauseEnabled((currentValue) => !currentValue)}
                        >
                            <span className="knob" />
                        </button>
                    </div>
                </div>

                <div className={`row ${!lunchPauseEnabled ? "rowDisabled" : ""}`}>
                    <div className="label">Officiële start middagpauze op werkdagen:</div>
                    <div className="value">
                        <input
                            aria-label="Start middagpauze"
                            type="time"
                            value={lunchStart}
                            disabled={!lunchPauseEnabled}
                            onChange={(e) => setLunchStart(e.target.value)}
                        />
                        <LuPencil className="iconEdit" />
                    </div>
                </div>

                <div className={`row timeRow ${!lunchPauseEnabled ? "rowDisabled" : ""}`}>
                    <div className="label">Officieel einde middagpauze op werkdagen:</div>
                    <div className="value">
                        <input
                            aria-label="Einde middagpauze"
                            type="time"
                            value={lunchEnd}
                            disabled={!lunchPauseEnabled}
                            onChange={(e) => setLunchEnd(e.target.value)}
                        />
                        <LuPencil className="iconEdit" />
                    </div>
                </div>

                <button className="saveButton" type="button" onClick={handleSave} disabled={saving}>
                    {saving ? "Opslaan..." : "Opslaan"}
                </button>
                {message && <div className="saveMessage">{message}</div>}
            </section>
        </main>
    );

    async function handleSave() {
        setSaving(true);
        setMessage("");

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

        const normalizedDuration = normalizeDuration(breakHours, breakMinutes);

        // validation: require a positive duration and valid times
        if (normalizedDuration.totalMinutes <= 0) {
            setMessage("Voer een geldige duur voor pauzeherinnering in.");
            setSaving(false);
            return;
        }

        const payload = {
            user_id: uid,
            workdays: Object.keys(selectedWorkdays).filter((k) => selectedWorkdays[k]),
            start_time: startTime,
            end_time: endTime,
            break_frequency_hours: normalizedDuration.hours,
            break_frequency_minutes_part: normalizedDuration.minutes,
            break_frequency_minutes: normalizedDuration.totalMinutes,
            auto_start_work_timer: autoStartWorkTimer,
            ...(lunchStart && lunchEnd
                ? { lunch_start: lunchStart, lunch_end: lunchEnd }
                : { lunch_start: null, lunch_end: null }),
        };

        // For now prepare payload and attempt to insert/upsert into Supabase if available.
        try {
            if (supabase && uid) {
                // try upsert into `work_hours` table (table must exist server-side)
                const { data, error } = await supabase.from("work_hours").upsert(payload, { onConflict: "user_id" });
                if (error) {
                    console.error("Supabase save error:", error);
                    setMessage("Opslaan niet gelukt (bewaar lokaal).",);
                } else {
                    setMessage("Instellingen opgeslagen.");
                }
            } else {
                // Not connected or no user id: just log the payload for later use
                // In a real app this payload should be sent to the backend with the authenticated user's id
                // or to the Supabase `work_hours` table.
                // eslint-disable-next-line no-console
                console.log("Prepared work hours payload:", payload);
                setMessage("Instellingen klaargemaakt (niet geüpload).");
            }
        } catch (e) {
            console.error(e);
            setMessage("Fout bij opslaan.");
        }

        setSaving(false);
    }

    function parseIntegerValue(value) {
        if (value === "") {
            return 0;
        }

        const parsedValue = Number.parseInt(value, 10);
        return Number.isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
    }

    function normalizeDuration(hoursValue, minutesValue) {
        const safeHours = Math.max(0, parseIntegerValue(hoursValue));
        const safeMinutes = Math.max(0, parseIntegerValue(minutesValue));
        const carriedHours = Math.floor(safeMinutes / 60);
        const normalizedMinutes = safeMinutes % 60;
        const normalizedHours = safeHours + carriedHours;

        return {
            hours: normalizedHours,
            minutes: normalizedMinutes,
            totalMinutes: normalizedHours * 60 + normalizedMinutes,
        };
    }

    function handleBreakMinutesChange(value) {
        const safeMinutes = parseIntegerValue(value);
        const carriedHours = Math.floor(safeMinutes / 60);
        const normalizedMinutes = safeMinutes % 60;

        setBreakHours((currentHours) => currentHours + carriedHours);
        setBreakMinutes(normalizedMinutes);
    }
}
