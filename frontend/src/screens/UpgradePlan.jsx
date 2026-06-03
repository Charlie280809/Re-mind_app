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
        btwNumber: "",
        invoiceAddress: "",
        teamSize: "",
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
            btwNumber: "",
            invoiceAddress: "",
            teamSize: "",
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
        const teamSize = companyRequestForm.teamSize;
        const btwNumber = companyRequestForm.btwNumber;
        const invoiceAddress = companyRequestForm.invoiceAddress;

        if (!companyName || !adminEmail || !teamSize || !btwNumber || !invoiceAddress) {
            setCompanyRequestMessage("Gelieve alle verplichte velden in te vullen.");
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
                <div className="requestOverlay" role="presentation" onClick={closeCompanyRequest}>
                    <div className="requestModal" role="dialog" aria-modal="true" aria-labelledby="company-request-title" onClick={(event) => event.stopPropagation()}>
                        <header className="requestHeader">
                            <h2 id="company-request-title" className="premiumModalTitle">Aanvraagformulier</h2>
                            <button className="requestCloseButton" type="button" onClick={closeCompanyRequest} aria-label="Sluiten">×</button>
                        </header>

                        <form className="companyRequestForm" onSubmit={submitCompanyRequest}>
                            <label className="companyRequestField">
                                <span>Bedrijfsnaam*</span>
                                <input
                                    type="text"
                                    value={companyRequestForm.companyName}
                                    onChange={(event) => setCompanyRequestForm((previous) => ({ ...previous, companyName: event.target.value }))}
                                    placeholder="Bv: Acme BV"
                                />
                            </label>

                            <label className="companyRequestField">
                                <span>BTW nummer*</span>
                                <input
                                    type="text"
                                    value={companyRequestForm.btwNumber}
                                    onChange={(event) => setCompanyRequestForm((previous) => ({ ...previous, btwNumber: event.target.value }))}
                                    placeholder="Bv: NL123456789B01"
                                />
                            </label>

                            <label className="companyRequestField">
                                <span>E-mail contactpersoon*</span>
                                <input
                                    type="email"
                                    value={companyRequestForm.adminEmail}
                                    onChange={(event) => setCompanyRequestForm((previous) => ({ ...previous, adminEmail: event.target.value }))}
                                />
                            </label>

                            <label className="companyRequestField">
                                <span>Factuur adres*</span>
                                <input
                                    type="text"
                                    value={companyRequestForm.invoiceAddress}
                                    onChange={(event) => setCompanyRequestForm((previous) => ({ ...previous, invoiceAddress: event.target.value }))}
                                    placeholder="Bv: Straatnaam 1, 1234 Gemeente"
                                />
                            </label>

                            <label className="companyRequestField">
                                <span>Teamgrootte*</span>
                                <input
                                    type="text"
                                    value={companyRequestForm.teamSize}
                                    onChange={(event) => setCompanyRequestForm((previous) => ({ ...previous, teamSize: event.target.value }))}
                                    placeholder="Bv: 5-10 personen"
                                />
                            </label>

                            <label className="companyRequestField">
                                <span>Bericht</span>
                                <input
                                    type="text"
                                    className="companyMessageInput"
                                    placeholder="Vertel ons meer over je behoeften"
                                />
                            </label>

                            {companyRequestMessage ? <p className="requestMessage">{companyRequestMessage}</p> : null}

                            <button className="requestSubmitButton" type="submit" disabled={companyRequestSaving}>
                                {companyRequestSaving ? "Versturen..." : "Aanvraag verzenden"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
