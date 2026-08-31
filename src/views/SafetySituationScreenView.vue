<script setup>
import SafetySituationApp from '../safetyScreen/App.vue'
import '../coc/styles/theme.css'
import '../coc/styles/hq-dark-theme.css'
</script>

<template>
  <div class="safety-screen-shell">
    <div class="screen-viewport coc-hq-mode">
      <SafetySituationApp />
    </div>
  </div>
</template>

<style scoped>
.safety-screen-shell {
  position: fixed;
  inset: 0;
  z-index: 2000;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #071225;
}

.screen-viewport {
  width: 100% !important;
  height: 100% !important;
  min-width: 0;
  min-height: 0;
  display: block;
  overflow: hidden;
}
</style>
