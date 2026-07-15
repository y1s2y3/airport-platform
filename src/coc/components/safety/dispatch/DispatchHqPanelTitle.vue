<script setup>
import HqPanelTitleLine from '../../hq/HqPanelTitleLine.vue'
import { PANEL_TITLE_ICON_URL } from '../../../config/panelTitleAssets.js'

defineProps({
  title: { type: String, required: true },
  showV2Tag: { type: Boolean, default: false },
})
</script>

<template>
  <div class="panel-title compact dispatch-hq-panel-title module-title-bar">
    <img
      class="hq-panel-title-icon"
      :src="PANEL_TITLE_ICON_URL"
      width="11"
      height="11"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
    <div class="dispatch-hq-title-main">
      <span class="dispatch-hq-title-text">{{ title }}</span>
      <span v-if="showV2Tag" class="panel-v2-tip">V2版本上线</span>
      <div v-if="$slots.actions" class="dispatch-hq-title-actions">
        <slot name="actions" />
      </div>
    </div>
    <HqPanelTitleLine />
  </div>
</template>

<style scoped>
.dispatch-hq-panel-title {
  flex-shrink: 0;
  padding: 10px 16px 8px;
}

.dispatch-hq-title-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
}

.dispatch-hq-title-text {
  font-size: calc(17px + var(--coc-font-boost));
  font-weight: 700;
  color: inherit;
  flex-shrink: 0;
}

.dispatch-hq-title-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
