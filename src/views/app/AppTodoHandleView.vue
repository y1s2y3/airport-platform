<script setup>
/**
 * 建管 APP · 待办/处置详情（复用 Web 处置面板，留在 APP 壳内）
 */
import PersonalCenterTodoHandleView from '../PersonalCenterTodoHandleView.vue'
</script>

<template>
  <div class="app-handle-wrap">
    <PersonalCenterTodoHandleView />
  </div>
</template>

<style scoped>
.app-handle-wrap {
  min-height: 100%;
  padding: 20px 24px 48px;
  background: #f4f5f7;
  box-sizing: border-box;
}
.app-handle-wrap :deep(.handle-page) {
  background: #fff;
  border-radius: 20px;
  padding: 24px 28px 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.app-handle-wrap :deep(.page-title) {
  font-size: 32px;
}
.app-handle-wrap :deep(.page-sub) {
  font-size: 24px;
}
.app-handle-wrap :deep(.el-button) {
  font-size: 22px;
  height: auto;
  padding: 10px 18px;
}
.app-handle-wrap :deep(.el-form-item__label),
.app-handle-wrap :deep(.el-input),
.app-handle-wrap :deep(.el-textarea),
.app-handle-wrap :deep(.el-select),
.app-handle-wrap :deep(.el-radio),
.app-handle-wrap :deep(.el-checkbox),
.app-handle-wrap :deep(.el-descriptions),
.app-handle-wrap :deep(.el-table),
.app-handle-wrap :deep(.el-alert),
.app-handle-wrap :deep(p),
.app-handle-wrap :deep(.field),
.app-handle-wrap :deep(.label),
.app-handle-wrap :deep(.value) {
  font-size: 22px;
}
.app-handle-wrap :deep(.el-input__inner),
.app-handle-wrap :deep(.el-textarea__inner) {
  font-size: 22px;
}
.app-handle-wrap :deep(.el-form-item) {
  margin-bottom: 18px;
}
</style>
