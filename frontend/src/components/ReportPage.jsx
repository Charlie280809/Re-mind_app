import "../css/ReportPage.css";
import { useEffect, useMemo, useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { TbCrown } from "react-icons/tb";

function TrendIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 16l5-5 4 4 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 8h6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function EnergyIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M14 3l-1 7h5l-6 11 1-7H8l6-11z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}

export default function ReportPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [report, setReport] = useState(null);

    useEffect(() => {
        const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

        async function loadReport() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(`${apiBaseUrl}/report/today`);

                if (!response.ok) {
                    throw new Error(`Backend gaf status ${response.status}`);
                }

                const data = await response.json();
                setReport(data);
            } catch (err) {
                setError(err.message || "Kon het dagrapport niet ophalen.");
            } finally {
                setLoading(false);
            }
        }

        loadReport();
    }, []);

    const reportTitle = useMemo(() => {
        if (!report?.date) {
            return "Dagrapport van vandaag";
        }

        const date = new Date(`${report.date}T00:00:00`);
        return `Dagrapport van ${date.toLocaleDateString("nl-BE")}`;
    }, [report?.date]);

    const avgStressLabel = report?.averageStress == null ? "-" : `${report.averageStress}/5`;
    const avgEnergyLabel = report?.averageEnergy == null ? "-" : `${report.averageEnergy}/5`;

    return (
        <main className="reportPage">
            <header className="reportHeader">
                <div className="reportTitleGroup">
                    <button className="reportNavButton" type="button" aria-label="Vorige dagrapport">
                        <LuChevronLeft />
                    </button>

                    <h1 className="reportTitle">{reportTitle}</h1>

                    <button className="reportNavButton" type="button" aria-label="Volgende dagrapport">
                        <LuChevronRight />
                    </button>
                </div>

                <button className="reportWeekButton" type="button">
                    <TbCrown aria-hidden="true" />
                    <span>Bekijk weekrapport</span>
                </button>
            </header>

            <section className="reportMetricsRow" aria-label="Samenvatting">
                <article className="reportMetricCard reportMetricCardWorktime">
                    <h2 className="reportSectionTitle">Totale werktijd</h2>
                    <p className="reportBigValue">7 uur en 26 minuten</p>
                </article>

                <article className="reportMetricCard reportMetricCardStats">
                    <h2 className="reportSectionTitle">Gemiddelde stress en energie</h2>

                    <div className="reportStatsSplit">
                        <div className="reportStatItem">
                            <div className="reportStatLabel">
                                <TrendIcon />
                                <span>Gemiddelde stress</span>
                            </div>
                            <p className="reportStatValue reportStatValueStress">{avgStressLabel}</p>
                        </div>

                        <div className="reportStatItem">
                            <div className="reportStatLabel">
                                <EnergyIcon />
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
                    <h2 className="reportSectionTitle reportSectionTitleLarge">Pauzeoverzicht</h2>
                    <p className="reportSectionMeta">Totale tijd gepauzeerd: <strong>34 minuten</strong></p>
                </div>

                <article className="reportCard reportBreakCard">
                    <div className="reportBreakRow">
                        <span className="reportBreakLabel">Pauzes genomen:</span>
                        <div className="reportDots" aria-hidden="true">
                            <span className="reportDot reportDotGood" />
                            <span className="reportDot reportDotGood" />
                            <span className="reportDot reportDotGood" />
                        </div>
                    </div>

                    <div className="reportBreakRow">
                        <span className="reportBreakLabel">Pauzes overgeslagen:</span>
                        <div className="reportDots" aria-hidden="true">
                            <span className="reportDot reportDotBad" />
                            <span className="reportDot reportDotBad" />
                        </div>
                    </div>
                </article>
            </section>

            <section className="reportSection">
                <h2 className="reportSectionTitle reportSectionTitleLarge">Advies</h2>

                <article className="reportAdviceCard">
                    Er wordt aangeraden om minstens elk uur (maximum elke 2 uur) een korte pauze te nemen om je geest tot rust te
                    brengen en je brein terug op te laden.
                </article>
            </section>

            <section className="reportSection reportAgendaSection">
                <div className="reportSectionHeader">
                    <h2 className="reportSectionTitle reportSectionTitleLarge">Jouw agenda vandaag</h2>
                    <button className="reportAgendaButton" type="button">
                        Link agenda
                    </button>
                </div>

                <article className="reportAgendaCard">
                    <div className="reportAgendaTime">8:00</div>
                </article>
            </section>
        </main>
    );
}