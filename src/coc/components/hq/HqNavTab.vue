<script setup>
import tabTextBgActive from '../../assets/hq/header/tab-text-bg-active.svg?url'

defineProps({
  label: { type: String, required: true },
  active: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** 右侧副导航：镜像切角，与左侧「数字沙盘」非高亮 Tab 一致 */
  mirrored: { type: Boolean, default: false },
})
</script>

<template>
  <button
    type="button"
    class="hq-tab"
    :class="{ 'is-active': active, 'is-mirrored': mirrored }"
    :disabled="disabled && !active"
  >
    <span
      class="hq-tab__label"
      :class="{ 'hq-tab__label--active': active }"
      :style="active ? { backgroundImage: `url(${tabTextBgActive})` } : undefined"
    >
      {{ label }}
    </span>
  </button>
</template>

<style scoped>
.hq-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: default;
  transition: opacity 0.2s;
}

.hq-tab:not(.is-active) {
  height: 36px;
  padding: 0 20px;
  border: 0.627px solid rgba(161, 201, 246, 0.35);
  background: rgba(16, 29, 55, 0.55);
  clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
}

.hq-tab:not(.is-active).is-mirrored {
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 100%, 8px 100%);
}

.hq-tab:not(.is-active) .hq-tab__label {
  color: rgba(255, 255, 255, 0.72);
  font-size: calc(14px + var(--coc-font-boost));
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1;
}

.hq-tab:disabled:not(.is-active) {
  opacity: 0.65;
}

.hq-tab__label {
  position: relative;
  z-index: 1;
  white-space: nowrap;
}

.hq-tab__label--active {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  min-width: 223px;
  padding: 0 26px;
  box-sizing: border-box;
  color: #fff;
  font-size: calc(14px + var(--coc-font-boost));
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
  text-shadow: 0 0 8px rgba(132, 205, 237, 0.85);
}
</style>
