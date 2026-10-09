<script setup>
import MeetingSignInFloatingPanel from './MeetingSignInFloatingPanel.vue'
import { cocFeatureFlags } from '../config/featureFlags.js'

defineProps({
  projects: { type: Array, default: () => [] },
  selectedProjectId: { type: String, default: 'hq' },
  statusFilters: { type: Array, default: () => ['在建'] },
})
</script>

<template>
  <div class="coc-floating-stack">
    <!-- 参会状态改由项目值班人员标签标注，原会议签到浮层隐藏（flag 可恢复） -->
    <MeetingSignInFloatingPanel
      v-if="cocFeatureFlags.meetingSignIn"
      :projects="projects"
      :selected-project-id="selectedProjectId"
      :status-filters="statusFilters"
    />
  </div>
</template>

<style scoped>
.coc-floating-stack {
  position: fixed;
  top: 50%;
  right: calc(16px * var(--coc-viewport-scale, 1));
  z-index: 100000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  transform: translateY(-50%) scale(var(--coc-viewport-scale, 1));
  transform-origin: right center;
  pointer-events: none;
}

.coc-floating-stack > :deep(*) {
  pointer-events: auto;
}
</style>
