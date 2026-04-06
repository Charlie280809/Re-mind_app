import { useState } from "react";

const BREATHING_EXERCISES = [
    { id: "box", title: "Box breathing" },
    { id: "coherent", title: "Coherent breathing" },
    { id: "vishama", title: "Vishama Vritti\n(ongelijk ademen)" },
    { id: "ratio", title: "1:2 ratio breathing" },
    { id: "physio", title: "Physiological sigh" },
    { id: "more", title: "Meer opties" },
];

export default function BreathingExercises({ onBack, onSelectExercise }) {
    const [filter, setFilter] = useState("all"); // "all" | "favorites"
    const [favorites, setFavorites] = useState(() => new Set());

    const filtered = filter === "favorites"
        ? BREATHING_EXERCISES.filter((ex) => favorites.has(ex.id))
        : BREATHING_EXERCISES;

    return (
        <main className="breathing-page">
            <div className="breathing-header">
                <button className="back-btn" onClick={onBack} aria-label="Terug">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            <div className="breathing-filters">
                <button
                    className={`filter-btn ${filter === "all" ? "active" : ""}`}
                    onClick={() => setFilter("all")}
                    type="button"
                >
                    Alle methoden
                </button>
                <button
                    className={`filter-btn ${filter === "favorites" ? "active" : ""}`}
                    onClick={() => setFilter("favorites")}
                    type="button"
                >
                    Favorieten
                </button>
            </div>

            <section className="breathing-grid">
                {filtered.map((exercise) => {
                    const isFav = favorites.has(exercise.id);

                    const handleCardClick = () => {
                        if (exercise.id !== "more" && onSelectExercise) {
                            onSelectExercise(exercise.id);
                        }
                    };

                    const handleFavoriteClick = (e) => {
                        e.stopPropagation();
                        setFavorites((prev) => {
                            const next = new Set(prev);
                            if (next.has(exercise.id)) next.delete(exercise.id);
                            else next.add(exercise.id);
                            return next;
                        });
                    };

                    return (
                        <article 
                            key={exercise.id} 
                            className={`breathing-card ${exercise.id !== "more" ? "clickable" : ""}`}
                            onClick={handleCardClick}
                            style={{ cursor: exercise.id !== "more" ? "pointer" : "default" }}
                        >
                            <h3>{exercise.title}</h3>
                            <button
                                className={`breathing-fav-btn ${isFav ? "active" : ""}`}
                                onClick={handleFavoriteClick}
                                aria-label={isFav ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
                                type="button"
                            >
                                {isFav ? "♥" : "♡"}
                            </button>
                        </article>
                    );
                })}
            </section>
        </main>
    );
}
