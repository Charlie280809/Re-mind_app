import { useEffect } from "react";
import { LuAlarmClock, LuX } from "react-icons/lu";
import "../css/PauseReminderModal.css";

export default function PauseReminderModal({ onDismiss, onTakeBreak }) {
    useEffect(() => {
        document.body.classList.add("modalOpen");

        return () => {
            document.body.classList.remove("modalOpen");
        };
    }, []);

    return (
        <div className="pauseReminderOverlay" role="presentation">
            <div className="pauseReminderModal" role="dialog" aria-modal="true" aria-labelledby="pause-reminder-title">
                <button className="pauseReminderCloseButton" type="button" onClick={onDismiss} aria-label="Sluiten">
                    <LuX />
                </button>

                <div className="pauseReminderIconWrap" aria-hidden="true">
                    <LuAlarmClock />
                </div>

                <h2 id="pause-reminder-title" className="pauseReminderTitle">
                    Je werkt al een tijdje aan een stuk.
                    <br />
                    Tijd voor een pauze?
                </h2>

                <div className="pauseReminderActions">
                    <button className="pauseReminderPrimaryButton" type="button" onClick={onTakeBreak}>
                        Neem een pauze
                    </button>
                    <button className="pauseReminderSecondaryButton" type="button" onClick={onDismiss}>
                        Overslaan
                    </button>
                </div>
            </div>
        </div>
    );
}