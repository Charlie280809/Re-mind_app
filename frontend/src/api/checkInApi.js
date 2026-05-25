import { getApiBaseUrl } from "./apiBaseUrl";

export async function submitCheckIn(stress, energy) {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/checkin`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            stress: parseInt(stress, 10),
            energy: parseInt(energy, 10),
        }),
    });

    if (!response.ok) {
        throw new Error(`Backend gaf status ${response.status}`);
    }

    return response.json();
}