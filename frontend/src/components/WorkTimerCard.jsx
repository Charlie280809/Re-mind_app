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
  const size = 140;
  const stroke = 70;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safeProgress = Math.max(0, progress);
  const regularProgress = Math.min(1, safeProgress);
  const overtimeProgress = Math.min(1, Math.max(0, safeProgress - 1));
  const regularDash = c * (1 - regularProgress);
  const overtimeDash = c * (1 - overtimeProgress);
  const circleCenter = size / 2;

  return (
    <svg width={size} height={size} aria-label="Timer progress">
      <circle
        cx={circleCenter}
        cy={circleCenter}
        r={r}
        stroke="#e6e3dd"
        strokeWidth={stroke}
        fill="#eaecef"
      />
      <circle
        cx={circleCenter}
        cy={circleCenter}
        r={r}
        stroke="#769382"
        strokeWidth={stroke}
        fill="transparent"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - regularProgress)}
        transform={`rotate(-90 ${circleCenter} ${circleCenter})`}
      />
      <circle
        cx={circleCenter}
        cy={circleCenter}
        r={r}
        stroke="#35423A"
        strokeWidth={stroke}
        fill="transparent"
        strokeDasharray={c}
        strokeDashoffset={overtimeDash}
        opacity={safeProgress > 1 ? 1 : 0}
        transform={`rotate(-90 ${circleCenter} ${circleCenter})`}
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
  const progress = Math.max(0, elapsedSeconds / dayTargetSeconds);

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
