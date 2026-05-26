import { LuPlus } from "react-icons/lu";
import { TbCrown } from "react-icons/tb";

export default function FavoriteLimitCard({ onNavigateToUpgrade }) {
    const handleClick = () => {
        if (onNavigateToUpgrade) {
            onNavigateToUpgrade();
        }
    };

    const handleKeyDown = (event) => {
        if (!onNavigateToUpgrade) {
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onNavigateToUpgrade();
        }
    };

    return (
        <article
            className="pause-card pause-card--upgrade"
            role={onNavigateToUpgrade ? "button" : undefined}
            tabIndex={onNavigateToUpgrade ? 0 : undefined}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
        >
            <span className="pause-cardUpgradeBadge" aria-hidden="true">
                <TbCrown />
            </span>

            <div className="pause-iconBox pause-iconBox-upgrade" aria-hidden="true">
                <LuPlus className="pause-cardUpgradeIcon" />
            </div>

            <div className="pause-content pause-content--upgrade">
                <p>Meer pauzes toevoegen?</p>
            </div>
        </article>
    );
}