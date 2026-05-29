import { fetchWithApiError, readJsonResponse } from "./apiBaseUrl";

export async function fetchProfile(apiBaseUrl, accessToken) {
    const response = await fetchWithApiError(`${apiBaseUrl}/profile/me`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }, (detail) => `Kan backend niet bereiken op ${apiBaseUrl}/profile/me. Controleer of de backend draait en of VITE_API_BASE_URL klopt. ${detail ? `(${detail})` : ""}`);

    const payload = await readJsonResponse(response, (snippet) => `Backend antwoordde niet met JSON op ${apiBaseUrl}/profile/me (status ${response.status}). Controleer VITE_API_BASE_URL en of backend draait op poort 3000. Respons: ${snippet}`);

    if (!response.ok) {
        throw new Error(payload.error || "Kon je profiel niet laden.");
    }

    return payload;
}

export async function createSignupAccount(apiBaseUrl, payload) {
    const response = await fetch(`${apiBaseUrl}/signup/create-account`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon account niet aanmaken.");

    if (!response.ok || !body?.user?.id) {
        throw new Error(body.error || "Kon account niet aanmaken.");
    }

    return body;
}

export async function saveSignupNotifications(apiBaseUrl, payload) {
    const response = await fetch(`${apiBaseUrl}/signup/notifications`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon onboarding niet opslaan.");

    if (!response.ok) {
        throw new Error(body.error || "Kon onboarding niet opslaan.");
    }

    return true;
}

export async function saveSignupWorkHours(apiBaseUrl, payload) {
    const response = await fetch(`${apiBaseUrl}/signup/work-hours`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon werkuren niet opslaan.");

    if (!response.ok) {
        throw new Error(body.error || "Kon werkuren niet opslaan.");
    }

    return true;
}

export async function incrementWorkSessionCounter(apiBaseUrl, accessToken, column) {
    const response = await fetch(`${apiBaseUrl}/work-sessions/breaks/increment`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ column }),
    });

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon pauze teller niet verhogen.");

    if (!response.ok) {
        throw new Error(body.error || "Kon pauze teller niet verhogen.");
    }

    return body;
}

export async function completeWorkSessionBreak(apiBaseUrl, accessToken, breakSeconds) {
    const response = await fetch(`${apiBaseUrl}/work-sessions/breaks/complete`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ break_seconds: breakSeconds }),
    });

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon pauzeduur niet opslaan.");

    if (!response.ok) {
        throw new Error(body.error || "Kon pauzeduur niet opslaan.");
    }

    return body?.work_session ?? null;
}

export async function fetchLatestWorkSession(apiBaseUrl, accessToken) {
    const response = await fetchWithApiError(
        `${apiBaseUrl}/work-sessions/today/latest`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        (detail) =>
            `Kan backend niet bereiken op ${apiBaseUrl}/work-sessions/today/latest. Controleer of de backend draait en of VITE_API_BASE_URL klopt. ${detail ? `(${detail})` : ""}`
    );

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon werkdag niet laden.");

    if (!response.ok) {
        throw new Error(body.error || "Kon werkdag niet laden.");
    }

    return body?.work_session ?? null;
}

export async function fetchWorkdayTasksOverview(apiBaseUrl, accessToken) {
    const response = await fetchWithApiError(
        `${apiBaseUrl}/workday-tasks/overview`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        (detail) =>
            `Kan backend niet bereiken op ${apiBaseUrl}/workday-tasks/overview. Controleer of de backend draait en of VITE_API_BASE_URL klopt. ${detail ? `(${detail})` : ""}`
    );

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon takenlijst niet laden.");

    if (!response.ok) {
        throw new Error(body.error || "Kon takenlijst niet laden.");
    }

    return {
        todayDate: body?.today_date || null,
        tomorrowDate: body?.tomorrow_date || null,
        today: Array.isArray(body?.today) ? body.today : [],
        tomorrow: Array.isArray(body?.tomorrow) ? body.tomorrow : [],
    };
}

