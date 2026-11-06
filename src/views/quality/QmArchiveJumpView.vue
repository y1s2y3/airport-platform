<script setup>
/**
 * 档案外跳模拟页 — 与验评清单「填报电子档案」同一页面
 * 支持：菜单新标签打开（可无节点）；清单携带 node_id / task_id
 */
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  findTask,
  inspectionTasks,
  markNodeDocFilled,
  listNodeArchiveDocs,
  isArchiveDocFilled,
  FILL_STATUS,
  wbsNodes,
} from '../../mock/qm.js'
import { projectList } from '../../mock/projectBasicInfo.js'
import {
  buildArchiveEngineeringCode,
  resolveProjectByNode,
} from '../../utils/archiveEngineeringCode.js'

const QmArchivePanel = defineAsyncComponent(() =>
  import('./components/QmArchivePanel.vue'),
)

const route = useRoute()
const router = useRouter()
const nodeId = computed(() => String(route.query.node_id || ''))
const taskId = computed(() => String(route.query.task_id || ''))
const isProvincialEntry = computed(() => String(route.query.entry || '') === 'provincial')
const menuEntryLabel = computed(() => (isProvincialEntry.value ? '省统表管理' : '档案管理'))
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

/** 节点 ID：优先路由 node_id，其次验收单关联的 WBS 节点 */
const effectiveNodeId = computed(() => nodeId.value || String(task.value?.wbs_node_id || ''))
const node = computed(() => wbsNodes.find((n) => n.id === effectiveNodeId.value))
const docs = computed(() => (effectiveNodeId.value ? listNodeArchiveDocs(effectiveNodeId.value) : []))

/** 向档案系统传输的工程代号（需求变更 CR-07：只到分项，同分项多检验批共用） */
const archiveCode = computed(() =>
  buildArchiveEngineeringCode({
    project: resolveProjectByNode(node.value, projectList),
    node: node.value,
    nodes: wbsNodes,
  }),
)

function onMarkFilled(row) {
  if (!effectiveNodeId.value) return
  markNodeDocFilled(effectiveNodeId.value, row.doc_key, true)
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
      <div class="page-breadcrumb">档案管理 / {{ fromMenu ? menuEntryLabel : '档案管理（外跳模拟）' }}</div>
      <h1 class="page-title">{{ fromMenu ? `${menuEntryLabel} · 外跳模拟` : '档案管理 · 外跳模拟' }}</h1>
      <p class="page-tip">
        <template v-if="fromMenu">
          模拟外部档案系统入口（新标签打开）· 可从「节点档案清单」或验评「填报电子档案」携带节点进入
        </template>
        <template v-else>
          已同步验收节点 ID：<code>{{ nodeId || '--' }}</code>
          · 节点：{{ node?.node_name || '--' }}
          · 与验评清单「填报电子档案」同一页面
        </template>
      </p>
      <el-button size="small" @click="router.back()">返回</el-button>
    </div>

    <el-card v-if="node" shadow="never" class="mb archive-code-card">
      <template #header>向档案系统传输的工程代号（按规则自动拼接）</template>
      <div v-if="archiveCode.ok" class="archive-code-row">
        <code class="archive-code-value">{{ archiveCode.code }}</code>
        <span class="muted">编码只到分项工程层；同一分项下的多个检验批共用此编码</span>
      </div>
      <el-alert
        v-else
        type="warning"
        :closable="false"
        show-icon
        :title="`暂不生成编码，缺少：${archiveCode.missing.join('、')}`"
      />
      <el-table :data="archiveCode.segments" border size="small" class="archive-seg-table">
        <el-table-column prop="key" label="编码段" width="200" />
        <el-table-column prop="value" label="取值" width="200" />
        <el-table-column prop="note" label="说明" min-width="240" />
      </el-table>
    </el-card>

    <el-card v-if="nodeId" shadow="never" class="mb">
      <template #header>节点档案清单（可演示标记已填报）</template>
      <el-table :data="docs" border size="small" empty-text="该节点无应填档案文档">
        <el-table-column prop="doc_name" label="文档名称" min-width="200" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="isArchiveDocFilled(row) ? 'success' : 'warning'">
              {{ isArchiveDocFilled(row) ? FILL_STATUS[1] : FILL_STATUS[0] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              v-if="!isArchiveDocFilled(row)"
              link
              type="primary"
              @click="onMarkFilled(row)"
            >
              标记已填报
            </el-button>
            <span v-else class="muted">--</span>
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
.archive-code-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.archive-code-value {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 15px;
  font-weight: 600;
  color: #ab004e;
  background: #fdf2f7;
  border: 1px solid #f3d3e2;
  padding: 4px 10px;
  border-radius: 4px;
  letter-spacing: 0.4px;
}
.archive-seg-table { margin-top: 4px; }
</style>
