import { useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import "../css/PauseReminderModal.css";
import { showNativeNotification } from "../lib/nativeNotification";

import clockIcon from "../assets/icons/alarmClock.svg";

const PAUSE_REMINDER_COPY = {
    title: ["Je werkt al een tijdje aan een stuk.", "Tijd voor een pauze?"],
    notificationTitle: "⏰ Tijd voor een pauze?",
    notificationBody: "Je werkt al een tijdje aan een stuk. Neem even een moment om tot rust te komen.",
    primaryActionLabel: "Neem een pauze",
    secondaryActionLabel: "Overslaan",
};

const LUNCH_REMINDER_COPY = {
    title: ["Het is nu tijd voor je middagpauze,", "Smakelijk eten!"],
    notificationTitle: "🍽️ Tijd voor je middagpauze",
    notificationBody: "Het is nu tijd voor je middagpauze, Smakelijk eten!",
    primaryActionLabel: "Middagpauze starten",
    secondaryActionLabel: "Nog niet",
};

const getPauseReminderOffsetSeconds = (pauseReminderIntervalSeconds) => {
    const safeIntervalSeconds = Math.max(1, Number(pauseReminderIntervalSeconds) || 0);
    return safeIntervalSeconds;
};

const getCurrentDateKey = (date = new Date()) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const isCurrentTimeMatching = (timeValue, date = new Date()) => {
    if (typeof timeValue !== "string") {
        return false;
    }

    const [hoursPart, minutesPart] = timeValue.split(":");
    const hours = Number.parseInt(hoursPart, 10);
    const minutes = Number.parseInt(minutesPart, 10);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return false;
    }

    return date.getHours() === hours && date.getMinutes() === minutes;
};

export default function PauseReminderModal({
    workStarted,
    onBreak,
    finished,
    workSeconds,
    pauseReminderIntervalSeconds,
    lunchStartTime,
    onDismiss,
    onTakeBreak,
    onLunchDismiss,
}) {
    const [activeReminderType, setActiveReminderType] = useState(null);
    const [nextPauseReminderTriggerWorkSecond, setNextPauseReminderTriggerWorkSecond] = useState(null);
    const hasShownPauseReminderNotificationRef = useRef(false);
    const lastLunchReminderDateKeyRef = useRef(null);

    const showPauseReminderModal = activeReminderType !== null;
    const reminderCopy = activeReminderType === "lunch" ? LUNCH_REMINDER_COPY : PAUSE_REMINDER_COPY;

    useEffect(() => {
        if (!workStarted || finished) {
            setActiveReminderType(null);
            setNextPauseReminderTriggerWorkSecond(null);
            hasShownPauseReminderNotificationRef.current = false;
            return;
        }

        if (activeReminderType === "lunch") {
            return;
        }

        if (onBreak) {
            setActiveReminderType(null);
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
                    title: PAUSE_REMINDER_COPY.notificationTitle,
                    body: PAUSE_REMINDER_COPY.notificationBody,
                    onClick: () => setActiveReminderType("pause"),
                });
                hasShownPauseReminderNotificationRef.current = true;
            }

            setActiveReminderType("pause");
        }
    }, [
        activeReminderType,
        finished,
        nextPauseReminderTriggerWorkSecond,
        onBreak,
        pauseReminderIntervalSeconds,
        showPauseReminderModal,
        workSeconds,
        workStarted,
    ]);

    // If the user updates the pause reminder frequency in settings, reschedule the next trigger.
    useEffect(() => {
        if (!workStarted || finished || onBreak) {
            return;
        }

        hasShownPauseReminderNotificationRef.current = false;
        setNextPauseReminderTriggerWorkSecond(workSeconds + getPauseReminderOffsetSeconds(pauseReminderIntervalSeconds));
    }, [pauseReminderIntervalSeconds]);

    useEffect(() => {
        if (!workStarted || finished || !lunchStartTime) {
            return;
        }

        if (activeReminderType !== null || onBreak) {
            return;
        }

        const currentDateKey = getCurrentDateKey();

        if (lastLunchReminderDateKeyRef.current === currentDateKey) {
            return;
        }

        if (!isCurrentTimeMatching(lunchStartTime)) {
            return;
        }

        showNativeNotification({
            title: LUNCH_REMINDER_COPY.notificationTitle,
            body: LUNCH_REMINDER_COPY.notificationBody,
            onClick: () => setActiveReminderType("lunch"),
        });

        lastLunchReminderDateKeyRef.current = currentDateKey;
        setActiveReminderType("lunch");
        setNextPauseReminderTriggerWorkSecond(
            workSeconds + getPauseReminderOffsetSeconds(pauseReminderIntervalSeconds)
        );
    }, [
        activeReminderType,
        finished,
        lunchStartTime,
        onBreak,
        pauseReminderIntervalSeconds,
        workSeconds,
        workStarted,
    ]);

    useEffect(() => {
        if (!showPauseReminderModal) {
            return undefined;
        }

        document.body.classList.add("modalOpen");

        return () => {
            document.body.classList.remove("modalOpen");
        };
    }, [showPauseReminderModal]);

    useEffect(() => {
        if (!showPauseReminderModal) {
            return undefined;
        }

        const autoDismissTimeoutId = window.setTimeout(() => {
            handleDismiss();
        }, 2 * 60 * 1000);

        return () => {
            window.clearTimeout(autoDismissTimeoutId);
        };
    }, [showPauseReminderModal, activeReminderType]);

    const closePauseReminderModal = (shouldRescheduleNextTrigger = true) => {
        setActiveReminderType(null);
        hasShownPauseReminderNotificationRef.current = false;

        if (shouldRescheduleNextTrigger) {
            setNextPauseReminderTriggerWorkSecond(
                workSeconds + getPauseReminderOffsetSeconds(pauseReminderIntervalSeconds)
            );
        }
    };

    const handleDismiss = () => {
        if (activeReminderType === "lunch") {
            onLunchDismiss?.();
        } else {
            onDismiss?.();
        }

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
                    <img src={clockIcon} alt="Alarmklok" />
                </div>

                <h2 id="pause-reminder-title" className="pauseReminderTitle">
                    {activeReminderType === "lunch" ? (
                        <>
                            {LUNCH_REMINDER_COPY.title[0]}
                            <br />
                            {LUNCH_REMINDER_COPY.title[1]}
                        </>
                    ) : (
                        <>
                            {PAUSE_REMINDER_COPY.title[0]}
                            <br />
                            {PAUSE_REMINDER_COPY.title[1]}
                        </>
                    )}
                </h2>

                <div className="pauseReminderActions">
                    <button className="pauseReminderPrimaryButton" type="button" onClick={handleTakeBreak}>
                        {reminderCopy.primaryActionLabel}
                    </button>
                    <button className="pauseReminderSecondaryButton" type="button" onClick={handleDismiss}>
                        {reminderCopy.secondaryActionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}