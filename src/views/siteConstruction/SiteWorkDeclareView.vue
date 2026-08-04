<script setup>
defineProps({
  title: { type: String, default: '施工作业申报' },
})
</script>

<template>
  <div class="page-card placeholder-page">
    <div class="page-header">
      <div class="page-breadcrumb">施工现场管理 / {{ title }}</div>
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-tip">功能开发中，敬请期待。</p>
    </div>
    <el-empty description="施工作业申报功能待定" />
  </div>
</template>

<style scoped>
.placeholder-page {
  padding: 20px 24px 32px;
}
.page-header {
  margin-bottom: 24px;
}
.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.page-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--ap-text-muted);
}
</style>
