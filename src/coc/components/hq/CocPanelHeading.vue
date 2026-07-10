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
    </div>
    <HqPanelTitleLine />
  </div>
</template>
