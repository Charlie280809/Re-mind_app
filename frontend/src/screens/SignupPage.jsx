import "../css/LoginPage.css";
import "../css/settings.css";
import { useState } from "react";
import { LuEye, LuEyeOff  } from "react-icons/lu";
import logo from "../assets/images/logo.svg";
import { WEEKDAY_OPTIONS, buildSignupWorkHoursPayload, createDefaultWorkHoursDraft, isValidWorkdayTimeRange, normalizeDuration } from "../lib/workHours";

const SOURCE_OPTIONS = [
    { key: "friends", label: "Door vrienden/collega's" },
    { key: "social", label: "Ik zag het op Facebook/LinkedIn/Instagram" },
    { key: "search", label: "Ik was op zoek naar een app die mij helpt met stress omgaan" },
];

const REASON_OPTIONS = [
    { key: "lessStress", label: "Om minder stress te hebben" },
    { key: "focus", label: "Om beter te kunnen concentreren/focussen" },
    { key: "healthyBreaks", label: "Om efficiënter en gezondere pauzes te nemen" },
    { key: "clearMind", label: "Om mentaal helder te blijven denken" },
    { key: "productive", label: "Om langer productief te blijven" },
];

function createOptionState(options) {
    return options.reduce((accumulator, option) => ({
        ...accumulator,
        [option.key]: false,
    }), {});
}

