const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
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
const calendarOAuthStates = new Map();
const calendarStateTtlMs = 10 * 60 * 1000;

function hasPremiumAccess(profile) {
  return Boolean(profile?.is_premium) || Boolean(profile?.company_id);
}

function isCompanyAdmin(profile) {
  return Boolean(profile?.company_id) && profile?.company_role === "admin";
}

function normalizeCompanyTheme(theme) {
  return theme && typeof theme === "object" ? theme : {};
}

async function deletePendingCompanyMembersByEmail(email) {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail) {
    return;
  }

  await supabase
    .from("company_pending_members")
    .delete()
    .ilike("email", normalizedEmail);
}

// --- shared request helpers ---

function getBearerToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
}

function isSupportedCalendarProvider(provider) {
  return provider === "google" || provider === "microsoft";
}

function getCalendarBaseUrl(req) {
  return process.env.CALENDAR_REDIRECT_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function getCalendarProviderConfig(provider) {
  if (provider === "google") {
    return {
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      responseMode: undefined,
      extraAuthorizeParams: {
        access_type: "offline",
        prompt: "consent",
      },
    };
  }

  return {
    authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    clientId: process.env.MS_CLIENT_ID,
    clientSecret: process.env.MS_CLIENT_SECRET,
    scope: "Calendars.Read offline_access",
    responseMode: "query",
    extraAuthorizeParams: {
      prompt: "consent",
    },
  };
}

function generatePkcePair() {
  const codeVerifier = crypto.randomBytes(64).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  return { codeVerifier, codeChallenge };
}

function cleanupCalendarOAuthStates() {
  const now = Date.now();

  for (const [state, payload] of calendarOAuthStates.entries()) {
    if (!payload || now - payload.createdAt > calendarStateTtlMs) {
      calendarOAuthStates.delete(state);
    }
  }
}

function createCalendarOAuthState(payload) {
  cleanupCalendarOAuthStates();

  const state = crypto.randomUUID();
  calendarOAuthStates.set(state, {
    ...payload,
    createdAt: Date.now(),
  });

  return state;
}

function consumeCalendarOAuthState(state) {
  cleanupCalendarOAuthStates();

  const payload = calendarOAuthStates.get(state) || null;
  if (payload) {
    calendarOAuthStates.delete(state);
  }

  return payload;
}

function getCalendarEncryptionKey() {
  const secret = process.env.CALENDAR_TOKEN_SECRET || process.env.CALENDAR_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "re-mind-calendar-dev-secret";
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptCalendarToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCalendarEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decryptCalendarToken(encryptedValue) {
  const buffer = Buffer.from(String(encryptedValue || ""), "base64");

  if (buffer.length <= 28) {
    throw new Error("Invalid encrypted calendar token.");
  }

  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const payload = buffer.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getCalendarEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
}

function buildCalendarAuthorizeUrl(provider, req, state, codeChallenge) {
  const config = getCalendarProviderConfig(provider);
  const redirectUri = `${getCalendarBaseUrl(req)}/calendar/callback/${provider}`;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scope,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  if (config.responseMode) {
    params.set("response_mode", config.responseMode);
  }

  for (const [key, value] of Object.entries(config.extraAuthorizeParams || {})) {
    if (value) {
      params.set(key, value);
    }
  }

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

async function exchangeCalendarAuthorizationCode(provider, req, code, codeVerifier) {
  const config = getCalendarProviderConfig(provider);
  const redirectUri = `${getCalendarBaseUrl(req)}/calendar/callback/${provider}`;
  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "Could not exchange authorization code.");
  }

  return payload;
}

async function refreshCalendarAccessToken(provider, refreshToken) {
  const config = getCalendarProviderConfig(provider);
  const body = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  };

  if (provider === "microsoft") {
    body.scope = config.scope;
  }

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "Could not refresh calendar access token.");
  }

  return payload.access_token;
}

async function loadCalendarConnection(userId, provider) {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("encrypted_refresh_token")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.encrypted_refresh_token) {
    return null;
  }

  return data;
}

