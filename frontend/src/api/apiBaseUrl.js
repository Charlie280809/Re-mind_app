export function getApiBaseUrl() {
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
}

export async function fetchWithApiError(url, options, fallbackMessage) {
    try {
        return await fetch(url, options);
    } catch (error) {
        const detail = error instanceof Error && error.message ? error.message : String(error);
        throw new Error(typeof fallbackMessage === "function" ? fallbackMessage(detail) : fallbackMessage || detail);
    }
}

export async function readJsonResponse(response, fallbackMessage) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return await response.json();
    }

    const bodyText = await response.text();
    const snippet = bodyText.slice(0, 120).replace(/\s+/g, " ").trim();
    throw new Error(fallbackMessage(snippet));
}