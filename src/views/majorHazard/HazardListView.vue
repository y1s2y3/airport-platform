<script setup>
import { computed } from 'vue'
import { useCurrentProject } from '../../composables/useCurrentProject'

const { isHqSelected } = useCurrentProject()
const parentLabel = computed(() => (isHqSelected.value ? '施工作业管理' : '施工作业申报'))
</script>

<template>
  <div class="hazard-list-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">{{ parentLabel }} / 危大工程清单</div>
      <div class="page-heading">
        <h1 class="page-title">危大工程清单</h1>
      </div>
      <p class="page-tip">功能开发中，敬请期待。</p>
    </div>

    <el-empty description="危大工程清单功能待定" />
  </div>
</template>

<style scoped>
.hazard-list-page {
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
.page-heading {
  display: flex;
  align-items: center;
  gap: 16px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}
.page-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--ap-text-muted);
}
</style>
