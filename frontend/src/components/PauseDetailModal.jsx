import { useEffect, useState } from "react";
import { LuChevronRight } from "react-icons/lu";
import "../css/PauseDetailModal.css";

export default function PauseDetailModal({ pause, onClose }) {
    const [showDescription, setShowDescription] = useState(false);

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
    const descriptionId = "pause-detail-description";

    return (
        <div className="pauseDetailOverlay" onClick={onClose} role="presentation">
            <div
                className="pauseDetailModal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pause-detail-title"
                aria-describedby={showDescription ? descriptionId : undefined}
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
                </div>

                <div className="pauseDetailFooter">
                    <div className="pauseDetailFooterActions">
                        <button
                            className="pauseDetailQuestionButton"
                            type="button"
                            aria-expanded={showDescription}
                            aria-controls={descriptionId}
                            onClick={() => setShowDescription((current) => !current)}
                        >
                            <span className={`pauseDetailChevron ${showDescription ? "open" : ""}`} aria-hidden="true">
                                <LuChevronRight />
                            </span>
                            <span>Wat doet dit?</span>
                        </button>

                        <button className="pauseDetailButton" type="button" onClick={onClose}>
                            Klaar
                        </button>
                    </div>

                    <p className={`pauseDetailDescription ${showDescription ? "open" : ""}`} id={descriptionId}>
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}