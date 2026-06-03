import "../css/LoginPage.css";
import { useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import logo from "../assets/images/logo.svg";
import { supabase } from "../lib/supabaseClient";

export default function ResetPasswordPage({ onNavigateToLogin, isConfigured }) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();

        if (!isConfigured) {
            setMessage("Supabase is nog niet geconfigureerd.");
            return;
        }

        if (!password || !confirmPassword) {
            setMessage("Vul beide wachtwoordvelden in.");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("De wachtwoorden komen niet overeen.");
            return;
        }

        if (password.length < 6) {
            setMessage("Je nieuwe wachtwoord moet minstens 6 tekens bevatten.");
            return;
        }

        setIsSubmitting(true);
        setMessage("");

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                throw error;
            }

            if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                url.searchParams.delete("auth");
                window.history.replaceState({}, "", url.toString());
            }

            await supabase.auth.signOut();
            setPassword("");
            setConfirmPassword("");
            setMessage("Je wachtwoord is aangepast. Je kan nu opnieuw inloggen.");

            if (onNavigateToLogin) {
                onNavigateToLogin();
            }
        } catch (error) {
            console.error(error);
            setMessage(error?.message || "Fout bij het wijzigen van je wachtwoord.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="loginPage">
            <section className="loginContent">
                <div className="loginFormColumn">
                    <h1 className="loginTitle">Wachtwoord resetten</h1>

                    <form className="loginForm" onSubmit={handleSubmit}>
                        <label className="inputField">
                            <span>Nieuw wachtwoord</span>
                            <div className="passwordInputWrap">
                                <input
                                    type={passwordVisible ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="Nieuw wachtwoord"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                />
                                <button
                                    className="passwordVisibilityButton"
                                    type="button"
                                    onClick={() => setPasswordVisible((currentValue) => !currentValue)}
                                    aria-label={passwordVisible ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                                >
                                    {passwordVisible ? <LuEye /> : <LuEyeOff />}
                                </button>
                            </div>
                        </label>

                        <label className="inputField">
                            <span>Bevestig nieuw wachtwoord</span>
                            <div className="passwordInputWrap">
                                <input
                                    type={confirmPasswordVisible ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="Bevestig nieuw wachtwoord"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    required
                                />
                                <button
                                    className="passwordVisibilityButton"
                                    type="button"
                                    onClick={() => setConfirmPasswordVisible((currentValue) => !currentValue)}
                                    aria-label={confirmPasswordVisible ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                                >
                                    {confirmPasswordVisible ? <LuEye /> : <LuEyeOff />}
                                </button>
                            </div>
                        </label>

                        {message ? <p className="errorMessage" role="alert">{message}</p> : null}
                        {!isConfigured ? <p className="errorMessage" role="alert">Supabase is nog niet geconfigureerd.</p> : null}

                        <button className="loginSubmit" type="submit" disabled={isSubmitting || !isConfigured}>
                            {isSubmitting ? "Bezig..." : "Wachtwoord opslaan"}
                        </button>
                    </form>
                </div>

                <div className="loginBrandColumn">
                    <img className="loginBrandLogo" src={logo} alt="" />
                    <p className="subtitle">
                        <button type="button" onClick={onNavigateToLogin}>Terug naar inloggen</button>
                    </p>
                </div>
            </section>
        </main>
    );
}