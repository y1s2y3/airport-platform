<script setup>
import { PANEL_TITLE_ICON_URL } from '../../config/panelTitleAssets.js'
import HqPanelTitleLine from './HqPanelTitleLine.vue'

defineProps({
  title: { type: String, required: true },
})
</script>

<template>
  <div class="hq-panel-heading-wrap">
    <div class="hq-panel-heading">
      <img
        class="hq-panel-title-icon"
        :src="PANEL_TITLE_ICON_URL"
        width="11"
        height="11"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <span class="hq-panel-heading__text">{{ title }}</span>
      <div v-if="$slots.actions" class="hq-panel-heading__actions">
        <slot name="actions" />
      </div>
    </div>
    <HqPanelTitleLine />
  </div>
</template>

<style scoped>
.hq-panel-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

/* 右侧操作位（计数 / 更多等），不占用标题与 V2 角标之间的间距 */
.hq-panel-heading__actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
