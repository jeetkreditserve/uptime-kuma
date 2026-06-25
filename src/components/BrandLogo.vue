<template>
    <span class="brand-logo" :class="{ compact }">
        <span class="brand-mark" aria-hidden="true">
            <img src="/overwatch-mark.png" alt="" />
        </span>
        <span v-if="!markOnly" class="brand-name">{{ label }}</span>
    </span>
</template>

<script>
export default {
    props: {
        compact: {
            type: Boolean,
            default: false,
        },
        label: {
            type: String,
            default: "Overwatch",
        },
        markOnly: {
            type: Boolean,
            default: false,
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../assets/vars.scss";

.brand-logo {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    color: $brand-dark;
    font-weight: 800;
    line-height: 1;

    .dark & {
        color: #f8fafc;
    }
}

.brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba($brand-light, 0.1);

    img {
        width: 28px;
        height: 28px;
        object-fit: contain;
    }
}

.brand-name {
    letter-spacing: 0;
}

.compact {
    gap: 0.45rem;

    .brand-mark {
        width: 36px;
        height: 36px;

        img {
            width: 24px;
            height: 24px;
        }
    }
}
</style>
