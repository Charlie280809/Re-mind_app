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
  };
}

app.get("/report/today", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
    });
  }

  const { startIso, endIso } = getTodayRange();
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
      date: startIso.slice(0, 10),
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
    date: startIso.slice(0, 10),
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

app.post("/signup/bootstrap", async (req, res) => {
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

  const requestedUserId = req.body?.userId || null;

  if (requestedUserId && requestedUserId !== userData.user.id) {
    return res.status(403).json({
      error: "The supplied user id does not match the authenticated user.",
    });
  }

  const profileSetup = req.body?.profileSetup || {};
  const workHoursSetup = req.body?.workHoursSetup || null;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: userData.user.id,
      email: userData.user.email || null,
      username: profileSetup.username || userData.user.user_metadata?.username || userData.user.email?.split("@")[0] || "Gebruiker",
      bedrijfsnaam: profileSetup.bedrijfsnaam || userData.user.user_metadata?.bedrijfsnaam || null,
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

  if (workHoursSetup) {
    const { error: workHoursError } = await supabase.from("work_hours").upsert(
      {
        user_id: userData.user.id,
        workdays: workHoursSetup.workdays || [],
        start_time: workHoursSetup.start_time || null,
        end_time: workHoursSetup.end_time || null,
        break_frequency_hours: workHoursSetup.break_frequency_hours ?? 0,
        break_frequency_minutes_part: workHoursSetup.break_frequency_minutes_part ?? 0,
        break_frequency_minutes: workHoursSetup.break_frequency_minutes ?? 0,
        auto_start_work_timer: workHoursSetup.auto_start_work_timer ?? true,
        lunch_start: workHoursSetup.lunch_start || null,
        lunch_end: workHoursSetup.lunch_end || null,
      },
      { onConflict: "user_id" }
    );

    if (workHoursError) {
      return res.status(500).json({
        error: "Failed to save work hours for the new user.",
        details: workHoursError.message,
      });
    }
  }

  return res.json({
    ok: true,
    user: {
      id: userData.user.id,
      email: userData.user.email,
    },
  });
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

  let profileRecord = profile;

  if (!profileRecord) {
    const onboarding = userData.user.user_metadata?.onboarding || {};
    const username = onboarding.username || userData.user.user_metadata?.username || userData.user.email?.split("@")[0] || "Gebruiker";
    const bedrijfsnaam = onboarding.bedrijfsnaam || userData.user.user_metadata?.bedrijfsnaam || null;

    const { error: insertError } = await supabase.from("profiles").upsert(
      {
        user_id: userData.user.id,
        email: userData.user.email || null,
        username,
        bedrijfsnaam,
        is_premium: false,
      },
      { onConflict: "user_id" }
    );

    if (insertError) {
      return res.status(500).json({
        error: "Failed to create profile for the signed-in user.",
        details: insertError.message,
      });
    }

    if (onboarding.work_hours) {
      const { error: workHoursError } = await supabase.from("work_hours").upsert(
        {
          user_id: userData.user.id,
          workdays: onboarding.work_hours.workdays || [],
          start_time: onboarding.work_hours.start_time || null,
          end_time: onboarding.work_hours.end_time || null,
          break_frequency_hours: onboarding.work_hours.break_frequency_hours ?? 0,
          break_frequency_minutes_part: onboarding.work_hours.break_frequency_minutes_part ?? 0,
          break_frequency_minutes: onboarding.work_hours.break_frequency_minutes ?? 0,
          auto_start_work_timer: onboarding.work_hours.auto_start_work_timer ?? true,
          lunch_start: onboarding.work_hours.lunch_start || null,
          lunch_end: onboarding.work_hours.lunch_end || null,
        },
        { onConflict: "user_id" }
      );

      if (workHoursError) {
        return res.status(500).json({
          error: "Failed to create work hours for the signed-in user.",
          details: workHoursError.message,
        });
      }
    }

    const { data: refreshedProfile, error: refreshError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (refreshError) {
      return res.status(500).json({
        error: "Failed to reload profile from Supabase.",
        details: refreshError.message,
      });
    }

    profileRecord = refreshedProfile;
  }

  if (!profileRecord) {
    return res.status(404).json({
      error: "No profile found for the signed-in user.",
    });
  }

  return res.json({
    user: {
      id: userData.user.id,
      email: userData.user.email,
    },
    profile: profileRecord,
  });
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
