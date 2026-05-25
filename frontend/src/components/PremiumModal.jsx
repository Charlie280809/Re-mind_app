import { useEffect } from "react";
import { LuX } from "react-icons/lu";
import "../css/PremiumModal.css";
import crown from "../assets/icons/crown_filled.svg";

export default function PremiumModal({ title, description, onClose, onUpgrade }) {
    useEffect(() => {
        document.body.classList.add("modalOpen");

        return () => {
            document.body.classList.remove("modalOpen");
        };
    }, [onClose]);

    function handleCtaClick() {
        onClose();

        if (onUpgrade) {
            onUpgrade();
        }
    }

    return (
        <div className="premiumCardOverlay" role="presentation" onClick={onClose}>
            <div
                className="premiumModal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="premium-modal-title"
                aria-describedby="premium-modal-description"
                onClick={(event) => event.stopPropagation()}
            >
                <button className="premiumModalCloseButton" type="button" onClick={onClose} aria-label="Sluiten">
                    <LuX />
                </button>

                <div className="premiumModalContent">
                    <img src={crown} alt="Premium" className="premiumIcon" />

                    <h2 id="premium-modal-title" className="premiumModalTitle">
                        {title}
                    </h2>

                    <p id="premium-modal-description" className="premiumModalMessage">
                        {description}
                    </p>

                    <button className="upgradeButton" type="button" onClick={handleCtaClick}>
                        Upgrade naar Premium
                    </button>
                </div>
            </div>
        </div>
    );
}