async function fetchCalendarEvents(provider, accessToken, startIso, endIso) {
  if (provider === "google") {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", startIso);
    url.searchParams.set("timeMax", endIso);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "50");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error?.message || payload.error || "Could not load Google Calendar events.");
    }

    return (Array.isArray(payload.items) ? payload.items : []).map((event) => ({
      id: event.id,
      provider: "google",
      title: event.summary || "Afspraak",
      start: event.start?.dateTime || event.start?.date || null,
      end: event.end?.dateTime || event.end?.date || null,
      allDay: Boolean(event.start?.date && !event.start?.dateTime),
      location: event.location || "",
    }));
  }

  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarview");
  url.searchParams.set("startDateTime", startIso);
  url.searchParams.set("endDateTime", endIso);
  url.searchParams.set("$select", "subject,start,end,location,showAs");
  url.searchParams.set("$orderby", "start/dateTime");
  url.searchParams.set("$top", "50");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error?.message || payload.error || "Could not load Microsoft Calendar events.");
  }

  return (Array.isArray(payload.value) ? payload.value : []).map((event) => ({
    id: event.id,
    provider: "microsoft",
    title: event.subject || "Afspraak",
    start: event.start?.dateTime || null,
    end: event.end?.dateTime || null,
    allDay: Boolean(event.isAllDay),
    location: event.location?.displayName || "",
  }));
}