export async function createWorkdayTask(apiBaseUrl, accessToken, payload) {
    const response = await fetch(`${apiBaseUrl}/workday-tasks`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    });

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon taak niet toevoegen.");

    if (!response.ok) {
        throw new Error(body.error || "Kon taak niet toevoegen.");
    }

    return body?.workday_task ?? null;
}

export async function updateWorkdayTask(apiBaseUrl, accessToken, taskId, payload) {
    const response = await fetch(`${apiBaseUrl}/workday-tasks/${taskId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    });

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon taak niet bijwerken.");

    if (!response.ok) {
        throw new Error(body.error || "Kon taak niet bijwerken.");
    }

    return body?.workday_task ?? null;
}

export async function deleteWorkdayTask(apiBaseUrl, accessToken, taskId) {
    const response = await fetch(`${apiBaseUrl}/workday-tasks/${taskId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon taak niet verwijderen.");

    if (!response.ok) {
        throw new Error(body.error || "Kon taak niet verwijderen.");
    }

    return Boolean(body?.ok);
}

export async function startWorkSession(apiBaseUrl, accessToken, payload) {
    const response = await fetch(`${apiBaseUrl}/work-sessions/start`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    });

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon werkdag niet starten.");

    if (!response.ok) {
        throw new Error(body.error || "Kon werkdag niet starten.");
    }

    return body?.work_session ?? null;
}

export async function endWorkSession(apiBaseUrl, accessToken, payload) {
    const response = await fetch(`${apiBaseUrl}/work-sessions/end`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload || {}),
    });

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon werkdag niet beëindigen.");

    if (!response.ok) {
        throw new Error(body.error || "Kon werkdag niet beëindigen.");
    }

    return body?.work_session ?? null;
}

export async function fetchLatestWorkSessionBreaks(apiBaseUrl, accessToken) {
    const response = await fetchWithApiError(`${apiBaseUrl}/work-sessions/breaks/latest`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }, (detail) => `Kan backend niet bereiken op ${apiBaseUrl}/work-sessions/breaks/latest. Controleer of de backend draait en of VITE_API_BASE_URL klopt. ${detail ? `(${detail})` : ""}`);

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon pauze-overzicht niet laden.");

    if (!response.ok) {
        throw new Error(body.error || "Kon pauze-overzicht niet laden.");
    }

    return {
        breaks_taken: Number(body?.breaks_taken ?? 0),
        breaks_skipped: Number(body?.breaks_skipped ?? 0),
    };
}

export async function fetchCalendarConnectUrl(apiBaseUrl, accessToken, provider) {
    const url = new URL(`${apiBaseUrl}/calendar/connect-url`);
    url.searchParams.set("provider", provider);

    const response = await fetchWithApiError(
        url,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        (detail) => `Kan agenda-koppeling niet starten op ${url.toString()}. ${detail ? `(${detail})` : ""}`
    );

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon agenda-koppeling niet starten.");

    if (!response.ok) {
        throw new Error(body.error || "Kon agenda-koppeling niet starten.");
    }

    return body?.url || "";
}

export async function fetchCalendarEvents(apiBaseUrl, accessToken, provider, date) {
    const url = new URL(`${apiBaseUrl}/calendar/events`);
    url.searchParams.set("provider", provider);

    if (date) {
        url.searchParams.set("date", date);
    }

    const response = await fetchWithApiError(
        url,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        (detail) => `Kan agenda niet ophalen op ${url.toString()}. ${detail ? `(${detail})` : ""}`
    );

    const body = await readJsonResponse(response, (snippet) => snippet || "Kon agenda niet laden.");

    if (!response.ok) {
        throw new Error(body.error || "Kon agenda niet laden.");
    }

    return {
        provider: body?.provider || provider,
        date: body?.date || date || null,
        events: Array.isArray(body?.events) ? body.events : [],
    };
}