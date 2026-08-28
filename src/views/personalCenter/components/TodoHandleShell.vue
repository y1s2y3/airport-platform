<script setup>
import { ArrowLeft } from '@element-plus/icons-vue'

defineProps({
  pageTitle: { type: String, default: '待办处理' },
  todoSourceLabel: { type: String, default: '' },
  processName: { type: String, default: '' },
  isReadonly: { type: Boolean, default: false },
  pageClass: { type: String, default: '' },
})

const emit = defineEmits(['back'])
</script>

<template>
  <div class="handle-page page-card" :class="pageClass">
    <div class="page-header">
      <div class="title-row">
        <el-button :icon="ArrowLeft" @click="emit('back')">返回</el-button>
        <div class="title-meta">
          <div class="title-line">
            <h1 class="page-title">{{ pageTitle }}</h1>
            <el-tag
              v-if="todoSourceLabel"
              size="small"
              type="danger"
              effect="plain"
              class="source-tag"
            >
              {{ todoSourceLabel }}
            </el-tag>
            <el-tag v-if="isReadonly" size="small" type="info" effect="plain">只读</el-tag>
          </div>
          <p v-if="processName" class="page-sub">{{ processName }}</p>
        </div>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.handle-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.page-header {
  margin-bottom: 4px;
}
.title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.title-meta {
  flex: 1;
  min-width: 0;
}
.title-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.page-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #606266;
}
.source-tag {
  flex-shrink: 0;
}
</style>
