const crypto = require("node:crypto");
const { once } = require("node:events");
const { pipeline } = require("node:stream/promises");
const tar = require("tar");
const { R } = require("redbean-node");
const Database = require("./database");

const HISTORY_EXPORT_PAGE_SIZE = 1000;
const EXPORT_TOKEN_TTL_MS = 5 * 60 * 1000;

class ExportTokenStore {
    /**
     * @param {{ttlMs?: number, now?: () => number, tokenFactory?: () => string}} options Options
     */
    constructor(options = {}) {
        this.ttlMs = options.ttlMs ?? EXPORT_TOKEN_TTL_MS;
        this.now = options.now ?? (() => Date.now());
        this.tokenFactory = options.tokenFactory ?? (() => crypto.randomBytes(32).toString("hex"));
        this.tokens = new Map();
    }

    /**
     * Create a one-time export token.
     * @param {number} userID User ID
     * @param {string} type Export type
     * @param {object} options Export options
     * @returns {string} Token
     */
    create(userID, type, options = {}) {
        const token = this.tokenFactory();
        this.tokens.set(token, {
            userID,
            type,
            options,
            expiresAt: this.now() + this.ttlMs,
        });
        return token;
    }

    /**
     * Consume a one-time export token.
     * @param {string} token Token
     * @param {string} expectedType Expected export type
     * @returns {{userID: number, type: string, options: object}|null} Token payload
     */
    consume(token, expectedType) {
        const payload = this.tokens.get(token);

        if (!payload) {
            return null;
        }

        this.tokens.delete(token);

        if (payload.expiresAt < this.now() || payload.type !== expectedType) {
            return null;
        }

        return {
            userID: payload.userID,
            type: payload.type,
            options: payload.options,
        };
    }
}

/**
 * @param {Date} date Date
 * @returns {string} Archive filename
 */
function getArchiveDownloadFilename(date = new Date()) {
    const stamp = date.toISOString().replaceAll("-", "").replaceAll(":", "").slice(0, 15).replace("T", "-");
    return `uptime-kuma-data-${stamp}.tar.gz`;
}

/**
 * @param {object} row Database row
 * @returns {object} JSON export row
 */
function formatHeartbeatExportRow(row) {
    const result = {
        id: row.id,
        monitorID: row.monitor_id,
        status: row.status,
        time: row.time,
        msg: row.msg,
        ping: row.ping,
        duration: row.duration,
        downCount: row.down_count,
        important: !!row.important,
        endTime: row.end_time,
    };

    if (row.response != null) {
        result.response = row.response;
    }

    return result;
}

/**
 * @param {string} scope Export scope
 * @returns {"events"|"heartbeats"} Validated export scope
 * @throws {Error} If the scope is invalid
 */
function validateHistoryScope(scope) {
    if (scope === "events" || scope === "heartbeats") {
        return scope;
    }

    throw new Error("Invalid export scope");
}

/**
 * @param {import("express").Response} response Response
 * @param {string} filename Download filename
 * @param {string} contentType Content-Type
 * @returns {void}
 */
function setDownloadHeaders(response, filename, contentType) {
    response.setHeader("Content-Type", contentType);
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.setHeader("Cache-Control", "no-store");
}

/**
 * @param {import("express").Response} response Response
 * @param {string} chunk JSON chunk
 * @returns {Promise<void>} Promise
 */
async function writeChunk(response, chunk) {
    if (!response.write(chunk)) {
        await once(response, "drain");
    }
}

/**
 * @param {{userID: number, scope: "events"|"heartbeats", limit: number, offset: number}} options Options
 * @returns {Promise<object[]>} Heartbeat rows
 */
async function fetchHistoryRows(options) {
    const importantClause = options.scope === "events" ? "AND heartbeat.important = 1" : "";

    return R.getAll(
        `
        SELECT
            heartbeat.id,
            heartbeat.monitor_id,
            heartbeat.status,
            heartbeat.time,
            heartbeat.msg,
            heartbeat.ping,
            heartbeat.duration,
            heartbeat.down_count,
            heartbeat.important,
            heartbeat.end_time,
            heartbeat.response
        FROM heartbeat
        INNER JOIN monitor ON heartbeat.monitor_id = monitor.id
        WHERE monitor.user_id = ?
        ${importantClause}
        ORDER BY heartbeat.time ASC, heartbeat.id ASC
        LIMIT ?
        OFFSET ?
        `,
        [options.userID, options.limit, options.offset]
    );
}

/**
 * Stream heartbeat history as JSON.
 * @param {import("express").Response} response Response
 * @param {{userID: number, scope: "events"|"heartbeats", now?: Date}} options Options
 * @returns {Promise<void>} Promise
 */
async function streamHistoryJson(response, options) {
    const scope = validateHistoryScope(options.scope);
    const exportedAt = (options.now ?? new Date()).toISOString();
    const filename = `uptime-kuma-${scope}-${exportedAt.replaceAll("-", "").replaceAll(":", "").slice(0, 15).replace("T", "-")}.json`;

    setDownloadHeaders(response, filename, "application/json; charset=utf-8");

    await writeChunk(response, JSON.stringify({ version: 1, exportedAt, scope }).slice(0, -1));
    await writeChunk(response, ',"heartbeats":[');

    let offset = 0;
    let count = 0;
    let first = true;

    while (true) {
        const rows = await fetchHistoryRows({
            userID: options.userID,
            scope,
            limit: HISTORY_EXPORT_PAGE_SIZE,
            offset,
        });

        if (rows.length === 0) {
            break;
        }

        for (const row of rows) {
            if (!first) {
                await writeChunk(response, ",");
            }

            first = false;
            count += 1;
            await writeChunk(response, JSON.stringify(formatHeartbeatExportRow(row)));
        }

        offset += rows.length;

        if (rows.length < HISTORY_EXPORT_PAGE_SIZE) {
            break;
        }
    }

    await writeChunk(response, `],"count":${count}}\n`);
    response.end();
}

/**
 * Stream the data directory as a gzipped tar archive.
 * @param {import("express").Response} response Response
 * @param {{dataDir?: string, now?: Date}} options Options
 * @returns {Promise<void>} Promise
 */
async function streamDataArchive(response, options = {}) {
    const dataDir = options.dataDir ?? Database.dataDir;

    if (!dataDir) {
        throw new Error("Data directory is not available");
    }

    setDownloadHeaders(response, getArchiveDownloadFilename(options.now), "application/gzip");

    await pipeline(
        tar.c(
            {
                gzip: true,
                cwd: dataDir,
                portable: true,
            },
            ["."]
        ),
        response
    );
}

const exportTokenStore = new ExportTokenStore();

module.exports = {
    ExportTokenStore,
    exportTokenStore,
    fetchHistoryRows,
    formatHeartbeatExportRow,
    getArchiveDownloadFilename,
    streamDataArchive,
    streamHistoryJson,
    validateHistoryScope,
};
