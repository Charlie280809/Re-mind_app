import { useEffect, useRef, useState } from "react";
import { LuAlarmClock, LuX } from "react-icons/lu";
import "../css/PauseReminderModal.css";
import { showNativeNotification } from "../lib/nativeNotification";

const getPauseReminderOffsetSeconds = (pauseReminderIntervalSeconds) => {
    const safeIntervalSeconds = Math.max(1, Number(pauseReminderIntervalSeconds) || 0);
    return safeIntervalSeconds;
};

export default function PauseReminderModal({
    workStarted,
    onBreak,
    finished,
    workSeconds,
    pauseReminderIntervalSeconds,
    onDismiss,
    onTakeBreak,
}) {
    const [showPauseReminderModal, setShowPauseReminderModal] = useState(false);
    const [nextPauseReminderTriggerWorkSecond, setNextPauseReminderTriggerWorkSecond] = useState(null);
    const hasShownPauseReminderNotificationRef = useRef(false);

    useEffect(() => {
        if (!workStarted || finished) {
            setShowPauseReminderModal(false);
            setNextPauseReminderTriggerWorkSecond(null);
            hasShownPauseReminderNotificationRef.current = false;
            return;
        }

        if (onBreak) {
            setShowPauseReminderModal(false);
            setNextPauseReminderTriggerWorkSecond(null);
            hasShownPauseReminderNotificationRef.current = false;
            return;
        }

        if (nextPauseReminderTriggerWorkSecond == null) {
            hasShownPauseReminderNotificationRef.current = false;
            setNextPauseReminderTriggerWorkSecond(
                workSeconds + getPauseReminderOffsetSeconds(pauseReminderIntervalSeconds)
            );
            return;
        }

        if (!showPauseReminderModal && workSeconds >= nextPauseReminderTriggerWorkSecond) {
            if (!hasShownPauseReminderNotificationRef.current) {
                showNativeNotification({
                    title: "⏰ Tijd voor een pauze?",
                    body: "Je werkt al een tijdje aan een stuk. Neem even een moment om tot rust te komen.",
                    onClick: () => setShowPauseReminderModal(true),
                });
                hasShownPauseReminderNotificationRef.current = true;
            }

            setShowPauseReminderModal(true);
        }
    }, [
        finished,
        nextPauseReminderTriggerWorkSecond,
        onBreak,
        pauseReminderIntervalSeconds,
        showPauseReminderModal,
        workSeconds,
        workStarted,
    ]);

    // if the user updates the pause reminder frequency in settings, reschedule the next trigger
    useEffect(() => {
        if (!workStarted || finished || onBreak) {
            return;
        }

        // always reset the 'has shown' flag so a new notification can be shown with the new interval
        hasShownPauseReminderNotificationRef.current = false;

        // recalculate next trigger relative to current workSeconds
        setNextPauseReminderTriggerWorkSecond(workSeconds + getPauseReminderOffsetSeconds(pauseReminderIntervalSeconds));
    }, [pauseReminderIntervalSeconds]);

    useEffect(() => {
        if (!showPauseReminderModal) {
            return undefined;
        }

        document.body.classList.add("modalOpen");

        return () => {
            document.body.classList.remove("modalOpen");
        };
    }, [showPauseReminderModal]);

    const closePauseReminderModal = (shouldRescheduleNextTrigger = true) => {
        setShowPauseReminderModal(false);
        hasShownPauseReminderNotificationRef.current = false;

        if (shouldRescheduleNextTrigger) {
            setNextPauseReminderTriggerWorkSecond(
                workSeconds + getPauseReminderOffsetSeconds(pauseReminderIntervalSeconds)
            );
        }
    };

    const handleDismiss = () => {
        onDismiss?.();
        closePauseReminderModal();
    };

    const handleTakeBreak = () => {
        onTakeBreak?.();
        closePauseReminderModal(false);
    };

    if (!showPauseReminderModal) {
        return null;
    }

    return (
        <div className="pauseReminderOverlay" role="presentation">
            <div className="pauseReminderModal" role="dialog" aria-modal="true" aria-labelledby="pause-reminder-title">
                <button className="pauseReminderCloseButton" type="button" onClick={handleDismiss} aria-label="Sluiten">
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
                    <button className="pauseReminderPrimaryButton" type="button" onClick={handleTakeBreak}>
                        Neem een pauze
                    </button>
                    <button className="pauseReminderSecondaryButton" type="button" onClick={handleDismiss}>
                        Overslaan
                    </button>
                </div>
            </div>
        </div>
    );
}