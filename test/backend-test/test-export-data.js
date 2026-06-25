const { describe, test } = require("node:test");
const assert = require("node:assert");
const {
    ExportTokenStore,
    formatHeartbeatExportRow,
    getArchiveDownloadFilename,
} = require("../../server/export-data");

describe("Export data helpers", () => {
    test("ExportTokenStore consumes tokens once", () => {
        let store = new ExportTokenStore({
            ttlMs: 1000,
            now: () => 1000,
            tokenFactory: () => "fixed-token",
        });

        let token = store.create(7, "history-json", { scope: "events" });

        assert.strictEqual(token, "fixed-token");
        assert.deepStrictEqual(store.consume("fixed-token", "history-json"), {
            userID: 7,
            type: "history-json",
            options: {
                scope: "events",
            },
        });
        assert.strictEqual(store.consume("fixed-token", "history-json"), null);
    });

    test("ExportTokenStore rejects expired tokens", () => {
        let currentTime = 1000;
        let store = new ExportTokenStore({
            ttlMs: 1000,
            now: () => currentTime,
            tokenFactory: () => "fixed-token",
        });

        store.create(7, "data-archive", {});
        currentTime = 2001;

        assert.strictEqual(store.consume("fixed-token", "data-archive"), null);
    });

    test("formatHeartbeatExportRow normalizes database rows for JSON export", () => {
        assert.deepStrictEqual(
            formatHeartbeatExportRow({
                id: 12,
                monitor_id: 3,
                status: 1,
                time: "2023-08-12 12:00:00",
                msg: "OK",
                ping: 42,
                duration: 60,
                down_count: 0,
                important: 1,
                end_time: "2023-08-12 12:01:00",
            }),
            {
                id: 12,
                monitorID: 3,
                status: 1,
                time: "2023-08-12 12:00:00",
                msg: "OK",
                ping: 42,
                duration: 60,
                downCount: 0,
                important: true,
                endTime: "2023-08-12 12:01:00",
            }
        );
    });

    test("getArchiveDownloadFilename includes a stable UTC timestamp", () => {
        assert.strictEqual(
            getArchiveDownloadFilename(new Date("2023-08-12T12:34:56.000Z")),
            "uptime-kuma-data-20230812-123456.tar.gz"
        );
    });
});
