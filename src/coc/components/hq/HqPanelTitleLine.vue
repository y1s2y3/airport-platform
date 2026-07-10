<script setup>
import {
  PANEL_TITLE_LINE_BASE_URL,
  PANEL_TITLE_LINE_ACCENT_URL,
  PANEL_TITLE_LINE_DOT_URL,
} from '../../config/panelTitleAssets.js'
</script>

<template>
  <div class="hq-panel-title-line-wrap" aria-hidden="true">
    <img
      class="hq-panel-title-line hq-panel-title-line--base"
      :src="PANEL_TITLE_LINE_BASE_URL"
      alt=""
      draggable="false"
    />
    <img
      class="hq-panel-title-line hq-panel-title-line--accent"
      :src="PANEL_TITLE_LINE_ACCENT_URL"
      width="73"
      height="3"
      alt=""
      draggable="false"
    />
    <img
      class="hq-panel-title-line hq-panel-title-line--dot"
      :src="PANEL_TITLE_LINE_DOT_URL"
      width="2"
      height="3"
      alt=""
      draggable="false"
    />
  </div>
</template>

<style scoped>
.hq-panel-title-line-wrap {
  position: relative;
  width: 100%;
  height: 3px;
  line-height: 0;
  flex-shrink: 0;
}

.hq-panel-title-line--base {
  display: block;
  width: 100%;
  height: 3px;
  object-fit: fill;
}

.hq-panel-title-line--accent {
  position: absolute;
  left: 0;
  top: 0;
  width: 73px;
  height: 3px;
  pointer-events: none;
  user-select: none;
}

.hq-panel-title-line--dot {
  position: absolute;
  left: 76px;
  top: 0;
  width: 2px;
  height: 3px;
  pointer-events: none;
  user-select: none;
}
</style>
