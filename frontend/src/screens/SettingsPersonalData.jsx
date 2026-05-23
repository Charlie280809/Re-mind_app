import "../css/settings.css";
import { useEffect, useState } from "react";
import { LuArrowLeft, LuPencil, LuUser, LuX } from "react-icons/lu";
import { supabase } from "../lib/supabaseClient";

export default function SettingsPersonalData({ onBack, profile, onProfileUpdated }) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState("");
    const [savedMessage, setSavedMessage] = useState("");
    const [profileForm, setProfileForm] = useState({ email: "", username: "", bedrijfsnaam: "" });
    const [activeField, setActiveField] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        if (!savedMessage) return undefined;
        const timeoutId = setTimeout(() => setSavedMessage(""), 5000);
        return () => clearTimeout(timeoutId);
    }, [savedMessage]);

    useEffect(() => {
        setProfileForm({
            email: profile?.email || "",
            username: profile?.username || "",
            bedrijfsnaam: profile?.bedrijfsnaam || "",
        });
        setActiveField(null);
    }, [profile]);

    const planLabel = profile?.is_premium ? "Premium plan" : "Basis plan";

    const fields = [
        { key: "email", label: "Email:", type: "email", placeholder: "Nog niet beschikbaar" },
        { key: "username", label: "Gebruikersnaam:", type: "text", placeholder: "Nog niet beschikbaar" },
        { key: "bedrijfsnaam", label: "Bedrijf:", type: "text", placeholder: "Nog niet beschikbaar" },
        { key: "plan", label: "Abonnement:", value: planLabel, readOnly: true },
    ];

    function updateProfileField(field, value) {
        setProfileForm((prev) => ({ ...prev, [field]: value }));
    }

    function startEditingField(field) {
        setActiveField(field);
    }

    function updatePasswordForm(field, value) {
        setPasswordForm((prev) => ({ ...prev, [field]: value }));
    }

    function openPasswordModal() {
        setPasswordModalOpen(true);
        setPasswordMessage("");
    }

    function closePasswordModal() {
        if (savingPassword) {
            return;
        }

        setPasswordModalOpen(false);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordMessage("");
    }

    async function handleProfileSave() {
        const nextEmail = profileForm.email.trim();
        const nextUsername = profileForm.username.trim();
        const nextCompany = profileForm.bedrijfsnaam.trim();

        if (!nextEmail || !nextUsername) {
            setSavedMessage("Email en gebruikersnaam zijn verplicht.");
            return;
        }

        setSavingProfile(true);
        setSavedMessage("");

        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            const session = sessionData?.session;

            if (sessionError || !session) {
                throw new Error(sessionError?.message || "Geen actieve sessie gevonden.");
            }

            const response = await fetch(`${apiBaseUrl}/profile/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    email: nextEmail,
                    username: nextUsername,
                    bedrijfsnaam: nextCompany,
                }),
            });

            const contentType = response.headers.get("content-type") || "";
            const payload = contentType.includes("application/json") ? await response.json() : null;

            if (!response.ok) {
                throw new Error(payload?.error || "Kon de profielgegevens niet opslaan.");
            }

            if (payload?.profile && onProfileUpdated) {
                onProfileUpdated(payload.profile);
            }

            setActiveField(null);
            setSavedMessage("Gegevens opgeslagen.");
        } catch (error) {
            console.error(error);
            setSavedMessage(error?.message || "Fout bij opslaan van de gegevens.");
        } finally {
            setSavingProfile(false);
        }
    }

    async function handlePasswordSave(event) {
        event.preventDefault();

        if (!profile?.email) {
            setPasswordMessage("E-mailadres ontbreekt. Kan wachtwoord niet wijzigen.");
            return;
        }

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordMessage("Vul alle wachtwoordvelden in.");
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMessage("Nieuwe wachtwoorden komen niet overeen.");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordMessage("Nieuw wachtwoord moet minstens 6 tekens zijn.");
            return;
        }

        setSavingPassword(true);
        setPasswordMessage("");

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: passwordForm.currentPassword,
            });

            if (signInError) {
                throw signInError;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordForm.newPassword,
            });

            if (updateError) {
                throw updateError;
            }

            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordMessage("Wachtwoord succesvol gewijzigd.");
        } catch (error) {
            console.error(error);
            setPasswordMessage(error?.message || "Fout bij wijzigen van het wachtwoord.");
        } finally {
            setSavingPassword(false);
        }
    }

    return (
        <main className="personalPage">
            <header className="settingsHeader">
                <button className="settingsBack" type="button" onClick={onBack} aria-label="Terug">
                    <LuArrowLeft />
                </button>
                <h1 className="settingsTitle">Persoonlijke gegevens</h1>
            </header>

            <section className="personalContent">
                <div className="personalAvatarRow">
                    <button className="personalAvatarButton" type="button" aria-label="Profielfoto bewerken">
                        <LuUser className="personalAvatarIcon" />
                    </button>
                    <button className="personalInlineEdit" type="button" aria-label="Profielfoto bewerken">
                        <LuPencil />
                    </button>
                </div>

                <div className="personalFields">
                    {fields.map((field) => (
                        <div key={field.key} className="personalFieldRow">
                            <div className="personalFieldLabel">{field.label}</div>
                            <div className="personalFieldValueWrap">
                                {field.key === "plan" ? (
                                    <span className="personalFieldValue">{field.value}</span>
                                ) : (
                                    <input
                                        className={`personalFieldInput ${activeField === field.key ? "active" : ""}`}
                                        type={field.type}
                                        value={profileForm[field.key]}
                                        placeholder={field.placeholder}
                                        readOnly={activeField !== field.key}
                                        aria-readonly={activeField !== field.key}
                                        onChange={(event) => updateProfileField(field.key, event.target.value)}
                                        onFocus={() => startEditingField(field.key)}
                                    />
                                )}

                                {field.key !== "plan" ? (
                                    <button
                                        className="personalInlineEdit"
                                        type="button"
                                        aria-label={`${field.label} bewerken`}
                                        onClick={() => startEditingField(field.key)}
                                    >
                                        <LuPencil />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}

                    <button className="personalPasswordChangeButton" type="button" onClick={openPasswordModal}>
                        Wachtwoord aanpassen
                    </button>
                </div>

                <button className="deleteAccountButton" type="button">
                    Verwijder account
                </button>
            </section>

            {passwordModalOpen ? (
                <div className="passwordModalOverlay" role="presentation" onClick={closePasswordModal}>
                    <div
                        className="passwordModal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="password-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header className="passwordModalHeader">
                            <h2 id="password-modal-title" className="passwordModalTitle">
                                Wachtwoord aanpassen
                            </h2>
                            <button className="passwordModalCloseButton" type="button" onClick={closePasswordModal} aria-label="Sluiten">
                                <LuX />
                            </button>
                        </header>

                        <div className={`passwordMessage ${passwordMessage ? "visible" : ""}`}>{passwordMessage}</div>

                        <form className="passwordModalForm" onSubmit={handlePasswordSave}>
                            <label className="passwordModalField">
                                <span>Vul je huidig wachtwoord in</span>
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    value={passwordForm.currentPassword}
                                    onChange={(event) => updatePasswordForm("currentPassword", event.target.value)}
                                    placeholder="Huidig wachtwoord"
                                    disabled={savingPassword}
                                />
                                <a className="passwordForgotLink" href="#">
                                    Wachtwoord vergeten?
                                </a>
                            </label>

                            <label className="passwordModalField">
                                <span>Nieuw wachtwoord</span>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={passwordForm.newPassword}
                                    onChange={(event) => updatePasswordForm("newPassword", event.target.value)}
                                    placeholder="Nieuw wachtwoord"
                                    disabled={savingPassword}
                                />
                            </label>

                            <label className="passwordModalField">
                                <span>Bevestig nieuw wachtwoord</span>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(event) => updatePasswordForm("confirmPassword", event.target.value)}
                                    placeholder="Nieuw wachtwoord"
                                    disabled={savingPassword}
                                />
                            </label>

                            <button className="passwordModalSubmitButton" type="submit" disabled={savingPassword}>
                                {savingPassword ? "Opslaan..." : "Opslaan"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : null}

            <button className="saveButton personalSaveButton" type="button" onClick={handleProfileSave} disabled={savingProfile}>
                {savingProfile ? "Opslaan..." : "Opslaan"}
            </button>

            <div className={`savedMessage ${savedMessage ? "visible" : ""}`}>{savedMessage}</div>
        </main>
    );
}