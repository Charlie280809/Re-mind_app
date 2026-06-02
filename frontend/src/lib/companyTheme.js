const THEME_VAR_KEYS = [
    "--background-300",
    "--surface-background",
    "--background-card-300",
    "--surface-card",
    "--text-primary-300",
    "--text-primary",
    "--text-secondary-300",
    "--text-secondary",
    "--text",
    "--border-300",
    "--border-color-default",
    "--border-green-300",
    "--border-color-green",
    "--primary-300",
    "--brand-primary",
    "--highlight-300",
    "--brand-highlight",
    "--highlight-200",
    "--success-300",
    "--warning-300",
    "--error-300",
    "--info-300",
];

function getCompanyThemeStorageKey(companyId) {
    return `remind-company-theme:${companyId}`;
}

function setThemeValue(rootStyle, key, value) {
    if (typeof value === "string" && value.trim()) {
        rootStyle.setProperty(key, value.trim());
    }
}

export function clearCompanyTheme() {
    if (typeof document === "undefined") {
        return;
    }

    const rootStyle = document.documentElement.style;
    for (const key of THEME_VAR_KEYS) {
        rootStyle.removeProperty(key);
    }
}

export function applyCompanyTheme(theme) {
    if (typeof document === "undefined") {
        return;
    }

    const vars = theme?.vars;
    if (!vars || typeof vars !== "object") {
        clearCompanyTheme();
        return;
    }

    const rootStyle = document.documentElement.style;

    setThemeValue(rootStyle, "--background-300", vars.background);
    setThemeValue(rootStyle, "--surface-background", vars.background);

    setThemeValue(rootStyle, "--background-card-300", vars.backgroundCard);
    setThemeValue(rootStyle, "--surface-card", vars.backgroundCard);

    setThemeValue(rootStyle, "--background-section-300", vars.backgroundSection);
    setThemeValue(rootStyle, "--surface-section", vars.backgroundSection);

    setThemeValue(rootStyle, "--text-primary-300", vars.text);
    setThemeValue(rootStyle, "--text-primary", vars.text);
    setThemeValue(rootStyle, "--text-secondary-300", vars.text);
    setThemeValue(rootStyle, "--text-secondary", vars.text);
    setThemeValue(rootStyle, "--text", vars.text);

    setThemeValue(rootStyle, "--border-300", vars.border);
    setThemeValue(rootStyle, "--border-color-default", vars.border);
    setThemeValue(rootStyle, "--border-green-300", vars.border);
    setThemeValue(rootStyle, "--border-color-green", vars.border);

    setThemeValue(rootStyle, "--primary-300", vars.primary);
    setThemeValue(rootStyle, "--brand-primary", vars.primary);

    setThemeValue(rootStyle, "--highlight-300", vars.highlight);
    setThemeValue(rootStyle, "--brand-highlight", vars.highlight);
    setThemeValue(rootStyle, "--highlight-200", vars.highlightHover);

    setThemeValue(rootStyle, "--success-300", vars.success);
    setThemeValue(rootStyle, "--warning-300", vars.warning);
    setThemeValue(rootStyle, "--error-300", vars.error);
    setThemeValue(rootStyle, "--info-300", vars.info);
}

export function persistCompanyTheme(companyId, theme) {
    if (typeof window === "undefined" || !companyId || !theme?.vars) {
        return;
    }

    try {
        window.localStorage.setItem(getCompanyThemeStorageKey(companyId), JSON.stringify(theme));
    } catch {
        // Ignore storage errors (private mode / quota).
    }
}

export function getPersistedCompanyTheme(companyId) {
    if (typeof window === "undefined" || !companyId) {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(getCompanyThemeStorageKey(companyId));
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        return parsed?.vars ? parsed : null;
    } catch {
        return null;
    }
}

export function clearPersistedCompanyTheme(companyId) {
    if (typeof window === "undefined" || !companyId) {
        return;
    }

    try {
        window.localStorage.removeItem(getCompanyThemeStorageKey(companyId));
    } catch {
        // Ignore storage errors.
    }
}