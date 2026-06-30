<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'
import logoUrl from '../assets/logo.png'
import dataFlowImg from '../image/数据流转示意.png'
import frameworkImg from '../image/业务框架.png'

const previewVisible = ref(false)
const previewTitle = ref('')
const previewSrc = ref('')

function openPreview(title, src) {
  previewTitle.value = title
  previewSrc.value = src
  previewVisible.value = true
}

function closePreview() {
  previewVisible.value = false
}

function handleCloseScreen() {
  if (window.opener && !window.opener.closed) {
    window.close()
    return
  }
  window.close()
  window.setTimeout(() => {
    if (!window.closed) {
      window.location.hash = '#/workbench'
    }
  }, 120)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    if (previewVisible.value) closePreview()
    else handleCloseScreen()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="top-nav">
    <div class="brand">
      <div class="brand-logo">
        <img :src="logoUrl" alt="深圳机场" class="logo-img" />
      </div>
      <div class="brand-text">
        <div class="brand-title">智慧工程建设管控一体化平台</div>
        <div class="brand-sub">深圳机场扩建工程 · COC调度指挥中心</div>
      </div>
    </div>

    <div class="nav-actions">
      <slot name="actions" />
      <button type="button" class="text-btn" @click="openPreview('数据流转示意', dataFlowImg)">
        数据流转示意
      </button>
      <button type="button" class="text-btn" @click="openPreview('业务框架', frameworkImg)">
        业务框架
      </button>
      <button type="button" class="logout-btn" title="关闭" @click="handleCloseScreen">
        <el-icon :size="14"><Close /></el-icon>
      </button>
    </div>
  </header>

  <Teleport to="body">
    <div v-if="previewVisible" class="image-fullscreen-overlay" @click.self="closePreview">
      <div class="overlay-panel">
        <div class="overlay-head">
          <span class="overlay-title">{{ previewTitle }}</span>
          <button type="button" class="overlay-close" @click="closePreview">关闭</button>
        </div>
        <div class="overlay-body">
          <img :src="previewSrc" :alt="previewTitle" class="overlay-img" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.top-nav {
  min-height: var(--coc-header-h);
  height: auto;
  display: flex;
  align-items: center;
  padding: 6px 20px 6px 16px;
  background: #fff;
  border-bottom: 1px solid var(--coc-border);
  gap: 16px;
  flex-shrink: 0;
  overflow: visible;
  min-width: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  max-width: 560px;
  padding: 4px 12px 4px 8px;
  background: linear-gradient(135deg, rgba(201, 123, 99, 0.12), rgba(212, 165, 116, 0.18));
  border-radius: 8px;
  border: 1px solid rgba(201, 123, 99, 0.2);
  position: relative;
  z-index: 2;
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 32px;
  background: #fff;
  border-radius: 6px;
  padding: 3px;
  box-shadow: 0 1px 4px rgba(201, 123, 99, 0.15);
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.brand-text {
  min-width: 0;
}

.brand-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--coc-text);
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.brand-sub {
  font-size: 10px;
  color: var(--coc-text-muted);
  margin-top: 1px;
  white-space: nowrap;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-left: auto;
}

.text-btn {
  border: none;
  background: transparent;
  color: #409eff;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.text-btn:hover {
  color: #337ecc;
  background: rgba(64, 158, 255, 0.08);
}

.logout-btn {
  border: none;
  background: transparent;
  color: var(--coc-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.logout-btn:hover {
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}
</style>

<style>
.image-fullscreen-overlay {
  position: fixed;
  inset: 0;
  z-index: 200000;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.overlay-panel {
  width: min(96vw, 1600px);
  height: min(92vh, 900px);
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
}

.overlay-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.overlay-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.overlay-close {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.overlay-close:hover {
  background: rgba(201, 123, 99, 0.35);
  border-color: rgba(201, 123, 99, 0.6);
}

.overlay-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: auto;
}

.overlay-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}
</style>
