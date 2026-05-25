import { useEffect } from "react";
import { LuX } from "react-icons/lu";
import "../css/confirmations.css";

export default function DeleteConfirmationModal({ description, onClose, deleteConfirmationButtonLabel, cancelButtonLabel, onConfirm }) {
    useEffect(() => {
        document.body.classList.add("modalOpen");

        return () => {
            document.body.classList.remove("modalOpen");
        };
    }, [onClose]);

    function handleCtaClick() {
        onClose();

        if (onConfirm) {
            onConfirm();
        }
    }

    return (
        <div className="popupOverlay" role="presentation" onClick={onClose}>
            <div
                className="deleteConfirmationModal"
                role="dialog"
                aria-modal="true"
                aria-describedby="delete-confirmation-modal-description"
                onClick={(event) => event.stopPropagation()}
            >

                <header className="confirmationHeader">
                    <h2 className="deleteConfirmationTitle"> Opgelet! </h2>
                    <button className="closeOverlayButton" type="button" onClick={onClose} aria-label="Sluiten">
                        <LuX />
                    </button>
                </header>


                <div className="deleteConfirmationContent">
                    <p id="delete-confirmation-modal-description" className="deleteConfirmationMessage">
                        {description}
                    </p>

                    <div className="deleteConfirmationActions">
                        <button className="deleteConfirmationButton" type="button" onClick={handleCtaClick}>
                            {deleteConfirmationButtonLabel}
                        </button>
                        <button className="cancelButton" type="button" onClick={onClose}>
                            {cancelButtonLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}