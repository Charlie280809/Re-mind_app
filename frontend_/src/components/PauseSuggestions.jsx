import { useMemo, useState } from "react";
import PauseCard from "./PauseCard";

import lungs from "../assets/ademhaling.png";

const DATA = [
  { id: "breath", type: "lang", title: "Ademhaling", icon: lungs },
];

export default function PauseSuggestions({ onNavigateToBreathing }) {
  const [tab, setTab] = useState("kort"); // "kort" | "lang" | "fav"
  const [favorites, setFavorites] = useState(() => new Set());

  const filtered = useMemo(() => {
    if (tab === "fav") return DATA.filter((x) => favorites.has(x.id));
    return DATA.filter((x) => x.type === tab);
  }, [tab, favorites]);

  const columnsClass = tab === "lang" ? "cols-2" : "cols-3";

  return (
    <main className="pause-page">
      <h1>Pauzesuggesties</h1>

      <div className="pause-tabs">
        <button
          className={`pause-tab ${tab === "kort" ? "active" : ""}`}
          onClick={() => setTab("kort")}
          type="button"
        >
          Korte pauzes
        </button>

        <button
          className={`pause-tab ${tab === "lang" ? "active" : ""}`}
          onClick={() => setTab("lang")}
          type="button"
        >
          Lange pauzes
        </button>

        <button
          className={`pause-tab ${tab === "fav" ? "active" : ""}`}
          onClick={() => setTab("fav")}
          type="button"
        >
          Favorieten
        </button>
      </div>

      <section className={`pause-grid ${columnsClass}`}>
        {filtered.map((item) => {
          const isFav = favorites.has(item.id);

          return (
            <PauseCard
              key={item.id}
              icon={item.icon}
              title={item.title}
              isFavorite={isFav}
              onClick={item.id === "breath" && onNavigateToBreathing ? onNavigateToBreathing : undefined}
              onToggleFavorite={() => {
                setFavorites((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                });
              }}
            />
          );
        })}
      </section>
    </main>
  );
}
