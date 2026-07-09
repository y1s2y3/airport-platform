<script setup>
import { defineAsyncComponent, onMounted } from 'vue'
import { ensureDailyWorkSeed } from '../coc/utils/dailyWorkStorage.js'
import '../coc/styles/theme.css'

const CocApp = defineAsyncComponent({
  loader: () => import('../coc/App.vue'),
  loadingComponent: {
    template: `
      <div class="coc-loading">
        <div class="coc-loading-spinner" />
        <p>正在加载 COC 调度大屏…</p>
      </div>
    `,
  },
  delay: 80,
  timeout: 120000,
})

onMounted(() => {
  ensureDailyWorkSeed()
})
</script>

<template>
  <div class="coc-screen-shell">
    <CocApp />
  </div>
</template>

<style scoped>
.coc-screen-shell {
  position: fixed;
  inset: 0;
  z-index: 2000;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: #1a1a2e;
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', sans-serif;
}

.coc-screen-shell :deep(.coc-loading) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  gap: 16px;
  color: rgba(255, 255, 255, 0.85);
  font-size: calc(14px + var(--coc-font-boost, 2.5px));
}

.coc-screen-shell :deep(.coc-loading-spinner) {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: #c97b63;
  border-radius: 50%;
  animation: coc-spin 0.8s linear infinite;
}

@keyframes coc-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
