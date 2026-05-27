import { getApiBaseUrl } from "./apiBaseUrl";

export async function fetchTodayReport(accessToken) {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/report/today`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });

    if (!response.ok) {
        throw new Error(`Backend gaf status ${response.status}`);
    }

    return response.json();
}