<template>
  <div class="nf-page">
    <div class="nf-brand">
      <span class="nf-brand-name">工程建设智慧管控一体化平台</span>
      <span class="nf-brand-sub">深圳机场扩建工程指挥部信息化平台</span>
    </div>

    <div class="nf-card">
      <div class="nf-code">404</div>
      <h1 class="nf-title">页面不存在</h1>
      <p class="nf-desc">
        当前地址没有对应的页面，可能是功能还在开发中，或者链接输入有误。
      </p>

      <div class="nf-path">
        <span class="nf-path-label">当前地址</span>
        <code class="nf-path-value">{{ currentPath }}</code>
      </div>

      <div class="nf-actions">
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goBack">返回上一页</el-button>
      </div>

      <p class="nf-hint">
        如果是从系统内某个按钮点进来的，说明该入口对应的页面尚未接通，可先用左侧菜单进入对应功能。
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const currentPath = computed(() => {
  const full = route.fullPath || ''
  return full || '/'
})

function goHome() {
  router.push('/')
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.nf-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  box-sizing: border-box;
  background: #f4f6fa;
}

.nf-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
}

.nf-brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #1f2d3d;
  letter-spacing: 1px;
}

.nf-brand-sub {
  font-size: 13px;
  color: #8a94a6;
}

.nf-card {
  width: 100%;
  max-width: 560px;
  padding: 36px 40px 28px;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(31, 45, 61, 0.08);
  text-align: center;
}

.nf-code {
  font-size: 56px;
  line-height: 1;
  font-weight: 800;
  color: #ab004e;
  letter-spacing: 2px;
}

.nf-title {
  margin: 12px 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: #1f2d3d;
}

.nf-desc {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.7;
  color: #5c6b7f;
}

.nf-path {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 22px;
  background: #f7f8fb;
  border: 1px solid #e6e9f0;
  border-radius: 8px;
  text-align: left;
}

.nf-path-label {
  flex: none;
  font-size: 12px;
  color: #8a94a6;
}

.nf-path-value {
  flex: 1;
  min-width: 0;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  color: #1f2d3d;
  word-break: break-all;
}

.nf-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.nf-hint {
  margin: 22px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: #97a1b2;
}
</style>
