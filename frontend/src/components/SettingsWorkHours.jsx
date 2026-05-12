import "../css/settings.css";
import { LuArrowLeft, LuPencil } from "react-icons/lu";

export default function SettingsWorkHours({ onBack }) {
    return (
        <main className="workhoursPage">
            <header className="workhoursHeader">
                <button className="workhoursBack" type="button" onClick={onBack} aria-label="Terug">
                    <LuArrowLeft />
                </button>
                <h1 className="workhoursTitle">Werktijden en pauzes</h1>
            </header>

            <section className="workhoursContent">
                <div className="row weekdaysRow">
                    <div className="label">Werkdagen:</div>
                    <div className="weekdays">
                        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d, i) => (
                            <button key={d} className={`weekday ${i < 5 ? "active" : ""}`} type="button" aria-pressed={i < 5}>
                                {i < 5 ? "✔" : ""}
                                <span className="weekdayLabel">{d}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="row timeRow">
                    <div className="label">Officieel startuur op werkdagen:</div>
                    <div className="value">9:00 <LuPencil className="iconEdit" /></div>
                </div>

                <div className="row timeRow">
                    <div className="label">Officieel einduur op werkdagen:</div>
                    <div className="value">17:00 <LuPencil className="iconEdit" /></div>
                </div>

                <div className="row toggleRow">
                    <div className="label">Werktimer automatisch starten op startuur:</div>
                    <div className="value">
                        <button className="toggle" type="button" aria-pressed="true"><span className="knob" /></button>
                    </div>
                </div>

                <div className="row timeRow">
                    <div className="label">Frequentie van pauzeherinneringen:</div>
                    <div className="value">Telkens na <u>50 min</u> <LuPencil className="iconEdit" /></div>
                </div>

                <div className="row toggleRow">
                    <div className="label">Middagpauze instellen:</div>
                    <div className="value">
                        <button className="toggle" type="button" aria-pressed="false"><span className="knob" /></button>
                    </div>
                </div>

                <div className="row timeRow">
                    <div className="label">Officiële start middagpauze op werkdagen:</div>
                    <div className="value">12:00 <LuPencil className="iconEdit muted" /></div>
                </div>

                <div className="row timeRow">
                    <div className="label">Officieel einde middagpauze op werkdagen:</div>
                    <div className="value">13:00 <LuPencil className="iconEdit muted" /></div>
                </div>

                <div className="row saveRow">
                    <button className="saveButton" type="button">Opslaan</button>
                </div>
            </section>
        </main>
    );
}
