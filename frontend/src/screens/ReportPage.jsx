import "../css/ReportPage.css";
import { useEffect, useMemo, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuBatteryCharging  } from "react-icons/lu";
import { HiOutlineTrendingUp  } from "react-icons/hi";
import { TbCrown } from "react-icons/tb";
import PremiumModal from "../components/PremiumModal";
import { fetchTodayReport } from "../api/reportApi";

const dateOptions = { day: "numeric", month: "long", year: "numeric" };

function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat("nl-BE", dateOptions).format(date);
}

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

export default function ReportPage({ isPremium, onNavigateToUpgrade, accessToken }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [report, setReport] = useState(null);
    const [selectedReportDate, setSelectedReportDate] = useState(() => formatDateKey(new Date()));
    const [premiumModalContent, setPremiumModalContent] = useState(null);

    const breaksTaken = Number(report?.breaks_taken ?? 0);
    const breaksSkipped = Number(report?.breaks_skipped ?? 0);
    const todayDateKey = useMemo(() => formatDateKey(new Date()), []);
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
    }, [accessToken, selectedReportDate]);

    const reportTitle = useMemo(() => {
        const reportDate = new Date(`${selectedReportDate}T00:00:00`);
        const safeDate = Number.isNaN(reportDate.getTime()) ? new Date() : reportDate;
        return `Rapport van ${formatDate(safeDate)}`;
    }, [selectedReportDate]);

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

            {loading ? <p className="reportSectionMeta">Rapport wordt geladen...</p> : null}
            {!loading && error ? <p className="reportSectionMeta">Fout: {error}</p> : null}
            {/* {!loading && !error && report?.totalCheckins === 0 ? (
                <p className="reportSectionMeta">Nog geen check-ins vandaag. Vul stress en energie in om data op te bouwen.</p>
            ) : null} */}

            <section className="reportSection">
                <div className="reportSectionHeader">
                    <h3 className="reportSectionTitle reportSectionTitleLarge">Pauzeoverzicht</h3>
                    <p className="reportSectionMeta">Totale tijd gepauzeerd: <strong>{report?.totalBreakTime || "0 minuten"}</strong></p>
                </div>

                <article className="reportCard reportBreakCard">
                    <div className="reportBreakRow">
                        <span className="reportBreakLabel">Pauzes genomen:</span>
                        <div className="reportDots" aria-hidden="true">
                            {Array.from({ length: breaksTaken }).map((_, index) => (
                                <span key={`taken-${index}`} className="reportDot reportDotGood" />
                            ))}
                        </div>
                        <strong className="reportBreakCount reportBreakCountGood">{breaksTaken}</strong>
                    </div>

                    <div className="reportBreakRow">
                        <span className="reportBreakLabel">Pauzes overgeslagen:</span>
                        <div className="reportDots" aria-hidden="true">
                            {Array.from({ length: breaksSkipped }).map((_, index) => (
                                <span key={`skipped-${index}`} className="reportDot reportDotBad" />
                            ))}
                        </div>
                        <strong className="reportBreakCount reportBreakCountBad">{breaksSkipped}</strong>
                    </div>
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
                    <button className="reportAgendaButton" type="button">
                        Link agenda
                    </button>
                </div>

                <article className="reportAgendaCard">
                    {/* agenda integratie */}
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