import { getApiBaseUrl, readJsonResponse } from "./apiBaseUrl";

export async function fetchProfile(apiBaseUrl, accessToken) {
    const response = await fetch(`${apiBaseUrl}/profile/me`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

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