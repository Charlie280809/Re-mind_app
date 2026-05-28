import "../css/worktimercard.css";
import { useMemo } from "react";

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function CircleProgress({ progress = 0 }) {
  // progress: 0..1
  const size = 140;
  const stroke = 70;
  const r = (size - stroke) / 2; // radius van de cirkel, rekening houdend met stroke
  const c = 2 * Math.PI * r; // omtrek van de cirkel
  const dash = c * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <svg width={size} height={size} aria-label="Timer progress">
      <circle // dikke grijze cirkel
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#e6e3dd"
        strokeWidth={stroke}
        fill="#eaecef"
      />
      <circle // dunne groene cirkel die de voortgang toont
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#769382"
        strokeWidth={stroke}
        fill="transparent"
        strokeDasharray={c}
        strokeDashoffset={dash}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {/* dunne “wijzer” */}
      {/* <line
        x1={size / 2}
        y1={size / 2}
        x2={size / 2}
        y2={size / 2 - r + 6}
        stroke="#46696F"
        strokeWidth="2"
      /> */}
    </svg>
  );
}

export default function WorkTimerCard({
  workStarted,
  onBreak,
  finished,
  workSeconds,
  startDay,
  endDay,
  takeBreak,
  endBreak,
  onOpenEndNote,
  dayTargetSeconds = 8 * 60,
}) {
  const mainTime = useMemo(() => formatTime(workSeconds), [workSeconds]);

  const progress = useMemo(() => {
    // toon voortgang van werkdag (0..1)
    return Math.min(1, workSeconds / dayTargetSeconds);
  }, [workSeconds]);

  return (
    <div className="card">
      <div className="hrRow">
        <CircleProgress progress={progress} />

        <div className="bigTime">{workStarted ? mainTime : "00:00"}</div>

        <div className="btnStack">
          {!workStarted && !finished && (
            <>
              <button className="btn" onClick={startDay} type="button">
                Start werkdag
              </button>
              <div className="muted">Je kan op elk moment pauzeren</div>
            </>
          )}

          {workStarted && !finished && !onBreak && (
            <>
              <button className="btn breakbtn" onClick={takeBreak} type="button">
                Neem een pauze
              </button>
              <button className="btn endbtn" onClick={endDay} type="button">
                Beëindig werkdag
              </button>
            </>
          )}

          {workStarted && !finished && onBreak && (
            <>
              <button className="btn breakbtn" onClick={endBreak} type="button">
                Beëindig pauze
              </button>
              <button className="btn endbtn" onClick={endDay} type="button">
                Beëindig werkdag
              </button>
            </>
          )}

          {finished && (
            <>
              <div className="finishedText">Je bent klaar voor vandaag!</div>
              <button className="btn" onClick={onOpenEndNote} type="button">
                Afsluitnotitie invullen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
