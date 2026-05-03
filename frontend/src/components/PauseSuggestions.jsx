import { useMemo, useState } from "react";
import PauseCard from "./PauseCard";

import lungs from "../assets/icons/ademhaling.svg";
import drink from "../assets/icons/drinkPauze.svg";
import handStretch from "../assets/icons/handstretch.svg";
import chest from "../assets/icons/handToChestReset.svg";
import posture from "../assets/icons/houdingCheck.svg";
import headphones from "../assets/icons/koptelefoon.svg";
import walk from "../assets/icons/korteWandeling.svg";
import trophy from "../assets/icons/nameOneWin.svg";
import eye from "../assets/icons/oogReset.svg";
import stretch from "../assets/icons/stretchen.svg";

const DATA = [
  { id: "breath", title: "Ademhaling", icon: lungs },
  { id: "stretch", title: "Stretchen", icon: stretch },
  { id: "posture", title: "Houding check", icon: posture },
  { id: "walk", title: "Korte wandeling", icon: walk },
  { id: "music", title: "Muziek luisteren", icon: headphones },
  { id: "win", title: "Name one win", icon: trophy },
  { id: "handStretch", title: "Hand stretch", icon: handStretch },
  { id: "chest", title: "Hand to chest reset", icon: chest },
  { id: "drink2", title: "Drinkpauze", icon: drink },
  { id: "eye", title: "Oog reset", icon: eye },
];

export default function PauseSuggestions({ onNavigateToBreathing }) {
  const [tab, setTab] = useState("all"); // "all" | "fav"
  const [favorites, setFavorites] = useState(() => new Set());

  const filtered = useMemo(() => {
    if (tab === "all") return DATA;
    if (tab === "fav") return DATA.filter((x) => favorites.has(x.id));
    return DATA;
  }, [tab, favorites]);

  const columnsClass = "cols";

  return (
    <main className="pause-page">
      <div className="pause-tabs">
        <button
          className={`pause-tab ${tab === "all" ? "active" : ""}`}
          onClick={() => setTab("all")}
          type="button"
        >
          Alle pauzes
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
