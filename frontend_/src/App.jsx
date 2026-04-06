import { useMemo, useState } from "react";
import "./App.css";

import Navbar from "./components/Navbar";
import WorkTimerCard from "./components/WorkTimerCard";
import PauseSuggestions from "./components/PauseSuggestions";
import BreathingExercises from "./components/BreathingExercises";
import BreathingExerciseDetail from "./components/BreathingExerciseDetail";

export default function App() {
  const [name] = useState("John Doe");

  const [currentPage, setCurrentPage] = useState("home"); 
  const [selectedExercise, setSelectedExercise] = useState(null);
  

  return (
    <div className="app">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {currentPage === "exercise-detail" ? (
        <BreathingExerciseDetail 
          exerciseId={selectedExercise} 
          onBack={() => setCurrentPage("breathing")}
          onChangeMethod={() => setCurrentPage("breathing")}
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
        <PauseSuggestions onNavigateToBreathing={() => setCurrentPage("breathing")} />
      ) : (
        <main className="page">
          <h1 className="greeting">Hallo,</h1>

          <section className="section">
            <WorkTimerCard />
          </section>
        </main>
      )}
    </div>
  );
}
