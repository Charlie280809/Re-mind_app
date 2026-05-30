import "./css/App.css";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import WorkTimerCard from "./components/WorkTimerCard";
import PauseSuggestions from "./screens/PauseSuggestions";
import BreathingExercise from "./screens/BreathingExercise";
import ProfilePage from "./screens/ProfilePage";
import ReportPage from "./screens/ReportPage";
import WeekReportPage from "./screens/WeekReportPage";
import CheckInModal from "./components/CheckInModal";
import PauseReminderModal from "./components/PauseReminderModal";
import FavoriteRemovalModal from "./components/FavoriteRemovalModal";
import PremiumModal from "./components/PremiumModal";
import WorkdayTasksOverlay from "./components/WorkdayTasksOverlay";
import LoginPage from "./screens/LoginPage";
import SignupPage from "./screens/SignupPage";
import Settings from "./screens/Settings";
import SettingsWorkHours from "./screens/SettingsWorkHours";
import SettingsNotifications from "./screens/SettingsNotifications";
import SettingsPersonalData from "./screens/SettingsPersonalData";
import SettingsPrivacy from "./screens/SettingsPrivacy";
import UpgradePlan from "./screens/UpgradePlan";

import { LuNotepadText } from "react-icons/lu";
import spinner from "./assets/images/loadingSpinner.svg";

import { DATA as PAUSE_OPTIONS } from "./screens/PauseSuggestions";
import { supabase } from "./lib/supabaseClient";
import { getApiBaseUrl } from "./api/apiBaseUrl";
import {
  createSignupAccount,
  completeWorkSessionBreak,
  endWorkSession,
  fetchLatestWorkSessionBreaks,
  fetchLatestWorkSession,
  fetchProfile,
  incrementWorkSessionCounter,
  startWorkSession,
  saveSignupNotifications,
  saveSignupWorkHours,
} from "./api/backendApi";
import { calculateWorkdayDurationSeconds } from "./lib/workHours";

const NAV_STATE_STORAGE_KEY = "remind-navigation-state";
const TIMER_STATE_STORAGE_KEY = "remind-worktimer-state";
const FREE_FAVORITE_LIMIT = 4;

const getSessionElapsedSeconds = (sessionRow) => {
  if (!sessionRow?.start_tijd) {
    return 0;
  }

  const startTime = new Date(sessionRow.start_tijd);
  const endTime = sessionRow.eind_tijd ? new Date(sessionRow.eind_tijd) : new Date();

  if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime())) {
    return 0;
  }

  return Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
};

const getSessionWorkedSeconds = (sessionRow) => {
  const elapsedSeconds = getSessionElapsedSeconds(sessionRow);
  const pauseSeconds = Math.max(0, Number(sessionRow?.total_pausetime ?? 0));

  return Math.max(0, elapsedSeconds - pauseSeconds);
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
      "settings-workhours",
      "settings-notifications",
      "settings-personal",
      "settings-privacy",
      "upgrade",
      "breathing",
      "pause",
      "exercise-detail",
    ]);

    if (!allowedPages.has(parsedState?.currentPage)) {
      return null;
    }

    return {
      currentPage: parsedState.currentPage,
      selectedExercise: typeof parsedState.selectedExercise === "string" ? parsedState.selectedExercise : null,
    };
  } catch {
    return null;
  }
};

const getStoredTimerState = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawState = window.sessionStorage.getItem(TIMER_STATE_STORAGE_KEY);

    if (!rawState) {
      return null;
    }

    const parsedState = JSON.parse(rawState);

    return {
      start_tijd: typeof parsedState?.start_tijd === "string" ? parsedState.start_tijd : null,
      workStarted: Boolean(parsedState?.workStarted),
      onBreak: Boolean(parsedState?.onBreak),
      finished: Boolean(parsedState?.finished),
      workSeconds: Number.isFinite(Number(parsedState?.workSeconds)) ? Math.max(0, Number(parsedState.workSeconds)) : 0,
      elapsedSeconds: Number.isFinite(Number(parsedState?.elapsedSeconds)) ? Math.max(0, Number(parsedState.elapsedSeconds)) : 0,
      breakSeconds: Number.isFinite(Number(parsedState?.breakSeconds)) ? Math.max(0, Number(parsedState.breakSeconds)) : 0,
    };
  } catch {
    return null;
  }
};

