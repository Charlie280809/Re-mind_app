import { useEffect, useMemo, useState } from "react";
import { LuArrowLeft, LuCheck, LuPlus } from "react-icons/lu";
import "../css/CompanyManagementPage.css";
import { addCompanyMember, loadCompanyManagement, removeCompanyMember, updateCompany } from "../api/companyApi";
import SmallLoader from "../components/SmallLoader";

const COMPANY_THEME_OPTIONS = [
    {
        id: "standard",
        name: "Re:Mind (standaardthema)",
        preview: ["#fffcf5", "#769382", "#a8bfaf", "#f4edd9"],
        vars: {
            background: "#fffcf5",
            backgroundCard: "#f4edd9",
            text: "#1a1a1a",
            border: "#c0c3b8",
            primary: "#769382",
            highlight: "#a8bfaf",
            highlightHover: "#f2f5f3",
            success: "#6baf8e",
            warning: "#e3cb91",
            error: "#da8383",
            info: "#8cb2c8",
        },
    },
    {
        id: "slate",
        name: "Slate",
        preview: ["#f7f8fb", "#5f7398", "#96a8c4", "#d6dbeb"],
        vars: {
            background: "#f7f8fb",
            backgroundCard: "#d6dbeb",
            text: "#162033",
            border: "#c5cfdf",
            primary: "#5f7398",
            highlight: "#96a8c4",
            highlightHover: "#eef2f8",
            success: "#5f9f88",
            warning: "#d7b97f",
            error: "#d06f6f",
            info: "#7ea9c6",
        },
    },
    {
        id: "soft",
        name: "Soft",
        preview: ["#FCF0EE", "#B3D0BE", "#F1EAD8", "#CDE0EA"],
        vars: {
            background: "#FCF0EE",
            backgroundCard: "#CDE0EA",
            text: "#151819",
            border: "#AFA792",
            primary: "#B3D0BE",
            highlight: "#F1EAD8",
            highlightHover: "#DCD7C7",
            success: "#89D289",
            warning: "#E4C47D",
            error: "#D0666F",
            info: "#5D90E2",
        },
    },
];

const DEFAULT_THEME_ID = "standard";

function getThemeById(themeId) {
    return COMPANY_THEME_OPTIONS.find((theme) => theme.id === themeId) || COMPANY_THEME_OPTIONS[0];
}

