import { useEffect, useState } from "react";
import "../css/CheckInModal.css";
import { HiOutlineTrendingUp  } from "react-icons/hi";
import { LuZap } from "react-icons/lu";
import { submitCheckIn } from "../api/checkInApi";

// const CHECK_IN_MIN_INTERVAL_SECONDS = 30 * 60; // 30 minuten
// const CHECK_IN_MAX_INTERVAL_SECONDS = 90 * 60; // 90 minuten
// Voor demo doeleinden kortere intervallen:
const CHECK_IN_MIN_INTERVAL_SECONDS = 15; // 15 seconden
const CHECK_IN_MAX_INTERVAL_SECONDS = 90; // 1,5 minuten

const getRandomCheckInIntervalSeconds = () => {
    const range = CHECK_IN_MAX_INTERVAL_SECONDS - CHECK_IN_MIN_INTERVAL_SECONDS;
    return CHECK_IN_MIN_INTERVAL_SECONDS + Math.floor(Math.random() * (range + 1));
};

export default function CheckInModal({
    workStarted,
    onBreak,
    finished,
    workSeconds,
    checkInNotificationsEnabled,
}) {
    const [stress, setStress] = useState(3);
    const [energy, setEnergy] = useState(3);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [nextCheckInTriggerWorkSecond, setNextCheckInTriggerWorkSecond] = useState(null);

    useEffect(() => {
        if (!checkInNotificationsEnabled) {
            setShowCheckInModal(false);
            setNextCheckInTriggerWorkSecond(null);
            return;
        }

        if (!workStarted || finished) {
            setShowCheckInModal(false);
            setNextCheckInTriggerWorkSecond(null);
            return;
        }

        if (onBreak) {
            setShowCheckInModal(false);
            return;
        }

        if (nextCheckInTriggerWorkSecond == null) {
            setNextCheckInTriggerWorkSecond(getRandomCheckInIntervalSeconds());
            //for demo purposes, trigger first check-in after 10 seconds
            // setNextCheckInTriggerWorkSecond(10);
            return;
        }

        if (!showCheckInModal && workSeconds >= nextCheckInTriggerWorkSecond) {
            setShowCheckInModal(true);
        }
    }, [
        checkInNotificationsEnabled,
        finished,
        nextCheckInTriggerWorkSecond,
        onBreak,
        showCheckInModal,
        workSeconds,
        workStarted,
    ]);

    useEffect(() => {
        if (!showCheckInModal) {
            return undefined;
        }

        document.body.classList.add("modalOpen");

        return () => {
            document.body.classList.remove("modalOpen");
        };
    }, [showCheckInModal]);

    const closeCheckInModal = () => {
        setShowCheckInModal(false);
        setNextCheckInTriggerWorkSecond(workSeconds + getRandomCheckInIntervalSeconds());
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError("");

        try {
            await submitCheckIn(stress, energy);
        } catch (err) {
            setError(err.message || "Kon check-in niet opslaan.");
        } finally {
            setLoading(false);
            closeCheckInModal();
        }
    };

    if (!showCheckInModal) {
        return null;
    }

    return (
        <div className="checkInModalOverlay">
            <div className="checkInModalContent">
                <header className="checkInModalHeader">
                    <div className="checkInModalTitle">
                        <h2 className="checkInTitle">Dagelijkse check-in</h2>
                        <p className="checkInSubtitle">
                            Sta even stil bij hoe je je op dit moment voelt.
                        </p>
                    </div>

                    <div className="checkInModalActions">
                        <button
                            className="checkInSkipButton"
                            onClick={closeCheckInModal}
                            disabled={loading}
                            type="button"
                        >
                            Overslaan
                        </button>
                        <button
                            className="checkInSubmitButton"
                            onClick={handleSubmit}
                            disabled={loading}
                            type="button"
                        >
                            {loading ? "Opslaan..." : "Klaar"}
                        </button>
                    </div>
                </header>

                <section className="checkInInputsRow">
                    <article className="checkInInputCard">
                        <label className="checkInLabel">
                            <div className="checkInLabelIcon">
                                <HiOutlineTrendingUp />
                            </div>
                            <span>Hoe hoog is je stressniveau nu?</span>
                        </label>

                        <input
                            type="range"
                            className="checkInSlider"
                            min="1"
                            max="5"
                            value={stress}
                            onChange={(e) => setStress(e.target.value)}
                            disabled={loading}
                        />

                        <div className="checkInScaleLabels">
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                            <span>4</span>
                            <span>5</span>
                        </div>
                    </article>

                    <article className="checkInInputCard">
                        <label className="checkInLabel">
                            <div className="checkInLabelIcon">
                                <LuZap />
                            </div>
                            <span>Wat is jouw energie level op dit moment?</span>
                        </label>

                        <input
                            type="range"
                            className="checkInSlider"
                            min="1"
                            max="5"
                            value={energy}
                            onChange={(e) => setEnergy(e.target.value)}
                            disabled={loading}
                        />

                        <div className="checkInScaleLabels">
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                            <span>4</span>
                            <span>5</span>
                        </div>
                    </article>
                </section>

                {error && <p className="checkInError">{error}</p>}
            </div>
        </div>
    );
}
