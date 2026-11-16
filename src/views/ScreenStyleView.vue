<script setup>
import ScreenStyleApp from '../screenStyle/App.vue'
import '../screenStyle/styles/screen-style.css'
</script>

<template>
  <div class="screen-style-shell">
    <ScreenStyleApp />
  </div>
</template>

<style scoped>
/* 全屏壳：盖住平台顶栏与侧栏（与 COC 调度大屏同一做法），样式仅作用于本页根节点 */
.screen-style-shell {
  position: fixed;
  inset: 0;
  z-index: 2000;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #02060c;
}
</style>
