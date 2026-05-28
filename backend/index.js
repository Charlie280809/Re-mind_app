const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

const PORT = process.env.PORT || 3000;
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

// --- shared request helpers ---

function getBearerToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
}

function getReportRange(dateInput) {
  const startDate = typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput) ? new Date(`${dateInput}T00:00:00`) : new Date();
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    localDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
  };
}

function getTodayRange() {
  return getReportRange();
}

// Convert a duration in seconds to a human-readable string for the report UI.
function formatSecondsAsDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes} minuten ${seconds} seconden`;
}

function summarizeDailyWorkSessions(workSessions) {
  return (workSessions || []).reduce(
    (acc, session) => {
      const startTime = new Date(session.start_tijd);
      const endTime = new Date(session.eind_tijd);
      const sessionDurationSeconds = Number.isFinite(startTime.getTime()) && Number.isFinite(endTime.getTime())
        ? Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000))
        : 0;
      const sessionPauseSeconds = Math.max(0, Number(session.total_pausetime ?? 0));

      acc.breaksTaken += Number(session.breaks_taken ?? 0);
      acc.breaksSkipped += Number(session.breaks_skipped ?? 0);
      acc.totalBreakSeconds += sessionPauseSeconds;
      acc.totalWorkSeconds += Math.max(0, sessionDurationSeconds - sessionPauseSeconds);
      return acc;
    },
    { breaksTaken: 0, breaksSkipped: 0, totalBreakSeconds: 0, totalWorkSeconds: 0 }
  );
}

function normalizeBreakSeconds(breakSeconds) {
  const safeSeconds = Math.max(0, Number(breakSeconds) || 0);

  if (safeSeconds <= 0) {
    return 0;
  }

  return Math.floor(safeSeconds);
}

function buildDailyReportPayload({ localDate, totals, pauseTotals, totalCheckins }) {
  return {
    date: localDate,
    totalCheckins,
    averageStress: totalCheckins === 0 ? null : Number((totals.stress / totalCheckins).toFixed(1)),
    averageEnergy: totalCheckins === 0 ? null : Number((totals.energy / totalCheckins).toFixed(1)),
    pauseRecommendations: totals.pauseRecommendations,
    breaks_taken: pauseTotals.breaksTaken,
    breaks_skipped: pauseTotals.breaksSkipped,
    totalBreakTime: formatSecondsAsDuration(pauseTotals.totalBreakSeconds),
    totalWorkTime: formatSecondsAsDuration(pauseTotals.totalWorkSeconds),
  };
}

const WORK_SESSION_SELECT = "id, start_tijd, eind_tijd, end_note, source, source_details, server_scheduled_day, total_pausetime, breaks_taken, breaks_skipped";

// --- report data ---

app.get("/report/today", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  // Report rows are scoped to the selected calendar day and signed-in user.
  const userId = userData.user.id;
  const requestedDate = typeof req.query?.date === "string" ? req.query.date : undefined;
  const { startIso, endIso, localDate } = getReportRange(requestedDate);
  const { data: checkins, error: checkinError } = await supabase
    .from("checkins")
    .select("stress, energy, need_pause, created_at")
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: true });

  if (checkinError) {
    return res.status(500).json({
      error: "Failed to load report data from Supabase.",
      details: checkinError.message,
    });
  }

  // Sum all sessions of the day to get the total work and pause time.
  const { data: workSessions, error: workSessionError } = await supabase
    .from("work_sessions")
    .select("breaks_taken, breaks_skipped, total_pausetime, start_tijd, eind_tijd")
    .eq("user_id", userId)
    .gte("start_tijd", startIso)
    .lt("start_tijd", endIso);

  if (workSessionError) {
    return res.status(500).json({
      error: "Failed to load work session data from Supabase.",
      details: workSessionError.message,
    });
  }

  const totalCheckins = checkins.length;
  const pauseTotals = summarizeDailyWorkSessions(workSessions);

  if (totalCheckins === 0) {
    return res.json(
      buildDailyReportPayload({
        localDate,
        totals: { stress: 0, energy: 0, pauseRecommendations: 0 },
        pauseTotals,
        totalCheckins,
      })
    );
  }

  const totals = checkins.reduce(
    (acc, row) => {
      acc.stress += row.stress;
      acc.energy += row.energy;
      if (row.need_pause) acc.pauseRecommendations += 1;
      return acc;
    },
    { stress: 0, energy: 0, pauseRecommendations: 0 }
  );

  return res.json(
    buildDailyReportPayload({
      localDate,
      totals,
      pauseTotals,
      totalCheckins,
    })
  );
});

// --- check-ins ---

app.post("/checkin", async (req, res) => {
  const stress = Number(req.body.stress);
  const energy = Number(req.body.energy);
  const token = getBearerToken(req);

  if (!token || !Number.isInteger(stress) || !Number.isInteger(energy) || stress < 1 || stress > 5 || energy < 1 || energy > 5) {
    return res.status(400).json({
      error: "Missing bearer token or invalid stress/energy values.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const needPause = stress >= 4 || energy <= 2;

  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const { error } = await supabase.from("checkins").insert({
    user_id: userData.user.id,
    stress,
    energy,
    need_pause: needPause,
  });

  if (error) {
    return res.status(500).json({
      error: "Failed to save check-in to Supabase.",
      details: error.message,
    });
  }

  res.json({ needPause });
});

// --- current-day work session counters ---

app.get("/work-sessions/today/latest", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { startIso, endIso } = getTodayRange();

  const { data: latestSession, error: sessionError } = await supabase
    .from("work_sessions")
    .select(WORK_SESSION_SELECT)
    .eq("user_id", userData.user.id)
    .gte("start_tijd", startIso)
    .lt("start_tijd", endIso)
    .order("start_tijd", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    return res.status(500).json({
      error: "Failed to load work session.",
      details: sessionError.message,
    });
  }

  return res.json({
    work_session: latestSession || null,
  });
});

app.post("/work-sessions/start", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const requestedStartTime = typeof req.body?.start_tijd === "string" ? new Date(req.body.start_tijd) : new Date();

  if (Number.isNaN(requestedStartTime.getTime())) {
    return res.status(400).json({
      error: "Invalid start time.",
    });
  }

  const source = req.body?.source === "server_scheduled" ? "server_scheduled" : "manual";
  const serverScheduledDay =
    typeof req.body?.server_scheduled_day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.server_scheduled_day)
      ? req.body.server_scheduled_day
      : null;

  const { startIso, endIso } = getTodayRange();

  const { data: latestSession, error: sessionError } = await supabase
    .from("work_sessions")
    .select(WORK_SESSION_SELECT)
    .eq("user_id", userData.user.id)
    .gte("start_tijd", startIso)
    .lt("start_tijd", endIso)
    .order("start_tijd", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    return res.status(500).json({
      error: "Failed to load work session.",
      details: sessionError.message,
    });
  }

  if (latestSession?.id) {
    return res.json({
      work_session: latestSession,
    });
  }

  const { data: createdSession, error: insertError } = await supabase
    .from("work_sessions")
    .insert({
      user_id: userData.user.id,
      start_tijd: requestedStartTime.toISOString(),
      eind_tijd: null,
      source,
      source_details: {
        started_at: new Date().toISOString(),
        source,
      },
      server_scheduled_day: source === "server_scheduled" ? serverScheduledDay : null,
    })
    .select(WORK_SESSION_SELECT)
    .single();

  if (insertError) {
    return res.status(500).json({
      error: "Failed to create work session.",
      details: insertError.message,
    });
  }

  return res.status(201).json({
    work_session: createdSession,
  });
});

app.post("/work-sessions/end", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const requestedEndTime = typeof req.body?.eind_tijd === "string" ? new Date(req.body.eind_tijd) : null;
  const requestedEndNote = typeof req.body?.end_note === "string" ? req.body.end_note.trim() : null;

  if (requestedEndTime && Number.isNaN(requestedEndTime.getTime())) {
    return res.status(400).json({
      error: "Invalid end time.",
    });
  }

  const { startIso, endIso } = getTodayRange();

  const sessionQuery = supabase
    .from("work_sessions")
    .select(WORK_SESSION_SELECT)
    .eq("user_id", userData.user.id)
    .gte("start_tijd", startIso)
    .lt("start_tijd", endIso)
    .order("start_tijd", { ascending: false })
    .limit(1);

  const { data: latestSession, error: sessionError } = requestedEndTime
    ? await sessionQuery.is("eind_tijd", null).maybeSingle()
    : await sessionQuery.not("eind_tijd", "is", null).maybeSingle();

  if (sessionError) {
    return res.status(500).json({
      error: "Failed to load work session.",
      details: sessionError.message,
    });
  }

  if (!latestSession?.id) {
    return res.status(404).json({ error: requestedEndTime ? "No open work session found for the signed-in user." : "No closed work session found for the signed-in user." });
  }

  const { data: updatedSession, error: updateError } = await supabase
    .from("work_sessions")
    .update(requestedEndTime ? { eind_tijd: requestedEndTime.toISOString(), ...(requestedEndNote !== null ? { end_note: requestedEndNote || null } : {}) } : { end_note: requestedEndNote || null })
    .eq("id", latestSession.id)
    .select(WORK_SESSION_SELECT)
    .single();

  if (updateError) {
    return res.status(500).json({
      error: "Failed to close work session.",
      details: updateError.message,
    });
  }

  return res.json({
    work_session: updatedSession,
  });
});

app.post("/work-sessions/breaks/complete", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const pauseSeconds = Number(req.body?.break_seconds);

  if (!Number.isFinite(pauseSeconds) || pauseSeconds < 0) {
    return res.status(400).json({
      error: "Invalid break duration.",
    });
  }

  const addedPauseSeconds = normalizeBreakSeconds(pauseSeconds);

  if (addedPauseSeconds <= 0) {
    return res.json({
      work_session: null,
      added_pause_seconds: 0,
    });
  }

  const { startIso, endIso } = getTodayRange();

  const { data: latestSession, error: sessionError } = await supabase
    .from("work_sessions")
    .select("id, total_pausetime")
    .eq("user_id", userData.user.id)
    .gte("start_tijd", startIso)
    .lt("start_tijd", endIso)
    .is("eind_tijd", null)
    .order("start_tijd", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    return res.status(500).json({
      error: "Failed to load work session.",
      details: sessionError.message,
    });
  }

  if (!latestSession?.id) {
    return res.status(404).json({
      error: "No open work session found for the signed-in user.",
    });
  }

  const nextTotalPauseSeconds = Number(latestSession.total_pausetime ?? 0) + addedPauseSeconds;

  const { data: updatedSession, error: updateError } = await supabase
    .from("work_sessions")
    .update({
      total_pausetime: nextTotalPauseSeconds,
    })
    .eq("id", latestSession.id)
    .select("id, total_pausetime")
    .single();

  if (updateError) {
    return res.status(500).json({
      error: "Failed to update total pause time.",
      details: updateError.message,
    });
  }

  return res.json({
    work_session: updatedSession,
    added_pause_seconds: addedPauseSeconds,
  });
});

app.get("/work-sessions/breaks/latest", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { startIso, endIso } = getTodayRange();

  const { data: latestSession, error: sessionError } = await supabase
    .from("work_sessions")
    .select("id, breaks_taken, breaks_skipped")
    .eq("user_id", userData.user.id)
    .gte("start_tijd", startIso)
    .lt("start_tijd", endIso)
    .order("start_tijd", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    return res.status(500).json({
      error: "Failed to load work session.",
      details: sessionError.message,
    });
  }

  if (!latestSession?.id) {
    return res.json({
      breaks_taken: 0,
      breaks_skipped: 0,
    });
  }

  return res.json({
    breaks_taken: Number(latestSession.breaks_taken ?? 0),
    breaks_skipped: Number(latestSession.breaks_skipped ?? 0),
  });
});

app.post("/work-sessions/breaks/increment", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { startIso, endIso } = getTodayRange();

  const column = req.body?.column === "breaks_skipped" ? "breaks_skipped" : "breaks_taken";

  const { data: latestSession, error: sessionError } = await supabase
    .from("work_sessions")
    .select(`id, ${column}`)
    .eq("user_id", userData.user.id)
    .gte("start_tijd", startIso)
    .lt("start_tijd", endIso)
    .order("start_tijd", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    return res.status(500).json({
      error: "Failed to load work session.",
      details: sessionError.message,
    });
  }

  if (!latestSession?.id) {
    return res.status(404).json({
      error: "No work session found for the signed-in user.",
    });
  }

  const nextValue = Number(latestSession[column] ?? 0) + 1;

  const { error: updateError } = await supabase
    .from("work_sessions")
    .update({ [column]: nextValue })
    .eq("id", latestSession.id);

  if (updateError) {
    return res.status(500).json({
      error: "Failed to update breaks_taken.",
      details: updateError.message,
    });
  }

  return res.json({ ok: true, [column]: nextValue });
});

// --- signup flow ---

app.post("/signup/create-account", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const bedrijfsnaam = typeof req.body?.bedrijfsnaam === "string" ? req.body.bedrijfsnaam.trim() : "";

  if (!email || !password || !username) {
    return res.status(400).json({
      error: "Missing email, password, or username.",
    });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      bedrijfsnaam: bedrijfsnaam || null,
    },
  });

  if (error || !data?.user?.id) {
    return res.status(500).json({
      error: error?.message || "Failed to create user.",
    });
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: data.user.id,
      email,
      username,
      bedrijfsnaam: bedrijfsnaam || null,
      is_premium: false,
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    return res.status(500).json({
      error: "Failed to save profile for the new user.",
      details: profileError.message,
    });
  }

  return res.json({
    ok: true,
    user: {
      id: data.user.id,
      email,
    },
  });
});

app.post("/signup/notifications", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const userId = typeof req.body?.userId === "string" ? req.body.userId : "";
  const checkinNotificationsOn = Boolean(req.body?.checkinNotificationsOn);

  if (!userId) {
    return res.status(400).json({
      error: "Missing user id.",
    });
  }

  const { error } = await supabase.from("settings").upsert(
    {
      user_id: userId,
      checkin_notifications_on: checkinNotificationsOn,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return res.status(500).json({
      error: "Failed to save notification settings.",
      details: error.message,
    });
  }

  return res.json({ ok: true });
});

app.post("/signup/work-hours", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const userId = typeof req.body?.userId === "string" ? req.body.userId : "";
  const workHoursSetup = req.body?.workHoursSetup || null;

  if (!userId || !workHoursSetup) {
    return res.status(400).json({
      error: "Missing user id or work-hours setup.",
    });
  }

  const { error } = await supabase.from("settings").upsert(
    {
      user_id: userId,
      pause_reminder: workHoursSetup.pause_reminder ?? 0,
      werk_startuur: workHoursSetup.werk_startuur || null,
      werk_einduur: workHoursSetup.werk_einduur || null,
      middag_startuur: workHoursSetup.middag_startuur || null,
      middag_einduur: workHoursSetup.middag_einduur || null,
      mon_isworkday: Boolean(workHoursSetup.mon_isworkday),
      tue_isworkday: Boolean(workHoursSetup.tue_isworkday),
      wed_isworkday: Boolean(workHoursSetup.wed_isworkday),
      thu_isworkday: Boolean(workHoursSetup.thu_isworkday),
      fri_isworkday: Boolean(workHoursSetup.fri_isworkday),
      sat_isworkday: Boolean(workHoursSetup.sat_isworkday),
      sun_isworkday: Boolean(workHoursSetup.sun_isworkday),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return res.status(500).json({
      error: "Failed to save work-hours settings.",
      details: error.message,
    });
  }

  return res.json({ ok: true });
});

// --- profile management ---

app.get("/profile/me", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
    // --- account deletion ---


  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      error: "Failed to load profile from Supabase.",
      details: error.message,
    });
  }

  if (!profile) {
    return res.status(404).json({
      error: "No profile found for the signed-in user.",
    });
  }

  return res.json({
    user: {
      id: userData.user.id,
      email: userData.user.email,
    },
    profile,
  });
});

app.put("/profile/me", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const bedrijfsnaam = typeof req.body?.bedrijfsnaam === "string" ? req.body.bedrijfsnaam.trim() : "";
  const avatarUrl = typeof req.body?.avatar_url === "string" ? req.body.avatar_url.trim() : "";

  if (!email || !username) {
    return res.status(400).json({
      error: "Missing email or username.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(userData.user.id, {
    email,
    user_metadata: {
      username,
      bedrijfsnaam: bedrijfsnaam || null,
    },
  });

  if (authError) {
    return res.status(500).json({
      error: "Failed to update auth user.",
      details: authError.message,
    });
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("is_premium, avatar_url")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (existingProfileError) {
    return res.status(500).json({
      error: "Failed to load existing profile state.",
      details: existingProfileError.message,
    });
  }

  const nextAvatarUrl = existingProfile?.is_premium ? avatarUrl || existingProfile?.avatar_url || null : existingProfile?.avatar_url || null;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: userData.user.id,
      email,
      username,
      bedrijfsnaam: bedrijfsnaam || null,
      is_premium: existingProfile?.is_premium ?? false,
      avatar_url: nextAvatarUrl,
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    return res.status(500).json({
      error: "Failed to update profile.",
      details: profileError.message,
    });
  }

  return res.json({
    ok: true,
    profile: {
      user_id: userData.user.id,
      email,
      username,
      bedrijfsnaam: bedrijfsnaam || null,
      is_premium: existingProfile?.is_premium ?? false,
      avatar_url: nextAvatarUrl,
    },
  });
});

app.put("/profile/me/premium", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const isPremium = Boolean(req.body?.is_premium);

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("email, username, bedrijfsnaam, avatar_url")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (existingProfileError) {
    return res.status(500).json({
      error: "Failed to load existing profile state.",
      details: existingProfileError.message,
    });
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: userData.user.id,
      email: existingProfile?.email || userData.user.email,
      username: existingProfile?.username || userData.user.user_metadata?.username || "",
      bedrijfsnaam: existingProfile?.bedrijfsnaam || userData.user.user_metadata?.bedrijfsnaam || null,
      is_premium: isPremium,
      avatar_url: existingProfile?.avatar_url || null,
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    return res.status(500).json({
      error: "Failed to update profile premium status.",
      details: profileError.message,
    });
  }

  return res.json({
    ok: true,
    profile: {
      user_id: userData.user.id,
      email: existingProfile?.email || userData.user.email,
      username: existingProfile?.username || userData.user.user_metadata?.username || "",
      bedrijfsnaam: existingProfile?.bedrijfsnaam || userData.user.user_metadata?.bedrijfsnaam || null,
      is_premium: isPremium,
      avatar_url: existingProfile?.avatar_url || null,
    },
  });
});

app.delete("/account/me", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Missing Bearer token.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const userId = userData.user.id;
  const tablesToDelete = ["favorite_pauses", "settings", "checkins", "work_sessions", "profiles"];

  for (const tableName of tablesToDelete) {
    const { error } = await supabase.from(tableName).delete().eq("user_id", userId);

    if (error) {
      return res.status(500).json({
        error: `Failed to delete data from ${tableName}.`,
        details: error.message,
      });
    }
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    return res.status(500).json({
      error: "Failed to delete auth user.",
      details: deleteAuthError.message,
    });
  }

  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});