import "../css/ReportPage.css";
import { useEffect, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuBatteryCharging } from "react-icons/lu";
import { HiOutlineTrendingUp } from "react-icons/hi";
import { TbCrown } from "react-icons/tb";
import PremiumModal from "../components/PremiumModal";
import SmallLoader from "../components/SmallLoader";
import { fetchTodayReport } from "../api/reportApi";
import { fetchCalendarConnectUrl, fetchCalendarEvents } from "../api/backendApi";
import { getApiBaseUrl } from "../api/apiBaseUrl";
import { formatReportDate } from "../lib/dateFormat";

function formatDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey, offsetDays) {
    const [year, month, day] = dateKey.split("-").map((part) => Number(part));
    const nextDate = new Date(year, month - 1, day);
    nextDate.setDate(nextDate.getDate() + offsetDays);
    return formatDateKey(nextDate);
}

function formatAgendaTime(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("nl-BE", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function formatAgendaRange(event) {
    if (event?.allDay) {
        return "Hele dag";
    }

    const start = formatAgendaTime(event?.start);
    const end = formatAgendaTime(event?.end);

    if (start && end) {
        return `${start} - ${end}`;
    }

    return start || end || "Tijd niet beschikbaar";
}

function getAgendaProviderLabel(provider) {
    return provider === "microsoft" ? "Outlook" : "Google";
}

function sortAgendaEvents(events) {
    return [...events].sort((first, second) => {
        const firstStart = new Date(first?.start || 0).getTime();
        const secondStart = new Date(second?.start || 0).getTime();
        return firstStart - secondStart;
    });
}

function renderBreakRow(label, count, dotClass, countClass, keyPrefix) {
    return (
        <div className="reportBreakRow">
            <span className="reportBreakLabel">{label}</span>
            <div className="reportDots" aria-hidden="true">
                {Array.from({ length: count }).map((_, index) => (
                    <span key={`${keyPrefix}-${index}`} className={`reportDot ${dotClass}`} />
                ))}
            </div>
            <strong className={`reportBreakCount ${countClass}`}>{count}</strong>
        </div>
    );
}

export default function ReportPage({ isPremium, onNavigateToUpgrade, accessToken }) {
    const apiBaseUrl = getApiBaseUrl();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [report, setReport] = useState(null);
    const [selectedReportDate, setSelectedReportDate] = useState(() => formatDateKey(new Date()));
    const [premiumModalContent, setPremiumModalContent] = useState(null);
    const [agendaEvents, setAgendaEvents] = useState([]);
    const [agendaLoading, setAgendaLoading] = useState(false);
    const [agendaError, setAgendaError] = useState("");
    const [agendaConnectingProvider, setAgendaConnectingProvider] = useState("");

    const breaksTaken = Number(report?.breaks_taken ?? 0);
    const breaksSkipped = Number(report?.breaks_skipped ?? 0);
    const todayDateKey = formatDateKey(new Date());
    const isCurrentDayReport = selectedReportDate >= todayDateKey;

    useEffect(() => {
        async function loadReport() {
            setLoading(true);
            setError("");

            try {
                const reportData = await fetchTodayReport(accessToken, selectedReportDate);
                setReport(reportData);
            } catch (err) {
                setError(err.message || "Kon het dagrapport niet ophalen.");
            } finally {
                setLoading(false);
            }
        }

        loadReport();
    }, [accessToken, apiBaseUrl, selectedReportDate]);

    useEffect(() => {
        if (!accessToken) {
            setAgendaEvents([]);
            setAgendaError("");
            setAgendaLoading(false);
            return undefined;
        }

        let cancelled = false;

        const loadAgenda = async () => {
            setAgendaLoading(true);
            setAgendaError("");

            try {
                const results = await Promise.allSettled(
                    ["google", "microsoft"].map((provider) => fetchCalendarEvents(apiBaseUrl, accessToken, provider, selectedReportDate))
                );

                if (cancelled) {
                    return;
                }

                const nextEvents = [];
                const errors = [];

                results.forEach((result) => {
                    if (result.status === "fulfilled") {
                        nextEvents.push(...(Array.isArray(result.value?.events) ? result.value.events : []));
                    } else if (result.reason?.message) {
                        errors.push(result.reason.message);
                    }
                });

                const sortedEvents = sortAgendaEvents(nextEvents);
                setAgendaEvents(sortedEvents);

                if (sortedEvents.length === 0) {
                    setAgendaError(errors[0] || "Koppel je agenda via Google of Outlook om afspraken te zien.");
                } else {
                    setAgendaError("");
                }
            } catch (agendaLoadError) {
                if (!cancelled) {
                    setAgendaEvents([]);
                    setAgendaError(agendaLoadError.message || "Koppel je agenda via Google of Outlook om afspraken te zien.");
                }
            } finally {
                if (!cancelled) {
                    setAgendaLoading(false);
                }
            }
        };

        loadAgenda();

        return () => {
            cancelled = true;
        };
    }, [accessToken, apiBaseUrl, selectedReportDate]);

    const reportTitle = (() => {
        const reportDate = new Date(`${selectedReportDate}T00:00:00`);
        const safeDate = Number.isNaN(reportDate.getTime()) ? new Date() : reportDate;
        return `Rapport van ${formatReportDate(safeDate)}`;
    })();

    const avgStressLabel = report?.averageStress == null ? "-" : `${report.averageStress}/5`;
    const avgEnergyLabel = report?.averageEnergy == null ? "-" : `${report.averageEnergy}/5`;

    function openPremiumModal(title, description) {
        setPremiumModalContent({ title, description });
    }

    function closePremiumModal() {
        setPremiumModalContent(null);
    }

    function handlePreviousDay() {
        if (!isPremium) {
            openPremiumModal("Ontgrendel vorige dagrapporten", "Bekijk je voorgaande dagrapporten met Premium.");
            return;
        }

        setSelectedReportDate((currentDate) => shiftDateKey(currentDate, -1));
    }

    function handleNextDay() {
        if (isCurrentDayReport) {
            return;
        }

        setSelectedReportDate((currentDate) => shiftDateKey(currentDate, 1));
    }

    async function handleConnectAgenda(provider) {
        if (!accessToken || agendaConnectingProvider) {
            return;
        }

        setAgendaConnectingProvider(provider);
        setAgendaError("");

        try {
            const connectUrl = await fetchCalendarConnectUrl(apiBaseUrl, accessToken, provider);
            const openedWindow = window.open(connectUrl, "_blank", "noopener,noreferrer");

            if (!openedWindow) {
                window.location.href = connectUrl;
            }
        } catch (connectError) {
            setAgendaError(connectError.message || "Kon agenda-koppeling niet starten.");
        } finally {
            setAgendaConnectingProvider("");
        }
    }

    if (loading) {
        return (
            <main className="reportPage">
                <header className="reportHeader">
                    <div className="reportTitleGroup">
                        <button className="reportNavButton" type="button" aria-label="Vorige dagrapport" onClick={handlePreviousDay}>
                            <LuChevronLeft />
                        </button>

                        <h2 className="reportTitle">{reportTitle}</h2>

                        <button className="reportNavButton" type="button" aria-label="Volgende dagrapport" onClick={handleNextDay} disabled={isCurrentDayReport}>
                            <LuChevronRight />
                        </button>
                    </div>
                </header>

                <SmallLoader message="Dagrapport wordt geladen..." />
            </main>
        );
    }

    return (
        <main className="reportPage">
            <header className="reportHeader">
                <div className="reportTitleGroup">
                    <button className="reportNavButton" type="button" aria-label="Vorige dagrapport" onClick={handlePreviousDay}>
                        <LuChevronLeft />
                    </button>

                    <h2 className="reportTitle">{reportTitle}</h2>

                    <button className="reportNavButton" type="button" aria-label="Volgende dagrapport" onClick={handleNextDay} disabled={isCurrentDayReport}>
                        <LuChevronRight />
                    </button>
                </div>

                {!isPremium ? (
                    <button
                        className="reportWeekButton"
                        type="button"
                        onClick={() => openPremiumModal("Ontgrendel weekrapporten", "Bekijk je weekrapporten met Premium.")}
                    >
                        <TbCrown aria-hidden="true" />
                        <span>Bekijk weekrapport</span>
                    </button>
                ) : null}
            </header>

            <section className="reportMetricsRow" aria-label="Samenvatting">
                <article className="reportMetricCard reportMetricCardWorktime">
                    <h3 className="reportSectionTitle">Totale werktijd</h3>
                    <p className="reportBigValue">{report?.totalWorkTime || "0 uur en 0 minuten"}</p>
                </article>

                <article className="reportMetricCard reportMetricCardStats">
                    <h3 className="reportSectionTitle">Gemiddelde stress en energie</h3>

                    <div className="reportStatsSplit">
                        <div className="reportStatItem">
                            <div className="reportStatLabel">
                                <HiOutlineTrendingUp />
                                <span>Gemiddelde stress</span>
                            </div>
                            <p className="reportStatValue reportStatValueStress">{avgStressLabel}</p>
                        </div>

                        <div className="reportStatItem">
                            <div className="reportStatLabel">
                                <LuBatteryCharging />
                                <span>Gemiddelde energie</span>
                            </div>
                            <p className="reportStatValue reportStatValueEnergy">{avgEnergyLabel}</p>
                        </div>
                    </div>
                </article>
            </section>

            {error ? <p className="reportSectionMeta">Fout: {error}</p> : null}

            <section className="reportSection">
                <div className="reportSectionHeader">
                    <h3 className="reportSectionTitle reportSectionTitleLarge">Pauzeoverzicht</h3>
                    <p className="reportSectionMeta">Totale tijd gepauzeerd: <strong>{report?.totalBreakTime || "0 minuten"}</strong></p>
                </div>

                <article className="reportCard reportBreakCard">
                    {renderBreakRow("Pauzes genomen:", breaksTaken, "reportDotGood", "reportBreakCountGood", "taken")}
                    {renderBreakRow("Pauzes overgeslagen:", breaksSkipped, "reportDotBad", "reportBreakCountBad", "skipped")}
                </article>
            </section>

            <section className="reportSection">
                <h3 className="reportSectionTitle reportSectionTitleLarge">Advies</h3>

                <article className="reportAdviceCard">
                    Er wordt aangeraden om minstens elk uur (maximum elke 2 uur) een korte pauze te nemen om je geest tot rust te
                    brengen en je brein terug op te laden.
                </article>
            </section>

            <section className="reportSection reportAgendaSection">
                <div className="reportSectionHeader">
                    <h3 className="reportSectionTitle reportSectionTitleLarge">Jouw agenda vandaag</h3>
                    <div className="reportAgendaActions">
                        <button className="reportAgendaButton" type="button" onClick={() => handleConnectAgenda("google")} disabled={Boolean(agendaConnectingProvider)}>
                            {agendaConnectingProvider === "google" ? "Google wordt gekoppeld..." : "Google koppelen"}
                        </button>
                        <button className="reportAgendaButton" type="button" onClick={() => handleConnectAgenda("microsoft")} disabled={Boolean(agendaConnectingProvider)}>
                            {agendaConnectingProvider === "microsoft" ? "Outlook wordt gekoppeld..." : "Outlook koppelen"}
                        </button>
                    </div>
                </div>

                <article className="reportAgendaCard">
                    {agendaLoading ? (
                        <SmallLoader message="Agenda wordt geladen..." />
                    ) : agendaEvents.length ? (
                        <ul className="reportAgendaList" aria-label="Afspraken voor deze dag">
                            {agendaEvents.map((event) => (
                                <li className="reportAgendaItem" key={`${event.provider}-${event.id}`}>
                                    <div className="reportAgendaItemHeader">
                                        <strong className="reportAgendaItemTitle">{event.title}</strong>
                                        <span className="reportAgendaItemSource">{getAgendaProviderLabel(event.provider)}</span>
                                    </div>
                                    <div className="reportAgendaItemMeta">
                                        <span>{formatAgendaRange(event)}</span>
                                        {event.location ? <span>{event.location}</span> : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="reportAgendaEmpty">{agendaError || "Nog geen afspraken gevonden voor deze dag."}</p>
                    )}
                </article>
            </section>

            {premiumModalContent ? (
                <PremiumModal
                    title={premiumModalContent.title}
                    description={premiumModalContent.description}
                    onClose={closePremiumModal}
                    onUpgrade={onNavigateToUpgrade}
                />
            ) : null}
        </main>
    );
}