export default function SignupPage({ onCreateAccount, onSaveNotifications, onSaveWorkHours, onNavigateToLogin, isSubmitting, error, isConfigured }) {
    const [step, setStep] = useState(1);
    const [formError, setFormError] = useState("");
    const [createdUserId, setCreatedUserId] = useState("");
    const [passwordVisibility, setPasswordVisibility] = useState({
        password: false,
        confirmPassword: false,
    });
    const [account, setAccount] = useState({
        email: "",
        bedrijfsnaam: "",
        username: "",
        password: "",
        confirmPassword: "",
    });
    const [foundHow, setFoundHow] = useState(() => createOptionState(SOURCE_OPTIONS));
    const [foundHowOther, setFoundHowOther] = useState("");
    const [whyUse, setWhyUse] = useState(() => createOptionState(REASON_OPTIONS));
    const [whyUseOther, setWhyUseOther] = useState("");
    const [checkinNotificationsOn, setCheckinNotificationsOn] = useState(null);
    const [workHours, setWorkHours] = useState(() => createDefaultWorkHoursDraft());

    const activeError = formError || error;

    const updateAccount = (field, value) => {
        setAccount((currentValue) => ({
            ...currentValue,
            [field]: value,
        }));
    };

    const toggleOption = (setter, currentState, key) => {
        setter({
            ...currentState,
            [key]: !currentState[key],
        });
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

    const togglePasswordVisibility = (field) => {
        setPasswordVisibility((currentValue) => ({
            ...currentValue,
            [field]: !currentValue[field],
        }));
    };

    const selectedCount = (state) => Object.values(state).filter(Boolean).length;

    const handlePrimaryAction = async (event) => {
        event.preventDefault();
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

        if (step === 2) {
            if (selectedCount(foundHow) === 0 && !foundHowOther.trim()) {
                setFormError("Kies minstens één optie.");
                return;
            }

            setStep(3);
            return;
        }

        if (step === 3) {
            if (selectedCount(whyUse) === 0 && !whyUseOther.trim()) {
                setFormError("Kies minstens één optie.");
                return;
            }

            setStep(4);
            return;
        }

        if (step === 4) {
            if (checkinNotificationsOn === null) {
                setFormError("Kies of je check-in notificaties wilt inschakelen.");
                return;
            }

            const saved = await onSaveNotifications({
                userId: createdUserId,
                checkinNotificationsOn,
            });

            if (!saved) {
                return;
            }

            setStep(5);
            return;
        }

        if (step === 5) {
            const workdayCount = Object.values(workHours.selectedWorkdays).filter(Boolean).length;
            if (workdayCount === 0) {
                setFormError("Selecteer minstens één werkdag.");
                return;
            }

            const normalizedDuration = normalizeDuration(workHours.breakHours, workHours.breakMinutes);

            if (normalizedDuration.totalMinutes <= 0) {
                setFormError("❗Voer een geldige duur voor pauzeherinnering in.");
                return;
            }

            if (!isValidWorkdayTimeRange(workHours.startTime, workHours.endTime)) {
                setFormError("❗Het startuur moet vroeger zijn dan het einduur.");
                return;
            }

            const saved = await onSaveWorkHours({
                userId: createdUserId,
                workHoursSetup: buildSignupWorkHoursPayload(createdUserId, workHours),
                email: account.email.trim(),
                password: account.password,
            });

            if (!saved) {
                return;
            }
        }
    };

    return (
        <main className={`signupPage ${step === 5 ? "signupPageWorkhours" : ""}`}>
            <div className="signupLogoCounterGroup">
                <img className="signupTopLogo" src={logo} alt="Re:Mind" />
                <div className="signupStepCounter">Stap {step} van 5</div>
            </div>

            {step === 5 ? (
                <form className="signupForm signupWorkhoursForm" onSubmit={handlePrimaryAction}>
                    <section className="signupWorkhoursPage">
                        <header className="signupHeading">
                            <h1 className="signupTitle">Werkuren en pauzes instellen</h1>
                            <p className="subtitle">Deze instellingen kunnen altijd aangepast worden in <br /> Instellingen &gt; Werktijden en pauzes.</p>
                        </header>

                        <section className="workhoursContent signupWorkhoursContent">
                            <div className="row">
                                <div className="label">Frequentie van pauzeherinneringen:</div>
                                <div className="value">
                                    <span className="telkensNa">Telkens na</span>
                                    <input
                                        aria-label="Frequentie uren"
                                        type="number"
                                        min={0}
                                        max={59}
                                        step={1}
                                        value={workHours.breakHours}
                                        onChange={(event) => updateWorkHours("breakHours", Number.parseInt(event.target.value || "0", 10) || 0)}
                                    />
                                    <span className="durationUnit">uur</span>
                                    <input
                                        aria-label="Frequentie minuten"
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={workHours.breakMinutes}
                                        onChange={(event) => updateWorkHours("breakMinutes", Number.parseInt(event.target.value || "0", 10) || 0)}
                                    />
                                    <span className="durationUnit">min</span>
                                </div>
                            </div>

                            <div className="row weekdaysRow">
                                <div className="label">Werkdagen:</div>
                                <div className="weekdays" role="group" aria-label="Selecteer werkdagen">
                                    {WEEKDAY_OPTIONS.map((day) => {
                                        const isChecked = workHours.selectedWorkdays[day.key];

                                        return (
                                            <label key={day.key} className="weekdayOption">
                                                <span className="weekdayLabel">{day.label}</span>
                                                <input
                                                    type="checkbox"
                                                    className="weekdayCheckbox checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleWorkday(day.key)}
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="row">
                                <div className="label">Officieel startuur op werkdagen:</div>
                                <div className="value">
                                    <input
                                        aria-label="Officieel startuur"
                                        type="time"
                                        value={workHours.startTime}
                                        onChange={(event) => updateWorkHours("startTime", event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="row">
                                <div className="label">Officieel einduur op werkdagen:</div>
                                <div className="value">
                                    <input
                                        aria-label="Officieel einduur"
                                        type="time"
                                        value={workHours.endTime}
                                        onChange={(event) => updateWorkHours("endTime", event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="row toggleRow">
                                <div className="label">Middagpauze instellen:</div>
                                <div className="value">
                                    <button
                                        className="toggle"
                                        type="button"
                                        aria-pressed={workHours.lunchPauseEnabled}
                                        onClick={() => updateWorkHours("lunchPauseEnabled", !workHours.lunchPauseEnabled)}
                                    >
                                        <span className="knob" />
                                    </button>
                                </div>
                            </div>

                            <div className={`row ${!workHours.lunchPauseEnabled ? "rowDisabled" : ""}`}>
                                <div className="label">Officiële start middagpauze op werkdagen:</div>
                                <div className="value">
                                    <input
                                        aria-label="Start middagpauze"
                                        type="time"
                                        value={workHours.lunchStart}
                                        disabled={!workHours.lunchPauseEnabled}
                                        onChange={(event) => updateWorkHours("lunchStart", event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={`row ${!workHours.lunchPauseEnabled ? "rowDisabled" : ""}`}>
                                <div className="label">Officieel einde middagpauze op werkdagen:</div>
                                <div className="value">
                                    <input
                                        aria-label="Einde middagpauze"
                                        type="time"
                                        value={workHours.lunchEnd}
                                        disabled={!workHours.lunchPauseEnabled}
                                        onChange={(event) => updateWorkHours("lunchEnd", event.target.value)}
                                    />
                                </div>
                            </div>
                        </section>
                    </section>

                    {activeError ? <p className="errorMessage" role="alert">{activeError}</p> : null}
                    {!isConfigured ? <p className="errorMessage" role="alert">Supabase is nog niet geconfigureerd.</p> : null}

                    <button className="signupPrimaryAction" type="submit" disabled={isSubmitting || !isConfigured}>
                        Start
                    </button>
                </form>
            ) : (
                <section className="signupCenterStage">
                    <div className="signupHeading">
                        <h1 className="signupTitle">
                            {step === 1 ? "Registreren" : step === 2 ? "Hoe heb je Re:Mind gevonden?" : step === 3 ? "Waarom wil je Re:Mind gebruiken?" : "Wil je meldingen voor check-ins inschakelen?"}
                        </h1>
                        <p className="subtitle">
                            {step === 1
                                ? (
                                    <>
                                        Heb je al een account?{' '}
                                        <button
                                            className="signupReturnAction"
                                            role="button"
                                            tabIndex={0}
                                            onClick={onNavigateToLogin}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToLogin(); }}
                                        >
                                            Log in.
                                        </button>
                                    </>
                                )
                                : step === 2 || step === 3
                                    ? "(Gelieve minstens één optie aan te duiden)"
                                    : "Deze check-ins vragen naar je stress- en energielevels op dat moment. Deze data geeft een beter inzicht in hoe je stress en energie evolueert doorheen de tijd."}
                        </p>
                    </div>

                    <form className="signupForm" onSubmit={handlePrimaryAction}>
                        {step === 1 ? (
                            <>
                                <label className="inputField">
                                    <span>E-mail *</span>
                                    <input type="email" autoComplete="email" placeholder="E-mail" value={account.email} onChange={(event) => updateAccount("email", event.target.value)} required />
                                </label>

                                <label className="inputField">
                                    <span>Bedrijfsnaam</span>
                                    <input type="text" autoComplete="organization" placeholder="Bedrijfsnaam" value={account.bedrijfsnaam} onChange={(event) => updateAccount("bedrijfsnaam", event.target.value)} />
                                </label>

                                <label className="inputField">
                                    <span>Gebruikersnaam *</span>
                                    <input type="text" autoComplete="username" placeholder="Gebruikersnaam" value={account.username} onChange={(event) => updateAccount("username", event.target.value)} required />
                                </label>

                                <label className="inputField">
                                    <span>Wachtwoord *</span>
                                    <div className="passwordInputWrap">
                                        <input
                                            type={passwordVisibility.password ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Wachtwoord"
                                            value={account.password}
                                            onChange={(event) => updateAccount("password", event.target.value)}
                                            required
                                        />
                                        <button
                                            className="passwordVisibilityButton"
                                            type="button"
                                            onClick={() => togglePasswordVisibility("password")}
                                            aria-label={passwordVisibility.password ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                                        >
                                            {passwordVisibility.password ? <LuEye /> : <LuEyeOff />}
                                        </button>
                                    </div>
                                </label>

                                <label className="inputField">
                                    <span>Wachtwoord bevestigen *</span>
                                    <div className="passwordInputWrap">
                                        <input
                                            type={passwordVisibility.confirmPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Wachtwoord"
                                            value={account.confirmPassword}
                                            onChange={(event) => updateAccount("confirmPassword", event.target.value)}
                                            required
                                        />
                                        <button
                                            className="passwordVisibilityButton"
                                            type="button"
                                            onClick={() => togglePasswordVisibility("confirmPassword")}
                                            aria-label={passwordVisibility.confirmPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                                        >
                                            {passwordVisibility.confirmPassword ? <LuEye /> : <LuEyeOff />}
                                        </button>
                                    </div>
                                </label>
                            </>
                        ) : null}

                        {step === 2 ? (
                            <div className="signupQuestionCard">
                                {SOURCE_OPTIONS.map((option) => (
                                    <label key={option.key} className="signupChoiceRow">
                                        <input type="checkbox" className="checkbox" checked={foundHow[option.key]} onChange={() => toggleOption(setFoundHow, foundHow, option.key)} />
                                        <span>{option.label}</span>
                                    </label>
                                ))}

                                <label className="signupOtherRow">
                                    <span>Andere:</span>
                                    <input type="text" value={foundHowOther} onChange={(event) => setFoundHowOther(event.target.value)} />
                                </label>
                            </div>
                        ) : null}

                        {step === 3 ? (
                            <div className="signupQuestionCard">
                                {REASON_OPTIONS.map((option) => (
                                    <label key={option.key} className="signupChoiceRow">
                                        <input type="checkbox" className="checkbox" checked={whyUse[option.key]} onChange={() => toggleOption(setWhyUse, whyUse, option.key)} />
                                        <span>{option.label}</span>
                                    </label>
                                ))}

                                <label className="signupOtherRow">
                                    <span>Andere:</span>
                                    <input type="text" value={whyUseOther} onChange={(event) => setWhyUseOther(event.target.value)} />
                                </label>
                            </div>
                        ) : null}

                        {step === 4 ? (
                            <div className="signupQuestionCard">
                                <label className={`signupBinaryOption ${checkinNotificationsOn === true ? "isActive" : ""}`}>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={checkinNotificationsOn === true}
                                        onChange={() => setCheckinNotificationsOn(true)}
                                    />
                                    <div className="signupBinaryCopy">
                                        <span>Inschakelen</span>
                                        <small>(Je ontvangt doorheen je werkdag enkele check-ins in verband met je stress en energie)</small>
                                    </div>
                                </label>
                                <label className={`signupBinaryOption ${checkinNotificationsOn === false ? "isActive" : ""}`}>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={checkinNotificationsOn === false}
                                        onChange={() => setCheckinNotificationsOn(false)}
                                    />
                                    <div className="signupBinaryCopy">
                                        <span>Niet inschakelen</span>
                                        <small>(Je kan deze instelling altijd aanpassen bij Instellingen &gt; Notificatie-voorkeuren)</small>
                                    </div>
                                </label>
                            </div>
                        ) : null}

                        {activeError ? <p className="errorMessage" role="alert">{activeError}</p> : null}
                        {!isConfigured ? <p className="errorMessage" role="alert">Supabase is nog niet geconfigureerd.</p> : null}

                        <button className="signupPrimaryAction" type="submit" disabled={isSubmitting || !isConfigured}>
                            {step === 1 ? "Account aanmaken" : step === 5 ? "Start" : "Volgende"}
                        </button>
                    </form>
                </section>
            )}
        </main>
    );
}