export default function App() {
  const apiBaseUrl = getApiBaseUrl();
  const [storedTimerState] = useState(() => getStoredTimerState());

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
  const [selectedExercise, setSelectedExercise] = useState(storedNavigationState?.selectedExercise || null);
  const [pauseFavorites, setPauseFavorites] = useState(() => new Set());
  const [favoriteRemovalTarget, setFavoriteRemovalTarget] = useState(null);
  const [favoriteLimitModalOpen, setFavoriteLimitModalOpen] = useState(false);
  const [pauseSummaryCounts, setPauseSummaryCounts] = useState({ breaks_taken: 0, breaks_skipped: 0 });
  const [workdayTasksOpen, setWorkdayTasksOpen] = useState(false);
  const [workdayTasksInitialTab, setWorkdayTasksInitialTab] = useState("today");
  const sessionUserId = session?.user?.id || null;

  // Persistent work timer state lifted here so the timer keeps running
  // even when `WorkTimerCard` unmounts during navigation.
  const [workStarted, setWorkStarted] = useState(Boolean(storedTimerState?.workStarted));
  const [onBreak, setOnBreak] = useState(Boolean(storedTimerState?.onBreak));
  const [finished, setFinished] = useState(Boolean(storedTimerState?.finished));

  const [workSeconds, setWorkSeconds] = useState(() => Number(storedTimerState?.workSeconds ?? 0));
  const [elapsedSeconds, setElapsedSeconds] = useState(() => Number(storedTimerState?.elapsedSeconds ?? 0));
  const [breakSeconds, setBreakSeconds] = useState(() => Number(storedTimerState?.breakSeconds ?? 0));
  const [workSessionStartTime, setWorkSessionStartTime] = useState(() => storedTimerState?.start_tijd ?? null);

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
          setProfile(payload.profile);
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
    if (!session?.access_token || !sessionUserId || signupProvisioning || (authView === "signup" && !signupCompleted)) {
      resetTimerState();
      return undefined;
    }

    let isCancelled = false;

    const loadWorkSession = async () => {
      try {
        const latestSession = await fetchLatestWorkSession(apiBaseUrl, session.access_token);

        if (isCancelled) {
          return;
        }

        if (latestSession?.id) {
          applyWorkSessionState(latestSession);
          return;
        }

        resetTimerState();
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to synchronize work session:", error);
        }
      }
    };

    loadWorkSession();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authView, session?.access_token, sessionUserId, signupCompleted, signupProvisioning]);

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

  const handleProfileUpdated = (nextProfile) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      ...nextProfile,
    }));
  };

  const resetTimerState = () => {
    setWorkStarted(false);
    setOnBreak(false);
    setFinished(false);
    setWorkSeconds(0);
    setElapsedSeconds(0);
    setBreakSeconds(0);
    setWorkSessionStartTime(null);
    setWorkdayTasksOpen(false);

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(TIMER_STATE_STORAGE_KEY);
    }
  };

  const applyWorkSessionState = (workSession) => {
    const nextElapsedSeconds = getSessionElapsedSeconds(workSession);
    const nextWorkSeconds = getSessionWorkedSeconds(workSession);
    const shouldRestoreStoredBreak =
      Boolean(storedTimerState?.start_tijd) &&
      storedTimerState.start_tijd === workSession.start_tijd &&
      storedTimerState.onBreak &&
      !workSession.eind_tijd;

    setWorkStarted(true);
    setOnBreak(shouldRestoreStoredBreak);
    setFinished(Boolean(workSession.eind_tijd));
    setWorkSeconds(shouldRestoreStoredBreak ? Number(storedTimerState?.workSeconds ?? nextWorkSeconds) : nextWorkSeconds);
    setElapsedSeconds(nextElapsedSeconds);
    setBreakSeconds(shouldRestoreStoredBreak ? Number(storedTimerState?.breakSeconds ?? 0) : 0);
    setWorkSessionStartTime(workSession.start_tijd || null);
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
      })
    );

    return undefined;
  }, [currentPage, selectedExercise]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (!session?.user?.id || !workStarted || !workSessionStartTime) {
      window.sessionStorage.removeItem(TIMER_STATE_STORAGE_KEY);
      return undefined;
    }

    window.sessionStorage.setItem(
      TIMER_STATE_STORAGE_KEY,
      JSON.stringify({
        start_tijd: workSessionStartTime,
        workStarted,
        onBreak,
        finished,
        workSeconds,
        elapsedSeconds,
        breakSeconds,
      })
    );

    return undefined;
  }, [breakSeconds, elapsedSeconds, finished, onBreak, session?.user?.id, workSeconds, workSessionStartTime, workStarted]);

  useEffect(() => {
    let timer = null;

    if (workStarted && !finished) {
      timer = setInterval(() => {
        setElapsedSeconds((currentElapsedSeconds) => currentElapsedSeconds + 1);

        if (onBreak) {
          setBreakSeconds((currentBreakSeconds) => currentBreakSeconds + 1);
        } else {
          setWorkSeconds((currentWorkSeconds) => currentWorkSeconds + 1);
        }
      }, 1000);
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

    if (!profile?.is_premium && pauseFavorites.size >= FREE_FAVORITE_LIMIT) {
      setFavoriteLimitModalOpen(true);
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

  const closeFavoriteLimitModal = () => {
    setFavoriteLimitModalOpen(false);
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

  const persistCurrentBreakDuration = async () => {
    if (!session?.access_token || !onBreak) {
      return null;
    }

    if (breakSeconds <= 0) {
      return null;
    }

    return completeWorkSessionBreak(apiBaseUrl, session.access_token, breakSeconds);
  };

  // timer control handlers passed down to WorkTimerCard
  const startDay = async () => {
    const startTime = new Date();

    try {
      const startedSession = await startWorkSession(apiBaseUrl, session.access_token, {
        start_tijd: startTime.toISOString(),
        source: "manual",
      });

      if (startedSession) {
        applyWorkSessionState(startedSession);
      }
    } catch (error) {
      console.error("Failed to start work session:", error);
    }
  };

  const endDay = async () => {
    try {
      if (onBreak) {
        await persistCurrentBreakDuration();
        setOnBreak(false);
        setBreakSeconds(0);
      }

      const endedSession = await endWorkSession(apiBaseUrl, session.access_token, {
        eind_tijd: new Date().toISOString(),
      });

      if (endedSession) {
        applyWorkSessionState(endedSession);
      }
    } catch (error) {
      console.error("Failed to end work session:", error);
    }
  };

  const takeBreak = async () => {
    if (onBreak || !workStarted || finished) {
      return;
    }

    await incrementWorkSessionCounterOnServer("breaks_taken");
    setOnBreak(true);
    setCurrentPage("pause");
  };
  const endBreak = async () => {
    try {
      await persistCurrentBreakDuration();
      setOnBreak(false);
      setBreakSeconds(0);
    } catch (error) {
      console.error("Failed to save break duration:", error);
    }
  };

  const openWorkdayTasksModal = () => {
    setWorkdayTasksOpen(true);
    setWorkdayTasksInitialTab("today");
  };

  const openWorkdayTasksModalOnTomorrow = () => {
    setWorkdayTasksOpen(true);
    setWorkdayTasksInitialTab("tomorrow");
  };

  const closeWorkdayTasksModal = () => {
    setWorkdayTasksOpen(false);
  };

  const handlePauseReminderDismiss = () => {
    incrementWorkSessionCounterOnServer("breaks_skipped");
  };

  const handlePauseReminderTakeBreak = () => {
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
    resetTimerState();

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
    resetTimerState();

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
        checkInNotificationsEnabled={workSettings == null ? null : Boolean(workSettings.checkin_notifications_on)}
      />
      <PauseReminderModal
        workStarted={workStarted}
        onBreak={onBreak}
        finished={finished}
        workSeconds={workSeconds}
        pauseReminderIntervalSeconds={pauseReminderIntervalSeconds}
        onDismiss={handlePauseReminderDismiss}
        onTakeBreak={handlePauseReminderTakeBreak}
      />
      <WorkdayTasksOverlay
        isOpen={workdayTasksOpen}
        onClose={closeWorkdayTasksModal}
        apiBaseUrl={apiBaseUrl}
        accessToken={session.access_token}
        initialTab={workdayTasksInitialTab}
      />
      {favoriteLimitModalOpen ? (
        <PremiumModal
          title="Meer pauzes toevoegen?"
          description="Upgrade naar Premium om ongelimiteerd favoriete pauzes op te slaan."
          onClose={closeFavoriteLimitModal}
          onUpgrade={() => {
            closeFavoriteLimitModal();
            setCurrentPage("upgrade");
          }}
        />
      ) : null}
      {favoriteRemovalTarget ? (
        <FavoriteRemovalModal
          pauseTitle={PAUSE_OPTIONS.find((item) => item.id === favoriteRemovalTarget)?.title || "deze pauze"}
          onConfirm={confirmFavoriteRemoval}
          onCancel={cancelFavoriteRemoval}
        />
      ) : null}
      <Navbar
        currentPage={
          currentPage === "breathing" || currentPage === "exercise-detail"
            ? "pause"
            : currentPage === "settings-workhours" ||
              currentPage === "settings-notifications" ||
              currentPage === "settings-personal" ||
              currentPage === "settings-privacy"
              ? "settings"
              : currentPage
        }
        setCurrentPage={setCurrentPage}
        isPremium={Boolean(profile?.is_premium)}
        onBreak={onBreak}
        breakSeconds={breakSeconds}
        onEndBreak={endBreak}
      />

      {currentPage === "exercise-detail" ? (
        <BreathingExerciseDetail
          exerciseId={selectedExercise}
          onBack={() => setCurrentPage("breathing")}
          onChangeMethod={() => setCurrentPage("breathing")}
        />
      ) : currentPage === "report" ? (
        <ReportPage
          isPremium={Boolean(profile?.is_premium)}
          accessToken={session?.access_token}
          onNavigateToUpgrade={() => setCurrentPage("upgrade")}
        />
      ) : currentPage === "weekreport" ? (
        <WeekReportPage accessToken={session?.access_token} />
      ) : currentPage === "profile" ? (
        <ProfilePage
          profile={profile}
          favorites={pauseFavorites}
          onToggleFavorite={togglePauseFavorite}
          onNavigateToPause={() => setCurrentPage("pause")}
          favoriteLimit={FREE_FAVORITE_LIMIT}
          onNavigateToUpgrade={() => {
            setCurrentPage("upgrade");
          }}
        />
      ) : currentPage === "settings" ? (
        <Settings
          onBack={() => setCurrentPage("home")}
          onNavigateToWorkHours={() => setCurrentPage("settings-workhours")}
          onNavigateToNotifications={() => setCurrentPage("settings-notifications")}
          onNavigateToPersonalData={() => setCurrentPage("settings-personal")}
          onNavigateToPrivacy={() => setCurrentPage("settings-privacy")}
          onNavigateToUpgrade={() => setCurrentPage("upgrade")}
          onLogout={handleLogout}
        />
      ) : currentPage === "settings-workhours" ? (
        <SettingsWorkHours onBack={() => setCurrentPage("settings")} />
      ) : currentPage === "settings-notifications" ? (
        <SettingsNotifications onBack={() => setCurrentPage("settings")} />
      ) : currentPage === "settings-personal" ? (
        <SettingsPersonalData
          onBack={() => setCurrentPage("settings")}
          profile={profile}
          onProfileUpdated={handleProfileUpdated}
          onNavigateToUpgrade={() => setCurrentPage("upgrade")}
          onLogout={handleLogout}
        />
      ) : currentPage === "settings-privacy" ? (
        <SettingsPrivacy onBack={() => setCurrentPage("settings")} />
      ) : currentPage === "upgrade" ? (
        <UpgradePlan
          onBack={() => setCurrentPage("home")}
          isPremium={Boolean(profile?.is_premium)}
          onProfileUpdated={handleProfileUpdated}
        />
      ) : currentPage === "breathing" ? (
        <BreathingExercise
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

            <button
              className="noteButton"
              type="button"
              aria-label="Open takenlijst"
              onClick={openWorkdayTasksModal}
            >
              <LuNotepadText />
            </button>
          </header>

          <section className="homeCard timerCardWrap">
            <WorkTimerCard
              workStarted={workStarted}
              onBreak={onBreak}
              finished={finished}
              workSeconds={workSeconds}
              elapsedSeconds={elapsedSeconds}
              startDay={startDay}
              endDay={endDay}
              takeBreak={takeBreak}
              endBreak={endBreak}
              onOpenWorkdayTasks={openWorkdayTasksModalOnTomorrow}
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
                <strong className="pauseSummaryCount pauseSummaryCountGood">{pauseSummaryCounts.breaks_taken}</strong>
              </div>

              <div className="pauseSummaryRow">
                <span className="pauseSummaryLabel">Pauzes overgeslagen:</span>
                <div className="pauseSummaryDots">
                  {Array.from({ length: pauseSummaryCounts.breaks_skipped }).map((_, index) => (
                    <span key={`dot-bad-${index}`} className="dot dotBad"></span>
                  ))}
                </div>
                <strong className="pauseSummaryCount pauseSummaryCountBad">{pauseSummaryCounts.breaks_skipped}</strong>
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
