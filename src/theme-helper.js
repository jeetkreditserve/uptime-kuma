const BRAND_THEME_COLORS = {
    light: "#53ace0",
    dark: "#1e293b",
};

function normalizeThemePreference(preference) {
    if (!preference || preference === "auto" || preference === "system") {
        return "system";
    }

    if (preference === "light" || preference === "dark") {
        return preference;
    }

    return "system";
}

function normalizeSystemTheme(systemTheme) {
    return systemTheme === "dark" ? "dark" : "light";
}

function resolveThemePreference(preference, systemTheme) {
    const normalizedPreference = normalizeThemePreference(preference);

    if (normalizedPreference === "system") {
        return normalizeSystemTheme(systemTheme);
    }

    return normalizedPreference;
}

function getThemeColorMeta(theme) {
    return BRAND_THEME_COLORS[theme] || BRAND_THEME_COLORS.light;
}

module.exports = {
    BRAND_THEME_COLORS,
    getThemeColorMeta,
    normalizeThemePreference,
    resolveThemePreference,
};
