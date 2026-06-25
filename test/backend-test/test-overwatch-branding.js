const { describe, test } = require("node:test");
const assert = require("node:assert");

const { appName } = require("../../src/util");
const manifest = require("../../public/manifest.json");
const {
    getThemeColorMeta,
    normalizeThemePreference,
    resolveThemePreference,
} = require("../../src/theme-helper");

describe("Overwatch branding", () => {
    test("uses Overwatch as the product name", () => {
        assert.strictEqual(appName, "Overwatch");
        assert.strictEqual(manifest.name, "Overwatch");
        assert.strictEqual(manifest.short_name, "Overwatch");
        assert.strictEqual(manifest.description, "Overwatch monitoring dashboard.");
    });

    test("uses Kreditserve brand colors for browser theme metadata", () => {
        assert.strictEqual(getThemeColorMeta("light"), "#53ace0");
        assert.strictEqual(getThemeColorMeta("dark"), "#1e293b");
    });
});

describe("Theme preference helpers", () => {
    test("normalizes legacy auto theme preference to system", () => {
        assert.strictEqual(normalizeThemePreference("auto"), "system");
        assert.strictEqual(normalizeThemePreference("system"), "system");
        assert.strictEqual(normalizeThemePreference(""), "system");
        assert.strictEqual(normalizeThemePreference(undefined), "system");
    });

    test("resolves light, dark, and system preferences", () => {
        assert.strictEqual(resolveThemePreference("light", "dark"), "light");
        assert.strictEqual(resolveThemePreference("dark", "light"), "dark");
        assert.strictEqual(resolveThemePreference("system", "dark"), "dark");
        assert.strictEqual(resolveThemePreference("auto", "light"), "light");
        assert.strictEqual(resolveThemePreference("unexpected", "dark"), "dark");
    });
});
