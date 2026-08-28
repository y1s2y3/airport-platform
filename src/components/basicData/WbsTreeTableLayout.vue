<script setup>
defineProps({
  canMaintain: { type: Boolean, default: true },
  maintainAlertTitle: {
    type: String,
    default: '请先在顶部切换到具体项目，再维护本项目数据',
  },
  treePanelTitle: { type: String, default: '结构树' },
  treeWidth: { type: String, default: '320px' },
  keywordPlaceholder: { type: String, default: '筛选节点名称' },
  showKeyword: { type: Boolean, default: true },
})

const keyword = defineModel('keyword', { type: String, default: '' })
</script>

<template>
  <el-alert
    v-if="!canMaintain"
    type="warning"
    :closable="false"
    show-icon
    :title="maintainAlertTitle"
    class="wbs-alert"
  />

  <div v-else class="wbs-layout">
    <aside class="wbs-tree-panel" :style="{ width: treeWidth }">
      <div class="wbs-panel-title">{{ treePanelTitle }}</div>
      <el-input
        v-if="showKeyword"
        v-model="keyword"
        clearable
        :placeholder="keywordPlaceholder"
        class="wbs-keyword"
        :aria-label="keywordPlaceholder"
      />
      <slot name="tree-toolbar" />
      <slot name="tree" />
    </aside>

    <section class="wbs-table-panel">
      <slot name="table" />
    </section>
  </div>
</template>

<style scoped>
.wbs-alert {
  margin-bottom: 8px;
}

.wbs-layout {
  display: flex;
  gap: 16px;
  min-height: 520px;
  flex: 1;
}

.wbs-tree-panel {
  flex-shrink: 0;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  overflow: auto;
}

.wbs-panel-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.wbs-keyword {
  margin-bottom: 12px;
}

.wbs-table-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

:deep(.tree-node) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

:deep(.tree-name) {
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.type-tag) {
  flex-shrink: 0;
}

:deep(.node-summary) {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

:deep(.name-cell) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

:deep(.node-table) {
  flex: 1;
}
</style>
