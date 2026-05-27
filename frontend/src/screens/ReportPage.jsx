import "../css/ReportPage.css";
import { useEffect, useMemo, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuZap } from "react-icons/lu";
import { HiOutlineTrendingUp  } from "react-icons/hi";
import { TbCrown } from "react-icons/tb";
import PremiumModal from "../components/PremiumModal";
import { getApiBaseUrl } from "../api/apiBaseUrl";
import { fetchLatestWorkSessionBreaks } from "../api/backendApi";
import { fetchTodayReport } from "../api/reportApi";

const dateOptions = { day: "numeric", month: "long", year: "numeric" };

function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat("nl-BE", dateOptions).format(date);
}

export default function ReportPage({ isPremium, onNavigateToUpgrade, accessToken }) {
    const apiBaseUrl = getApiBaseUrl();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [report, setReport] = useState(null);
    const [premiumModalOpen, setPremiumModalOpen] = useState(false);
    const [pauseCounts, setPauseCounts] = useState({ breaks_taken: 0, breaks_skipped: 0 });

    const breaksTaken = Number(pauseCounts.breaks_taken ?? 0);
    const breaksSkipped = Number(pauseCounts.breaks_skipped ?? 0);

    useEffect(() => {
        async function loadReport() {
            setLoading(true);
            setError("");

            try {
                const [reportData, breakData] = await Promise.all([
                    fetchTodayReport(accessToken),
                    fetchLatestWorkSessionBreaks(apiBaseUrl, accessToken),
                ]);

                setReport(reportData);
                setPauseCounts(breakData);
            } catch (err) {
                setError(err.message || "Kon het dagrapport niet ophalen.");
            } finally {
                setLoading(false);
            }
        }

        loadReport();
    }, [accessToken]);

    const reportTitle = useMemo(() => {
        const reportDate = report?.date ? new Date(`${report.date}T00:00:00`) : new Date();
        const safeDate = Number.isNaN(reportDate.getTime()) ? new Date() : reportDate;
        return `Rapport van ${formatDate(safeDate)}`;
    }, [report?.date]);

    const avgStressLabel = report?.averageStress == null ? "-" : `${report.averageStress}/5`;
    const avgEnergyLabel = report?.averageEnergy == null ? "-" : `${report.averageEnergy}/5`;

    function openPremiumModal() {
        setPremiumModalOpen(true);
    }

    function closePremiumModal() {
        setPremiumModalOpen(false);
    }

    return (
        <main className="reportPage">
            <header className="reportHeader">
                <div className="reportTitleGroup">
                    <button className="reportNavButton" type="button" aria-label="Vorige dagrapport">
                        <LuChevronLeft />
                    </button>

                    <h2 className="reportTitle">{reportTitle}</h2>

                    <button className="reportNavButton" type="button" aria-label="Volgende dagrapport">
                        <LuChevronRight />
                    </button>
                </div>

                {!isPremium ? (
                    <button className="reportWeekButton" type="button" onClick={openPremiumModal}>
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
                                <LuZap />
                                <span>Gemiddelde energie</span>
                            </div>
                            <p className="reportStatValue reportStatValueEnergy">{avgEnergyLabel}</p>
                        </div>
                    </div>
                </article>
            </section>

            {loading ? <p className="reportSectionMeta">Rapport wordt geladen...</p> : null}
            {!loading && error ? <p className="reportSectionMeta">Fout: {error}</p> : null}
            {!loading && !error && report?.totalCheckins === 0 ? (
                <p className="reportSectionMeta">Nog geen check-ins vandaag. Vul stress en energie in om data op te bouwen.</p>
            ) : null}

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

            {premiumModalOpen ? (
                <PremiumModal
                    title="Ontgrendel weekrapporten"
                    description="Bekijk je weekrapporten met Premium."
                    onClose={closePremiumModal}
                    onUpgrade={onNavigateToUpgrade}
                />
            ) : null}
        </main>
    );
}