export function getApiBaseUrl() {
    return import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";
} //bestaat 'VITE_API_URL'?

export async function readJsonResponse(response, fallbackMessage) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return await response.json();
    }

    const bodyText = await response.text();
    const snippet = bodyText.slice(0, 120).replace(/\s+/g, " ").trim();
    throw new Error(fallbackMessage(snippet));
}