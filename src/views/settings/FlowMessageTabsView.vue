<script setup>
/**
 * 消息模板（指挥部 · 流程管理）
 * 2026-10-28 用户要求：原「消息模板」下的两个三级子页收敛为一个二级页，页内两个 Tab：
 * - 消息分类（原 /flow/message/classify）
 * - 模板定义（原 /flow/message/template）
 * Tab 状态写入 URL（?tab=classify|template），旧子页链接由 menu.js redirects 兼容。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MessageClassifyView from './MessageClassifyView.vue'
import MessageTemplateView from './MessageTemplateView.vue'

const route = useRoute()
const router = useRouter()

const TAB_NAMES = ['classify', 'template']

const activeTab = computed({
  get() {
    const tab = String(route.query.tab || '')
    return TAB_NAMES.includes(tab) ? tab : 'classify'
  },
  set(value) {
    if (value === activeTab.value) return
    router.replace({ path: route.path, query: { ...route.query, tab: value } })
  },
})
</script>

<template>
  <div class="flow-message-page page-card">
    <div class="page-head">
      <h1 class="page-title">消息模板</h1>
      <p class="page-tip">
        维护通知消息的分类字典与模板定义：分类供模板归属，已被模板引用的分类不可删除；模板标题与正文支持
        ${变量} 占位并可预览渲染效果。
      </p>
    </div>

    <el-tabs v-model="activeTab" class="message-tabs">
      <el-tab-pane label="消息分类" name="classify">
        <MessageClassifyView embedded />
      </el-tab-pane>
      <el-tab-pane label="模板定义" name="template">
        <MessageTemplateView embedded />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.flow-message-page {
  padding: 16px 20px 20px;
}

.page-head {
  margin-bottom: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
}

.page-tip {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.message-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}
</style>
