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
import LoginPage from "./components/LoginPage";
import Settings from "./components/Settings";
import notitie from "./assets/icons/Afsluitnotitie.svg";
import spinner from "./assets/images/loadingSpinner.svg";
import { supabase } from "./lib/supabaseClient";

export default function App() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [currentPage, setCurrentPage] = useState("home");
  const [settingsResetKey, setSettingsResetKey] = useState(0);
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
  const [lastCheckInPromptIndex, setLastCheckInPromptIndex] = useState(0);

  // reference target for progress (kept small for demo; original used 8*60)
  const dayTargetSeconds = 8 * 60;
  const checkInIntervalSeconds = 0.5 * 60; // Show check-in every 2 minutes of work (demo; normally 2 hours)

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      setAuthError("Supabase is niet geconfigureerd. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.");
      return undefined;
    }

    let isMounted = true;

    const initializeSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setSession(data.session ?? null);
      setAuthLoading(false);
    };

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession ?? null);

      if (!nextSession) {
        setProfile(null);
        setProfileLoading(false);
        setCurrentPage("home");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setProfileLoading(false);
      return undefined;
    }

    let isCancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      setAuthError("");

      try {
        const response = await fetch(`${apiBaseUrl}/profile/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const contentType = response.headers.get("content-type") || "";

        let payload = null;
        if (contentType.includes("application/json")) {
          payload = await response.json();
        } else {
          const bodyText = await response.text();
          const snippet = bodyText.slice(0, 120).replace(/\s+/g, " ").trim();
          throw new Error(
            `Backend antwoordde niet met JSON op ${apiBaseUrl}/profile/me (status ${response.status}). Controleer VITE_API_BASE_URL en of backend draait op poort 3000. Respons: ${snippet}`
          );
        }

        if (!response.ok) {
          throw new Error(payload.error || "Kon je profiel niet laden.");
        }

        if (!isCancelled) {
          setProfile(payload.profile);
          setCurrentPage("home");
        }
      } catch (error) {
        if (!isCancelled) {
          setAuthError(error.message);
          setProfile(null);
          setSession(null);
        }

        if (supabase) {
          await supabase.auth.signOut();
        }
      } finally {
        if (!isCancelled) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, session]);

  const displayName = profile?.username || session?.user?.email?.split("@")[0] || "Gebruiker";
  const companyName = profile?.bedrijfsnaam || "";

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

  // Load user's favorite pauses from Supabase when session/profile is available
  useEffect(() => {
    if (!session || !supabase) return undefined;

    let isCancelled = false;

    const loadFavorites = async () => {
      try {
        const userId = session.user.id;
        const { data, error } = await supabase
          .from("favorite_pauses")
          .select("pauze_type")
          .eq("user_id", userId);

        if (error) {
          console.error("Failed to load favorite pauses:", error);
          return;
        }

        if (isCancelled) return;

        const set = new Set((data || []).map((r) => r.pauze_type));
        setPauseFavorites(set);
      } catch (err) {
        console.error("Error loading favorites:", err);
      }
    };

    loadFavorites();

    return () => {
      isCancelled = true;
    };
  }, [session]);

  // Check-in modal trigger: show every ~checkInIntervalSeconds of work time
  useEffect(() => {
    if (workStarted && !finished && !onBreak && !showCheckInModal) {
      const currentPromptIndex = Math.floor(workSeconds / checkInIntervalSeconds);
      if (currentPromptIndex > lastCheckInPromptIndex) {
        setShowCheckInModal(true);
      }
    }
  }, [workSeconds, workStarted, finished, onBreak, showCheckInModal, lastCheckInPromptIndex, checkInIntervalSeconds]);

  const togglePauseFavorite = async (id) => {
    if (!session || !supabase) {
      setPauseFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }

    const userId = session.user.id;
    const previouslyHad = pauseFavorites.has(id);

    // ask for confirmation only when removing
    if (previouslyHad) {
      const confirmed = window.confirm("Weet je zeker dat je deze pauze uit favorieten wilt verwijderen?");
      if (!confirmed) return;
    }

    // optimistic update
    setPauseFavorites((prev) => {
      const next = new Set(prev);
      if (previouslyHad) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      if (!previouslyHad) {
        const { error } = await supabase.from("favorite_pauses").insert([{ user_id: userId, pauze_type: id }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorite_pauses").delete().match({ user_id: userId, pauze_type: id });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to toggle favorite in Supabase:", err);
      // revert optimistic update
      setPauseFavorites((prev) => {
        const next = new Set(prev);
        if (previouslyHad) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  };

  // timer control handlers passed down to WorkTimerCard
  const startDay = () => {
    setWorkStarted(true);
    setFinished(false);
    setOnBreak(false);
    setWorkSeconds(0);
    setBreakSeconds(0);
    setShowCheckInModal(false);
    setLastCheckInPromptIndex(0);
  };

  const endDay = () => {
    setFinished(true);
    setOnBreak(false);
  };

  const takeBreak = () => setOnBreak(true);
  const endBreak = () => setOnBreak(false);

  const closeCheckInModal = () => {
    const currentPromptIndex = Math.floor(workSeconds / checkInIntervalSeconds);

    setShowCheckInModal(false);
    setLastCheckInPromptIndex(currentPromptIndex);
  };

  const handleCheckInSubmit = () => {
    closeCheckInModal();
  };

  const handleLogin = async ({ email, password }) => {
    if (!supabase) {
      setAuthError("Supabase is niet geconfigureerd. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.");
      return;
    }

    setAuthError("");
    setLoginSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
      }
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setAuthError("");
    setCurrentPage("home");
    setProfile(null);

    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  if (authLoading || (session && profileLoading)) {
    return (
      <div className="authLoadingState" aria-live="polite">
          <p>Bezig met inloggen...</p>
          <img className="authLoadingSpinner" src={spinner} alt="Laden" />
      </div>
    );
  }

  if (!session) {
    return (
      <LoginPage
        onLogin={handleLogin}
        isSubmitting={loginSubmitting}
        error={authError}
        isConfigured={Boolean(supabase)}
      />
    );
  }

  if (!profile) {
    return (
      <div className="authLoadingState" aria-live="polite">
          <p>{authError || "Profiel laden..."}</p>
          <img className="authLoadingSpinner" src={spinner} alt="Laden" />
      </div>
    );
  }

  return (
    <div className="appShell">
      {showCheckInModal && (
        <CheckInModal
          onClose={closeCheckInModal}
          onSubmitCheckIn={handleCheckInSubmit}
        />
      )}
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onSettingsNavigate={() => {
          setCurrentPage("settings");
          setSettingsResetKey((k) => k + 1);
        }}
      />

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
          profile={profile}
          favorites={pauseFavorites}
          onToggleFavorite={togglePauseFavorite}
          onNavigateToPause={() => setCurrentPage("pause")}
          onLogout={handleLogout}
        />
      ) : currentPage === "settings" ? (
        <Settings onBack={() => setCurrentPage("home")} resetKey={settingsResetKey} />
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
              <h1 className="homeGreeting">Hallo {displayName},</h1>
              <h2 className="homeSubtitle">Klaar om je werkdag te starten?</h2>
            </div>

            <button className="noteButton" type="button" aria-label="Meldingen"> {/* aanpassen --> afsluitroutine van voorgaande dag */}
              <img src={notitie} alt="Afsluitnotitie van vorige dag"/>
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
