const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    localDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
  };
}

app.get("/report/today", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const { startIso, endIso, localDate } = getTodayRange();
  const { data, error } = await supabase
    .from("checkins")
    .select("stress, energy, need_pause, created_at")
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({
      error: "Failed to load report data from Supabase.",
      details: error.message,
    });
  }

  const totalCheckins = data.length;

  if (totalCheckins === 0) {
    return res.json({
      date: localDate,
      totalCheckins: 0,
      averageStress: null,
      averageEnergy: null,
      pauseRecommendations: 0,
    });
  }

  const totals = data.reduce(
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
  });
});

app.post("/checkin", async (req, res) => {
  const stress = Number(req.body.stress);
  const energy = Number(req.body.energy);

  if (!Number.isInteger(stress) || !Number.isInteger(energy) || stress < 1 || stress > 5 || energy < 1 || energy > 5) {
    return res.status(400).json({
      error: "Stress and energy must both be integers between 1 and 5.",
    });
  }

  const needPause = stress >= 4 || energy <= 2;

  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const { error } = await supabase.from("checkins").insert({
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
      checkin_frequentie: workHoursSetup.checkin_frequentie ?? 0,
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
    .select("is_premium")
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
      email,
      username,
      bedrijfsnaam: bedrijfsnaam || null,
      is_premium: existingProfile?.is_premium ?? false,
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
    .select("email, username, bedrijfsnaam")
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
    },
  });
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
