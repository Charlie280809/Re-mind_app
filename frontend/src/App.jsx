import "./css/App.css";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import WorkTimerCard from "./components/WorkTimerCard";
import PauseSuggestions from "./screens/PauseSuggestions";
import BreathingExerciseDetail from "./screens/BreathingExerciseDetail";
import ProfilePage from "./screens/ProfilePage";
import ReportPage from "./screens/ReportPage";
import WeekReportPage from "./screens/WeekReportPage";
import CheckInModal from "./components/CheckInModal";
import PauseReminderModal from "./components/PauseReminderModal";
import FavoriteRemovalModal from "./components/FavoriteRemovalModal";
import LoginPage from "./screens/LoginPage";
import SignupPage from "./screens/SignupPage";
import Settings from "./screens/Settings";
import UpgradePlan from "./screens/UpgradePlan";
import notitie from "./assets/icons/Afsluitnotitie.svg";
import spinner from "./assets/images/loadingSpinner.svg";

import { DATA as PAUSE_OPTIONS } from "./screens/PauseSuggestions";
import { supabase } from "./lib/supabaseClient";
import { getApiBaseUrl } from "./api/apiBaseUrl";
import {
  createSignupAccount,
  fetchLatestWorkSessionBreaks,
  fetchProfile,
  incrementWorkSessionCounter,
  saveSignupNotifications,
  saveSignupWorkHours,
} from "./api/backendApi";
import { calculateWorkdayDurationSeconds } from "./lib/workHours";

const NAV_STATE_STORAGE_KEY = "remind-navigation-state";
const PROFILE_AVATAR_STORAGE_KEY_PREFIX = "remind-profile-avatar-";

const getProfileAvatarStorageKey = (userId) =>
  userId ? `${PROFILE_AVATAR_STORAGE_KEY_PREFIX}${userId}` : null;

const readStoredAvatar = (userId) => {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = getProfileAvatarStorageKey(userId);
  if (!storageKey) {
    return null;
  }

  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

const writeStoredAvatar = (userId, avatarDataUrl) => {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getProfileAvatarStorageKey(userId);
  if (!storageKey) {
    return;
  }

  try {
    if (avatarDataUrl) {
      window.localStorage.setItem(storageKey, avatarDataUrl);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Ignore storage failures; the avatar still works in memory.
  }
};

const mergeProfileWithStoredAvatar = (profileData, userId) => {
  if (!profileData) {
    return profileData;
  }

  const storedAvatar = readStoredAvatar(userId);

  return {
    ...profileData,
    avatarDataUrl: profileData.avatarDataUrl || storedAvatar || null,
  };
};

const getStoredNavigationState = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawState = window.sessionStorage.getItem(NAV_STATE_STORAGE_KEY);
    if (!rawState) {
      return null;
    }

    const parsedState = JSON.parse(rawState);
    const allowedPages = new Set([
      "home",
      "report",
      "weekreport", //verder uitwerken
      "profile",
      "settings",
      "upgrade",
      "breathing", //verder uitwerken
      "pause",
      "exercise-detail",
    ]);

    if (!allowedPages.has(parsedState?.currentPage)) {
      return null;
    }

    return {
      currentPage: parsedState.currentPage,
      selectedExercise: typeof parsedState.selectedExercise === "string" ? parsedState.selectedExercise : null,
      settingsInitialView: typeof parsedState.settingsInitialView === "string" ? parsedState.settingsInitialView : null,
    };
  } catch {
    return null;
  }
};

