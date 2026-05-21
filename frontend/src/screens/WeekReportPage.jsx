import "../css/WeekReportPage.css";
import { LuChevronLeft, LuChevronRight, LuSparkles, LuClock3 } from "react-icons/lu";
import { HiOutlineTrendingUp } from "react-icons/hi";
import { TbActivityHeartbeat, TbZzz } from "react-icons/tb";

const stressEnergyData = [
    { day: "Ma", stress: 4.8, energy: 4.0 },
    { day: "Di", stress: 1.5, energy: 3.6 },
    { day: "Wo", stress: 2.8, energy: 2.0 },
    { day: "Do", stress: 4.0, energy: 2.6 },
    { day: "Vr", stress: 3.5, energy: 3.0 },
];

const pauseData = [
    { day: "Ma", taken: 5, skipped: 0 },
    { day: "Di", taken: 3, skipped: 1 },
    { day: "Wo", taken: 2, skipped: 3 },
    { day: "Do", taken: 4, skipped: 0 },
    { day: "Vr", taken: 3, skipped: 1 },
];

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

const chartWidth = 360;
const chartHeight = 170;
const chartPadding = 18;

function buildLinePath(values) {
    const range = 5;
    const innerWidth = chartWidth - chartPadding * 2;
    const innerHeight = chartHeight - chartPadding * 2;

    return values
        .map((value, index) => {
            const x = chartPadding + (innerWidth / (values.length - 1)) * index;
            const y = chartHeight - chartPadding - ((value / range) * innerHeight);
            return `${index === 0 ? "M" : "L"}${x},${y}`;
        })
        .join(" ");
}

export default function WeekReportPage() {
    const stressPath = buildLinePath(stressEnergyData.map((item) => item.stress));
    const energyPath = buildLinePath(stressEnergyData.map((item) => item.energy));

    return (
        <main className="weekReportPage">
            <header className="weekReportHeader">
                <div className="weekReportTitleGroup">
                    <button className="weekReportNavButton" type="button" aria-label="Vorige week">
                        <LuChevronLeft />
                    </button>

                    <h2 className="weekReportTitle">Weekrapport van 08-12 tot 14-12</h2>

                    <button className="weekReportNavButton" type="button" aria-label="Volgende week">
                        <LuChevronRight />
                    </button>
                </div>
            </header>

            <section className="weekReportTopGrid" aria-label="Weekoverzicht">
                <article className="weekReportStatBlock">
                    <h3 className="weekReportSectionTitle">Totale werktijd</h3>
                    <p className="weekReportValueCard">38 uur en 12 minuten</p>
                </article>

                <article className="weekReportChartBlock">
                    <div className="weekReportSectionHeading">
                        <h3 className="weekReportSectionTitle">Stress en energie</h3>
                        <span className="weekReportSectionMeta">gemiddelde per dag</span>
                    </div>

                    <div className="weekReportChartRow">
                        <article className="weekReportLineChartCard">
                            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="weekReportLineChart" role="img" aria-label="Stress en energie per dag">
                                <g className="weekReportGrid" aria-hidden="true">
                                    {[1, 2, 3, 4, 5].map((value) => {
                                        const y = chartHeight - chartPadding - ((value / 5) * (chartHeight - chartPadding * 2));
                                        return <line key={value} x1={chartPadding} x2={chartWidth - chartPadding} y1={y} y2={y} />;
                                    })}
                                    {[0, 1, 2, 3, 4].map((index) => {
                                        const x = chartPadding + ((chartWidth - chartPadding * 2) / 4) * index;
                                        return <line key={index} y1={chartPadding} y2={chartHeight - chartPadding} x1={x} x2={x} />;
                                    })}
                                </g>

                                <path className="weekReportStressPath" d={stressPath} />
                                <path className="weekReportEnergyPath" d={energyPath} />

                                {stressEnergyData.map((item, index) => {
                                    const x = chartPadding + ((chartWidth - chartPadding * 2) / (stressEnergyData.length - 1)) * index;
                                    const stressY = chartHeight - chartPadding - ((item.stress / 5) * (chartHeight - chartPadding * 2));
                                    const energyY = chartHeight - chartPadding - ((item.energy / 5) * (chartHeight - chartPadding * 2));

                                    return (
                                        <g key={item.day}>
                                            <circle className="weekReportStressPoint" cx={x} cy={stressY} r="4.5" />
                                            <circle className="weekReportEnergyPoint" cx={x} cy={energyY} r="4.5" />
                                            <text x={x} y={chartHeight - 4} className="weekReportChartLabel">{item.day}</text>
                                        </g>
                                    );
                                })}
                            </svg>

                            <div className="weekReportLegend" aria-hidden="true">
                                <span><i className="weekReportLegendDot weekReportLegendDotStress" />Stress</span>
                                <span><i className="weekReportLegendDot weekReportLegendDotEnergy" />Energie</span>
                            </div>
                        </article>

                        <article className="weekReportStatsCard">
                            <div className="weekReportStatItem">
                                <HiOutlineTrendingUp className="weekReportStatIcon" />
                                <span className="weekReportStatLabel">Gemiddelde stress</span>
                                <strong className="weekReportStatValue weekReportStatValueStress">3.7/5</strong>
                            </div>

                            <div className="weekReportDivider" aria-hidden="true" />

                            <div className="weekReportStatItem">
                                <TbActivityHeartbeat className="weekReportStatIcon" />
                                <span className="weekReportStatLabel">Gemiddelde energie</span>
                                <strong className="weekReportStatValue weekReportStatValueEnergy">3.2/5</strong>
                            </div>
                        </article>
                    </div>
                </article>
            </section>

            <section className="weekReportSection">
                <div className="weekReportSectionHeading weekReportSectionHeadingSplit">
                    <h3 className="weekReportSectionTitle">Pauzegedrag</h3>
                    <p className="weekReportSectionMeta">Totale tijd gepauzeerd: <strong>1u 48m</strong></p>
                </div>

                <article className="weekReportBarChartCard">
                    <div className="weekReportBarChart" role="img" aria-label="Pauzes genomen en overgeslagen per dag">
                        {pauseData.map((item) => (
                            <div className="weekReportBarGroup" key={item.day}>
                                <div className="weekReportBars">
                                    <span className="weekReportBar weekReportBarTaken" style={{ height: `${item.taken * 14}px` }} />
                                    <span className="weekReportBar weekReportBarSkipped" style={{ height: `${item.skipped * 14}px` }} />
                                </div>
                                <span className="weekReportBarLabel">{item.day}</span>
                            </div>
                        ))}
                    </div>

                    <div className="weekReportLegend weekReportLegendBottom" aria-hidden="true">
                        <span><i className="weekReportLegendDot weekReportLegendDotTaken" />Pauzes genomen</span>
                        <span><i className="weekReportLegendDot weekReportLegendDotSkipped" />Pauzes genegeerd</span>
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