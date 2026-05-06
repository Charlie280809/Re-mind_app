import { useMemo } from "react";
import { TbCrown } from "react-icons/tb";
import PauseCard from "./PauseCard";
import { DATA as PAUSE_OPTIONS } from "./PauseSuggestions";

export default function ProfilePage({ name, favorites, onToggleFavorite, onNavigateToPause }) {

    const favoritePauses = useMemo(
        () => PAUSE_OPTIONS.filter((item) => favorites.has(item.id)),
        [favorites]
    );

    return (
        <main className="profile-page">
            <section className="profile-hero">
                <div className="profile-avatar" aria-hidden="true">
                    {name
                        .split(" ")
                        .filter(Boolean)
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                </div>

                <div className="profile-heroCopy">
                    <h1 className="profile-title">{name}</h1>
                    <p className="profile-jobTitle">Technieker</p>
                    <button className="profile-upgradeBtn" type="button">
                        {<TbCrown />}
                        <span>Upgrade plan</span>
                    </button>
                </div>

                <button className="profile-logoutBtn" type="button"> {/* onclick navigate to login */}
                    Afmelden
                </button>
            </section>

            <section className="profile-section">
                <h3 className="profile-sectionTitle">Favoriete pauzes</h3>

                {favoritePauses.length > 0 ? (
                    <section className="profile-favoritesGrid">
                        {favoritePauses.map((item) => (
                            <PauseCard
                                key={item.id}
                                icon={item.icon}
                                title={item.title}
                                isFavorite
                                onToggleFavorite={() => onToggleFavorite(item.id)}
                            />
                        ))}
                    </section>
                ) : (
                    <article className="profile-emptyState">
                        <p>Je hebt nog geen favoriete pauzes.</p>
                        <button className="profile-addPausesButton" type="button" onClick={onNavigateToPause}>
                            Voeg toe
                        </button>
                    </article>
                )}
            </section>
        </main>
    );
}