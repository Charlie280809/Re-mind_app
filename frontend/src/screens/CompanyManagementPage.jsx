import { useEffect, useMemo, useState } from "react";
import { LuArrowLeft, LuBuilding2, LuCheck, LuPlus, LuSave, LuTrash2, LuUsers } from "react-icons/lu";
import "../css/CompanyManagementPage.css";
import { addCompanyMember, loadCompanyManagement, removeCompanyMember, updateCompany } from "../api/companyApi";

const COMPANY_THEME_OPTIONS = [
  {
    id: "sage",
    name: "Re-Mind",
    description: "Zachte, rustige standaardstijl",
    preview: ["#fffcf5", "#769382", "#596e62", "#e4ebe6"],
    vars: {
      background: "#fffcf5",
      backgroundDark: "#f4edd9",
      text: "#1a1a1a",
      textLight: "#414141",
      border: "#c0c3b8",
      primaryDark: "#596e62",
      primary: "#769382",
      highlightDark: "#7e8f83",
      highlight: "#a8bfaf",
      highlightLight: "#e4ebe6",
      highlightHover: "#f2f5f3",
      success: "#6baf8e",
      warning: "#e3cb91",
      warningLight: "#f6efdd",
      error: "#da8383",
      errorDark: "#a46262",
      info: "#8cb2c8",
    },
  },
  {
    id: "slate",
    name: "Slate",
    description: "Koel, zakelijk en helder",
    preview: ["#f7f8fb", "#5f7398", "#2f3e58", "#dbe3f1"],
    vars: {
      background: "#f7f8fb",
      backgroundDark: "#e9eef7",
      text: "#162033",
      textLight: "#4a5870",
      border: "#c5cfdf",
      primaryDark: "#2f3e58",
      primary: "#5f7398",
      highlightDark: "#7286ab",
      highlight: "#96a8c4",
      highlightLight: "#dbe3f1",
      highlightHover: "#eef2f8",
      success: "#5f9f88",
      warning: "#d7b97f",
      warningLight: "#f6efd9",
      error: "#d06f6f",
      errorDark: "#9f4f4f",
      info: "#7ea9c6",
    },
  },
];

const DEFAULT_THEME_ID = "sage";

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
        setMemberMessage("Werknemer staat op pending tot die zich aanmeldt.");
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
        <div>
          <h1 className="companyManagementTitle">Bedrijfsbeheer</h1>
          <p className="companyManagementSubtitle">Beheer je bedrijf, werknemers en kleuren vanuit één plek.</p>
        </div>
      </header>

      {errorMessage ? <p className="companyManagementAlert">{errorMessage}</p> : null}

      <div className="companyManagementGrid">
        <section className="companyManagementCard">
          <div className="companyManagementCardHeader">
            <div>
              <h2 className="companyManagementCardTitle"><LuBuilding2 /> Bedrijfsgegevens</h2>
              <p className="companyManagementCardCopy">{company?.admin_email || profile?.email}</p>
            </div>
          </div>

          <form className="companyManagementForm" onSubmit={saveCompany}>
            <label className="companyManagementField">
              <span>Bedrijfsnaam</span>
              <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Bijvoorbeeld: Acme BV" />
            </label>

            <label className="companyManagementField">
              <span>Admin e-mail</span>
              <input value={profile?.email || ""} readOnly />
            </label>

            <div className="companyManagementThemeList" role="list" aria-label="Bedrijfsthema's">
              {COMPANY_THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`companyManagementThemeCard${themeId === theme.id ? " companyManagementThemeCard--active" : ""}`}
                  onClick={() => setThemeId(theme.id)}
                >
                  <span className="companyManagementThemeCard__title">{theme.name}</span>
                  <span className="companyManagementThemeCard__copy">{theme.description}</span>
                  <span className="companyManagementThemePreview" aria-hidden="true">
                    {theme.preview.map((color) => (
                      <span key={color} style={{ background: color }} />
                    ))}
                  </span>
                </button>
              ))}
            </div>

            <button className="companyManagementPrimaryBtn" type="submit" disabled={savingCompany}>
              <LuSave />
              {savingCompany ? "Opslaan..." : "Bedrijf opslaan"}
            </button>
          </form>
        </section>

        <section className="companyManagementCard">
          <div className="companyManagementCardHeader">
            <div>
              <h2 className="companyManagementCardTitle"><LuUsers /> Werknemers</h2>
              <p className="companyManagementCardCopy">Voeg werknemers toe of verwijder ze meteen uit je licentie.</p>
            </div>
          </div>

          <form className="companyManagementInlineForm" onSubmit={handleAddMember}>
            <input
              value={memberEmail}
              onChange={(event) => setMemberEmail(event.target.value)}
              type="email"
              placeholder="werknemer@bedrijf.be"
            />
            <button className="companyManagementPrimaryBtn" type="submit" disabled={savingMember}>
              <LuPlus />
              {savingMember ? "Toevoegen..." : "Toevoegen"}
            </button>
          </form>

          {memberMessage ? <p className="companyManagementNotice">{memberMessage}</p> : null}

          <div className="companyManagementMemberList">
            {loading ? (
              <p className="companyManagementEmptyState">Bedrijfsgegevens laden...</p>
            ) : members.length ? (
              members.map((member) => (
                <article key={member.user_id} className="companyManagementMemberCard">
                  <div>
                    <h3>{member.username || member.email}</h3>
                    <p>{member.email}</p>
                    <span className="companyManagementBadge">{member.company_role === "admin" ? "Admin" : "Werknemer"}</span>
                  </div>

                  {member.email?.toLowerCase() !== profile?.email?.toLowerCase() ? (
                    <button
                      className="companyManagementDangerBtn"
                      type="button"
                      onClick={() => handleRemoveMember(member.email)}
                      disabled={memberActionTarget === member.email}
                    >
                      <LuTrash2 />
                      Verwijderen
                    </button>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="companyManagementEmptyState">Nog geen werknemers toegevoegd.</p>
            )}
          </div>

          <h3 className="companyManagementSubheading">Pending uitnodigingen</h3>
          <div className="companyManagementMemberList">
            {pendingMembers.length ? (
              pendingMembers.map((member) => (
                <article key={member.id} className="companyManagementMemberCard companyManagementMemberCard--pending">
                  <div>
                    <h3>{member.email}</h3>
                    <p>Wacht tot deze gebruiker zich aanmeldt</p>
                  </div>

                  <button className="companyManagementDangerBtn" type="button" onClick={() => handleRemoveMember(member.email)}>
                    <LuTrash2 />
                    Verwijderen
                  </button>
                </article>
              ))
            ) : (
              <p className="companyManagementEmptyState">Geen pending uitnodigingen.</p>
            )}
          </div>
        </section>
      </div>

      <section className="companyManagementCard companyManagementCard--footer">
        <div className="companyManagementCardHeader">
          <div>
            <h2 className="companyManagementCardTitle"><LuCheck /> Thema preview</h2>
            <p className="companyManagementCardCopy">Het gekozen thema wordt opgeslagen op het company-record.</p>
          </div>
        </div>

        <div className="companyManagementThemePreviewRow">
          {currentTheme.preview.map((color) => (
            <span key={color} style={{ background: color }} />
          ))}
        </div>
      </section>
    </main>
  );
}