<script setup>
import PersonalCenterPanels from './personalCenter/PersonalCenterPanels.vue'
</script>

<template>
  <div class="page-card pc-standalone">
    <PersonalCenterPanels show-title base-path="/personal-center" />
  </div>
</template>

<style scoped>
.pc-standalone :deep(.pc-page) {
  border: none;
  border-radius: 0;
  padding: 0;
  background: transparent;
  min-height: auto;
}
</style>
