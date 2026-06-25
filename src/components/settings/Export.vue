<template>
    <div class="export-settings">
        <div class="alert alert-warning d-flex gap-2 align-items-start my-4">
            <font-awesome-icon icon="exclamation-triangle" class="mt-1" />
            <div>{{ $t("exportSensitiveWarning") }}</div>
        </div>

        <section class="export-section">
            <div>
                <h2>{{ $t("Data Archive") }}</h2>
                <p>{{ $t("exportDataArchiveDescription") }}</p>
            </div>
            <button
                type="button"
                class="btn btn-primary"
                :disabled="loadingKey === 'data-archive'"
                @click="downloadExport('data-archive')"
            >
                <font-awesome-icon icon="download" />
                {{ $t("Download Data Archive") }}
            </button>
        </section>

        <section class="export-section">
            <div>
                <h2>{{ $t("History JSON") }}</h2>
                <p>{{ $t("exportHistoryJsonDescription") }}</p>
            </div>
            <div class="d-flex flex-wrap gap-2">
                <button
                    type="button"
                    class="btn btn-outline-primary"
                    :disabled="loadingKey === 'events'"
                    @click="downloadExport('history-json', 'events')"
                >
                    <font-awesome-icon icon="download" />
                    {{ $t("Download Events JSON") }}
                </button>
                <button
                    type="button"
                    class="btn btn-outline-primary"
                    :disabled="loadingKey === 'heartbeats'"
                    @click="downloadExport('history-json', 'heartbeats')"
                >
                    <font-awesome-icon icon="download" />
                    {{ $t("Download Heartbeats JSON") }}
                </button>
            </div>
        </section>
    </div>
</template>

<script>
export default {
    data() {
        return {
            loadingKey: null,
        };
    },

    methods: {
        /**
         * Start an export download.
         * @param {string} exportType Export type
         * @param {string|null} scope History scope
         * @returns {void}
         */
        downloadExport(exportType, scope = null) {
            this.loadingKey = scope || exportType;
            this.$root.getSocket().emit(
                "createExportToken",
                exportType,
                {
                    scope,
                },
                (res) => {
                    this.loadingKey = null;

                    if (!res.ok) {
                        this.$root.toastError(res.msg);
                        return;
                    }

                    this.openDownload(res.url);
                }
            );
        },

        /**
         * Open a generated download URL.
         * @param {string} url URL
         * @returns {void}
         */
        openDownload(url) {
            const link = document.createElement("a");
            link.href = url;
            link.rel = "noopener";
            document.body.appendChild(link);
            link.click();
            link.remove();
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../../assets/vars.scss";

.export-section {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 24px 0;
    border-bottom: 1px solid #dee2e6;

    .dark & {
        border-bottom-color: $dark-border-color;
    }

    h2 {
        font-size: 20px;
        margin-bottom: 8px;
    }

    p {
        color: $secondary-text;
        margin: 0;
        max-width: 620px;
    }
}

@media (max-width: 767px) {
    .export-section {
        display: block;

        button,
        .d-flex {
            margin-top: 16px;
        }
    }
}
</style>
