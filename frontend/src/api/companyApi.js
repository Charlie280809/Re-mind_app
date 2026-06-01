import { getApiBaseUrl, fetchWithApiError, readJsonResponse } from "./apiBaseUrl";

async function fetchCompanyApi(path, options, fallbackMessage) {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetchWithApiError(`${apiBaseUrl}${path}`, options, fallbackMessage);
  const payload = await readJsonResponse(response, (snippet) => snippet || "Kon bedrijfsgegevens niet laden.");

  if (!response.ok) {
    throw new Error(payload?.error || "Kon bedrijfsgegevens niet laden.");
  }

  return payload;
}

export function loadCompanyManagement(accessToken) {
  return fetchCompanyApi(
    "/company/me",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    "Kan bedrijfsbeheer niet laden."
  );
}

export function requestCompany(accessToken, payload) {
  return fetchCompanyApi(
    "/company/request",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    },
    "Kan bedrijfsaanvraag niet indienen."
  );
}

export function updateCompany(accessToken, payload) {
  return fetchCompanyApi(
    "/company/me",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    },
    "Kan bedrijfsgegevens niet opslaan."
  );
}

export function addCompanyMember(accessToken, email) {
  return fetchCompanyApi(
    "/company/members",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email }),
    },
    "Kan werknemer niet toevoegen."
  );
}

export function removeCompanyMember(accessToken, email) {
  return fetchCompanyApi(
    "/company/members",
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email }),
    },
    "Kan werknemer niet verwijderen."
  );
}