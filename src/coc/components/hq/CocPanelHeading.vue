<script setup>
import { PANEL_TITLE_ICON_URL } from '../../config/panelTitleAssets.js'
import HqPanelTitleLine from './HqPanelTitleLine.vue'

defineProps({
  title: { type: String, required: true },
  showV2Tag: { type: Boolean, default: false },
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
      <span v-if="showV2Tag" class="panel-v2-tip">V2版本上线</span>
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
</style>
