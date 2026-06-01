import { useMemo } from "react";
import { TbCrown } from "react-icons/tb";
import PauseCard from "../components/PauseCard";
import FavoriteLimitCard from "../components/FavoriteLimitCard";
import { DATA as PAUSE_OPTIONS } from "./PauseSuggestions";
import { hasPremiumAccess } from "../lib/access";

export default function ProfilePage({ profile, favorites, onToggleFavorite, onNavigateToPause, onNavigateToUpgrade, onNavigateToCompanyManagement, favoriteLimit }) {
    const name = profile?.username || profile?.email || "Gebruiker";
    const companyName = profile?.bedrijfsnaam || "";
    const isPremium = hasPremiumAccess(profile);

    const favoritePauses = useMemo(
        () => PAUSE_OPTIONS.filter((item) => favorites.has(item.id)),
        [favorites]
    );

    const showFavoriteLimitCard = !isPremium && favoritePauses.length >= favoriteLimit;

    return (
        <main className="profile-page">
            <section className="profile-hero">
                <div className="profile-avatar" aria-hidden="true">
                    {profile?.avatar_url ? (
                        <img className="profile-avatarImage" src={profile.avatar_url} alt="Profielfoto" />
                    ) : (
                        name
                            .split(" ")
                            .filter(Boolean)
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                    )}
                </div>

                <div className="profile-heroCopy">
                    <h1 className="profile-title">{name}</h1>
                    <p className="profile-companyTitle">{companyName}</p>
                    {profile?.company_id && profile?.company_role === "admin" ? (
                        <button
                            className="profile-companyManageBtn"
                            type="button"
                            onClick={() => {
                                if (onNavigateToCompanyManagement) onNavigateToCompanyManagement();
                            }}
                            aria-label="Bedrijfsbeheer openen"
                        >
                            <span>Bedrijfsbeheer</span>
                        </button>
                    ) : null}
                    {isPremium ? null : (
                        <button
                            className="profile-upgradeBtn"
                            type="button"
                            onClick={() => {
                                if (onNavigateToUpgrade) onNavigateToUpgrade();
                            }}
                            aria-label="Upgrade naar premium"
                        >
                            <TbCrown />
                            <span>Upgrade plan</span>
                        </button>
                    )}
                </div>
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

                        {showFavoriteLimitCard ? <FavoriteLimitCard onNavigateToUpgrade={onNavigateToUpgrade} /> : null}
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