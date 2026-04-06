export default function PauseCard({ icon, title, isFavorite, onToggleFavorite, onClick }) {
  const handleCardClick = (e) => {
    if (onClick) {
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
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="pause-iconBox">
        <img src={icon} alt={title} />
      </div>

      <div className="pause-content">
        <h3>{title}</h3>
      </div>

      <button
        className={`pause-favBtn ${isFavorite ? "active" : ""}`}
        onClick={handleFavoriteClick}
        aria-label={isFavorite ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
        type="button"
      >
        {isFavorite ? "♥" : "♡"}
      </button>
    </article>
  );
}
