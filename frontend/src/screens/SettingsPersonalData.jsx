import "../css/settings.css";
import { useEffect, useRef, useState } from "react";
import { LuArrowLeft, LuPencil, LuUser, LuX, LuEye, LuEyeOff } from "react-icons/lu";
import { supabase } from "../lib/supabaseClient";
import PremiumModal from "../components/PremiumModal";
import DeleteConfirmationModal from "../components/deleteConfirmationModal";
import { deleteAccount, updateProfile } from "../api/profileApi";
import { getPlanLabel, hasPremiumAccess } from "../lib/access";

const AVATAR_BUCKET = "profile_avatars";

async function uploadAvatarToStorage(userId, file) {
    const fileExtension = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const filePath = `${userId}/${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, {
        upsert: true,
        contentType: file.type,
    });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

    return data.publicUrl;
}

export default function SettingsPersonalData({ onBack, profile, onProfileUpdated, onNavigateToUpgrade, onLogout }) {
    const fileRef = useRef(null);
    const isPremium = hasPremiumAccess(profile);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [premiumModalOpen, setPremiumModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState("");
    const [passwordVisibility, setPasswordVisibility] = useState({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
    });
    const [savedMessage, setSavedMessage] = useState("");
    const [profileForm, setProfileForm] = useState({ email: "", username: "", bedrijfsnaam: "", avatarUrl: "" });
    const [avatarFile, setAvatarFile] = useState(null);
    const [activeField, setActiveField] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

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
            avatarUrl: profile?.avatar_url || "",
        });
        setAvatarFile(null);
        setActiveField(null);
    }, [profile]);

    const planLabel = getPlanLabel(profile);

    const fields = [
        { key: "email", label: "Email:", type: "email", placeholder: "Vul je email in" },
        { key: "username", label: "Naam:", type: "text", placeholder: "Vul je naam in" },
        { key: "bedrijfsnaam", label: "Bedrijf:", type: "text", placeholder: "Vul je bedrijfsnaam in" },
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

    function togglePasswordVisibility(field) {
        setPasswordVisibility((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    }

    function openAvatarPicker() {
        if (!isPremium) {
            setPremiumModalOpen(true);
            return;
        }

        fileRef.current?.click();
    }

    function closePremiumModal() {
        setPremiumModalOpen(false);
    }

    function openDeleteConfirmation() {
        setDeleteConfirmationOpen(true);
    }

    function closeDeleteConfirmation() {
        setDeleteConfirmationOpen(false);
    }

    async function handleDeleteAccountConfirm() {
        setDeleteConfirmationOpen(false);

        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            const session = sessionData?.session;

            if (sessionError || !session) {
                throw new Error(sessionError?.message || "Geen actieve sessie gevonden.");
            }

            await deleteAccount(session.access_token);

            if (onLogout) {
                await onLogout();
                return;
            }

            await supabase.auth.signOut();
        } catch (error) {
            console.error(error);
            setSavedMessage(error?.message || "Fout bij verwijderen van het account.");
        }
    }

    function handleAvatarFileChange(event) {
        const nextFile = event.target.files?.[0];

        if (!nextFile) {
            return;
        }

        if (!isPremium) {
            setPremiumModalOpen(true);
            event.target.value = "";
            return;
        }

        if (!nextFile.type.startsWith("image/")) {
            setSavedMessage("Kies een afbeeldingsbestand.");
            event.target.value = "";
            return;
        }

        const previewUrl = URL.createObjectURL(nextFile);

        setProfileForm((prev) => {
            if (prev.avatarUrl?.startsWith("blob:")) {
                URL.revokeObjectURL(prev.avatarUrl);
            }

            return {
                ...prev,
                avatarUrl: previewUrl,
            };
        });
        setAvatarFile(nextFile);
        event.target.value = "";
    }

    function openPasswordModal() {
        setPasswordModalOpen(true);
        setPasswordMessage("");
        setPasswordVisibility({
            currentPassword: false,
            newPassword: false,
            confirmPassword: false,
        });
    }

    function closePasswordModal() {
        if (savingPassword) {
            return;
        }

        setPasswordModalOpen(false);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordMessage("");
        setPasswordVisibility({
            currentPassword: false,
            newPassword: false,
            confirmPassword: false,
        });
    }

    async function handleSendResetEmail(event) {
        event && event.preventDefault();

        if (!profile?.email) {
            setPasswordMessage("E-mailadres ontbreekt. Vul je e-mailadres in om een resetlink te ontvangen.");
            return;
        }

        setPasswordMessage("");

        try {
            const redirectUrl = typeof window !== "undefined" ? new URL(window.location.href) : null;

            if (redirectUrl) {
                redirectUrl.searchParams.set("auth", "recovery");
                redirectUrl.hash = "";
            }

            const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
                redirectTo: redirectUrl?.toString() || (typeof window !== "undefined" ? window.location.origin : ""),
            });

            if (error) throw error;

            setPasswordMessage("Een e-mail om je wachtwoord te resetten is verzonden.");
        } catch (err) {
            console.error(err);
            setPasswordMessage(err?.message || "Fout bij verzenden van reset e-mail.");
        }
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

            let nextAvatarUrl = profile?.avatar_url || null;

            if (avatarFile) {
                nextAvatarUrl = await uploadAvatarToStorage(session.user.id, avatarFile);
            }

            const payload = await updateProfile(session.access_token, {
                email: nextEmail,
                username: nextUsername,
                bedrijfsnaam: nextCompany,
                avatar_url: isPremium ? nextAvatarUrl : undefined,
            });

            if (payload?.profile && onProfileUpdated) {
                onProfileUpdated({
                    ...payload.profile,
                    avatar_url: payload.profile.avatar_url || nextAvatarUrl || profileForm.avatarUrl || profile?.avatar_url || "",
                });
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
            setPasswordMessage("❗Vul alle wachtwoordvelden in.");
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMessage("❗Nieuwe wachtwoorden komen niet overeen.");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordMessage("❗Nieuw wachtwoord moet minstens 6 tekens zijn.");
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
            setPasswordModalOpen(false);
            setPasswordMessage("");
            setSavedMessage("Wachtwoord succesvol gewijzigd.");
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
                    <button className="personalAvatarButton" type="button" aria-label="Profielfoto bewerken" onClick={openAvatarPicker}>
                        {profileForm.avatarUrl ? (
                            <img className="personalAvatarImage" src={profileForm.avatarUrl} alt="Geselecteerde profielfoto" />
                        ) : (
                            <LuUser className="personalAvatarIcon" />
                        )}
                    </button>
                    <button className="personalInlineEdit" type="button" aria-label="Profielfoto bewerken" onClick={openAvatarPicker}>
                        <LuPencil />
                    </button>
                    <input
                        ref={fileRef}
                        onChange={handleAvatarFileChange}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                    />
                </div>

                {premiumModalOpen ? (
                    <PremiumModal
                        title="Ontgrendel profielfoto"
                        description="Upgrade naar Premium om een profielfoto te kunnen uploaden/aanpassen."
                        onClose={closePremiumModal}
                        onUpgrade={onNavigateToUpgrade}
                    />
                ) : null}

                <div className="personalFields">
                    {fields.map((field) => (
                        <div key={field.key} className="personalFieldRow">
                            <div className="personalFieldLabel">{field.label}</div>
                            <div className="personalFieldValueWrap">
                                {field.key === "plan" ? (
                                    <span className="personalFieldValue">{field.value}</span>
                                ) : (
                                    <div className="personalFieldInputWrap">
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

                                        <span
                                            className="personalInlineEdit personalInlineEditInside"
                                            aria-hidden="true"
                                        >
                                            <LuPencil />
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <button className="personalPasswordChangeButton" type="button" onClick={openPasswordModal}>
                        Wachtwoord aanpassen
                        <LuPencil className="personalPasswordChangeIcon" />
                    </button>
                </div>

                <button className="deleteAccountButton" type="button" onClick={openDeleteConfirmation}>
                    Verwijder account
                </button> {/* moet alle data, inclusief profielgegevens, verwijderen en dus ook uitloggen */}
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
                                <div className="passwordInputWrap">
                                    <input
                                        type={passwordVisibility.currentPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        value={passwordForm.currentPassword}
                                        onChange={(event) => updatePasswordForm("currentPassword", event.target.value)}
                                        placeholder="Huidig wachtwoord"
                                        disabled={savingPassword}
                                    />
                                    <button
                                        className="passwordVisibilityButton"
                                        type="button"
                                        onClick={() => togglePasswordVisibility("currentPassword")}
                                        aria-label={passwordVisibility.currentPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                                        disabled={savingPassword}
                                    >
                                        {passwordVisibility.currentPassword ? <LuEye /> : <LuEyeOff />}
                                    </button>
                                </div>
                                <a
                                    className="passwordForgotLink"
                                    href="#"
                                    onClick={handleSendResetEmail}
                                >
                                    Wachtwoord vergeten?
                                </a>
                            </label>

                            <label className="passwordModalField">
                                <span>Nieuw wachtwoord</span>
                                <div className="passwordInputWrap">
                                    <input
                                        type={passwordVisibility.newPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        value={passwordForm.newPassword}
                                        onChange={(event) => updatePasswordForm("newPassword", event.target.value)}
                                        placeholder="Nieuw wachtwoord"
                                        disabled={savingPassword}
                                    />
                                    <button
                                        className="passwordVisibilityButton"
                                        type="button"
                                        onClick={() => togglePasswordVisibility("newPassword")}
                                        aria-label={passwordVisibility.newPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                                        disabled={savingPassword}
                                    >
                                        {passwordVisibility.newPassword ? <LuEye /> : <LuEyeOff />}
                                    </button>
                                </div>
                            </label>

                            <label className="passwordModalField">
                                <span>Bevestig nieuw wachtwoord</span>
                                <div className="passwordInputWrap">
                                    <input
                                        type={passwordVisibility.confirmPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(event) => updatePasswordForm("confirmPassword", event.target.value)}
                                        placeholder="Nieuw wachtwoord"
                                        disabled={savingPassword}
                                    />
                                    <button
                                        className="passwordVisibilityButton"
                                        type="button"
                                        onClick={() => togglePasswordVisibility("confirmPassword")}
                                        aria-label={passwordVisibility.confirmPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                                        disabled={savingPassword}
                                    >
                                        {passwordVisibility.confirmPassword ? <LuEye /> : <LuEyeOff />}
                                    </button>
                                </div>
                            </label>

                            <button className="passwordModalSubmitButton" type="submit" disabled={savingPassword}>
                                {savingPassword ? "Opslaan..." : "Opslaan"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : null}

            {deleteConfirmationOpen ? (
                <DeleteConfirmationModal
                    description="Je staat op het punt om je account te verwijderen. Wil je doorgaan?"
                    onClose={closeDeleteConfirmation}
                    deleteConfirmationButtonLabel="Ja, verwijder mijn account"
                    cancelButtonLabel="Nee, behoud mijn account"
                    onConfirm={handleDeleteAccountConfirm}
                />
            ) : null}

            <button className="saveButton personalSaveButton" type="button" onClick={handleProfileSave} disabled={savingProfile}>
                {savingProfile ? "Opslaan..." : "Opslaan"}
            </button>

            <div className={`savedMessage ${savedMessage ? "visible" : ""}`}>{savedMessage}</div>
        </main>
    );
}