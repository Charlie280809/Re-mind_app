import { getApiBaseUrl, readJsonResponse } from "./apiBaseUrl";

export async function loadProfile(accessToken) {
    const apiBaseUrl = getApiBaseUrl();
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

export async function updateProfile(accessToken, body) {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/profile/me`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
    });

    const payload = await readJsonResponse(response, (snippet) => snippet || "Kon de profielgegevens niet opslaan.");

    if (!response.ok) {
        throw new Error(payload?.error || "Kon de profielgegevens niet opslaan.");
    }

    return payload;
}

export async function setPremiumStatus(accessToken, isPremium) {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/profile/me/premium`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ is_premium: Boolean(isPremium) }),
    });

    const payload = await readJsonResponse(response, (snippet) => snippet || "Kon het plan niet aanpassen.");

    if (!response.ok) {
        throw new Error(payload?.error || "Kon het plan niet aanpassen.");
    }

    return payload;
}

export async function deleteAccount(accessToken) {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/account/me`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const payload = await readJsonResponse(response, (snippet) => snippet || "Kon het account niet verwijderen.");

    if (!response.ok) {
        throw new Error(payload?.error || "Kon het account niet verwijderen.");
    }

    return payload;
}

export async function resetPersonalData(accessToken) {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/account/me/data`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const payload = await readJsonResponse(response, (snippet) => snippet || "Kon je persoonlijke data niet verwijderen.");

    if (!response.ok) {
        throw new Error(payload?.error || "Kon je persoonlijke data niet verwijderen.");
    }

    return payload;
}