import "../css/settings.css";
import { LuArrowLeft, LuCheck, LuHeart } from "react-icons/lu";
import { TbCrown } from "react-icons/tb";
import { useState } from "react";

export default function SettingsUpgrade({ onBack, isPremium }) {
    const [billingCycle, setBillingCycle] = useState("monthly");

    const premiumPrice = billingCycle === "monthly" ? "€2,99/maand" : "€33/jaar";
    const companyPrice = billingCycle === "monthly" ? "€2,20/maand" : "€20/jaar";

    return (
        <main className="upgradePage">
            <header className="settingsHeader upgradeHeader">
                <button className="settingsBack" type="button" onClick={onBack} aria-label="Terug">
                    <LuArrowLeft />
                </button>
                <h1 className="settingsTitle">Upgrade plan</h1>

                <div className="upgradeBillingToggle" role="tablist" aria-label="Facturatieperiode">
                    <button
                        className={`upgradeBillingOption ${billingCycle === "monthly" ? "active" : ""}`}
                        type="button"
                        role="tab"
                        aria-selected={billingCycle === "monthly"}
                        onClick={() => setBillingCycle("monthly")}
                    >
                        Maandelijks
                    </button>
                    <button
                        className={`upgradeBillingOption ${billingCycle === "yearly" ? "active" : ""}`}
                        type="button"
                        role="tab"
                        aria-selected={billingCycle === "yearly"}
                        onClick={() => setBillingCycle("yearly")}
                    >
                        Jaarlijks
                    </button>
                </div>
            </header>

            <section className="upgradeGrid">
                <article className="upgradeCard upgradeCardTop">
                    <h2 className="upgradeCardTitle">
                        <TbCrown /> Premium plan
                    </h2>
                    <p className="upgradePrice">{premiumPrice}</p>
                    <ul className="upgradeList" role="list">
                        <li><LuCheck /> Alle basis functies</li>
                        <li><LuCheck /> Onbeperkt favoriete pauzes</li>
                        <li><LuCheck /> Wekelijks rapport</li>
                        <li><LuCheck /> Diepere inzichten</li>
                    </ul>
                    {isPremium ? (
                        <div className="upgradeCurrentPlan">Jouw momentele plan</div>
                    ) : (
                        <button className="upgradePrimaryBtn" type="button">Upgraden</button>
                    )}
                </article>

                <article className="upgradeCard upgradeCardTop">
                    <h2 className="upgradeCardTitle">
                        <TbCrown /> Bedrijfslicentie
                    </h2>
                    <p className="upgradePrice">{companyPrice}</p>
                    <p className="upgradeSubPrice">per werknemer</p>
                    <ul className="upgradeList" role="list">
                        <li><LuCheck /> Alle basis functies</li>
                        <li><LuCheck /> Premium functies</li>
                        <li><LuCheck /> Bedrijfspersonalisatie</li>
                    </ul>
                    <button className="upgradePrimaryBtn" type="button">Aanvraag invullen</button>
                </article>

                <article className="upgradeCard upgradeCardBottom">
                    <h2 className="upgradeCardTitle upgradeCardTitleCentered">Basis plan</h2>
                    <p className="upgradePrice upgradePriceCentered">Gratis</p>
                    <ul className="upgradeList upgradeListCompact" role="list">
                        <li><LuCheck /> Pauzesuggesties</li>
                        <li><LuCheck /> Afsluitroutine</li>
                        <li><LuCheck /> Check-ins</li>
                        <li><LuCheck /> Dagelijks rapport</li>
                    </ul>
                    {isPremium ? (
                        <button className="upgradePrimaryBtn" type="button">Kis dit plan</button>
                    ) : (
                        <div className="upgradeCurrentPlan">Jouw momentele plan</div>
                    )}
                </article>

                <article className="upgradeCard upgradeCardBottom">
                    <h2 className="upgradeCardTitle upgradeCardTitleCentered">Toon je support op een andere manier</h2>
                    <p className="upgradeSupportText">
                        Jouw steun maakt het verschil!
                        <br />
                        Elke bijdrage, hoe klein die ook mag zijn, helpt om een betere gebruikerservaring te creeren.
                    </p>
                    <button className="upgradePrimaryBtn" type="button">
                        <LuHeart /> Doe een gift
                    </button>
                </article>
            </section>
        </main>
    );
}
