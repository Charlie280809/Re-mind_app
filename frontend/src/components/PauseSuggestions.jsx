import { useMemo, useState } from "react";
import PauseCard from "./PauseCard";

import lungs from "../assets/icons/ademhaling.png";
import posture from "../assets/icons/houdingCheck.png";
import trophy from "../assets/icons/nameOneWin.png";
import handStretch from "../assets/icons/handstretch.png";
import chest from "../assets/icons/handToChestReset.png";
import drink from "../assets/icons/drinkPauze.png";
import eye from "../assets/icons/oogReset.png";

const DATA = [
  { id: "breath", type: "lang", title: "Ademhaling", icon: lungs },
  { id: "posture", type: "kort", title: "Houding check", icon: posture },
  { id: "win", type: "kort", title: "Name one win", icon: trophy },
  { id: "handStretch", type: "kort", title: "Hand stretch", icon: handStretch },
  { id: "chest", type: "kort", title: "Hand to chest reset", icon: chest },
  { id: "drink2", type: "kort", title: "Drink pauze", icon: drink },
  { id: "eye", type: "kort", title: "Oog reset", icon: eye },
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
