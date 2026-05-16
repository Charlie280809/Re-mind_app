import { useEffect } from "react";
import "../css/confirmations.css";
import { LuX } from "react-icons/lu";

export default function FavoriteRemovalModal({ pauseTitle, onConfirm, onCancel }) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onCancel();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        document.body.classList.add("modalOpen");

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.classList.remove("modalOpen");
        };
    }, [onCancel]);

    return (
        <div className="favoriteRemovalOverlay" onClick={onCancel} role="presentation">
            <div
                className="favoriteRemovalModal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="favorite-removal-title"
                aria-describedby="favorite-removal-description"
                onClick={(event) => event.stopPropagation()}
            >

                <div className="favoriteRemovalTop">
                    <p className="favoriteRemovalTitle">
                        Ben je zeker dat je {pauseTitle} uit je favoriete pauzes wil verwijderen?
                    </p>
                    <button className="favoriteRemovalClose" type="button" onClick={onCancel} aria-label="Sluiten">
                        <LuX />
                    </button>
                </div>

                <button className="favoriteRemovalPrimaryButton" type="button" onClick={onConfirm}>
                    Verwijderen
                </button>
            </div>
        </div>
    );
}