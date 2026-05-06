import "./css/App.css";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import WorkTimerCard from "./components/WorkTimerCard";
import PauseSuggestions from "./components/PauseSuggestions";
import BreathingExercises from "./components/BreathingExercises";
import BreathingExerciseDetail from "./components/BreathingExerciseDetail";
import ProfilePage from "./components/ProfilePage";
import ReportPage from "./components/ReportPage";
import CheckInModal from "./components/CheckInModal";

export default function App() {
  const [name] = useState("John Doe");

  const [currentPage, setCurrentPage] = useState("home");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [pauseFavorites, setPauseFavorites] = useState(() => new Set());

  // Persistent work timer state lifted here so the timer keeps running
  // even when `WorkTimerCard` unmounts during navigation.
  const [workStarted, setWorkStarted] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [finished, setFinished] = useState(false);

  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  // Check-in modal state: show every ~2 hours of work (3-4 times per 8-hour day)
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInsShownCount, setCheckInsShownCount] = useState(0);

  // reference target for progress (kept small for demo; original used 8*60)
  const dayTargetSeconds = 8 * 60;
  const checkInIntervalSeconds = 1 * 60; // Show check-in every 2 minutes of work (demo; normally 2 hours)

  useEffect(() => {
    let timer = null;

    if (workStarted && !finished && !onBreak) {
      timer = setInterval(() => setWorkSeconds((p) => p + 1), 1000);
    } else if (workStarted && !finished && onBreak) {
      timer = setInterval(() => setBreakSeconds((p) => p + 1), 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [workStarted, finished, onBreak]);

  // Check-in modal trigger: show every ~checkInIntervalSeconds of work time
  useEffect(() => {
    if (workStarted && !finished && !onBreak && !showCheckInModal) {
      const nextCheckInTime = (checkInsShownCount + 1) * checkInIntervalSeconds;
      if (workSeconds >= nextCheckInTime) {
        setShowCheckInModal(true);
      }
    }
  }, [workSeconds, workStarted, finished, onBreak, showCheckInModal, checkInsShownCount, checkInIntervalSeconds]);

  const togglePauseFavorite = (id) => {
    setPauseFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // timer control handlers passed down to WorkTimerCard
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

  const closeCheckInModal = () => {
    setShowCheckInModal(false);
    setCheckInsShownCount((p) => p + 1);
  };

  const handleCheckInSubmit = () => {
    closeCheckInModal();
  };

  return (
    <div className="appShell">
      {showCheckInModal && (
        <CheckInModal
          onClose={closeCheckInModal}
          onSubmitCheckIn={handleCheckInSubmit}
        />
      )}
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {currentPage === "exercise-detail" ? (
        <BreathingExerciseDetail
          exerciseId={selectedExercise}
          onBack={() => setCurrentPage("breathing")}
          onChangeMethod={() => setCurrentPage("breathing")}
        />
      ) : currentPage === "report" ? (
        <ReportPage />
      ) : currentPage === "profile" ? (
        <ProfilePage
          name={name}
          favorites={pauseFavorites}
          onToggleFavorite={togglePauseFavorite}
          onNavigateToPause={() => setCurrentPage("pause")}
        />
      ) : currentPage === "breathing" ? (
        <BreathingExercises
          onBack={() => setCurrentPage("pause")}
          onSelectExercise={(id) => {
            setSelectedExercise(id);
            setCurrentPage("exercise-detail");
          }}
        />
      ) : currentPage === "pause" ? (
        <PauseSuggestions
          favorites={pauseFavorites}
          onToggleFavorite={togglePauseFavorite}
          onNavigateToBreathing={() => setCurrentPage("breathing")}
        />
      ) : (

        <main className="homePage">
          <header className="homeHeader">
            <div>
              <h1 className="homeGreeting">Hallo {name},</h1>
              <h2 className="homeSubtitle">Klaar om je werkdag te starten?</h2>
            </div>

            <button className="statusButton" type="button" aria-label="Meldingen"> {/* aanpassen --> afsluitroutine van voorgaande dag */}
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
                <rect x="6" y="4" width="40" height="48" rx="10" stroke="currentColor" strokeWidth="2.8" />
                <path d="M17 18H35" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                <path d="M17 27H35" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                <path d="M17 36H31" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                <circle cx="41" cy="39" r="9" fill="#b5c6b6" stroke="#2b2a28" strokeWidth="2.4" />
                <path d="M41 34.5V39" stroke="#2b2a28" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="41" cy="43" r="1.4" fill="#2b2a28" />
              </svg>
            </button>
          </header>

          <section className="homeCard timerCardWrap">
            <WorkTimerCard
              workStarted={workStarted}
              onBreak={onBreak}
              finished={finished}
              workSeconds={workSeconds}
              breakSeconds={breakSeconds}
              startDay={startDay}
              endDay={endDay}
              takeBreak={takeBreak}
              endBreak={endBreak}
            />
          </section>

          <section className="homeSection">
            <h3 className="homeSectionTitle">Pauze-overzicht vandaag</h3>
            <article className="homeCard pauseSummaryCard">
              <div className="pauseSummaryRow">
                <span className="pauseSummaryLabel">Pauzes genomen:</span>
                <div className="pauseSummaryDots">
                  <span className="dot dotGood"></span>
                </div>
              </div>

              <div className="pauseSummaryRow">
                <span className="pauseSummaryLabel">Pauzes overgeslagen:</span>
                <div className="pauseSummaryDots">
                  <span className="dot dotBad"></span>
                </div>
              </div>
            </article>
          </section>

          <section className="homeSection">
            <h3 className="homeSectionTitle">Advies van de dag</h3>
            <article className="adviceCard">
              Vergeet niet om diep in en uit te ademen als je stress voelt opkomen. Voldoende zuurstof in je lichaam
              helpt je om te ontspannen en helder te denken.
            </article>
          </section>
        </main>
      )}
    </div>
  );
}
