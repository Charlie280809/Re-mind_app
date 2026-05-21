import { IoMdHeartEmpty } from "react-icons/io";
import { IoMdHeart } from "react-icons/io";

export default function PauseCard({ icon, title, isFavorite, onToggleFavorite, onClick }) {
  const handleCardClick = (e) => {
    if (onClick) {
      onClick();
    }
  };

  const handleCardKeyDown = (event) => {
    if (!onClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation(); // Voorkom dat de card click event ook getriggerd wordt
    onToggleFavorite();
  };

  return (
    <article 
      className={`pause-card ${onClick ? "clickable" : ""}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="pause-iconBox">
        <img src={icon} alt={title} />
      </div>

      <div className="pause-content">
        <p>{title}</p>
      </div>

      <button
        className={`pause-favBtn ${isFavorite ? "active" : ""}`}
        onClick={handleFavoriteClick}
        aria-label={isFavorite ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
        type="button"
      >
        {isFavorite ? <IoMdHeart /> : <IoMdHeartEmpty />}
      </button>
    </article>
  );
}
