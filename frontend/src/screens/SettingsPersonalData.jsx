import "../css/settings.css";
import { useEffect, useState } from "react";
import { LuArrowLeft, LuPencil, LuUser } from "react-icons/lu";
import { supabase } from "../lib/supabaseClient";

export default function SettingsPersonalData({ onBack, profile }) {
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState("");
    const [savedMessage, setSavedMessage] = useState("");

    useEffect(() => {
        if (!savedMessage) return undefined;
        const timeoutId = setTimeout(() => setSavedMessage(""), 5000);
        return () => clearTimeout(timeoutId);
    }, [savedMessage]);

    const planLabel = profile?.is_premium ? "Premium plan" : "Basis plan";

    const fields = [
        { key: "email", label: "Email:", value: profile?.email || "Nog niet beschikbaar" },
        { key: "username", label: "Gebruikersnaam:", value: profile?.username || "Nog niet beschikbaar" },
        { key: "company", label: "Bedrijf:", value: profile?.bedrijfsnaam || "Nog niet beschikbaar" },
        { key: "plan", label: "Plan:", value: planLabel },
    ];

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
                                <span className="personalFieldValue">{field.value}</span>
                                <button className="personalInlineEdit" type="button" aria-label={`${field.label} bewerken`}>
                                    <LuPencil />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="personalPasswordRow">
                    <div className="personalFieldRow">
                        <div className="personalFieldLabel">Wachtwoord:</div>
                        <div className="personalFieldValueWrap">
                            <span className="personalFieldValue">****************</span>
                            <span className="personalPasswordNote">Niet zichtbaar vanuit Supabase</span>
                        </div>
                    </div>

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
                                ×
                            </button>
                        </header>

                        <form className="passwordModalForm" onSubmit={handlePasswordSave}>
                            <label className="passwordModalField">
                                <span>Vul je huidige wachtwoord in</span>
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    value={passwordForm.currentPassword}
                                    onChange={(event) => updatePasswordForm("currentPassword", event.target.value)}
                                    placeholder="Wachtwoord"
                                    disabled={savingPassword}
                                />
                            </label>

                            <a className="passwordForgotLink" href="#">
                                Wachtwoord vergeten?
                            </a>

                            <label className="passwordModalField">
                                <span>Nieuw wachtwoord</span>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={passwordForm.newPassword}
                                    onChange={(event) => updatePasswordForm("newPassword", event.target.value)}
                                    placeholder="Wachtwoord"
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
                                    placeholder="Wachtwoord"
                                    disabled={savingPassword}
                                />
                            </label>

                            <div className={`passwordMessage ${passwordMessage ? "visible" : ""}`}>{passwordMessage}</div>

                            <button className="passwordModalSubmitButton" type="submit" disabled={savingPassword}>
                                {savingPassword ? "Opslaan..." : "Opslaan"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : null}

            <div className={`savedMessage ${savedMessage ? "visible" : ""}`}>{savedMessage}</div>
        </main>
    );
}