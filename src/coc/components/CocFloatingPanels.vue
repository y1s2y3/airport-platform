<script setup>
import MeetingSignInFloatingPanel from './MeetingSignInFloatingPanel.vue'

defineProps({
  projects: { type: Array, default: () => [] },
  selectedProjectId: { type: String, default: 'hq' },
  statusFilters: { type: Array, default: () => ['在建'] },
})

defineEmits(['project-change'])
</script>

<template>
  <div class="coc-floating-stack">
    <MeetingSignInFloatingPanel
      :projects="projects"
      :selected-project-id="selectedProjectId"
      :status-filters="statusFilters"
      @project-change="$emit('project-change', $event)"
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
