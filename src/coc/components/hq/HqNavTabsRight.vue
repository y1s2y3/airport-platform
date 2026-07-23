<script setup>
import navTabsRight from '../../assets/hq/header/nav-tabs-right.svg?url'

/** Figma 297×37 合成 Tab：项目要素、质量态势（非高亮态） */
const tabs = [
  { id: 'elements', label: '项目要素', start: 0, end: 47.8, disabled: true },
  { id: 'quality', label: '质量态势', start: 52, end: 100, disabled: true },
]

function onTabClick(tab) {
  if (tab.disabled) return
}
</script>

<template>
  <div class="hq-nav-tabs-right" role="navigation" aria-label="右侧导航">
    <img
      class="hq-nav-tabs-right__art"
      :src="navTabsRight"
      width="297"
      height="37"
      alt="项目要素、质量态势"
      draggable="false"
    />
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="hq-nav-tabs-right__hit"
      :class="{ 'is-disabled': tab.disabled }"
      :style="{
        left: `${tab.start}%`,
        width: `${tab.end - tab.start}%`,
      }"
      :aria-label="tab.label"
      :disabled="tab.disabled"
      @click="onTabClick(tab)"
    />
  </div>
</template>

<style scoped>
.hq-nav-tabs-right {
  position: relative;
  flex-shrink: 0;
  height: var(--coc-hq-nav-tab-h-right, 30px);
  line-height: 0;
}

.hq-nav-tabs-right__art {
  display: block;
  height: 100%;
  width: auto;
  user-select: none;
  pointer-events: none;
}

.hq-nav-tabs-right__hit {
  position: absolute;
  top: 0;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: default;
}

.hq-nav-tabs-right__hit.is-disabled {
  cursor: not-allowed;
}

.hq-nav-tabs-right__hit:not(.is-disabled) {
  cursor: pointer;
}

.hq-nav-tabs-right__hit:focus-visible {
  outline: 2px solid rgba(94, 238, 255, 0.65);
  outline-offset: 2px;
}
</style>
