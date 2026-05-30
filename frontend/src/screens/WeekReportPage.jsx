import "../css/WeekReportPage.css";
import { useEffect, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuSparkles, LuClock3, LuBatteryCharging } from "react-icons/lu";
import { HiOutlineTrendingUp } from "react-icons/hi";
import { TbActivityHeartbeat, TbZzz } from "react-icons/tb";
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

const insights = [
    {
        day: "Maandag",
        icon: <LuSparkles />,
        text: "Je start de week met hoge stress en energie, maar neemt voldoende pauzes om het tempo vol te houden.",
    },
    {
        day: "Dinsdag",
        icon: <TbZzz />,
        text: "Door minder pauzes zakt je energie, terwijl het stressniveau tijdelijk lager blijft.",
    },
    {
        day: "Woensdag",
        icon: <LuClock3 />,
        text: "Drukke vergaderingen zorgen voor een gemiddeld stressniveau en een lichte heropleving van je energie.",
    },
    {
        day: "Donderdag",
        icon: <TbActivityHeartbeat />,
        text: "Extra pauzemomenten, zoals een lunchpauze, helpen om hogere stress onder controle te houden.",
    },
    {
        day: "Vrijdag",
        icon: <HiOutlineTrendingUp />,
        text: "Je stress daalt richting het weekend, maar je energieniveau blijft beperkt door vermoeidheid.",
    },
];

function formatDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function WeekReportPage({ accessToken }) {
    const [selectedWeekStart, setSelectedWeekStart] = useState(() => getStartOfWeek(new Date()));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [report, setReport] = useState(null);
    const daily = Array.isArray(report?.daily) && report.daily.length > 0
        ? report.daily
        : [
            { label: "Ma", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0 },
            { label: "Di", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0 },
            { label: "Wo", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0 },
            { label: "Do", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0 },
            { label: "Vr", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0 },
            { label: "Za", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0 },
            { label: "Zo", averageStress: null, averageEnergy: null, breaks_taken: 0, breaks_skipped: 0 },
        ];
    const avgStressLabel = report?.averageStress == null ? "-" : `${report.averageStress}/5`;
    const avgEnergyLabel = report?.averageEnergy == null ? "-" : `${report.averageEnergy}/5`;
    const lineChartData = {
        labels: daily.map((item) => item.label),
        datasets: [
            {
                label: "Stress",
                data: daily.map((item) => item.averageStress),
                borderColor: "#C67052",
                backgroundColor: "rgba(198, 112, 82, 0.18)",
                pointBackgroundColor: "#C67052",
                pointBorderColor: "#FFFCF5",
                pointBorderWidth: 2,
                pointRadius: 4,
                tension: 0.35,
                spanGaps: true,
            },
            {
                label: "Energie",
                data: daily.map((item) => item.averageEnergy),
                borderColor: "#5A8A74",
                backgroundColor: "rgba(90, 138, 116, 0.16)",
                pointBackgroundColor: "#5A8A74",
                pointBorderColor: "#FFFCF5",
                pointBorderWidth: 2,
                pointRadius: 4,
                tension: 0.35,
                spanGaps: true,
            },
        ],
    };
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: "bottom",
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
                min: 0,
                max: 5,
                ticks: {
                    stepSize: 1,
                },
                grid: {
                    color: "rgba(118, 147, 130, 0.14)",
                },
            },
            x: {
                grid: {
                    color: "rgba(118, 147, 130, 0.08)",
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
                backgroundColor: "#769382",
                borderRadius: 6,
                maxBarThickness: 26,
            },
            {
                label: "Pauzes genegeerd",
                data: daily.map((item) => Number(item.breaks_skipped ?? 0)),
                backgroundColor: "#C67052",
                borderRadius: 6,
                maxBarThickness: 26,
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
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0,
                    stepSize: 1,
                },
                grid: {
                    color: "rgba(118, 147, 130, 0.14)",
                },
            },
            x: {
                grid: {
                    display: false,
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
                                <span className="weekReportStatLabel">Gemiddelde stress</span>
                                <strong className="weekReportStatValue weekReportStatValueStress">{avgStressLabel}</strong>
                            </div>

                            <div className="weekReportDivider" aria-hidden="true" />

                            <div className="weekReportStatItem">
                                <LuBatteryCharging className="weekReportStatIcon" />
                                <span className="weekReportStatLabel">Gemiddelde energie</span>
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
                        {insights.map((item) => (
                            <div key={item.day} className="weekReportInsightRow">
                                <div className="weekReportInsightDay">
                                    <span className="weekReportInsightBadge">{item.icon}</span>
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