import "../css/worktimercard.css";

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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
    </svg>
  );
}

export default function WorkTimerCard({
  workStarted,
  onBreak,
  finished,
  workSeconds,
  elapsedSeconds,
  startDay,
  endDay,
  takeBreak,
  endBreak,
  onOpenWorkdayTasks,
  dayTargetSeconds = 8 * 60,
}) {
  const mainTime = formatTime(workSeconds);
  const progress = Math.min(1, Math.max(0, elapsedSeconds / dayTargetSeconds));

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
              <button className="btn" onClick={() => onOpenWorkdayTasks("tomorrow")} type="button">
                Taken voor morgen invullen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
