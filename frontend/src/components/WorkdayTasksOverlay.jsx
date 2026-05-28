import { useEffect, useState } from "react";
import { LuTrash2, LuX } from "react-icons/lu";
import {
    createWorkdayTask,
    deleteWorkdayTask,
    fetchWorkdayTasksOverview,
    updateWorkdayTask,
} from "../api/backendApi";
import SmallLoader from "./SmallLoader";
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

export default function WorkdayTasksOverlay({ isOpen, onClose, apiBaseUrl, accessToken, initialTab = "today" }) {
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

        setActiveTab(initialTab);
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
    }, [apiBaseUrl, accessToken, initialTab, isOpen]);

    if (!isOpen) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="workdayTasksOverlay" role="presentation" onMouseDown={onClose}>
                <div className="workdayTasksCard" role="dialog" aria-modal="true" aria-labelledby="workday-tasks-title" onMouseDown={(event) => event.stopPropagation()}>
                    <button className="workdayTasksCloseButton" type="button" onClick={onClose} aria-label="Sluiten">
                        <LuX />
                    </button>

                    <h2 id="workday-tasks-title" className="workdayTasksTitle">
                        Takenlijst
                    </h2>

                    <SmallLoader message="Takenlijst wordt geladen..." />
                </div>
            </div>
        );
    }

    const currentItems = [...(itemsByTab[activeTab] || [])].reverse();

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

                <h2 id="workday-tasks-title" className="workdayTasksTitle">
                    Takenlijst
                </h2>

                <div className="workdayTasksTabs" role="tablist" aria-label="Taken per dag" data-active-tab={activeTab}>
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
                    {activeTab === "today" ? "Waar wil je vandaag aan werken?" : "Waar wil je morgen zeker aan werken?"}
                    {isSaving ? <span className="workdayTasksSaving">Opslaan...</span> : error ? <span className="workdayTasksError">{error}</span> : null}
                </p>

                <form onSubmit={handleAddItem}>
                    <div className="workdayTasksEntryRow">
                        <input
                            className="workdayTasksInput"
                            type="text"
                            value={draftItem}
                            onChange={(event) => setDraftItem(event.target.value)}
                            placeholder={activeTab === "today" ? "Noteer hier een taak voor vandaag" : "Noteer hier een taak voor morgen"}
                            aria-label={activeTab === "today" ? "Noteer hier een taak voor vandaag" : "Noteer hier een taak voor morgen"}
                            autoFocus
                        />

                        <button className="workdayTasksAddButton" type="submit" aria-label="Taak toevoegen" disabled={isSaving || !draftItem.trim()}>
                            Toevoegen
                        </button>
                    </div>
                </form>

                <ul className="workdayTasksList" aria-label={activeTab === "today" ? "Taken voor vandaag" : "Taken voor morgen"}>
                    {currentItems.length ? (
                        currentItems.map((task) => (
                            <li className={`workdayTasksItem ${task.is_done ? "isDone" : ""}`} key={task.id}>
                                <label className="workdayTasksCheckRow">
                                    <input
                                        className="checkbox"
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
                                    <LuTrash2 />
                                </button>
                            </li>
                        ))
                    ) : (
                        <li className="workdayTasksEmpty">Nog geen taken toegevoegd.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}