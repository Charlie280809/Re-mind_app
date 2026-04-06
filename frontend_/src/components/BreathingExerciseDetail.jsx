import { useState, useEffect, useRef } from "react";

const EXERCISE_DATA = {
    box: {
        title: "Box breathing",
        steps: [
            { label: "Inademen", duration: "4s" },
            { label: "Vasthouden", duration: "4s" },
            { label: "Uitademen", duration: "4s" },
            { label: "Vasthouden", duration: "4s" }
        ]
    },
    coherent: {
        title: "Coherent breathing",
        steps: [
            { label: "Inademen", duration: "5s" },
            { label: "Uitademen", duration: "5s" }
        ]
    },
    vishama: {
        title: "Vishama Vritti (ongelijk ademen)",
        steps: [
            { label: "Inademen", duration: "4s" },
            { label: "Uitademen", duration: "6s" }
        ]
    },
    ratio: {
        title: "1:2 ratio breathing",
        steps: [
            { label: "Inademen", duration: "4s" },
            { label: "Uitademen", duration: "8s" }
        ]
    },
    physio: {
        title: "Physiological sigh",
        steps: [
            { label: "Inademen", duration: "2s" },
            { label: "Nog inademen", duration: "1s" },
            { label: "Uitademen", duration: "5s" }
        ]
    }
};

// Helper function to convert duration string (e.g., "4s") to milliseconds
const durationToMs = (duration) => {
    const seconds = parseFloat(duration);
    return seconds * 1000;
};

export default function BreathingExerciseDetail({ exerciseId, onBack, onChangeMethod }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const timerRef = useRef(null);

    const exercise = EXERCISE_DATA[exerciseId] || EXERCISE_DATA.box;

    const handleStart = () => {
        setIsActive(true);
        setCurrentStepIndex(0);
    };

    const handleStop = () => {
        setIsActive(false);
        setCurrentStepIndex(0);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    // Handle step cycling
    useEffect(() => {
        if (!isActive) return;

        const currentStep = exercise.steps[currentStepIndex];
        const duration = durationToMs(currentStep.duration);

        timerRef.current = setTimeout(() => {
            setCurrentStepIndex((prevIndex) => {
                return (prevIndex + 1) % exercise.steps.length;
            });
        }, duration);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [isActive, currentStepIndex, exercise.steps]);

    const stepsText = exercise.steps
        .map(step => `${step.label}: ${step.duration}`)
        .join("  ");

    return (
        <main className="exercise-detail-page">
            <div className="exercise-detail-header">
                <button className="back-btn" onClick={onBack} aria-label="Terug">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <div className="exercise-controls">
                    <button
                        className="control-btn"
                        onClick={handleStart}
                        disabled={isActive}
                    >
                        Start
                    </button>
                    <button
                        className="control-btn"
                        onClick={handleStop}
                        disabled={!isActive}
                    >
                        Stop
                    </button>
                </div>
            </div>

            <div className="exercise-circle-container">
                <div className={`exercise-circle ${isActive ? "active" : ""}`}>
                    {isActive && (
                        <span className="circle-text">
                            {exercise.steps[currentStepIndex].label}
                        </span>
                    )}
                </div>
            </div>

            <div className="exercise-info">
                <h2 className="exercise-title">{exercise.title}</h2>
                <p className="exercise-steps">{stepsText}</p>
            </div>

            <button className="help-btn" aria-label="Help">
                {/* <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
                    <text x="16" y="22" textAnchor="middle" fontSize="18" fill="currentColor">?</text>
                </svg> */}
                ?
            </button>

            <div className="exercise-footer">
                <button className="change-method-btn" onClick={onChangeMethod}>
                    Andere methode →
                </button>
                <div className="exercise-indicators">
                    <span className="indicator active"></span>
                    <span className="indicator"></span>
                </div>
            </div>
        </main>
    );
}
