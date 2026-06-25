const { R } = require("redbean-node");
const { checkLogin } = require("../util-server");
const { exportTokenStore, validateHistoryScope } = require("../export-data");
const { UptimeCalculator } = require("../uptime-calculator");

/**
 * @param {Socket} socket Socket.io socket instance
 * @returns {void}
 */
module.exports.exportSocketHandler = (socket) => {
    socket.on("getMonitorUptimeWindow", async (monitorID, range, callback) => {
        try {
            checkLogin(socket);

            const monitor = await R.findOne("monitor", " id = ? AND user_id = ? ", [monitorID, socket.userID]);

            if (!monitor) {
                throw new Error("Monitor not found.");
            }

            if (!range || !range.start || !range.end) {
                throw new Error("Invalid date range");
            }

            const uptimeCalculator = await UptimeCalculator.getUptimeCalculator(monitorID);

            callback({
                ok: true,
                data: uptimeCalculator.getDataInRange(range.start, range.end),
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("createExportToken", (exportType, options, callback) => {
        try {
            checkLogin(socket);

            let tokenOptions = {};
            let url;

            if (exportType === "data-archive") {
                tokenOptions = {};
            } else if (exportType === "history-json") {
                tokenOptions = {
                    scope: validateHistoryScope(options?.scope),
                };
            } else {
                throw new Error("Invalid export type");
            }

            const token = exportTokenStore.create(socket.userID, exportType, tokenOptions);

            if (exportType === "data-archive") {
                url = `/api/export/data-archive?token=${encodeURIComponent(token)}`;
            } else {
                url = `/api/export/history.json?scope=${encodeURIComponent(tokenOptions.scope)}&token=${encodeURIComponent(token)}`;
            }

            callback({
                ok: true,
                token,
                url,
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });
};
