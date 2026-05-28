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