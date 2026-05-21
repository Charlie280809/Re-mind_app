import { useEffect } from "react";
import "../css/PauseDetailModal.css";

export default function PauseDetailModal({ pause, onClose }) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.classList.add("modalOpen");

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.classList.remove("modalOpen");
        };
    }, [onClose]);

    if (!pause) {
        return null;
    }

    const title = pause.modalTitle || pause.title;
    const layout = pause.layout || (Array.isArray(pause.steps) && pause.steps.length > 0 ? "steps" : "centered");
    const intro = pause.intro || "";
    const description = pause.description || "Neem even een korte pauze om je hoofd en lichaam te resetten.";
    const hasSteps = layout === "steps" && Array.isArray(pause.steps) && pause.steps.length > 0;
    const hasIntro = layout === "centered" && Boolean(intro);

    return (
        <div className="pauseDetailOverlay" onClick={onClose} role="presentation">
            <div
                className="pauseDetailModal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pause-detail-title"
                aria-describedby="pause-detail-description"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="pauseDetailContent">
                    <h2 className="pauseDetailTitle" id="pause-detail-title">
                        {title}
                    </h2>

                    {hasIntro ? <p className="pauseDetailLead">{intro}</p> : null}

                    {hasSteps ? (
                        <ol className="pauseDetailSteps">
                            {pause.steps.map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                    ) : null}

                    <div className="pauseDetailExplanation">
                        <p className="pauseDetailQuestion">Wat doet dit?</p>
                        <p className="pauseDetailDescription" id="pause-detail-description">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="pauseDetailFooter">
                    <button className="pauseDetailButton" type="button" onClick={onClose}>
                        Klaar
                    </button>
                </div>
            </div>
        </div>
    );
}