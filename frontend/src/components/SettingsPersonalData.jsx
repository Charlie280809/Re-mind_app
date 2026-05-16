import "../css/settings.css";
import { LuArrowLeft, LuPencil, LuUser } from "react-icons/lu";

export default function SettingsPersonalData({ onBack }) {
    const fields = [
        { key: "email", label: "Email:", value: "JohnDoe@gmail.com" },
        { key: "username", label: "Gebruikersnaam:", value: "John Doe" },
        { key: "password", label: "Wachtwoord:", value: "****************" },
        { key: "function", label: "Functie:", value: "Technieker" },
        { key: "plan", label: "Plan:", value: "Basis plan" },
    ];

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

                <button className="personalDeleteButton" type="button">
                    Verwijder account
                </button>
            </section>

            <button className="saveButton personalSaveButton" type="button">
                Opslaan
            </button>
        </main>
    );
}