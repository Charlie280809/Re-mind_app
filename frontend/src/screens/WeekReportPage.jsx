import "../css/WeekReportPage.css";
import { useEffect, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuBatteryCharging } from "react-icons/lu";
import { HiOutlineTrendingUp } from "react-icons/hi";
import { Bar, Line } from "react-chartjs-2";
import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LineElement,
    LinearScale,
    BarElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import { formatWeekRange, getEndOfWeek, getStartOfWeek } from "../lib/dateFormat";
import SmallLoader from "../components/SmallLoader";
import { fetchWeekReport } from "../api/reportApi";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

function formatDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getFullDayName(dayLabel) {
    const dayNames = {
        Ma: "maandag",
        Di: "dinsdag",
        Wo: "woensdag",
        Do: "donderdag",
        Vr: "vrijdag",
        Za: "zaterdag",
        Zo: "zondag",
    };

    return dayNames[dayLabel] || "deze dag";
}

function getDayInsight(day) {
    const breaksTaken = Number(day?.breaks_taken ?? 0);
    const breaksSkipped = Number(day?.breaks_skipped ?? 0);
    const averageStress = Number(day?.averageStress);
    const averageEnergy = Number(day?.averageEnergy);
    const fullDayName = getFullDayName(day?.label);
    const hasData = Number(day?.totalCheckins ?? 0) > 0 || breaksTaken > 0 || breaksSkipped > 0 || day?.averageStress != null || day?.averageEnergy != null;

    if (!hasData) {
        return ``;
    }

    if(averageStress >= 4.3 && breaksTaken >= 5) {
        return `Op ${fullDayName} ervaarde je hoge stress, hoewel je pauzes nam. Zorg ervoor dat je pauzes echt rustmomenten zijn die herstellend werken (zie onze pauzesuggesties).`;
    }

    if (breaksSkipped > breaksTaken && averageStress >= 4 && averageEnergy <= 2) {
        return `Je slaat op ${fullDayName} vaker pauzes over terwijl stress hoog en energie laag is. Korte herstelpauzes zouden hier het meeste verschil maken.`;
    }

    if (breaksSkipped > breaksTaken && breaksSkipped >= 3) {
        return `Op ${fullDayName} heb je meer pauzes overgeslagen dan genomen. Een vast pauzemoment kan helpen om je ritme stabieler te houden.`;
    }

    if (averageStress >= 4 && averageEnergy <= 2) {
        return `Op ${fullDayName} lag je stress hoog en je energie laag. Regelmatige pauzes kunnen je helpen om sneller te herstellen.`;
    }

    if (averageStress >= 4) {
        return `Je stress lag op ${fullDayName} hoog. Zorg dat je pauzes voldoende rust geven en niet enkel onderbreken.`;
    }

    if (averageEnergy <= 2 && breaksTaken >= 2) {
        return `Je had weinig energie op ${fullDayName}. Overweeg om een paar rustmomenten extra te nemen, dat kan hier nuttig zijn.`;
    }

    if (breaksTaken >= 4 && breaksTaken > breaksSkipped && averageStress <= 2 && averageEnergy >= 3) {
        return `Op ${fullDayName} zat je pauzeritme sterk en bleef je stress laag. Dat is een goed patroon om aan te houden.`;
    }

    if (breaksTaken > 0 && breaksTaken === breaksSkipped) {
        return `Op ${fullDayName} nam je evenveel pauzes als je oversloeg. Probeer om minder pauzes over te slaan.`;
    }

    if (breaksSkipped < 1 && breaksTaken > 0) {
        return `Op ${fullDayName} sloeg je geen enkele pauze over. Doe zo verder!`;
    }

    if (breaksTaken === 0 && breaksSkipped === 0 && averageStress > 0 && averageEnergy > 0) {
        return `Op ${fullDayName} heb je geen pauzes genomen. Probeer te onthouden dat pauzes belangrijk zijn voor je welzijn.`;
    }

    return `Blijf op ${fullDayName} je pauzes en energie opvolgen; kleine aanpassingen kunnen je stress merkbaar helpen verlagen.`;
}

