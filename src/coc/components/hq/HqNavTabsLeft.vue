<script setup>
import navTabsLeft from '../../assets/hq/header/nav-tabs-left.svg?url'

/** Figma 531×57 合成 Tab，当前为「COC调度指挥中心」高亮态 */
const tabs = [
  { id: 'coc', label: 'COC调度指挥中心', start: 0, end: 41.8 },
  { id: 'sandbox', label: '数字沙盘', start: 44.1, end: 70.8, disabled: true },
  { id: 'security', label: '安全态势', start: 73.1, end: 100, disabled: true },
]

const activeId = 'coc'

function onTabClick(tab) {
  if (tab.disabled || tab.id === activeId) return
}
</script>

<template>
  <div class="hq-nav-tabs-left" role="navigation" aria-label="左侧导航">
    <img
      class="hq-nav-tabs-left__art"
      :src="navTabsLeft"
      width="531"
      height="57"
      alt="COC调度指挥中心、数字沙盘、安全态势"
      draggable="false"
    />
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="hq-nav-tabs-left__hit"
      :class="{ 'is-active': tab.id === activeId, 'is-disabled': tab.disabled }"
      :style="{
        left: `${tab.start}%`,
        width: `${tab.end - tab.start}%`,
      }"
      :aria-label="tab.label"
      :aria-current="tab.id === activeId ? 'page' : undefined"
      :disabled="tab.disabled"
      @click="onTabClick(tab)"
    />
  </div>
</template>

<style scoped>
.hq-nav-tabs-left {
  position: relative;
  flex-shrink: 0;
  height: var(--coc-hq-nav-tab-h-left, 46px);
  line-height: 0;
}

.hq-nav-tabs-left__art {
  display: block;
  height: 100%;
  width: auto;
  user-select: none;
  pointer-events: none;
}

.hq-nav-tabs-left__hit {
  position: absolute;
  top: 0;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: default;
}

.hq-nav-tabs-left__hit.is-disabled {
  cursor: not-allowed;
}

.hq-nav-tabs-left__hit:not(.is-disabled):not(.is-active) {
  cursor: pointer;
}

.hq-nav-tabs-left__hit:focus-visible {
  outline: 2px solid rgba(94, 238, 255, 0.65);
  outline-offset: 2px;
}
</style>
