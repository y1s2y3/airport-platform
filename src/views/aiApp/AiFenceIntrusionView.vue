<script setup>
defineProps({
  title: { type: String, default: '围栏入侵及破坏检测' },
})
</script>

<template>
  <div class="page-card placeholder-page">
    <div class="page-header">
      <div class="page-breadcrumb">AI 应用 / {{ title }}</div>
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-tip">基于 AI 视觉识别电子围栏入侵与破坏行为，功能开发中。</p>
    </div>
    <el-empty description="功能待定" />
  </div>
</template>

<style scoped>
.placeholder-page { padding: 20px 24px 32px; }
.page-header { margin-bottom: 24px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; }
.page-tip { margin: 8px 0 0; font-size: 12px; color: var(--ap-text-muted); }
</style>
