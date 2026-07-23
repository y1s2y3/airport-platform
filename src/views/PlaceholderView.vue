<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="page-card placeholder-page">
    <div v-if="description" class="placeholder-desc">{{ description }}</div>
    <el-empty :description="`${title} · 功能开发中`" />
  </div>
</template>

<style scoped>
.placeholder-page {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.placeholder-desc {
  max-width: 720px;
  margin-bottom: 20px;
  padding: 14px 18px;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fafafa;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ap-text-secondary);
  text-align: center;
}
</style>
