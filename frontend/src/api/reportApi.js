import { getApiBaseUrl } from "./apiBaseUrl";

export async function fetchTodayReport() {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/report/today`);

    if (!response.ok) {
        throw new Error(`Backend gaf status ${response.status}`);
    }

    return response.json();
}