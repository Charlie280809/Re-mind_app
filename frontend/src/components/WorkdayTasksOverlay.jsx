import { useEffect, useState } from "react";
import { LuPlus, LuX } from "react-icons/lu";
import {
    createWorkdayTask,
    deleteWorkdayTask,
    fetchWorkdayTasksOverview,
    updateWorkdayTask,
} from "../api/backendApi";
import "../css/WorkdayTasks.css";

const EMPTY_LISTS = { today: [], tomorrow: [] };

function useModalOpen(isOpen, onClose) {
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };

        document.body.classList.add("modalOpen");
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.classList.remove("modalOpen");
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);
}

function normalizeOverview(payload) {
    return {
        today: Array.isArray(payload?.today) ? payload.today : [],
        tomorrow: Array.isArray(payload?.tomorrow) ? payload.tomorrow : [],
    };
}

export default function WorkdayTasksOverlay({ isOpen, onClose, apiBaseUrl, accessToken }) {
    useModalOpen(isOpen, onClose);

    const [activeTab, setActiveTab] = useState("today");
    const [draftItem, setDraftItem] = useState("");
    const [itemsByTab, setItemsByTab] = useState(EMPTY_LISTS);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        setActiveTab("today");
        setDraftItem("");
        setItemsByTab(EMPTY_LISTS);
        setError("");

        if (!apiBaseUrl || !accessToken) {
            return undefined;
        }

        let isCancelled = false;

        const loadOverview = async () => {
            setIsLoading(true);

            try {
                const overview = await fetchWorkdayTasksOverview(apiBaseUrl, accessToken);

                if (!isCancelled) {
                    setItemsByTab(normalizeOverview(overview));
                }
            } catch (requestError) {
                if (!isCancelled) {
                    setError(requestError.message || "Kon takenlijst niet laden.");
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadOverview();

        return () => {
            isCancelled = true;
        };
    }, [apiBaseUrl, accessToken, isOpen]);

    if (!isOpen) {
        return null;
    }

    const currentItems = itemsByTab[activeTab] || [];

    const refreshTasks = async () => {
        if (!apiBaseUrl || !accessToken) {
            return;
        }

        const overview = await fetchWorkdayTasksOverview(apiBaseUrl, accessToken);
        setItemsByTab(normalizeOverview(overview));
    };

    const handleAddItem = async (event) => {
        event.preventDefault();

        const nextText = draftItem.trim();
        if (!nextText || isSaving) {
            return;
        }

        setIsSaving(true);
        setError("");

        try {
            await createWorkdayTask(apiBaseUrl, accessToken, {
                task_text: nextText,
                task_day: activeTab,
            });
            setDraftItem("");
            await refreshTasks();
        } catch (requestError) {
            setError(requestError.message || "Kon taak niet toevoegen.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleDone = async (task) => {
        if (isSaving) {
            return;
        }

        setIsSaving(true);
        setError("");

        try {
            await updateWorkdayTask(apiBaseUrl, accessToken, task.id, {
                is_done: !task.is_done,
            });
            await refreshTasks();
        } catch (requestError) {
            setError(requestError.message || "Kon taak niet bijwerken.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteItem = async (task) => {
        if (isSaving) {
            return;
        }

        setIsSaving(true);
        setError("");

        try {
            await deleteWorkdayTask(apiBaseUrl, accessToken, task.id);
            await refreshTasks();
        } catch (requestError) {
            setError(requestError.message || "Kon taak niet verwijderen.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="workdayTasksOverlay" role="presentation" onMouseDown={onClose}>
            <div className="workdayTasksCard" role="dialog" aria-modal="true" aria-labelledby="workday-tasks-title" onMouseDown={(event) => event.stopPropagation()}>
                <button className="workdayTasksCloseButton" type="button" onClick={onClose} aria-label="Sluiten">
                    <LuX />
                </button>

                <header className="workdayTasksHeader">
                    <h2 id="workday-tasks-title" className="workdayTasksTitle">
                        Werkdagtaken
                    </h2>
                    <p className="workdayTasksSubtitle">
                        Voeg taken toe voor vandaag of morgen en vink ze af zodra ze klaar zijn.
                    </p>
                </header>

                <div className="workdayTasksTabs" role="tablist" aria-label="Taken per dag">
                    <button
                        className={`workdayTasksTab ${activeTab === "today" ? "isActive" : ""}`}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "today"}
                        onClick={() => setActiveTab("today")}
                    >
                        Vandaag
                    </button>
                    <button
                        className={`workdayTasksTab ${activeTab === "tomorrow" ? "isActive" : ""}`}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "tomorrow"}
                        onClick={() => setActiveTab("tomorrow")}
                    >
                        Morgen
                    </button>
                </div>

                <p className="workdayTasksQuestion">
                    {activeTab === "today" ? "Waar wil je vandaag aan werken?" : "Waar wil je morgen aan werken?"}
                </p>

                <form className="workdayTasksForm" onSubmit={handleAddItem}>
                    <div className="workdayTasksEntryRow">
                        <input
                            className="workdayTasksInput"
                            type="text"
                            value={draftItem}
                            onChange={(event) => setDraftItem(event.target.value)}
                            placeholder={activeTab === "today" ? "Voeg een taak voor vandaag toe" : "Voeg een taak voor morgen toe"}
                            aria-label={activeTab === "today" ? "Taak voor vandaag" : "Taak voor morgen"}
                            autoFocus
                            disabled={isSaving}
                        />

                        <button className="workdayTasksAddButton" type="submit" aria-label="Taak toevoegen" disabled={isSaving || !draftItem.trim()}>
                            <LuPlus />
                        </button>
                    </div>
                </form>

                {error ? <p className="workdayTasksError">{error}</p> : null}

                <ul className="workdayTasksList" aria-label={activeTab === "today" ? "Taken voor vandaag" : "Taken voor morgen"}>
                    {isLoading ? (
                        <li className="workdayTasksEmpty">Taken laden...</li>
                    ) : currentItems.length ? (
                        currentItems.map((task) => (
                            <li className={`workdayTasksItem ${task.is_done ? "isDone" : ""}`} key={task.id}>
                                <label className="workdayTasksCheckRow">
                                    <input
                                        className="checkbox workdayTasksCheckbox"
                                        type="checkbox"
                                        checked={Boolean(task.is_done)}
                                        onChange={() => handleToggleDone(task)}
                                        disabled={isSaving}
                                    />
                                    <span className="workdayTasksItemText">{task.task_text}</span>
                                </label>

                                <button
                                    className="workdayTasksDeleteButton"
                                    type="button"
                                    onClick={() => handleDeleteItem(task)}
                                    aria-label={`Taak verwijderen: ${task.task_text}`}
                                    disabled={isSaving}
                                >
                                    <LuX />
                                </button>
                            </li>
                        ))
                    ) : (
                        <li className="workdayTasksEmpty">Nog geen taken toegevoegd.</li>
                    )}
                </ul>

                <div className="workdayTasksFooter">
                    <button className="workdayTasksDoneButton" type="button" onClick={onClose}>
                        Klaar
                    </button>
                </div>
            </div>
        </div>
    );
}