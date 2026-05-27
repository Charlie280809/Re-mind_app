import { fetchWithApiError, getApiBaseUrl } from "./apiBaseUrl";

export async function fetchTodayReport(accessToken, reportDate) {
    const apiBaseUrl = getApiBaseUrl();
    const url = new URL(`${apiBaseUrl}/report/today`);

    if (reportDate) {
        url.searchParams.set("date", reportDate);
    }

    const response = await fetchWithApiError(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }, (detail) => `Kan backend niet bereiken op ${url.toString()}. Controleer of de backend draait en of VITE_API_BASE_URL klopt. ${detail ? `(${detail})` : ""}`);

    if (!response.ok) {
        throw new Error(`Backend gaf status ${response.status}`);
    }

    return response.json();
}