export default function App() {
  const apiBaseUrl = getApiBaseUrl();

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [signupProvisioning, setSignupProvisioning] = useState(false);
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authView, setAuthView] = useState("login");
  const [workSettings, setWorkSettings] = useState(null);

  const storedNavigationState = getStoredNavigationState();
  const [currentPage, setCurrentPage] = useState(storedNavigationState?.currentPage || "home");
  const [settingsResetKey, setSettingsResetKey] = useState(0);
  const [settingsInitialView, setSettingsInitialView] = useState(storedNavigationState?.settingsInitialView || null);
  const [selectedExercise, setSelectedExercise] = useState(storedNavigationState?.selectedExercise || null);
  const [pauseFavorites, setPauseFavorites] = useState(() => new Set());
  const [favoriteRemovalTarget, setFavoriteRemovalTarget] = useState(null);
  const [pauseSummaryCounts, setPauseSummaryCounts] = useState({ breaks_taken: 0, breaks_skipped: 0 });
  const sessionUserId = session?.user?.id || null;

  // Persistent work timer state lifted here so the timer keeps running
  // even when `WorkTimerCard` unmounts during navigation.
  const [workStarted, setWorkStarted] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [finished, setFinished] = useState(false);

  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  // Pause reminder modal state
  const [showPauseReminderModal, setShowPauseReminderModal] = useState(false);
  const [nextPauseReminderTriggerWorkSecond, setNextPauseReminderTriggerWorkSecond] = useState(null);

  const pauseReminderIntervalSeconds = Math.max(1, Number(workSettings?.pause_reminder ?? 120)) * 60;

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
    if (!session || signupProvisioning || (authView === "signup" && !signupCompleted)) {
      setProfile(null);
      setProfileLoading(false);
      return undefined;
    }

    let isCancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      setAuthError("");

      try {
        const payload = await fetchProfile(apiBaseUrl, session.access_token);
        if (!isCancelled) {
          setProfile(mergeProfileWithStoredAvatar(payload.profile, session.user.id));
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
  }, [apiBaseUrl, sessionUserId, signupProvisioning, authView, signupCompleted]);

  useEffect(() => {
    if (!session || !supabase) {
      setWorkSettings(null);
      return undefined;
    }

    let isCancelled = false;

    const loadWorkSettings = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("werk_startuur, werk_einduur, pause_reminder, checkin_notifications_on")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!isCancelled) {
        if (error) {
          setWorkSettings(null);
        } else {
          setWorkSettings(data || null);
        }
      }
    };

    loadWorkSettings();

    return () => {
      isCancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session?.access_token) {
      setPauseSummaryCounts({ breaks_taken: 0, breaks_skipped: 0 });
      return undefined;
    }

    let isCancelled = false;

    const loadLatestBreakCounts = async () => {
      try {
        const counts = await fetchLatestWorkSessionBreaks(apiBaseUrl, session.access_token);
        if (!isCancelled) {
          setPauseSummaryCounts({
            breaks_taken: Math.max(0, Number(counts.breaks_taken ?? 0)),
            breaks_skipped: Math.max(0, Number(counts.breaks_skipped ?? 0)),
          });
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to load pause summary:", error);
        }
      }
    };

    loadLatestBreakCounts();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, sessionUserId]);

  const displayName = profile?.username || session?.user?.email?.split("@")[0] || "Gebruiker";
  const companyName = profile?.bedrijfsnaam || "";

  const handleProfileUpdated = (nextProfile) => {
    setProfile((currentProfile) => {
      const mergedProfile = mergeProfileWithStoredAvatar(
        {
          ...currentProfile,
          ...nextProfile,
        },
        sessionUserId
      );

      writeStoredAvatar(sessionUserId, mergedProfile?.avatarDataUrl || null);

      return mergedProfile;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    window.sessionStorage.setItem(
      NAV_STATE_STORAGE_KEY,
      JSON.stringify({
        currentPage,
        selectedExercise,
        settingsInitialView,
      })
    );

    return undefined;
  }, [currentPage, selectedExercise, settingsInitialView]);

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
          .select("pause_type")
          .eq("user_id", userId);

        if (error) {
          console.error("Failed to load favorite pauses:", error);
          return;
        }

        if (isCancelled) return;

        const set = new Set((data || []).map((r) => r.pause_type));
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

  // Pause reminder trigger: first after the configured interval, then after each dismissal.
  useEffect(() => {
    if (workStarted && !finished && nextPauseReminderTriggerWorkSecond == null) {
      setNextPauseReminderTriggerWorkSecond(pauseReminderIntervalSeconds);
      return;
    }

    if (!workStarted || finished || onBreak || showPauseReminderModal || nextPauseReminderTriggerWorkSecond == null) {
      return;
    }

    if (workSeconds >= nextPauseReminderTriggerWorkSecond) {
      setShowPauseReminderModal(true);
    }
  }, [
    finished,
    nextPauseReminderTriggerWorkSecond,
    onBreak,
    pauseReminderIntervalSeconds,
    showPauseReminderModal,
    workSeconds,
    workStarted,
  ]);

  const persistFavoriteToggle = async (id, previouslyHad) => {
    setPauseFavorites((prev) => {
      const next = new Set(prev);
      if (previouslyHad) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      if (session && supabase) {
        const userId = session.user.id;

        if (!previouslyHad) {
          const { error } = await supabase.from("favorite_pauses").insert([{ user_id: userId, pause_type: id }]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("favorite_pauses").delete().match({ user_id: userId, pause_type: id });
          if (error) throw error;
        }
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

  const togglePauseFavorite = async (id) => {
    const previouslyHad = pauseFavorites.has(id);

    if (previouslyHad) {
      setFavoriteRemovalTarget(id);
      return;
    }

    await persistFavoriteToggle(id, false);
  };

  const confirmFavoriteRemoval = async () => {
    if (!favoriteRemovalTarget) return;

    const id = favoriteRemovalTarget;
    setFavoriteRemovalTarget(null);
    await persistFavoriteToggle(id, true);
  };

  const cancelFavoriteRemoval = () => {
    setFavoriteRemovalTarget(null);
  };

  const incrementWorkSessionCounterOnServer = async (column) => {
    if (!session?.access_token) {
      return;
    }

    try {
      const response = await incrementWorkSessionCounter(apiBaseUrl, session.access_token, column);
      if (column === "breaks_taken") {
        setPauseSummaryCounts((prev) => ({
          ...prev,
          breaks_taken: Math.max(0, Number(response?.breaks_taken ?? prev.breaks_taken)),
        }));
      } else {
        setPauseSummaryCounts((prev) => ({
          ...prev,
          breaks_skipped: Math.max(0, Number(response?.breaks_skipped ?? prev.breaks_skipped)),
        }));
      }
    } catch (error) {
      console.error(`Failed to increment ${column}:`, error);
    }
  };

  // timer control handlers passed down to WorkTimerCard
  const startDay = () => {
    setWorkStarted(true);
    setFinished(false);
    setOnBreak(false);
    setWorkSeconds(0);
    setBreakSeconds(0);
    setShowPauseReminderModal(false);
    setNextPauseReminderTriggerWorkSecond(pauseReminderIntervalSeconds);
  };

  const endDay = () => {
    setFinished(true);
    setOnBreak(false);
  };

  const takeBreak = async () => {
    if (onBreak || !workStarted || finished) {
      return;
    }

    await incrementWorkSessionCounterOnServer("breaks_taken");
    setOnBreak(true);
    setCurrentPage("pause");
  };
  const endBreak = () => setOnBreak(false);

  const closePauseReminderModal = () => {
    setShowPauseReminderModal(false);
    // setNextPauseReminderTriggerWorkSecond(workSeconds + pauseReminderIntervalSeconds);
    // For demo purposes, trigger next reminder after 15 seconds
    setNextPauseReminderTriggerWorkSecond(workSeconds + 15);
  };

  const handlePauseReminderDismiss = () => {
    incrementWorkSessionCounterOnServer("breaks_skipped");
    closePauseReminderModal();
  };

  const handlePauseReminderTakeBreak = () => {
    closePauseReminderModal();
    takeBreak();
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

  const handleSignupAccount = async ({ email, password, username, bedrijfsnaam }) => {
    if (!supabase) {
      setAuthError("Supabase is niet geconfigureerd. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.");
      return null;
    }

    setAuthError("");
    setSignupSubmitting(true);
    setSignupProvisioning(true);

    try {
      const createPayload = await createSignupAccount(apiBaseUrl, {
        email,
        password,
        username,
        bedrijfsnaam,
      });

      return {
        userId: createPayload.user.id,
      };
    } catch (error) {
      setAuthError(
        error instanceof TypeError
          ? `Kan geen verbinding maken met backend op ${apiBaseUrl}. Controleer of de backend draait.`
          : error.message || "Kon account niet aanmaken."
      );
      setSignupProvisioning(false);
      return null;
    } finally {
      setSignupSubmitting(false);
    }
  };

  const handleSignupNotifications = async ({ userId, checkinNotificationsOn }) => {
    if (!supabase) {
      setAuthError("Supabase is niet geconfigureerd. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.");
      return false;
    }

    setAuthError("");
    setSignupSubmitting(true);

    try {
      await saveSignupNotifications(apiBaseUrl, {
        userId,
        checkinNotificationsOn,
      });
      return true;
    } catch (error) {
      setAuthError(error.message);
      return false;
    } finally {
      setSignupSubmitting(false);
    }
  };

  const handleSignupWorkHours = async ({ userId, workHoursSetup, email, password }) => {
    if (!supabase) {
      setAuthError("Supabase is niet geconfigureerd. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.");
      return false;
    }

    setAuthError("");
    setSignupSubmitting(true);

    try {
      await saveSignupWorkHours(apiBaseUrl, {
        userId,
        workHoursSetup,
      });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSignupCompleted(true);
      return true;
    } catch (error) {
      setAuthError(error.message);
      return false;
    } finally {
      setSignupProvisioning(false);
      setSignupSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setAuthError("");
    setCurrentPage("home");
    setProfile(null);
    setAuthView("login");
    setSignupCompleted(false);

    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const handleNavigateToSignup = async () => {
    setAuthError("");
    setSignupCompleted(false);
    setSignupProvisioning(false);
    setProfileLoading(false);
    setProfile(null);
    setSession(null);

    if (supabase) {
      await supabase.auth.signOut();
    }

    setAuthView("signup");
  };

  const dayTargetSeconds = calculateWorkdayDurationSeconds(workSettings?.werk_startuur, workSettings?.werk_einduur) ?? 8 * 60;

  if (authLoading || (session && profileLoading)) {
    return (
      <div className="authLoadingState" aria-live="polite">
          <p>Bezig met inloggen...</p>
          <img className="authLoadingSpinner" src={spinner} alt="Laden" />
      </div>
    );
  }

  const isSignupFlowActive = authView === "signup" && !signupCompleted;

  if (!session || isSignupFlowActive) {
    return authView === "signup" ? (
      <SignupPage
        onCreateAccount={handleSignupAccount}
        onSaveNotifications={handleSignupNotifications}
        onSaveWorkHours={handleSignupWorkHours}
        onNavigateToLogin={() => setAuthView("login")}
        isSubmitting={signupSubmitting}
        error={authError}
        isConfigured={Boolean(supabase)}
      />
    ) : (
      <LoginPage
        onLogin={handleLogin}
        onNavigateToSignup={handleNavigateToSignup}
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
      <CheckInModal
        workStarted={workStarted}
        onBreak={onBreak}
        finished={finished}
        workSeconds={workSeconds}
        checkInNotificationsEnabled={Boolean(workSettings?.checkin_notifications_on)}
      />
      {showPauseReminderModal && (
        <PauseReminderModal onDismiss={handlePauseReminderDismiss} onTakeBreak={handlePauseReminderTakeBreak} />
      )}
      {favoriteRemovalTarget ? (
        <FavoriteRemovalModal
          pauseTitle={PAUSE_OPTIONS.find((item) => item.id === favoriteRemovalTarget)?.title || "deze pauze"}
          onConfirm={confirmFavoriteRemoval}
          onCancel={cancelFavoriteRemoval}
        />
      ) : null}
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onSettingsNavigate={(view) => {
          setSettingsInitialView(view || null);
          setCurrentPage("settings");
          setSettingsResetKey((k) => k + 1);
        }}
        isPremium={Boolean(profile?.is_premium)}
        onBreak={onBreak}
        breakSeconds={breakSeconds}
      />

      {currentPage === "exercise-detail" ? (
        <BreathingExerciseDetail
          exerciseId={selectedExercise}
          onBack={() => setCurrentPage("breathing")}
          onChangeMethod={() => setCurrentPage("breathing")}
        />
      ) : currentPage === "report" ? (
        <ReportPage isPremium={Boolean(profile?.is_premium)} />
      ) : currentPage === "weekreport" ? (
        <WeekReportPage />
      ) : currentPage === "profile" ? (
        <ProfilePage
          profile={profile}
          favorites={pauseFavorites}
          onToggleFavorite={togglePauseFavorite}
          onNavigateToPause={() => setCurrentPage("pause")}
          onNavigateToUpgrade={() => {
            setCurrentPage("upgrade");
          }}
        />
      ) : currentPage === "settings" ? (
        <Settings
          onBack={() => setCurrentPage("home")}
          resetKey={settingsResetKey}
          isPremium={Boolean(profile?.is_premium)}
          initialView={settingsInitialView}
          clearInitialView={() => setSettingsInitialView(null)}
          onNavigateToUpgrade={() => setCurrentPage("upgrade")}
          onLogout={handleLogout}
          profile={profile}
          onProfileUpdated={handleProfileUpdated}
        />
      ) : currentPage === "upgrade" ? (
        <UpgradePlan
          onBack={() => setCurrentPage("home")}
          isPremium={Boolean(profile?.is_premium)}
          onProfileUpdated={handleProfileUpdated}
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
              startDay={startDay}
              endDay={endDay}
              takeBreak={takeBreak}
              endBreak={endBreak}
              dayTargetSeconds={dayTargetSeconds}
            />
          </section>

          <section className="homeSection">
            <h3 className="homeSectionTitle">Pauze-overzicht vandaag</h3>
            <article className="homeCard pauseSummaryCard">
              <div className="pauseSummaryRow">
                <span className="pauseSummaryLabel">Pauzes genomen:</span>
                <div className="pauseSummaryDots">
                  {Array.from({ length: pauseSummaryCounts.breaks_taken }).map((_, index) => (
                    <span key={`dot-good-${index}`} className="dot dotGood"></span>
                  ))}
                </div>
              </div>

              <div className="pauseSummaryRow">
                <span className="pauseSummaryLabel">Pauzes overgeslagen:</span>
                <div className="pauseSummaryDots">
                  {Array.from({ length: pauseSummaryCounts.breaks_skipped }).map((_, index) => (
                    <span key={`dot-bad-${index}`} className="dot dotBad"></span>
                  ))}
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
