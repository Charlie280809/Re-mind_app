import { useEffect, useMemo, useState } from "react";

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
        stroke="#eee"
        strokeWidth={stroke}
        fill="#eee"
      />
      <circle // dunne groene cirkel die de voortgang toont
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#ccc"
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

export default function WorkTimerCard() {
  const [workStarted, setWorkStarted] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [finished, setFinished] = useState(false);

  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  // Voor de cirkel: neem bijvoorbeeld een “dag” van 8 uur als referentie
  const dayTargetSeconds = 8 * 60; //*60

  useEffect(() => {
    let timer = null;

    if (workStarted && !finished && !onBreak) {
      timer = setInterval(() => setWorkSeconds((p) => p + 1), 1000);
    }
    if (workStarted && !finished && onBreak) {
      timer = setInterval(() => setBreakSeconds((p) => p + 1), 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [workStarted, finished, onBreak]);

  const mainTime = useMemo(() => formatTime(workSeconds), [workSeconds]);

  const progress = useMemo(() => {
    // toon voortgang van werkdag (0..1)
    return Math.min(1, workSeconds / dayTargetSeconds);
  }, [workSeconds]);

  const startDay = () => {
    setWorkStarted(true);
    setFinished(false);
    setOnBreak(false);
    setWorkSeconds(0);
    setBreakSeconds(0);
  };

  const endDay = () => {
    setFinished(true);
    setOnBreak(false);
  };

  const takeBreak = () => setOnBreak(true);
  const endBreak = () => setOnBreak(false);

  return (
    <div className="card" style={{ borderRadius: 22, padding: 22 }}>
      <div className="hrRow">
        <CircleProgress progress={progress} />

        <div style={{ minWidth: 140, display: "flex", justifyContent: "center" }}>
          <div className="bigTime">{workStarted ? mainTime : "--:--"}</div>
        </div>

        <div className="btnStack">
          {!workStarted && !finished && (
            <>
              <button className="btn btnPrimary" onClick={startDay}>
                Start werkdag
              </button>
              <div className="muted" style={{ fontWeight: 700, fontSize: 12 }}>
                Je kan op elk moment pauzeren
              </div>
            </>
          )}

          {workStarted && !finished && !onBreak && (
            <>
              <button className="btn btnPrimary" onClick={takeBreak}>
                Neem een pauze
              </button>
              <button className="btn" onClick={endDay}>
                Beëindig werkdag
              </button>
            </>
          )}

          {workStarted && !finished && onBreak && (
            <>
              <button className="btn btnPrimary" onClick={endBreak}>
                Beëindig pauze
              </button>
              <button className="btn" onClick={endDay}>
                Beëindig werkdag
              </button>
              <div className="muted" style={{ fontSize: 12 }}>
                Pauzetijd: {formatTime(breakSeconds)}
              </div>
            </>
          )}

          {finished && (
            <>
              <div style={{ fontWeight: 900 }}>Je bent klaar voor vandaag!</div>
              <button className="btn btnPrimary" onClick={() => alert("Reflectie (demo)")} >
                Vul nu de reflectie in
              </button>
              <button className="btn" onClick={startDay}>Start nieuwe werkdag</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
