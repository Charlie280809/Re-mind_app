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

  const { data: workSessions, error: workSessionError } = await supabase
    .from("work_sessions")
    .select("breaks_taken, breaks_skipped")
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
  const pauseTotals = (workSessions || []).reduce(
    (acc, session) => {
      acc.breaksTaken += Number(session.breaks_taken ?? 0);
      acc.breaksSkipped += Number(session.breaks_skipped ?? 0);
      return acc;
    },
    { breaksTaken: 0, breaksSkipped: 0 }
  );

  if (totalCheckins === 0) {
    return res.json({
      date: localDate,
      totalCheckins: 0,
      averageStress: null,
      averageEnergy: null,
      pauseRecommendations: 0,
      breaks_taken: pauseTotals.breaksTaken,
      breaks_skipped: pauseTotals.breaksSkipped,
    });
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

  return res.json({
    date: localDate,
    totalCheckins,
    averageStress: Number((totals.stress / totalCheckins).toFixed(1)),
    averageEnergy: Number((totals.energy / totalCheckins).toFixed(1)),
    pauseRecommendations: totals.pauseRecommendations,
    breaks_taken: pauseTotals.breaksTaken,
    breaks_skipped: pauseTotals.breaksSkipped,
  });
});

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
  const tablesToDelete = ["favorite_pauses", "settings", "checkins", "profiles"]; {/* andere data van werksessies toevoegen */}

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