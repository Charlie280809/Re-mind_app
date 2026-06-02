import "../css/upgradePlan.css";
import { LuArrowLeft, LuCheck } from "react-icons/lu";
import { IoMdHeart } from "react-icons/io";
import { TbCrown } from "react-icons/tb";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { setPremiumStatus } from "../api/profileApi";
import { hasPremiumAccess } from "../lib/access";
import { requestCompany } from "../api/companyApi";

export default function SettingsUpgrade({ profile, isPremium, onProfileUpdated, onNavigateToCompanyManagement, onBack }) {
    const [billingCycle, setBillingCycle] = useState("monthly");
    const [savingPlan, setSavingPlan] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [companyRequestOpen, setCompanyRequestOpen] = useState(false);
    const [companyRequestSaving, setCompanyRequestSaving] = useState(false);
    const [companyRequestMessage, setCompanyRequestMessage] = useState("");
    const [companyRequestForm, setCompanyRequestForm] = useState({
        companyName: "",
        adminEmail: profile?.email || "",
    });

    const premiumPrice = billingCycle === "monthly" ? "€2,99/maand" : "€33/jaar";
    const companyPrice = billingCycle === "monthly" ? "€2,20/maand" : "€20/jaar";
    const hasCompanyLicense = Boolean(profile?.company_id);

    const handleSelectBasePlan = async () => {
        setSavingPlan(true);
        setSaveMessage("");

        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            const session = sessionData?.session;

            if (sessionError || !session) {
                throw new Error(sessionError?.message || "Geen actieve sessie gevonden.");
            }

            const payload = await setPremiumStatus(session.access_token, false);

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

    const openCompanyRequest = () => {
        setCompanyRequestMessage("");
        setCompanyRequestForm({
            companyName: profile?.bedrijfsnaam ? `${profile.bedrijfsnaam} BV` : "",
            adminEmail: profile?.email || "",
        });
        setCompanyRequestOpen(true);
    };

    const closeCompanyRequest = () => {
        if (companyRequestSaving) {
            return;
        }

        setCompanyRequestOpen(false);
        setCompanyRequestMessage("");
    };

    const submitCompanyRequest = async (event) => {
        event.preventDefault();

        const companyName = companyRequestForm.companyName.trim();
        const adminEmail = companyRequestForm.adminEmail.trim().toLowerCase();

        if (!companyName || !adminEmail) {
            setCompanyRequestMessage("Vul bedrijfsnaam en admin e-mail in.");
            return;
        }

        setCompanyRequestSaving(true);
        setCompanyRequestMessage("");

        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            const session = sessionData?.session;

            if (sessionError || !session) {
                throw new Error(sessionError?.message || "Geen actieve sessie gevonden.");
            }

            const payload = await requestCompany(session.access_token, {
                company_name: companyName,
                admin_email: adminEmail,
                theme: { id: "sage" },
            });

            if (payload?.profile && onProfileUpdated) {
                onProfileUpdated(payload.profile);
            }

            setCompanyRequestOpen(false);
            setCompanyRequestMessage("Bedrijfslicentie aangemaakt.");

            if (onNavigateToCompanyManagement) {
                onNavigateToCompanyManagement();
            }
        } catch (error) {
            console.error(error);
            setCompanyRequestMessage(error?.message || "Bedrijfsaanvraag kon niet worden verzonden.");
        } finally {
            setCompanyRequestSaving(false);
        }
    };

    return (
        <main className="upgradePage">
            <header className="upgradeHeader">
                <button className="settingsBack" type="button" aria-label="Terug" onClick={() => onBack?.()}>
                    <LuArrowLeft />
                </button>

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
                        <li><LuCheck /> Vorige dagrapporten</li>
                        <li><LuCheck /> Wekelijkse rapporten</li>
                    </ul>
                    {hasPremiumAccess({ is_premium: isPremium }) && !hasCompanyLicense ? (
                        <div className="currentPlanLabel">Jouw momentele plan</div>
                    ) : !hasPremiumAccess({ is_premium: isPremium }) && !hasCompanyLicense ? (
                        <button className="upgradePrimaryBtn" type="button">Upgraden</button>
                    ) : null}
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
                    {hasCompanyLicense ? (
                        <div className="currentPlanLabel">Jouw momentele plan</div>
                    ) : (
                        <button className="upgradePrimaryBtn" type="button" onClick={openCompanyRequest}>
                            Aanvraag invullen
                        </button>
                    )}
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
                    {hasCompanyLicense ? null : hasPremiumAccess({ is_premium: isPremium }) ? (
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

            {companyRequestOpen ? (
                <div className="premiumCardOverlay" role="presentation" onClick={closeCompanyRequest}>
                    <div className="premiumModal" role="dialog" aria-modal="true" aria-labelledby="company-request-title" onClick={(event) => event.stopPropagation()}>
                        <header className="premiumModalHeader">
                            <h2 id="company-request-title" className="premiumModalTitle">Bedrijfsaanvraag</h2>
                            <button className="premiumModalCloseButton" type="button" onClick={closeCompanyRequest} aria-label="Sluiten">×</button>
                        </header>

                        <p className="premiumModalMessage">Vul de basisgegevens in. Na bevestiging wordt jouw account de admin van het bedrijf.</p>

                        <form className="companyRequestForm" onSubmit={submitCompanyRequest}>
                            <label className="companyRequestField">
                                <span>Bedrijfsnaam</span>
                                <input
                                    type="text"
                                    value={companyRequestForm.companyName}
                                    onChange={(event) => setCompanyRequestForm((previous) => ({ ...previous, companyName: event.target.value }))}
                                    placeholder="Bijvoorbeeld: Acme BV"
                                />
                            </label>

                            <label className="companyRequestField">
                                <span>Admin e-mail</span>
                                <input
                                    type="email"
                                    value={companyRequestForm.adminEmail}
                                    onChange={(event) => setCompanyRequestForm((previous) => ({ ...previous, adminEmail: event.target.value }))}
                                />
                            </label>

                            {companyRequestMessage ? <p className="premiumModalMessage">{companyRequestMessage}</p> : null}

                            <div className="companyRequestActions">
                                <button className="upgradePrimaryBtn" type="submit" disabled={companyRequestSaving}>
                                    {companyRequestSaving ? "Versturen..." : "Bedrijf aanmaken"}
                                </button>
                                <button className="companyRequestSecondaryBtn" type="button" onClick={closeCompanyRequest} disabled={companyRequestSaving}>
                                    Annuleer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
