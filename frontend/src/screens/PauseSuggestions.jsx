import { useMemo, useState } from "react";
import PauseCard from "../components/PauseCard";
import PauseDetailModal from "../components/PauseDetailModal";

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

export const DATA = [
  { id: "breath", title: "Ademhaling", icon: lungs, route: "breathing" },
  {
    id: "stretch",
    title: "Stretchen",
    icon: stretch,
    layout: "centered",
    intro: "Sta even recht en strek je uit. Geef extra aandacht aan elk lichaamsdeel dat je rekt.",
    description: "Even stretchen maakt je lichaam terug los na na een langere tijd in dezelfde houding te zitten. Dit is een fysieke reset.",
  },
  {
    id: "posture",
    title: "Houding check",
    modalTitle: "Houdingcheck",
    icon: posture,
    layout: "steps",
    description:
      "Een slechte houding beïnvloedt stress en focus direct. Zorg voor een goede houding voor minder stress en betere focus!",
    steps: [
      "Zet je beide voeten plat op de grond.",
      "Recht je rug.",
      "Ontspan je schouders.",
      "Ontspan je kaak.",
    ],
  },
  {
    id: "walk",
    title: "Korte wandeling",
    icon: walk,
    layout: "centered",
    intro: "Maak een korte wandeling in de buitenlucht of in je kantoor.",
    description: "Een korte wandeling (zeker in de frisse lucht) helpt je hoofd leeg te maken en tot rust te komen.",
  },
  {
    id: "music",
    title: "Muziek luisteren",
    icon: headphones,
    layout: "centered",
    intro: "Luister naar 2-3 van je favoriete nummers, zonder met iets anders bezig te zijn.",
    description: "Luisteren naar je favoriete nummers kan je opvrolijken als je een mentale dip hebt en het activeert een kernzintuig.",
  },
  {
    id: "win",
    title: "Name one win",
    icon: trophy,
    layout: "centered",
    intro: "Noem voor jezelf één ding dat vandaag al goed ging.",
    description: "Even bewust stilstaan bij een succes helpt om je aandacht te verplaatsen en zorgt voor ee, positieve mindset.",
  },
  {
    id: "handStretch",
    title: "Hand stretch",
    icon: handStretch,
    layout: "steps",
    description: "Je handen staan continu onder spanning bij het typen. Door deze reset kunnen je handen terug ontspannen.",
    steps: [
      "Spreid je vingers wijd en ontspan ze terug.",
      "Draai je polsen een aantal keren rond.",
      "Herhaal dit 3 keer.",
    ],
  },
  {
    id: "chest",
    title: "Hand to chest reset",
    icon: chest,
    layout: "steps",
    description: "Deze reset helpt je om spanning in je borst en bovenlichaam bewust los te laten en sorgt voor onmiddellijke kalmering.",
    steps: [
      "Leg je hand op je borst.",
      "Adem 4x langzaam in en uit.",
      "Focus op de fysieke sensatie.",
    ],
  },
  {
    id: "hydration",
    title: "Drinkpauze",
    icon: drink,
    layout: "centered",
    intro: "Drink wat water en/of ga je water bijvullen.",
    description: "Hydratatie is belangrijk. Zorg ervoor dat je altijd wat water in je buurt hebt staan.",
  },
  {
    id: "eye",
    title: "Oog reset",
    icon: eye,
    layout: "centered",
    intro: "Kijk 20 seconden weg van je scherm en laat je ogen even rusten. Knipper een aantal keer.",
    description: "Door je ogen even te laten ontspannen, verminder je vermoeidheid van het scherm.",
  },
];

export default function PauseSuggestions({ favorites = new Set(), onToggleFavorite, onNavigateToBreathing }) {
  const [tab, setTab] = useState("all");
  const [selectedPause, setSelectedPause] = useState(null);

  const filtered = useMemo(() => {
    if (tab === "all") return DATA;
    if (tab === "fav") return DATA.filter((x) => favorites.has(x.id));
    return DATA;
  }, [tab, favorites]);

  const handlePauseClick = (item) => {
    if (item.route === "breathing") {
      onNavigateToBreathing?.();
      return;
    }

    setSelectedPause(item);
  };

  const closePauseDetail = () => {
    setSelectedPause(null);
  };

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
              onClick={() => handlePauseClick(item)}
              onToggleFavorite={() => onToggleFavorite?.(item.id)}
            />
          );
        })}
      </section>

      {selectedPause ? <PauseDetailModal pause={selectedPause} onClose={closePauseDetail} /> : null}
    </main>
  );
}