export default function CompanyManagementPage({ profile, accessToken, onBack }) {
    const [company, setCompany] = useState(null);
    const [members, setMembers] = useState([]);
    const [pendingMembers, setPendingMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
    const [savingCompany, setSavingCompany] = useState(false);
    const [memberEmail, setMemberEmail] = useState("");
    const [savingMember, setSavingMember] = useState(false);
    const [memberMessage, setMemberMessage] = useState("");
    const [memberActionTarget, setMemberActionTarget] = useState("");

    const isAdmin = profile?.company_role === "admin";
    const currentTheme = useMemo(() => getThemeById(themeId), [themeId]);
    const companyPeople = useMemo(() => {
        const activeMembers = members.map((member) => ({
            ...member,
            id: member.user_id || member.email,
            statusLabel: member.company_role === "admin" ? "Admin" : "Werknemer",
            isPending: false,
        }));

        const waitingMembers = pendingMembers.map((member) => ({
            ...member,
            id: member.id || member.email,
            statusLabel: "In behandeling",
            isPending: true,
        }));

        return [...activeMembers, ...waitingMembers];
    }, [members, pendingMembers]);

    useEffect(() => {
        if (!memberMessage) return;
        const timer = setTimeout(() => setMemberMessage(""), 5000);
        return () => clearTimeout(timer);
    }, [memberMessage]);

    useEffect(() => {
        let cancelled = false;

        const loadCompany = async () => {
        if (!accessToken) {
            setLoading(false);
            setErrorMessage("Geen geldige sessie gevonden.");
            return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
            const payload = await loadCompanyManagement(accessToken);

            if (cancelled) {
            return;
            }

            setCompany(payload.company || null);
            setMembers(Array.isArray(payload.members) ? payload.members : []);
            setPendingMembers(Array.isArray(payload.pending_members) ? payload.pending_members : []);
            setCompanyName(payload.company?.name || "");

            const storedThemeId = payload.company?.theme?.id;
            setThemeId(storedThemeId && getThemeById(storedThemeId) ? storedThemeId : DEFAULT_THEME_ID);
        } catch (err) {
            if (!cancelled) {
            setErrorMessage(err?.message || "Bedrijfsbeheer kon niet geladen worden.");
            }
        } finally {
            if (!cancelled) {
            setLoading(false);
            }
        }
        };

        loadCompany();

        return () => {
        cancelled = true;
        };
    }, [accessToken]);

    async function saveCompany(event) {
        event.preventDefault();

        if (!companyName.trim()) {
        setErrorMessage("Geef een bedrijfsnaam in.");
        return;
        }

        setSavingCompany(true);
        setErrorMessage("");

        try {
        const payload = await updateCompany(accessToken, {
            company_name: companyName.trim(),
            theme: currentTheme,
        });

        setCompany(payload.company || company);
        } catch (err) {
        setErrorMessage(err?.message || "Bedrijfsgegevens konden niet opgeslagen worden.");
        } finally {
        setSavingCompany(false);
        }
    }

    async function handleAddMember(event) {
        event.preventDefault();

        const email = memberEmail.trim();
        if (!email) {
        setMemberMessage("Geef een e-mailadres in.");
        return;
        }

        setSavingMember(true);
        setMemberMessage("");

        try {
        const payload = await addCompanyMember(accessToken, email);

        if (payload?.pending) {
            setPendingMembers((previous) => [
            ...previous,
            {
                id: `pending-${email}`,
                email,
                role: "member",
                created_at: new Date().toISOString(),
            },
            ]);
            setMemberMessage("Werknemer toegevoegd en in afwachting van goedkeuring.");
        } else if (payload?.member) {
            setMembers((previous) => {
            const next = previous.filter((item) => item.email?.toLowerCase() !== email.toLowerCase());
            return [payload.member, ...next];
            });
            setMemberMessage("Werknemer toegevoegd aan het bedrijf.");
        }

        setMemberEmail("");
        } catch (err) {
        setMemberMessage(err?.message || "Werknemer kon niet toegevoegd worden.");
        } finally {
        setSavingMember(false);
        }
    }

    async function handleRemoveMember(email) {
        if (!email) {
        return;
        }

        setMemberActionTarget(email);

        try {
        await removeCompanyMember(accessToken, email);
        setMembers((previous) => previous.filter((item) => item.email?.toLowerCase() !== email.toLowerCase()));
        setPendingMembers((previous) => previous.filter((item) => item.email?.toLowerCase() !== email.toLowerCase()));
        setMemberMessage("Werknemer verwijderd.");
        } catch (err) {
        setMemberMessage(err?.message || "Werknemer kon niet verwijderd worden.");
        } finally {
        setMemberActionTarget("");
        }
    }

    if (loading) {
        return (
            <main className="companyManagementPage">
                <header className="companyManagementHeader">
                    <button className="companyManagementBack" type="button" onClick={onBack} aria-label="Terug">
                        <LuArrowLeft />
                    </button>
                    <h1 className="companyManagementTitle">Bedrijfsbeheer</h1>
                </header>
                <section className="companyManagementCard">
                    <SmallLoader message="Bedrijfsgegevens worden geladen." />
                </section>
            </main>
        );
    }

    if (!isAdmin) {
        return (
        <main className="companyManagementPage">
            <header className="companyManagementHeader">
                <button className="companyManagementBack" type="button" onClick={onBack} aria-label="Terug">
                    <LuArrowLeft />
                </button>
                <h1 className="companyManagementTitle">Bedrijfsbeheer</h1>
            </header>

            <section className="companyManagementCard">
            <p>Alleen de admin van een bedrijfslicentie heeft toegang tot deze pagina.</p>
            </section>
        </main>
        );
    }

    return (
        <main className="companyManagementPage">
        <header className="companyManagementHeader">
            <button className="companyManagementBack" type="button" onClick={onBack} aria-label="Terug">
                <LuArrowLeft />
            </button>
            <h1 className="companyManagementTitle">Bedrijfsbeheer</h1>
        </header>

        {errorMessage ? <p className="companyManagementAlert">{errorMessage}</p> : null}

        <div className="companyManagementGrid">
            <section className="companyManagementCard">
            <div className="companyManagementCardHeader">
                <div>
                    <h2 className="companyManagementCardTitle">Bedrijfsgegevens</h2>
                </div>
            </div>

            <form className="companyManagementForm" onSubmit={saveCompany}>
                <div className="companyManagementFields">
                    <label className="companyManagementField">
                        <span>Bedrijfsnaam</span>
                        <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Bijvoorbeeld: Acme BV" />
                    </label>

                    <label className="companyManagementField">
                        <span>Admin e-mail</span>
                        <input value={profile?.email || ""} readOnly />
                    </label>
                </div>

                <div className="companyManagementThemeSelection">
                    <span>Thema:</span>
                    <div className="companyManagementThemeList" role="list" aria-label="Bedrijfsthema's">
                        {COMPANY_THEME_OPTIONS.map((theme) => (
                            <button
                                key={theme.id}
                                type="button"
                                className={`companyManagementThemeCard${themeId === theme.id ? " companyManagementThemeCard--active" : ""}`}
                                onClick={() => setThemeId(theme.id)}
                                >
                                <span className="companyManagementThemeCard__title">{theme.name}</span>
                                <span className="companyManagementThemePreview" aria-hidden="true">
                                    {theme.preview.map((color) => (
                                        <span key={color} style={{ background: color }} />
                                    ))}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <button className="companyManagementSaveBtn" type="submit" disabled={savingCompany}>
                    {savingCompany ? "Bezig..." : "Opslaan"}
                </button>
            </form>
            </section>

            <section className="companyManagementCard">
            <div className="companyManagementCardHeader">
                <h2 className="companyManagementCardTitle">Werknemers</h2>
            </div>

            {memberMessage ? <p className="companyManagementNotice">{memberMessage}</p> : null}

            <form className="companyManagementInlineForm" onSubmit={handleAddMember}>
                <input
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    type="email"
                    placeholder="werknemer@bedrijf.be"
                />
                <button className="companyManagementAddBtn" type="submit" disabled={savingMember}>
                    {savingMember ? "Bezig..." : "Toevoegen"}
                </button>
            </form>

            <div className="companyManagementMemberList">
                {companyPeople.length ? (
                companyPeople.map((member) => (
                    <article
                        key={member.id}
                        className={`companyManagementMemberCard${member.isPending ? "companyManagementMemberCard--pending" : ""}`}
                    >
                        <div>
                            <h3>{member.username || member.email}</h3>
                            <p>{member.email}</p>
                        </div>
                        <div className="companyManagementMemberActions">
                            <span className="companyManagementBadge">{member.statusLabel}</span>
                            {member.email?.toLowerCase() !== profile?.email?.toLowerCase() ? (
                                <button
                                    className="companyManagementDangerBtn"
                                    type="button"
                                    onClick={() => handleRemoveMember(member.email)}
                                    disabled={memberActionTarget === member.email}
                                >
                                    Verwijderen
                                </button>
                            ) : null}
                        </div>
                    </article>
                ))
                ) : (
                <p className="companyManagementEmptyState">Nog geen werknemers toegevoegd.</p>
                )}
            </div>
            </section>
        </div>
        </main>
    );
}