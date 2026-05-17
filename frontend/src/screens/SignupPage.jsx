import "../css/LoginPage.css";
import { useMemo, useState } from "react";
import logo from "../assets/images/logo.svg";
import { WEEKDAY_OPTIONS, buildWorkHoursFields, createDefaultWorkHoursDraft } from "../lib/workHours";

export default function SignupPage({ onCreateAccount, onCompleteOnboarding, onNavigateToLogin, isSubmitting, error, isConfigured }) {
    const [step, setStep] = useState(1);
    const [formError, setFormError] = useState("");
    const [createdUserId, setCreatedUserId] = useState("");
    const [account, setAccount] = useState({
        email: "",
        bedrijfsnaam: "",
        username: "",
        password: "",
        confirmPassword: "",
    });
    const [workHours, setWorkHours] = useState(() => createDefaultWorkHoursDraft());

    const activeError = formError || error;
    const isLastStep = step === 3;
    const stepTitle = useMemo(() => {
        if (step === 1) return "Je account";
        if (step === 2) return "Werkritme";
        return "Snelle setup";
    }, [step]);

    const updateAccount = (field, value) => {
        setAccount((currentValue) => ({
            ...currentValue,
            [field]: value,
        }));
    };

    const toggleWorkday = (dayKey) => {
        setWorkHours((currentValue) => ({
            ...currentValue,
            selectedWorkdays: {
                ...currentValue.selectedWorkdays,
                [dayKey]: !currentValue.selectedWorkdays[dayKey],
            },
        }));
    };

    const updateWorkHours = (field, value) => {
        setWorkHours((currentValue) => ({
            ...currentValue,
            [field]: value,
        }));
    };

    const handleNext = () => {
        setFormError("");

        if (step === 1) {
            if (!account.email || !account.username || !account.password || !account.confirmPassword) {
                setFormError("Vul alle verplichte velden in.");
                return;
            }

            if (account.password !== account.confirmPassword) {
                setFormError("Wachtwoorden komen niet overeen.");
                return;
            }
        }

        if (step === 2) {
            const workdayCount = Object.values(workHours.selectedWorkdays).filter(Boolean).length;
            if (workdayCount === 0) {
                setFormError("Selecteer minstens één werkdag.");
                return;
            }
        }

        setStep((currentValue) => Math.min(3, currentValue + 1));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError("");

        if (step === 1) {
            const createdAccount = await onCreateAccount({
                email: account.email.trim(),
                password: account.password,
                username: account.username.trim(),
                bedrijfsnaam: account.bedrijfsnaam.trim(),
            });

            if (!createdAccount?.userId) {
                return;
            }

            setCreatedUserId(createdAccount.userId);
            setStep(2);
            return;
        }

        if (!isLastStep) {
            handleNext();
            return;
        }

        const saved = await onCompleteOnboarding({
            userId: createdUserId,
            profileSetup: {
                username: account.username.trim(),
                bedrijfsnaam: account.bedrijfsnaam.trim(),
            },
            workHoursSetup: buildWorkHoursFields(workHours),
        });

        if (saved) {
            setFormError("");
        }
    };

    return (
        <main className="signupPage">
            <section className="signupContent">
                <div className="signupFormColumn">
                    <div className="signupHeading">
                        <h1 className="signupTitle">Registreren</h1>
                        <p className="signupSubtitle">Stap {step} van 3 · {stepTitle}</p>
                    </div>

                    {/* <div className="signupStepper" aria-label="Voortgang registratie">
                        {[1, 2, 3].map((stepNumber) => (
                            <span key={stepNumber} className={`signupStep ${stepNumber === step ? "active" : stepNumber < step ? "done" : ""}`}>
                                {stepNumber}
                            </span>
                        ))}
                    </div> */}

                    <form className="signupForm" onSubmit={handleSubmit}>
                        {step === 1 ? (
                            <>
                                <label className="signupField">
                                    <span>E-mail *</span>
                                    <input
                                        type="email"
                                        name="email"
                                        autoComplete="email"
                                        placeholder="E-mail"
                                        value={account.email}
                                        onChange={(event) => updateAccount("email", event.target.value)}
                                        required
                                    />
                                </label>

                                <label className="signupField">
                                    <span>Bedrijfsnaam</span>
                                    <input
                                        type="text"
                                        name="bedrijfsnaam"
                                        autoComplete="organization"
                                        placeholder="Bedrijfsnaam"
                                        value={account.bedrijfsnaam}
                                        onChange={(event) => updateAccount("bedrijfsnaam", event.target.value)}
                                    />
                                </label>

                                <label className="signupField">
                                    <span>Gebruikersnaam *</span>
                                    <input
                                        type="text"
                                        name="username"
                                        autoComplete="username"
                                        placeholder="Gebruikersnaam"
                                        value={account.username}
                                        onChange={(event) => updateAccount("username", event.target.value)}
                                        required
                                    />
                                </label>

                                <label className="signupField">
                                    <span>Wachtwoord *</span>
                                    <input
                                        type="password"
                                        name="password"
                                        autoComplete="new-password"
                                        placeholder="Wachtwoord"
                                        value={account.password}
                                        onChange={(event) => updateAccount("password", event.target.value)}
                                        required
                                    />
                                </label>

                                <label className="signupField">
                                    <span>Wachtwoord bevestigen *</span>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        autoComplete="new-password"
                                        placeholder="Wachtwoord"
                                        value={account.confirmPassword}
                                        onChange={(event) => updateAccount("confirmPassword", event.target.value)}
                                        required
                                    />
                                </label>

                                <button className="signupSubmit signupSubmitFirst" type="submit" disabled={isSubmitting || !isConfigured}>
                                    {isSubmitting ? "Bezig..." : "Account aanmaken"}
                                </button>
                            </>
                        ) : null}

                        {step === 2 ? (
                            <div className="signupSection">
                                <div className="signupSectionHeader">
                                    <h2>Wanneer werk je meestal?</h2>
                                    <p>Deze voorkeuren vullen straks automatisch de instellingen in.</p>
                                </div>

                                <div className="signupWeekdays" role="group" aria-label="Selecteer werkdagen">
                                    {WEEKDAY_OPTIONS.map((day) => (
                                        <label key={day.key} className="signupWeekdayOption">
                                            <span>{day.label}</span>
                                            <input
                                                type="checkbox"
                                                checked={workHours.selectedWorkdays[day.key]}
                                                onChange={() => toggleWorkday(day.key)}
                                            />
                                        </label>
                                    ))}
                                </div>

                                <div className="signupGrid">
                                    <label className="signupField">
                                        <span>Startuur</span>
                                        <input
                                            type="time"
                                            value={workHours.startTime}
                                            onChange={(event) => updateWorkHours("startTime", event.target.value)}
                                        />
                                    </label>

                                    <label className="signupField">
                                        <span>Einduur</span>
                                        <input
                                            type="time"
                                            value={workHours.endTime}
                                            onChange={(event) => updateWorkHours("endTime", event.target.value)}
                                        />
                                    </label>

                                    <label className="signupField">
                                        <span>Pauzeherinnering na</span>
                                        <div className="signupDurationRow">
                                            <input
                                                type="number"
                                                min="0"
                                                value={workHours.breakHours}
                                                onChange={(event) => updateWorkHours("breakHours", Number.parseInt(event.target.value || "0", 10) || 0)}
                                            />
                                            <span>uur</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={workHours.breakMinutes}
                                                onChange={(event) => updateWorkHours("breakMinutes", Number.parseInt(event.target.value || "0", 10) || 0)}
                                            />
                                            <span>min</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        ) : null}

                        {step === 3 ? (
                            <div className="signupSection">
                                <div className="signupSectionHeader">
                                    <h2>Snelle setup voor pauzes</h2>
                                    <p>Je kunt dit later altijd aanpassen in de instellingen.</p>
                                </div>

                                <div className="signupToggleRow">
                                    <div>
                                        <strong>Werktimer automatisch starten</strong>
                                        <p>Start de timer automatisch op je werkdag.</p>
                                    </div>
                                    <button
                                        className="signupToggle"
                                        type="button"
                                        aria-pressed={workHours.autoStartWorkTimer}
                                        onClick={() => updateWorkHours("autoStartWorkTimer", !workHours.autoStartWorkTimer)}
                                    >
                                        <span className="signupKnob" />
                                    </button>
                                </div>

                                <div className="signupToggleRow">
                                    <div>
                                        <strong>Middagpauze instellen</strong>
                                        <p>Gebruik vaste lunchpauzes in je instellingen.</p>
                                    </div>
                                    <button
                                        className="signupToggle"
                                        type="button"
                                        aria-pressed={workHours.lunchPauseEnabled}
                                        onClick={() => updateWorkHours("lunchPauseEnabled", !workHours.lunchPauseEnabled)}
                                    >
                                        <span className="signupKnob" />
                                    </button>
                                </div>

                                <div className="signupGrid">
                                    <label className="signupField">
                                        <span>Start middagpauze</span>
                                        <input
                                            type="time"
                                            value={workHours.lunchStart}
                                            disabled={!workHours.lunchPauseEnabled}
                                            onChange={(event) => updateWorkHours("lunchStart", event.target.value)}
                                        />
                                    </label>

                                    <label className="signupField">
                                        <span>Einde middagpauze</span>
                                        <input
                                            type="time"
                                            value={workHours.lunchEnd}
                                            disabled={!workHours.lunchPauseEnabled}
                                            onChange={(event) => updateWorkHours("lunchEnd", event.target.value)}
                                        />
                                    </label>
                                </div>

                                <article className="signupSummary">
                                    <h3>Voorbeeld van je setup</h3>
                                    <p>{account.username || "Je account"} werkt {workHours.startTime} tot {workHours.endTime}.</p>
                                    <p>De pauzeherinnering staat op {workHours.breakHours} uur en {workHours.breakMinutes} minuten.</p>
                                </article>
                            </div>
                        ) : null}

                        {activeError ? <p className="signupError" role="alert">{activeError}</p> : null}
                        {!isConfigured ? <p className="signupError" role="alert">Supabase is nog niet geconfigureerd.</p> : null}

                        <div className="signupActions">
                            {step > 1 && isLastStep ? (
                                <button className="signupSubmit" type="submit" disabled={isSubmitting || !isConfigured}>
                                    {isSubmitting ? "Opslaan..." : "Setup opslaan"}
                                </button>
                            ) : step > 1 ? (
                                <button className="signupSubmit" type="button" onClick={handleNext} disabled={isSubmitting || !isConfigured}>
                                    Volgende
                                </button>
                            ) : null}
                        </div>
                    </form>
                </div>

                <div className="signupBrandColumn">
                    <img className="signupBrandLogo" src={logo} alt="" aria-hidden="true" />
                    <p className="signupBrandText">
                        Heb je al een account? <button type="button" onClick={onNavigateToLogin}>Log in.</button>
                    </p>
                </div>
            </section>
        </main>
    );
}