function renderCalendarConnectionSuccessPage(provider) {
  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agenda gekoppeld</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 10% auto 0 auto; min-height: 100vh;  background: #FFFCF5; }
      .card { width: 520px); background: #F4EDD9; border-radius: 20px; padding: 32px; }
      h1 { margin: 0 0 10px; font-size: 24px; color: #1A1A1A; }
      p { margin: 0; line-height: 1.5; color: #605E5B; }
    </style>
  </head>
  <body>
    <div class="card"><h1>Je agenda is gekoppeld</h1><p>Open Re:Mind om je afspraken te bekijken.</p></div>
  </body>
</html>`;
}

app.get("/calendar/connect-url", async (req, res) => {
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

  const provider = typeof req.query?.provider === "string" ? req.query.provider : "";
  if (!isSupportedCalendarProvider(provider)) {
    return res.status(400).json({
      error: "Invalid provider. Use google or microsoft.",
    });
  }

  const config = getCalendarProviderConfig(provider);
  if (!config.clientId || !config.clientSecret) {
    return res.status(500).json({
      error: `${provider} OAuth is not configured in the backend environment.`,
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { data: settingsData, error: settingsError } = await supabase
    .from("settings")
    .select("allow_agenda_sync")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (settingsError) {
    return res.status(500).json({
      error: "Failed to load privacy settings.",
      details: settingsError.message,
    });
  }

  if (!settingsData || settingsData.allow_agenda_sync !== true) {
    return res.status(403).json({
      error: "Geen agenda gekoppeld. Ga naar de privacy instellingen om sync in te schakelen.",
    });
  }

  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = createCalendarOAuthState({
    userId: userData.user.id,
    provider,
    codeVerifier,
  });

  return res.json({
    provider,
    url: buildCalendarAuthorizeUrl(provider, req, state, codeChallenge),
  });
});

app.get("/calendar/callback/:provider", async (req, res) => {
  if (!supabase) {
    return res.status(500).send("Supabase is not configured.");
  }

  const provider = typeof req.params?.provider === "string" ? req.params.provider : "";
  if (!isSupportedCalendarProvider(provider)) {
    return res.status(400).send("Invalid provider.");
  }

  const code = typeof req.query?.code === "string" ? req.query.code : "";
  const state = typeof req.query?.state === "string" ? req.query.state : "";
  const oauthError = typeof req.query?.error === "string" ? req.query.error : "";

  if (oauthError) {
    return res.status(400).send(`OAuth error: ${oauthError}`);
  }

  if (!code || !state) {
    return res.status(400).send("Missing authorization code or state.");
  }

  const statePayload = consumeCalendarOAuthState(state);
  if (!statePayload || statePayload.provider !== provider) {
    return res.status(400).send("Invalid or expired OAuth state.");
  }

  try {
    const tokenData = await exchangeCalendarAuthorizationCode(provider, req, code, statePayload.codeVerifier);
    const refreshToken = typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : "";

    if (!refreshToken) {
      return res.status(500).send("No refresh token was returned by the provider.");
    }

    const encryptedRefreshToken = encryptCalendarToken(refreshToken);
    const accessTokenExpiresAt = tokenData.expires_in ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString();

    const deleteResult = await supabase
      .from("calendar_connections")
      .delete()
      .eq("user_id", statePayload.userId)
      .eq("provider", provider);

    if (deleteResult.error) {
      throw deleteResult.error;
    }

    const { error: insertError } = await supabase.from("calendar_connections").insert({
      user_id: statePayload.userId,
      provider,
      encrypted_refresh_token: encryptedRefreshToken,
      access_token_expires_at: accessTokenExpiresAt,
    });

    if (insertError) {
      throw insertError;
    }

    return res.status(200).send(renderCalendarConnectionSuccessPage(provider));
  } catch (error) {
    return res.status(500).send(error.message || "Could not complete calendar connection.");
  }
});

app.delete("/calendar/connections", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase is not configured." });

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing Bearer token." });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return res.status(401).json({ error: "Invalid or expired session." });

  const { error } = await supabase.from("calendar_connections").delete().eq("user_id", userData.user.id);
  if (error) return res.status(500).json({ error: "Could not disconnect calendar.", details: error.message });

  return res.json({ ok: true });
});

app.get("/calendar/events", async (req, res) => {
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

  const provider = typeof req.query?.provider === "string" ? req.query.provider : "";
  const requestedDate = typeof req.query?.date === "string" ? req.query.date : undefined;

  if (!isSupportedCalendarProvider(provider)) {
    return res.status(400).json({
      error: "Invalid provider. Use google or microsoft.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { data: settingsData, error: settingsError } = await supabase
    .from("settings")
    .select("allow_agenda_sync")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (settingsError) {
    return res.status(500).json({
      error: "Failed to load privacy settings.",
      details: settingsError.message,
    });
  }

  if (!settingsData || settingsData.allow_agenda_sync !== true) {
    return res.status(403).json({
      error: "Geen agenda gekoppeld. Ga naar de privacy instellingen om sync in te schakelen.",
    });
  }

  const connection = await loadCalendarConnection(userData.user.id, provider);
  if (!connection) {
    return res.status(200).json({
      provider,
      date: requestedDate || getReportRange().localDate,
      events: [],
      connected: false,
    });
  }

  let refreshToken;
  try {
    refreshToken = decryptCalendarToken(connection.encrypted_refresh_token);
  } catch (error) {
    return res.status(500).json({
      error: "Stored calendar token could not be decrypted.",
      details: error.message,
    });
  }

  const { startIso, endIso, localDate } = getReportRange(requestedDate);

  try {
    const accessToken = await refreshCalendarAccessToken(provider, refreshToken);
    const events = await fetchCalendarEvents(provider, accessToken, startIso, endIso);

    return res.json({
      provider,
      date: localDate,
      events,
      connected: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Could not load calendar events.",
    });
  }
});

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

function getWeekRange(dateInput) {
  const baseDate = typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput) ? new Date(`${dateInput}T00:00:00`) : new Date();
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    localStartDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
  };
}

function toIsoDateKey(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function getWeekDayLabel(dayIndex) {
  const labels = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  return labels[dayIndex] || "";
}

function buildWeekDays(localStartDate) {
  const start = new Date(`${localStartDate}T00:00:00`);
  const days = [];

  for (let index = 0; index < 7; index += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;

    days.push({
      date: dateKey,
      label: getWeekDayLabel(index),
      stressSum: 0,
      energySum: 0,
      totalCheckins: 0,
      breaksTaken: 0,
      breaksSkipped: 0,
      totalBreakSeconds: 0,
      totalWorkSeconds: 0,
    });
  }

  return days;
}

function getTodayRange() {
  return getReportRange();
}

function getLocalDateString(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Convert a duration in seconds to a human-readable string for the report UI.
function formatDurationUnit(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatSecondsAsDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes >= 60) {
    return formatSecondsAsHoursAndMinutes(safeSeconds);
  }

  if (minutes === 0) {
    return formatDurationUnit(seconds, "seconde", "seconden");
  }

  if (seconds === 0) {
    return formatDurationUnit(minutes, "minuut", "minuten");
  }

  return `${formatDurationUnit(minutes, "minuut", "minuten")} en ${formatDurationUnit(seconds, "seconde", "seconden")}`;
}

function formatSecondsAsHoursAndMinutes(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (minutes === 0) {
    return formatDurationUnit(hours, "uur", "uur");
  }

  return `${formatDurationUnit(hours, "uur", "uur")} en ${formatDurationUnit(minutes, "minuut", "minuten")}`;
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

function summarizeCheckins(checkins) {
  return (checkins || []).reduce(
    (acc, row) => {
      acc.stress += row.stress;
      acc.energy += row.energy;
      return acc;
    },
    { stress: 0, energy: 0 }
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
    totalWorkSeconds: pauseTotals.totalWorkSeconds,
    totalWorkTime: formatSecondsAsHoursAndMinutes(pauseTotals.totalWorkSeconds),
  };
}

const WORK_SESSION_SELECT = "id, start_tijd, eind_tijd, source, source_details, server_scheduled_day, total_pausetime, breaks_taken, breaks_skipped";
const WORKDAY_TASK_SELECT = "id, user_id, task_date, task_text, is_done";

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

app.get("/report/week", async (req, res) => {
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
  const { startIso, endIso, localStartDate } = getWeekRange(requestedDate);

  const { data: checkins, error: checkinError } = await supabase
    .from("checkins")
    .select("stress, energy, created_at")
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (checkinError) {
    return res.status(500).json({
      error: "Failed to load weekly check-in data from Supabase.",
      details: checkinError.message,
    });
  }

  const { data: workSessions, error: workSessionError } = await supabase
    .from("work_sessions")
    .select("breaks_taken, breaks_skipped, total_pausetime, start_tijd, eind_tijd")
    .eq("user_id", userId)
    .gte("start_tijd", startIso)
    .lt("start_tijd", endIso);

  if (workSessionError) {
    return res.status(500).json({
      error: "Failed to load weekly work session data from Supabase.",
      details: workSessionError.message,
    });
  }

  const totalCheckins = checkins.length;
  const totals = summarizeCheckins(checkins);
  const pauseTotals = summarizeDailyWorkSessions(workSessions);
  const weekDays = buildWeekDays(localStartDate);
  const dayByDate = new Map(weekDays.map((day) => [day.date, day]));

  for (const row of checkins) {
    const dateKey = toIsoDateKey(row.created_at);
    if (!dateKey || !dayByDate.has(dateKey)) {
      continue;
    }

    const day = dayByDate.get(dateKey);
    day.stressSum += Number(row.stress ?? 0);
    day.energySum += Number(row.energy ?? 0);
    day.totalCheckins += 1;
  }

  for (const session of workSessions) {
    const dateKey = toIsoDateKey(session.start_tijd);
    if (!dateKey || !dayByDate.has(dateKey)) {
      continue;
    }

    const startTime = new Date(session.start_tijd);
    const endTime = new Date(session.eind_tijd);
    const sessionDurationSeconds = Number.isFinite(startTime.getTime()) && Number.isFinite(endTime.getTime())
      ? Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000))
      : 0;
    const sessionPauseSeconds = Math.max(0, Number(session.total_pausetime ?? 0));
    const day = dayByDate.get(dateKey);

    day.breaksTaken += Number(session.breaks_taken ?? 0);
    day.breaksSkipped += Number(session.breaks_skipped ?? 0);
    day.totalBreakSeconds += sessionPauseSeconds;
    day.totalWorkSeconds += Math.max(0, sessionDurationSeconds - sessionPauseSeconds);
  }

  const daily = weekDays.map((day) => ({
    date: day.date,
    label: day.label,
    totalCheckins: day.totalCheckins,
    averageStress: day.totalCheckins === 0 ? null : Number((day.stressSum / day.totalCheckins).toFixed(1)),
    averageEnergy: day.totalCheckins === 0 ? null : Number((day.energySum / day.totalCheckins).toFixed(1)),
    breaks_taken: day.breaksTaken,
    breaks_skipped: day.breaksSkipped,
    totalBreakSeconds: day.totalBreakSeconds,
    totalWorkSeconds: day.totalWorkSeconds,
  }));

  return res.json({
    date: localStartDate,
    averageStress: totalCheckins === 0 ? null : Number((totals.stress / totalCheckins).toFixed(1)),
    averageEnergy: totalCheckins === 0 ? null : Number((totals.energy / totalCheckins).toFixed(1)),
    totalBreakTime: formatSecondsAsDuration(pauseTotals.totalBreakSeconds),
    totalWorkTime: formatSecondsAsHoursAndMinutes(pauseTotals.totalWorkSeconds),
    daily,
  });
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
    .update(requestedEndTime ? { eind_tijd: requestedEndTime.toISOString() } : { eind_tijd: latestSession.eind_tijd })
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

app.get("/workday-tasks/overview", async (req, res) => {
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

  const todayDate = getLocalDateString(0);
  const tomorrowDate = getLocalDateString(1);

  const { data: tasks, error: taskError } = await supabase
    .from("workday_tasks")
    .select(WORKDAY_TASK_SELECT)
    .eq("user_id", userData.user.id)
    .in("task_date", [todayDate, tomorrowDate]);

  if (taskError) {
    return res.status(500).json({
      error: "Failed to load workday tasks.",
      details: taskError.message,
    });
  }

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  return res.json({
    today_date: todayDate,
    tomorrow_date: tomorrowDate,
    today: safeTasks.filter((task) => task.task_date === todayDate),
    tomorrow: safeTasks.filter((task) => task.task_date === tomorrowDate),
  });
});

app.post("/workday-tasks", async (req, res) => {
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

  const taskText = typeof req.body?.task_text === "string" ? req.body.task_text.trim() : "";
  const taskDay = req.body?.task_day === "tomorrow" ? "tomorrow" : req.body?.task_day === "today" ? "today" : null;

  if (!taskText || !taskDay) {
    return res.status(400).json({
      error: "Missing task text or invalid task day.",
    });
  }

  const taskDate = getLocalDateString(taskDay === "tomorrow" ? 1 : 0);

  const { data: createdTask, error: createError } = await supabase
    .from("workday_tasks")
    .insert({
      user_id: userData.user.id,
      task_date: taskDate,
      task_text: taskText,
    })
    .select(WORKDAY_TASK_SELECT)
    .single();

  if (createError) {
    return res.status(500).json({
      error: "Failed to create workday task.",
      details: createError.message,
    });
  }

  return res.status(201).json({
    workday_task: createdTask,
  });
});

app.patch("/workday-tasks/:id", async (req, res) => {
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

  const taskId = typeof req.params?.id === "string" ? req.params.id : "";
  if (!taskId) {
    return res.status(400).json({
      error: "Missing task id.",
    });
  }

  const updates = {};

  if (typeof req.body?.task_text === "string") {
    const nextText = req.body.task_text.trim();
    if (!nextText) {
      return res.status(400).json({
        error: "Task text cannot be empty.",
      });
    }
    updates.task_text = nextText;
  }

  if (typeof req.body?.task_day === "string") {
    if (req.body.task_day !== "today" && req.body.task_day !== "tomorrow") {
      return res.status(400).json({
        error: "Invalid task day.",
      });
    }

    updates.task_date = getLocalDateString(req.body.task_day === "tomorrow" ? 1 : 0);
  }

  if (typeof req.body?.is_done === "boolean") {
    updates.is_done = req.body.is_done;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: "No valid task updates provided.",
    });
  }

  const { data: updatedTask, error: updateError } = await supabase
    .from("workday_tasks")
    .update(updates)
    .eq("id", taskId)
    .eq("user_id", userData.user.id)
    .select(WORKDAY_TASK_SELECT)
    .single();

  if (updateError) {
    return res.status(500).json({
      error: "Failed to update workday task.",
      details: updateError.message,
    });
  }

  return res.json({
    workday_task: updatedTask,
  });
});

app.delete("/workday-tasks/:id", async (req, res) => {
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

  const taskId = typeof req.params?.id === "string" ? req.params.id : "";
  if (!taskId) {
    return res.status(400).json({
      error: "Missing task id.",
    });
  }

  const { error: deleteError } = await supabase
    .from("workday_tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userData.user.id);

  if (deleteError) {
    return res.status(500).json({
      error: "Failed to delete workday task.",
      details: deleteError.message,
    });
  }

  return res.json({ ok: true });
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

  await deletePendingCompanyMembersByEmail(email);

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

  let { data: profile, error } = await supabase
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

  let companyTheme = null;

  if (profile.company_id) {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name, theme")
      .eq("id", profile.company_id)
      .maybeSingle();

    if (!companyError) {
      companyTheme = normalizeCompanyTheme(company?.theme);
    }

    if (!companyError && company?.name && profile.bedrijfsnaam !== company.name) {
      const { error: syncError } = await supabase
        .from("profiles")
        .update({
          bedrijfsnaam: company.name,
        })
        .eq("user_id", profile.user_id);

      if (!syncError) {
        profile = {
          ...profile,
          bedrijfsnaam: company.name,
        };
      }
    }
  }

  profile = {
    ...profile,
    company_theme: companyTheme,
  };

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
    .select("is_premium, avatar_url, company_id, company_role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (existingProfileError) {
    return res.status(500).json({
      error: "Failed to load existing profile state.",
      details: existingProfileError.message,
    });
  }

  const nextAvatarUrl = hasPremiumAccess(existingProfile) ? avatarUrl || existingProfile?.avatar_url || null : existingProfile?.avatar_url || null;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: userData.user.id,
      email,
      username,
      bedrijfsnaam: bedrijfsnaam || null,
      is_premium: existingProfile?.is_premium ?? false,
      company_id: existingProfile?.company_id ?? null,
      company_role: existingProfile?.company_role ?? null,
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

  await deletePendingCompanyMembersByEmail(email);

  return res.json({
    ok: true,
    profile: {
      user_id: userData.user.id,
      email,
      username,
      bedrijfsnaam: bedrijfsnaam || null,
      is_premium: existingProfile?.is_premium ?? false,
      company_id: existingProfile?.company_id ?? null,
      company_role: existingProfile?.company_role ?? null,
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
      company_id: existingProfile?.company_id ?? null,
      company_role: existingProfile?.company_role ?? null,
      avatar_url: existingProfile?.avatar_url || null,
    },
  });
});

app.get("/company/me", async (req, res) => {
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    return res.status(500).json({
      error: "Failed to load profile.",
      details: profileError.message,
    });
  }

  if (!isCompanyAdmin(profile) || !profile?.company_id) {
    return res.status(403).json({
      error: "Je hebt geen toegang tot bedrijfsbeheer.",
    });
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .maybeSingle();

  if (companyError) {
    return res.status(500).json({
      error: "Failed to load company.",
      details: companyError.message,
    });
  }

  if (!company) {
    return res.status(404).json({
      error: "Company not found.",
    });
  }

  const { data: members, error: membersError } = await supabase
    .from("profiles")
    .select("user_id, email, username, bedrijfsnaam, avatar_url, company_id, company_role, is_premium")
    .eq("company_id", company.id)
    .order("company_role", { ascending: false })
    .order("username", { ascending: true });

  if (membersError) {
    return res.status(500).json({
      error: "Failed to load company members.",
      details: membersError.message,
    });
  }

  const { data: pendingMembers, error: pendingMembersError } = await supabase
    .from("company_pending_members")
    .select("id, email, role, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: true });

  if (pendingMembersError) {
    return res.status(500).json({
      error: "Failed to load pending members.",
      details: pendingMembersError.message,
    });
  }

  return res.json({
    ok: true,
    company: {
      ...company,
      theme: normalizeCompanyTheme(company.theme),
    },
    members: Array.isArray(members) ? members : [],
    pending_members: Array.isArray(pendingMembers) ? pendingMembers : [],
  });
});

app.post("/company/request", async (req, res) => {
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

  const companyName = typeof req.body?.company_name === "string" ? req.body.company_name.trim() : "";
  const adminEmail = typeof req.body?.admin_email === "string" ? req.body.admin_email.trim().toLowerCase() : "";
  const theme = normalizeCompanyTheme(req.body?.theme);

  if (!companyName || !adminEmail) {
    return res.status(400).json({
      error: "Missing company name or admin email.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  if ((userData.user.email || "").toLowerCase() !== adminEmail) {
    return res.status(400).json({
      error: "Het admin e-mailadres moet overeenkomen met het ingelogde account.",
    });
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (existingProfileError) {
    return res.status(500).json({
      error: "Failed to load existing profile state.",
      details: existingProfileError.message,
    });
  }

  if (existingProfile?.company_id) {
    return res.status(409).json({
      error: "Je bent al aan een bedrijf gekoppeld.",
    });
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: companyName,
      admin_user_id: userData.user.id,
      admin_email: adminEmail,
      theme,
    })
    .select("*")
    .single();

  if (companyError) {
    return res.status(500).json({
      error: "Failed to create company.",
      details: companyError.message,
    });
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: userData.user.id,
      email: adminEmail,
      username: existingProfile?.username || userData.user.user_metadata?.username || "",
      bedrijfsnaam: existingProfile?.bedrijfsnaam || userData.user.user_metadata?.bedrijfsnaam || null,
      company_id: company.id,
      company_role: "admin",
      is_premium: true,
      avatar_url: existingProfile?.avatar_url || null,
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    await supabase.from("companies").delete().eq("id", company.id);
    return res.status(500).json({
      error: "Failed to assign admin profile to company.",
      details: profileError.message,
    });
  }

  await deletePendingCompanyMembersByEmail(adminEmail);

  return res.json({
    ok: true,
    company: {
      ...company,
      theme: normalizeCompanyTheme(company.theme),
    },
    profile: {
      user_id: userData.user.id,
      email: adminEmail,
      username: existingProfile?.username || userData.user.user_metadata?.username || "",
      bedrijfsnaam: existingProfile?.bedrijfsnaam || userData.user.user_metadata?.bedrijfsnaam || null,
      company_id: company.id,
      company_role: "admin",
      is_premium: true,
      avatar_url: existingProfile?.avatar_url || null,
      company_theme: normalizeCompanyTheme(company.theme),
    },
  });
});

app.put("/company/me", async (req, res) => {
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

  const companyName = typeof req.body?.company_name === "string" ? req.body.company_name.trim() : "";
  const theme = normalizeCompanyTheme(req.body?.theme);

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    return res.status(500).json({
      error: "Failed to load profile.",
      details: profileError.message,
    });
  }

  if (!isCompanyAdmin(profile) || !profile?.company_id) {
    return res.status(403).json({
      error: "Je hebt geen toegang tot bedrijfsbeheer.",
    });
  }

  const updatePayload = {};

  if (companyName) {
    updatePayload.name = companyName;
  }

  if (theme) {
    updatePayload.theme = theme;
  }

  if (!Object.keys(updatePayload).length) {
    return res.status(400).json({
      error: "Nothing to update.",
    });
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .update(updatePayload)
    .eq("id", profile.company_id)
    .select("*")
    .single();

  if (companyError) {
    return res.status(500).json({
      error: "Failed to update company.",
      details: companyError.message,
    });
  }

  return res.json({
    ok: true,
    company: {
      ...company,
      theme: normalizeCompanyTheme(company.theme),
    },
  });
});

app.post("/company/members", async (req, res) => {
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

  if (!email) {
    return res.status(400).json({
      error: "Missing email.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { data: adminProfile, error: adminProfileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminProfileError) {
    return res.status(500).json({
      error: "Failed to load profile.",
      details: adminProfileError.message,
    });
  }

  if (!isCompanyAdmin(adminProfile) || !adminProfile?.company_id) {
    return res.status(403).json({
      error: "Je hebt geen toegang tot bedrijfsbeheer.",
    });
  }

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle();

  if (targetProfileError) {
    return res.status(500).json({
      error: "Failed to load target profile.",
      details: targetProfileError.message,
    });
  }

  if (targetProfile?.company_id && targetProfile.company_id !== adminProfile.company_id) {
    return res.status(409).json({
      error: "Deze gebruiker hoort al bij een ander bedrijf.",
    });
  }

  if (targetProfile?.company_role === "admin" && targetProfile.company_id === adminProfile.company_id) {
    return res.status(409).json({
      error: "Gebruik admin-overdracht voordat je deze gebruiker toevoegt of verwijdert.",
    });
  }

  if (targetProfile) {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", adminProfile.company_id)
      .maybeSingle();

    if (companyError) {
      return res.status(500).json({
        error: "Failed to load company.",
        details: companyError.message,
      });
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        company_id: adminProfile.company_id,
        company_role: "member",
        bedrijfsnaam: company?.name || targetProfile.bedrijfsnaam || null,
      })
      .eq("user_id", targetProfile.user_id)
      .select("*")
      .single();

    if (updateError) {
      return res.status(500).json({
        error: "Failed to add member to company.",
        details: updateError.message,
      });
    }

    await deletePendingCompanyMembersByEmail(email);

    return res.json({
      ok: true,
      member: updatedProfile,
    });
  }

  const { error: pendingError } = await supabase.from("company_pending_members").upsert(
    {
      company_id: adminProfile.company_id,
      email,
      role: "member",
    },
    { onConflict: "company_id,email" }
  );

  if (pendingError) {
    return res.status(500).json({
      error: "Failed to create pending company member.",
      details: pendingError.message,
    });
  }

  return res.json({
    ok: true,
    pending: true,
  });
});

app.delete("/company/members", async (req, res) => {
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

  if (!email) {
    return res.status(400).json({
      error: "Missing email.",
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Invalid or expired session.",
    });
  }

  const { data: adminProfile, error: adminProfileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminProfileError) {
    return res.status(500).json({
      error: "Failed to load profile.",
      details: adminProfileError.message,
    });
  }

  if (!isCompanyAdmin(adminProfile) || !adminProfile?.company_id) {
    return res.status(403).json({
      error: "Je hebt geen toegang tot bedrijfsbeheer.",
    });
  }

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle();

  if (targetProfileError) {
    return res.status(500).json({
      error: "Failed to load target profile.",
      details: targetProfileError.message,
    });
  }

  if (targetProfile?.company_role === "admin" && targetProfile.company_id === adminProfile.company_id) {
    return res.status(409).json({
      error: "De admin van een bedrijf kan je niet verwijderen zonder admin-overdracht.",
    });
  }

  if (targetProfile?.company_id === adminProfile.company_id) {
    const { error: removeError } = await supabase
      .from("profiles")
      .update({
        company_id: null,
        company_role: null,
      })
      .eq("user_id", targetProfile.user_id);

    if (removeError) {
      return res.status(500).json({
        error: "Failed to remove member from company.",
        details: removeError.message,
      });
    }
  }

  const { error: pendingDeleteError } = await supabase
    .from("company_pending_members")
    .delete()
    .eq("company_id", adminProfile.company_id)
    .ilike("email", email);

  if (pendingDeleteError) {
    return res.status(500).json({
      error: "Failed to remove pending member.",
      details: pendingDeleteError.message,
    });
  }

  return res.json({ ok: true });
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
  const tablesToDelete = ["favorite_pauses", "settings", "checkins", "work_sessions", "workday_tasks", "profiles"];

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

app.delete("/account/me/data", async (req, res) => {
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
  const tablesToDelete = [
    "favorite_pauses",
    "workday_tasks",
    "checkins",
    "work_sessions",
    "work_hours",
    "settings",
    "calendar_connections",
  ];

  for (const tableName of tablesToDelete) {
    const { error } = await supabase.from(tableName).delete().eq("user_id", userId);

    if (error) {
      return res.status(500).json({
        error: `Failed to delete data from ${tableName}.`,
        details: error.message,
      });
    }
  }

  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});