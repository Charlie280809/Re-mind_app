import { useState } from "react";
import "../css/CheckInModal.css";
import { FaArrowTrendUp } from "react-icons/fa6";
import { LuZap } from "react-icons/lu";

export default function CheckInModal({ onClose, onSubmitCheckIn }) {
    const [stress, setStress] = useState(3);
    const [energy, setEnergy] = useState(3);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setLoading(true);
        setError("");

        try {
            const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
            const response = await fetch(`${apiBaseUrl}/checkin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    stress: parseInt(stress, 10),
                    energy: parseInt(energy, 10),
                }),
            });

            if (!response.ok) {
                throw new Error(`Backend gaf status ${response.status}`);
            }

            const data = await response.json();
            if (onSubmitCheckIn) {
                onSubmitCheckIn(data);
            }
        } catch (err) {
            setError(err.message || "Kon check-in niet opslaan.");
        } finally {
            setLoading(false);
            onClose();
        }
    };

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
                            onClick={onClose}
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
                                <FaArrowTrendUp />
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
