import "../css/upgradePlan.css";
import { LuArrowLeft, LuCheck } from "react-icons/lu";
import { IoMdHeart } from "react-icons/io";
import { TbCrown } from "react-icons/tb";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SettingsUpgrade({ isPremium, onProfileUpdated }) {
    const [billingCycle, setBillingCycle] = useState("monthly");
    const [savingPlan, setSavingPlan] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";

    const premiumPrice = billingCycle === "monthly" ? "€2,99/maand" : "€33/jaar";
    const companyPrice = billingCycle === "monthly" ? "€2,20/maand" : "€20/jaar";

    const handleSelectBasePlan = async () => {
        setSavingPlan(true);
        setSaveMessage("");

        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            const session = sessionData?.session;

            if (sessionError || !session) {
                throw new Error(sessionError?.message || "Geen actieve sessie gevonden.");
            }

            const response = await fetch(`${apiBaseUrl}/profile/me/premium`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    is_premium: false,
                }),
            });

            const contentType = response.headers.get("content-type") || "";
            const payload = contentType.includes("application/json") ? await response.json() : null;

            if (!response.ok) {
                throw new Error(payload?.error || "Kon het plan niet aanpassen.");
            }

            if (payload?.profile && onProfileUpdated) {
                onProfileUpdated(payload.profile);
            }

            setSaveMessage("Basis plan geactiveerd.");
        } catch (error) {
            console.error(error);
            setSaveMessage(error?.message || "Fout bij aanpassen van het plan.");
        } finally {
            setSavingPlan(false);
        }
    };

    return (
        <main className="upgradePage">
            <header className="upgradeHeader">
                <h1 className="upgradeTitle">Upgrade plan</h1>

                <div className="upgradeBillingToggle" role="tablist" aria-label="Facturatieperiode" data-billing-cycle={billingCycle}>
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
                        <div className="currentPlanLabel">Jouw momentele plan</div>
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
                        <li><LuCheck /> Alle premium functies</li>
                        <li><LuCheck /> Bedrijfspersonalisatie</li>
                    </ul>
                    <button className="upgradePrimaryBtn" type="button">Aanvraag invullen</button>
                </article>

                <article className="upgradeCard upgradeCardBottom">
                    <h2 className="upgradeCardTitle">Basis plan</h2>
                    <p className="upgradePrice">Gratis</p>
                    <ul className="upgradeList upgradeListCompact" role="list">
                        <li><LuCheck /> Pauzesuggesties</li>
                        <li><LuCheck /> Check-ins</li>
                        <li><LuCheck /> Afsluitroutine</li>
                        <li><LuCheck /> Dagelijks rapport</li>
                    </ul>
                    {isPremium ? (
                        <button className="upgradePrimaryBtn" type="button" onClick={handleSelectBasePlan} disabled={savingPlan}>
                            {savingPlan ? "Bezig..." : "Kies dit plan"}
                        </button>
                    ) : (
                        <div className="currentPlanLabel">Jouw momentele plan</div>
                    )}
                </article>

                <article className="upgradeCard upgradeCardBottom">
                    <h2 className="upgradeCardTitle supportTitle">Toon je support op een andere manier</h2>
                    <p className="upgradeSupportText">
                        Jouw steun maakt het verschil!
                        <br />
                        Elke bijdrage, hoe klein die ook mag zijn, helpt om een betere gebruikerservaring te creëren.
                    </p>
                    <button className="upgradePrimaryBtn" type="button">
                        <IoMdHeart /> Doe een gift
                    </button>
                </article>
            </section>

            {saveMessage ? <p className="upgradeSupportText">{saveMessage}</p> : null}
        </main>
    );
}