export default function WeekReportPage({ accessToken }) {
    const [selectedWeekStart, setSelectedWeekStart] = useState(() => getStartOfWeek(new Date()));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [report, setReport] = useState(null);
    const daily = Array.isArray(report?.daily) && report.daily.length > 0
        ? report.daily
        : [
            { label: "Ma", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0, totalCheckins: 0 },
            { label: "Di", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0, totalCheckins: 0 },
            { label: "Wo", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0, totalCheckins: 0 },
            { label: "Do", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0, totalCheckins: 0 },
            { label: "Vr", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0, totalCheckins: 0 },
            { label: "Za", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0, totalCheckins: 0 },
            { label: "Zo", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0, totalCheckins: 0 },
        ];
    const dailyInsights = daily.map((item) => ({
        day: item.label,
        text: getDayInsight(item),
    }));
    const avgStressLabel = report?.averageStress == null ? "-" : `${report.averageStress}/5`;
    const avgEnergyLabel = report?.averageEnergy == null ? "-" : `${report.averageEnergy}/5`;
    const lineChartData = {
        labels: daily.map((item) => item.label),
        datasets: [
            {
                label: "Stress",
                data: daily.map((item) => item.averageStress),
                borderColor: "#E3CB91",
                backgroundColor: "#E3CB91",
                pointBackgroundColor: "#E3CB91",
                pointBorderWidth: 6,
                pointRadius: 6,
                tension: 0.35,
                spanGaps: true,
                clip: false,
            },
            {
                label: "Energie",
                data: daily.map((item) => item.averageEnergy),
                borderColor: "#8CB2C8",
                backgroundColor: "#8CB2C8",
                pointBackgroundColor: "#8CB2C8",
                pointBorderWidth: 6,
                pointRadius: 6,
                tension: 0.35,
                spanGaps: true,
                clip: false,
            },
        ],
    };
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 8,
                bottom: 8,
            },
        },
        plugins: {
            legend: {
                display: true,
                position: "bottom",
                ticks: {
                    color: "#414141",
                    font: { family: "nunito, sans-serif", size: 16 },
                },
                labels: {
                    color: "#414141",
                    font: { family: "nunito, sans-serif", size: 16 },
                    usePointStyle: true,
                    pointStyle: "circle",
                    pointStyleWidth: 16,
                    pointStyleHeight: 16,
                    boxWidth: 16,
                    boxHeight: 16,
                },
            },
            tooltip: {
                callbacks: {
                    label(context) {
                        const value = context.raw;
                        return value == null ? `${context.dataset.label}: geen data` : `${context.dataset.label}: ${value}/5`;
                    },
                },
            },
        },
        scales: {
            y: {
                min: 1,
                max: 5,
                ticks: {
                    stepSize: 1,
                    color: "#414141",
                    font: { family: "nunito, sans-serif", size: 16 },
                },
                grid: {
                    color: "#C4C4C4",
                    font: { family: "nunito, sans-serif", size: 16 },
                },
            },
            x: {
                ticks: {
                    color: "#414141",
                    font: { family: "nunito, sans-serif", size: 16 },
                },
                grid: {
                    color: "#E3E3E3",
                },
            },
        },
    };
    const barChartData = {
        labels: daily.map((item) => item.label),
        datasets: [
            {
                label: "Pauzes genomen",
                data: daily.map((item) => Number(item.breaks_taken ?? 0)),
                backgroundColor: "#A8BFAF",
                borderRadius: 6,
                maxBarThickness: 32,
            },
            {
                label: "Pauzes overgeslagen",
                data: daily.map((item) => Number(item.breaks_skipped ?? 0)),
                backgroundColor: "#DA8383",
                borderRadius: 6,
                maxBarThickness: 32,
            },
        ],
    };
    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: "bottom",
                labels: {
                    color: "#414141",
                    font: { family: "nunito, sans-serif", size: 16 },
                    usePointStyle: true,
                    pointStyle: "circle",
                    boxWidth: 16,
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0,
                    stepSize: 2,
                    color: "#414141",
                    font: { family: "nunito, sans-serif", size: 16 },
                },
                grid: {
                    color: "#E3E3E3",
                },
            },
            x: {
                ticks: {
                    color: "#414141",
                    font: { family: "nunito, sans-serif", size: 16 },
                },
                grid: {
                    color: "#E3E3E3",
                },
            },
        },
    };
    const currentWeekStart = getStartOfWeek(new Date());
    const isCurrentWeek = selectedWeekStart.getTime() >= currentWeekStart.getTime();
    const weekTitle = `Weekrapport van ${formatWeekRange(selectedWeekStart, getEndOfWeek(selectedWeekStart))}`;

    useEffect(() => {
        async function loadWeekReport() {
            setLoading(true);
            setError("");

            try {
                const reportData = await fetchWeekReport(accessToken, formatDateKey(selectedWeekStart));
                setReport(reportData);
            } catch (err) {
                setError(err.message || "Kon het weekrapport niet ophalen.");
            } finally {
                setLoading(false);
            }
        }

        loadWeekReport();
    }, [accessToken, selectedWeekStart]);

    function handlePreviousWeek() {
        setSelectedWeekStart((currentDate) => {
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() - 7);
            return getStartOfWeek(nextDate);
        });
    }

    function handleNextWeek() {
        if (isCurrentWeek) {
            return;
        }

        setSelectedWeekStart((currentDate) => {
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 7);
            return getStartOfWeek(nextDate);
        });
    }

    if (loading) {
        return (
            <main className="weekReportPage">
                <header className="weekReportHeader">
                    <div className="weekReportTitleGroup">
                        <button className="weekReportNavButton" type="button" aria-label="Vorige week" onClick={handlePreviousWeek}>
                            <LuChevronLeft />
                        </button>

                        <h2 className="weekReportTitle">{weekTitle}</h2>

                        <button className="weekReportNavButton" type="button" aria-label="Volgende week" onClick={handleNextWeek} disabled={isCurrentWeek}>
                            <LuChevronRight />
                        </button>
                    </div>
                </header>

                <SmallLoader message="Weekrapport wordt geladen..." />
            </main>
        );
    }

    return (
        <main className="weekReportPage">
            <header className="weekReportHeader">
                <div className="weekReportTitleGroup">
                    <button className="weekReportNavButton" type="button" aria-label="Vorige week" onClick={handlePreviousWeek}>
                        <LuChevronLeft />
                    </button>

                    <h2 className="weekReportTitle">{weekTitle}</h2>

                    <button className="weekReportNavButton" type="button" aria-label="Volgende week" onClick={handleNextWeek} disabled={isCurrentWeek}>
                        <LuChevronRight />
                    </button>
                </div>
            </header>

            {error ? <p className="weekReportSectionMeta">Fout: {error}</p> : null}

            <section className="weekReportTopGrid" aria-label="Weekoverzicht">
                <article className="weekReportStatBlock">
                    <h3 className="weekReportSectionTitle">Totale werktijd</h3>
                    <p className="weekReportValueCard">{report?.totalWorkTime || "0 uur en 0 minuten"}</p>
                </article>

                <article className="weekReportChartBlock">
                    <div className="weekReportSectionHeading">
                        <h3 className="weekReportSectionTitle">Stress en energie</h3>
                        <span className="weekReportSectionMeta">(gemiddelde per dag)</span>
                    </div>

                    <div className="weekReportChartRow">
                        <article className="weekReportLineChartCard">
                            <div className="weekReportChartCanvasWrap" role="img" aria-label="Stress en energie per dag">
                                <Line data={lineChartData} options={lineChartOptions} />
                            </div>
                        </article>

                        <article className="weekReportStatsCard">
                            <div className="weekReportStatItem">
                                <HiOutlineTrendingUp className="weekReportStatIcon" />
                                <span className="weekReportStatLabel">Gem. stress</span>
                                <strong className="weekReportStatValue weekReportStatValueStress">{avgStressLabel}</strong>
                            </div>

                            <div className="weekReportDivider" aria-hidden="true" />

                            <div className="weekReportStatItem">
                                <LuBatteryCharging className="weekReportStatIcon" />
                                <span className="weekReportStatLabel">Gem. energie</span>
                                <strong className="weekReportStatValue weekReportStatValueEnergy">{avgEnergyLabel}</strong>
                            </div>
                        </article>
                    </div>
                </article>
            </section>

            <section className="weekReportSection">
                <div className="weekReportSectionHeading weekReportSectionHeadingSplit">
                    <h3 className="weekReportSectionTitle">Pauzegedrag</h3>
                    <p className="weekReportSectionMeta">Totale tijd gepauzeerd: <strong>{report?.totalBreakTime || "0 minuten"}</strong></p>
                </div>

                <article className="weekReportBarChartCard">
                    <div className="weekReportBarCanvasWrap" role="img" aria-label="Pauzes genomen en overgeslagen per dag">
                        <Bar data={barChartData} options={barChartOptions} />
                    </div>
                </article>
            </section>

            <section className="weekReportSection weekReportInsightsSection">
                <h3 className="weekReportSectionTitle">Inzichten van afgelopen week</h3>

                <article className="weekReportInsightsCard">
                    <div className="weekReportTimeline" aria-hidden="true" />

                    <div className="weekReportInsightList">
                        {dailyInsights.map((item) => (
                            <div key={item.day} className="weekReportInsightRow">
                                <div className="weekReportInsightDay">
                                    <span>{item.day}</span>
                                </div>
                                <p className="weekReportInsightText">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
        </main>
    );
}