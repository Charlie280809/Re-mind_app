import "../css/BreathingExercise.css";
import { useState, useEffect, useRef } from "react";

const EXERCISE_DATA = {
    box: {
        title: "Box breathing",
        variants: {
            "4-4-4-4": [
                { label: "Inademen", duration: "4s" },
                { label: "Vasthouden", duration: "4s" },
                { label: "Uitademen", duration: "4s" },
                { label: "Vasthouden", duration: "4s" }
            ],
            "5-5-5-5": [
                { label: "Inademen", duration: "5s" },
                { label: "Vasthouden", duration: "5s" },
                { label: "Uitademen", duration: "5s" },
                { label: "Vasthouden", duration: "5s" }
            ],
            "6-6-6-6": [
                { label: "Inademen", duration: "6s" },
                { label: "Vasthouden", duration: "6s" },
                { label: "Uitademen", duration: "6s" },
                { label: "Vasthouden", duration: "6s" }
            ]
        }
    },
    ratio: {
        title: "1:2 ratio breathing",
        variants: {
            "2-0-4-0": [
                { label: "Inademen", duration: "2s" },
                { label: "Vasthouden", duration: "0s" },
                { label: "Uitademen", duration: "4s" },
                { label: "Vasthouden", duration: "0s" }
            ],
            "3-0-6-0": [
                { label: "Inademen", duration: "3s" },
                { label: "Vasthouden", duration: "0s" },
                { label: "Uitademen", duration: "6s" },
                { label: "Vasthouden", duration: "0s" }
            ],
            "4-0-8-0": [
                { label: "Inademen", duration: "4s" },
                { label: "Vasthouden", duration: "0s" },
                { label: "Uitademen", duration: "8s" },
                { label: "Vasthouden", duration: "0s" }
            ]
        }
    },
    coherent: {
        title: "Coherent breathing",
        variants: {
            "5-0-5-0": [
                { label: "Inademen", duration: "5s" },
                { label: "Vasthouden", duration: "0s" },
                { label: "Uitademen", duration: "5s" },
                { label: "Vasthouden", duration: "0s" }
            ],
            "6-0-6-0": [
                { label: "Inademen", duration: "6s" },
                { label: "Vasthouden", duration: "0s" },
                { label: "Uitademen", duration: "6s" },
                { label: "Vasthouden", duration: "0s" }
            ]
        }
    },
    physio: {
        title: "Physiological sigh",
        variants: {
            "2+1-0-7-0": [
                { label: "Inademen 2", duration: "2s" },
                { label: "Inademen 1", duration: "1s" },
                { label: "Vasthouden", duration: "0s" },
                { label: "Uitademen", duration: "7s" },
                { label: "Vasthouden", duration: "0s" }
            ]
        }
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
    const [selectedMethod, setSelectedMethod] = useState("box");
    const [selectedVariant, setSelectedVariant] = useState(() => {
        const firstVariant = Object.keys(EXERCISE_DATA.box.variants)[0];
        return firstVariant;
    });

    const timerRef = useRef(null);

    const selectedExercise = EXERCISE_DATA[selectedMethod];
    const steps = selectedExercise.variants[selectedVariant];

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

        const currentStep = steps[currentStepIndex];
        const duration = durationToMs(currentStep.duration);

        timerRef.current = setTimeout(() => {
            setCurrentStepIndex((prevIndex) => {
                return (prevIndex + 1) % steps.length;
            });
        }, duration);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [isActive, currentStepIndex, steps]);

    const stepsText = steps.map(step => `${step.label}: ${step.duration}`).join("  ");

    const handleSelect = (methodKey, variantKey) => {
        setSelectedMethod(methodKey);
        setSelectedVariant(variantKey);
        setIsActive(false);
        setCurrentStepIndex(0);
    };

    return (
        <main className="exercise-detail-page">
            <div className="exercise-detail-header">
                <button className="back-btn" onClick={onBack} aria-label="Terug">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <div className="header-center">
                    <h1 className="exercise-title">{selectedExercise.title} {selectedVariant ? `· ${selectedVariant}` : ''}</h1>

                    <div className="exercise-controls">
                        <button
                            className="control-btn start-btn"
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
            </div>

            <section className="method-selection" aria-label="Method selection">
                {Object.entries(EXERCISE_DATA).map(([methodKey, method]) => (
                    <div key={methodKey} className="method-group">
                        <h3 className="method-title">{method.title}</h3>
                        <div className="method-variants">
                            {Object.keys(method.variants).map((variantKey) => (
                                <button
                                    key={variantKey}
                                    type="button"
                                    className={`variant-btn ${selectedMethod === methodKey && selectedVariant === variantKey ? 'active' : ''}`}
                                    onClick={() => handleSelect(methodKey, variantKey)}
                                >
                                    {variantKey}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </section>

            <div className="exercise-circle-container">
                <div className={`exercise-circle ${isActive ? "active" : ""}`}>
                    {isActive && (
                        <span className="circle-text">
                            {steps[currentStepIndex].label}
                        </span>
                    )}
                </div>
            </div>

            <div className="exercise-info">
                <div className="steps-grid">
                    {steps.map((s, i) => (
                        <div className="step-item" key={i}>
                            <span className="step-label">{s.label}</span>
                            <span className="step-value">{s.duration.replace('s','s')}</span>
                        </div>
                    ))}
                </div>
            </div>

            <button className="help-btn" aria-label="Help">?</button>

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
