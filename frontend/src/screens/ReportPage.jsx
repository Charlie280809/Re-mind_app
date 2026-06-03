import "../css/ReportPage.css";
import { useEffect, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuBatteryCharging } from "react-icons/lu";
import { HiOutlineTrendingUp } from "react-icons/hi";
import { TbCrown } from "react-icons/tb";
import PremiumModal from "../components/PremiumModal";
import SmallLoader from "../components/SmallLoader";
import { fetchTodayReport } from "../api/reportApi";
import { fetchCalendarConnectUrl, fetchCalendarEvents, disconnectCalendar } from "../api/backendApi";
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
    return provider === "microsoft" ? "Microsoft Outlook" : "Google Agenda";
}

function sortAgendaEvents(events) {
    return [...events].sort((first, second) => {
        const firstStart = new Date(first?.start || 0).getTime();
        const secondStart = new Date(second?.start || 0).getTime();
        return firstStart - secondStart;
    });
}

function waitFor(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

function getAdviceMessage({ breaksTaken, breaksSkipped, averageStress, averageEnergy }) {
    const hasReportData = breaksTaken > 0 || breaksSkipped > 0 || averageStress != null || averageEnergy != null;

    if (!hasReportData) {
        return "Er is nog te weinig data om een advies op maat te tonen.";
    }

    if (breaksSkipped > breaksTaken && Number(averageStress) >= 4 && Number(averageEnergy) <= 2) {
        return "Je slaat vaker pauzes over terwijl je stress hoog en je energie laag is. Een pauze hoeft niet lang te zijn, zelfs een kort rustmoment kan een groot verschil maken.";
    }

    if (breaksSkipped > breaksTaken) {
        return "Je slaat vaker pauzes over dan je neemt. Probeer een vast pauzemoment te kiezen zodat je ritme stabieler wordt.";
    }

    if (Number(averageStress) >= 4 && Number(averageEnergy) <= 2) {
        return "Je stress ligt hoog en je energie laag. Het is belangrijk om regelmatig pauzes te nemen, zelfs korte momenten van ontspanning kunnen helpen om je stress te verlagen en je energie te herstellen.";
    }

    if (Number(averageStress) >= 4) {
        return "Je stress lag vandaag hoog. Zorg dat je genoeg pauze neemt en dat deze ook effectief zijn (zie onze pauzesuggesties).";
    }

    if(Number(averageEnergy) <= 2 ) {
        return "Je energie lag vandaag laag. Rustmomenten inplannen is een must!";
    }

    if (breaksTaken >= 4 && Number(averageStress) <= 2 && Number(averageEnergy) >= 4) {
        return "Je pauzeritme ziet er sterk uit en je stress blijft laag. Zo kan je dit ritme verder aanhouden.";
    }

    if (breaksTaken > breaksSkipped) {
        return "Je pauzeritme zit in de goede richting. Blijf korte pauzes nemen om je focus en energie stabiel te houden.";
    }

    if (breaksTaken === breaksSkipped) {
        return "Je hebt vandaag net zoveel pauzes genomen als overgeslagen. Kleine aanpassingen in je pauzemomenten kunnen je stress merkbaar helpen verlagen.";
    }

    return "Blijf je pauzes en energie opvolgen: kleine aanpassingen in je pauzemomenten kunnen je stress merkbaar helpen verlagen.";
}

function formatWorkDuration(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);

    if (hours > 0 && minutes > 0) {
        return `${hours} ${hours === 1 ? "uur" : "uren"} en ${minutes} ${minutes === 1 ? "minuut" : "minuten"}`;
    }

    if (hours > 0) {
        return `${hours} ${hours === 1 ? "uur" : "uren"}`;
    }

    if (minutes > 0) {
        return `${minutes} ${minutes === 1 ? "minuut" : "minuten"}`;
    }

    return "0 minuten";
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

export default function ReportPage({ isPremium, onNavigateToUpgrade, accessToken, liveWorkSeconds = 0, isWorkSessionActive = false }) {
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
    const [agendaDisconnecting, setAgendaDisconnecting] = useState(false);
    const [agendaLinked, setAgendaLinked] = useState(false);

    const breaksTaken = Number(report?.breaks_taken ?? 0);
    const breaksSkipped = Number(report?.breaks_skipped ?? 0);
    const averageStress = report?.averageStress;
    const averageEnergy = report?.averageEnergy;
    const todayDateKey = formatDateKey(new Date());
    const isCurrentDayReport = selectedReportDate >= todayDateKey;
    const adviceMessage = getAdviceMessage({ breaksTaken, breaksSkipped, averageStress, averageEnergy });
    const totalWorkSeconds = Number(report?.totalWorkSeconds ?? 0) + (isCurrentDayReport && isWorkSessionActive ? Number(liveWorkSeconds || 0) : 0);
    const totalWorkTimeLabel = formatWorkDuration(totalWorkSeconds);

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
            setAgendaLinked(false);
            return undefined;
        }

        let cancelled = false;

        const loadAgenda = async () => {
            setAgendaLoading(true);
            setAgendaError("");
            setAgendaLinked(false);

            try {
                const results = await Promise.allSettled(
                    ["google", "microsoft"].map((provider) => fetchCalendarEvents(apiBaseUrl, accessToken, provider, selectedReportDate))
                );

                if (cancelled) {
                    return;
                }

                const nextEvents = [];
                const errors = [];
                let anyConnected = false;

                results.forEach((result) => {
                    if (result.status === "fulfilled") {
                        if (result.value?.connected) {
                            anyConnected = true;
                            nextEvents.push(...(Array.isArray(result.value?.events) ? result.value.events : []));
                        }
                    } else if (result.reason?.message) {
                        errors.push(result.reason.message);
                    }
                });

                const sortedEvents = sortAgendaEvents(nextEvents);
                setAgendaEvents(sortedEvents);
                setAgendaLinked(anyConnected);

                if (sortedEvents.length === 0) {
                    if (anyConnected) {
                        setAgendaError("Nog geen afspraken gevonden voor deze dag.");
                    } else {
                        setAgendaError(errors[0] || "Koppel je agenda via Google of Outlook om afspraken te zien.");
                    }
                } else {
                    setAgendaError("");
                }
            } catch (agendaLoadError) {
                if (!cancelled) {
                    setAgendaEvents([]);
                    setAgendaError(agendaLoadError.message || "Koppel je agenda via Google of Outlook om afspraken te zien.");
                    setAgendaLinked(false);
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

    async function pollAgendaConnection(provider) {
        let lastError = "";

        for (let attempt = 0; attempt < 45; attempt += 1) {
            try {
                const result = await fetchCalendarEvents(apiBaseUrl, accessToken, provider, selectedReportDate);

                if (result?.connected) {
                    setAgendaLinked(true);
                    setAgendaEvents(sortAgendaEvents(Array.isArray(result.events) ? result.events : []));
                    setAgendaError("");
                    return true;
                }
            } catch (error) {
                lastError = error?.message || "";
            }

            await waitFor(1500);
        }

        setAgendaLinked(false);
        if (lastError) {
            setAgendaError(lastError);
        } else {
            setAgendaError("De koppeling lijkt nog niet afgerond. Probeer opnieuw of wacht even.");
        }

        return false;
    }

    async function handleConnectAgenda(provider) {
        if (!accessToken || agendaConnectingProvider) {
            return;
        }

        setAgendaConnectingProvider(provider);
        setAgendaLoading(true);
        setAgendaError("");

        try {
            const connectUrl = await fetchCalendarConnectUrl(apiBaseUrl, accessToken, provider);

            if (window.reMindPlatform && typeof window.reMindPlatform.openExternal === "function") {
                await window.reMindPlatform.openExternal(connectUrl);
                await pollAgendaConnection(provider);
            } else {
                const popup = window.open(connectUrl, "re-mind-calendar-connect", "width=600,height=700");

                if (!popup) {
                    window.location.assign(connectUrl);
                    return;
                } else {
                    try {
                        popup.focus();
                    } catch (error) {
                        // ignore
                    }

                    const isConnected = await pollAgendaConnection(provider);
                    if (isConnected && !popup.closed) {
                        try {
                            popup.close();
                        } catch (error) {
                            // ignore
                        }
                    }
                }
            }
        } catch (connectError) {
            setAgendaError(connectError.message || "Kon agenda-koppeling niet starten.");
            setAgendaLinked(false);
        } finally {
            setAgendaConnectingProvider("");
            setAgendaLoading(false);
        }
    }

    async function handleDisconnectAgenda() {
        if (!accessToken) {
            return;
        }

        setAgendaLoading(true);
        setAgendaDisconnecting(true);
        setAgendaError("");

        try {
            await disconnectCalendar(apiBaseUrl, accessToken);
            setAgendaLinked(false);
            setAgendaEvents([]);
            setAgendaError("Koppel je agenda via Google of Outlook om afspraken te zien.");
        } catch (disconnectError) {
            setAgendaError(disconnectError.message || "Agenda loskoppelen mislukt.");
        } finally {
            setAgendaDisconnecting(false);
            setAgendaLoading(false);
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
                    <p className="reportBigValue">{totalWorkTimeLabel}</p>
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
                    {adviceMessage}
                </article>
            </section>

            <section className="reportSection">
                <div className="reportSectionHeader">
                    <h3 className="reportSectionTitle reportSectionTitleLarge">Jouw agenda vandaag</h3>
                    {agendaLinked ? (
                        <button className="reportAgendaButton" type="button" onClick={handleDisconnectAgenda}>
                            Agenda loskoppelen
                        </button>
                    ) : (
                        <div className="reportAgendaActions">
                            <button className="reportAgendaButton" type="button" onClick={() => handleConnectAgenda("google")} disabled={Boolean(agendaConnectingProvider)}>
                                {agendaConnectingProvider === "google" ? "Bezig met koppelen..." : "Google Agenda koppelen"}
                            </button>
                            <button className="reportAgendaButton" type="button" onClick={() => handleConnectAgenda("microsoft")} disabled={Boolean(agendaConnectingProvider)}>
                                {agendaConnectingProvider === "microsoft" ? "Bezig met koppelen..." : "Outlook koppelen"}
                            </button>
                        </div>
                    )}
                </div>

                <article className="reportAgendaCard">
                    {agendaLoading ? (
                        <SmallLoader message={agendaDisconnecting ? "Agenda wordt losgekoppeld." : "Agenda wordt geladen..."} />
                    ) : agendaEvents.length ? (
                        <ul className="reportAgendaList" aria-label="Afspraken voor deze dag">
                            {agendaEvents.map((event) => (
                                <li className="reportAgendaItem" key={`${event.provider}-${event.id}`}>
                                    <div className="reportAgendaItemHeader">
                                        <p className="reportAgendaItemTitle">{event.title}</p>
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