<script setup>
/**
 * 档案外跳模拟页 — 与验评清单「填报电子档案」同一页面
 * 支持：菜单新标签打开（可无节点）；清单携带 node_id / task_id
 */
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { findTask, inspectionTasks, markNodeDocFilled, listNodeArchiveDocs, wbsNodes } from '../../mock/qm.js'

const QmArchivePanel = defineAsyncComponent(() =>
  import('./components/QmArchivePanel.vue'),
)

const route = useRoute()
const router = useRouter()
const nodeId = computed(() => String(route.query.node_id || ''))
const taskId = computed(() => String(route.query.task_id || ''))
const fromMenu = computed(() => !nodeId.value && !taskId.value)

const task = computed(() => {
  if (taskId.value) return findTask(taskId.value) || null
  if (!nodeId.value) return null
  return (
    inspectionTasks.find((t) => t.wbs_node_id === nodeId.value && Number(t.status) === 0) ||
    inspectionTasks.find((t) => t.wbs_node_id === nodeId.value) ||
    null
  )
})

const node = computed(() => wbsNodes.find((n) => n.id === nodeId.value))
const docs = computed(() => (nodeId.value ? listNodeArchiveDocs(nodeId.value) : []))

function onMarkFilled(row) {
  if (!nodeId.value) return
  markNodeDocFilled(nodeId.value, row.doc_key, true)
  ElMessage.success(`已标记「${row.doc_name}」为已填报（演示）`)
}

onMounted(() => {
  // 菜单入口可不带节点；验评操作入口应带 node_id
  if (!nodeId.value && route.query.from === 'list') {
    ElMessage.warning('未携带验收节点 ID')
  }
})
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">档案管理 / 档案管理（外跳模拟）</div>
      <h1 class="page-title">档案管理 · 外跳模拟</h1>
      <p class="page-tip">
        <template v-if="fromMenu">
          模拟外部档案系统入口（新标签打开）· 可从「节点档案清单」或验评「填报电子档案」携带节点进入
        </template>
        <template v-else>
          已同步验收节点 ID：<code>{{ nodeId || '—' }}</code>
          · 节点：{{ node?.node_name || '—' }}
          · 与验评清单「填报电子档案」同一页面
        </template>
      </p>
      <el-button size="small" @click="router.back()">返回</el-button>
    </div>

    <el-card v-if="nodeId" shadow="never" class="mb">
      <template #header>节点档案清单（可演示标记已填报）</template>
      <el-table :data="docs" border size="small" empty-text="该节点无应填档案文档">
        <el-table-column prop="doc_name" label="文档名称" min-width="200" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.filled ? 'success' : 'warning'">
              {{ row.filled ? '已填报' : '需填报' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              v-if="!row.filled"
              link
              type="primary"
              @click="onMarkFilled(row)"
            >
              标记已填报
            </el-button>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <QmArchivePanel v-if="task" :task="task" />
    <el-empty
      v-else-if="fromMenu"
      description="请从节点档案清单点「查看」，或从验评单「填报电子档案」进入以带入节点上下文"
    />
    <el-empty v-else description="未找到关联验收单，仍可在上方维护节点档案清单演示态" />
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0 0 8px; font-size: 13px; color: #606266; }
.mb { margin-bottom: 12px; }
.muted { color: #909399; font-size: 12px; }
code { background: #f5f7fa; padding: 2px 6px; border-radius: 4px; }
</style>
