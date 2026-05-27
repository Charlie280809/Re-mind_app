import "../css/BreathingExercise.css";
import { useState, useEffect, useRef } from "react";
import { LuArrowLeft } from "react-icons/lu";

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
                { label: "Inademen", duration: "2s" },
                { label: "Nog eens", duration: "1s" },
                { label: "Vasthouden", duration: "0s" },
                { label: "Uitademen", duration: "7s" },
            ]
        }
    }
};

// Helper function to convert duration string (e.g., "4s") to milliseconds
const durationToMs = (duration) => {
    const seconds = parseFloat(duration);
    return seconds * 1000;
};

const getCircleScale = (methodKey, steps, currentStepIndex) => {
    const currentStep = steps[currentStepIndex];
    const previousStep = steps[currentStepIndex - 1];

    if (!currentStep) {
        return 0.84;
    }

    if (methodKey === "physio") {
        if (currentStep.label.startsWith("Inademen")) {
            return currentStepIndex === 0 ? 1 : 1.08;
        }

        if (currentStep.label.startsWith("Nog eens")) {
            return 1.08;
        }

        if (currentStep.label.startsWith("Vasthouden")) {
            return 1.08;
        }

        if (currentStep.label.startsWith("Uitademen")) {
            return 0.84;
        }

        return 0.84;
    }

    if (currentStep.label.startsWith("Inademen")) {
        return 1.08;
    }

    if (currentStep.label.startsWith("Vasthouden")) {
        return previousStep?.label.startsWith("Uitademen") ? 0.84 : 1.08;
    }

    if (currentStep.label.startsWith("Uitademen")) {
        return 0.84;
    }

    return 0.84;
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
    const currentStepDurationMs = isActive ? durationToMs(steps[currentStepIndex]?.duration || "0s") : 0;
    const circleScale = isActive ? getCircleScale(selectedMethod, steps, currentStepIndex) : 0.85;
    const circleText = isActive && steps[currentStepIndex]?.duration !== "0s" ? steps[currentStepIndex].label : "";

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
            <button className="back-btn" onClick={onBack} aria-label="Terug">
                <LuArrowLeft />
            </button>

            <div className="breathing-exercise-column">
                <div className="header-center">
                    <h1 className="exercise-title">
                        {selectedExercise.title}
                    </h1>

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

                <div className="exercise-circle-container">
                    <div
                        className={`exercise-circle ${isActive ? "active" : ""}`}
                        style={{
                            transform: `scale(${circleScale})`,
                            transitionDuration: `${currentStepDurationMs}ms`,
                        }}
                    >
                        {circleText && (
                            <span className="circle-text">
                                {circleText}
                            </span>
                        )}
                    </div>
                </div>

                <div className="exercise-info">
                    <h2 className="exercise-steps-title"> {selectedVariant ? `${selectedVariant}` : ''}</h2>
                    <div className="steps-grid">
                        {steps.map((s, i) => (
                            <div className="step-item" key={i}>
                                <span className="step-label">{s.label}:</span>
                                <span className="step-value">{s.duration.replace('s', 's')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <section className="method-selection" aria-label="Method selection">
                <h2 className="method-selection-title">Methoden</h2>
                {Object.entries(EXERCISE_DATA).map(([methodKey, method]) => (
                    <div key={methodKey} className="method-group">
                        <div className="method-header">
                            <h3 className="method-title">{method.title}</h3>
                            <button
                                type="button"
                                className="method-help-btn"
                                aria-label={`Meer info over ${method.title}`}
                                data-method={methodKey}
                            >
                                ?
                            </button>
                        </div>
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
        </main>
    );
}
