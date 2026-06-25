import themeHelper from "../theme-helper";

const {
    getThemeColorMeta,
    normalizeThemePreference,
    resolveThemePreference,
} = themeHelper;

export default {
    data() {
        return {
            system: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
            systemThemeMediaQuery: null,
            userTheme: normalizeThemePreference(localStorage.theme),
            userHeartbeatBar: localStorage.heartbeatBarTheme,
            styleElapsedTime: localStorage.styleElapsedTime,
            statusPageTheme: "light",
            forceStatusPageTheme: false,
            path: "",
        };
    },

    mounted() {
        this.systemThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this.system = this.getSystemTheme();

        if (this.systemThemeMediaQuery.addEventListener) {
            this.systemThemeMediaQuery.addEventListener("change", this.updateSystemTheme);
        } else if (this.systemThemeMediaQuery.addListener) {
            this.systemThemeMediaQuery.addListener(this.updateSystemTheme);
        }

        // Default Heartbeat Bar
        if (!this.userHeartbeatBar) {
            this.userHeartbeatBar = "normal";
        }

        // Default Elapsed Time Style
        if (!this.styleElapsedTime) {
            this.styleElapsedTime = "no-line";
        }

        document.body.classList.add(this.theme);
        this.updateThemeColorMeta();
    },

    beforeUnmount() {
        if (this.systemThemeMediaQuery?.removeEventListener) {
            this.systemThemeMediaQuery.removeEventListener("change", this.updateSystemTheme);
        } else if (this.systemThemeMediaQuery?.removeListener) {
            this.systemThemeMediaQuery.removeListener(this.updateSystemTheme);
        }
    },

    computed: {
        theme() {
            // As entry can be status page now, set forceStatusPageTheme to true to use status page theme
            if (this.forceStatusPageTheme) {
                return resolveThemePreference(this.statusPageTheme, this.system);
            }

            if (this.path.startsWith("/status-page") || this.path.startsWith("/status")) {
                return resolveThemePreference(this.statusPageTheme, this.system);
            }

            return resolveThemePreference(this.userTheme, this.system);
        },

        isDark() {
            return this.theme === "dark";
        },
    },

    watch: {
        "$route.fullPath"(path) {
            this.path = path;
        },

        userTheme(to, from) {
            localStorage.theme = normalizeThemePreference(to);
        },

        styleElapsedTime(to, from) {
            localStorage.styleElapsedTime = to;
        },

        theme(to, from) {
            document.body.classList.remove(from);
            document.body.classList.add(this.theme);
            this.updateThemeColorMeta();
        },

        userHeartbeatBar(to, from) {
            localStorage.heartbeatBarTheme = to;
        },

        heartbeatBarTheme(to, from) {
            document.body.classList.remove(from);
            document.body.classList.add(this.heartbeatBarTheme);
        },
    },

    methods: {
        /**
         * Update the theme color meta tag
         * @returns {void}
         */
        updateThemeColorMeta() {
            document.querySelector("#theme-color").setAttribute("content", getThemeColorMeta(this.theme));
        },

        /**
         * Get the current operating-system color scheme.
         * @returns {"light"|"dark"} Current system color scheme
         */
        getSystemTheme() {
            return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        },

        /**
         * Refresh the computed system theme when the OS preference changes.
         * @returns {void}
         */
        updateSystemTheme() {
            this.system = this.getSystemTheme();
        },
    },
};
