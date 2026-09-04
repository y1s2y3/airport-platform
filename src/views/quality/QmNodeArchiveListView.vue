<script setup>
/**
 * 节点档案清单 — 左侧验评目录树，右侧所选节点档案文档及状态
 * 树节点着色：仅看当前节点是否存在已填报档案 → 绿，否则灰（不看下级）
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  buildWbsTree,
  ensureWbsScaffold,
  listNodeArchiveDocs,
  wbsNodes,
} from '../../mock/qm.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const selectedNodeId = ref('')
const treeFilter = ref('')
const treeRef = ref(null)

const canUse = computed(() => !isHqSelected.value && !!scopeProjectId.value)

const treeData = computed(() => {
  if (!canUse.value) return []
  ensureWbsScaffold(scopeProjectId.value)
  return buildWbsTree(scopeProjectId.value)
})

const selectedNode = computed(() => wbsNodes.find((n) => n.id === selectedNodeId.value) || null)

const docs = computed(() => {
  if (!selectedNodeId.value) return []
  let list = listNodeArchiveDocs(selectedNodeId.value).map((d) => ({
    ...d,
    node_id: selectedNodeId.value,
  }))
  if (statusFilter.value === 'todo') list = list.filter((d) => !d.filled)
  if (statusFilter.value === 'filled') list = list.filter((d) => d.filled)
  const kw = keyword.value.trim()
  if (kw) list = list.filter((d) => String(d.doc_name || '').includes(kw))
  return list
})

const docSummary = computed(() => {
  if (!selectedNodeId.value) return ''
  const all = listNodeArchiveDocs(selectedNodeId.value)
  const filled = all.filter((d) => d.filled).length
  return all.length ? `共 ${all.length} 项 · 已填报 ${filled} · 需填报 ${all.length - filled}` : '该节点暂无档案文档'
})

/** 当前节点：存在任一已填报档案文档即为绿（不看下级） */
function isArchiveTreeGreen(node) {
  if (!node?.id) return false
  return listNodeArchiveDocs(node.id).some((d) => d.filled)
}

/** 节点类型标签：档案有已填报→绿，否则灰（同验评目录树） */
function archiveNodeTagType(node) {
  return isArchiveTreeGreen(node) ? 'success' : 'info'
}

function filterTreeNode(value, data) {
  if (!value) return true
  return String(data.label || '').includes(value)
}

function onTreeSelect(data) {
  if (!data?.id) return
  selectedNodeId.value = data.id
}

function pickDefaultNode(nodes) {
  for (const n of nodes || []) {
    if (![8, 9, 10].includes(Number(n.node_type))) return n.id
    const hit = pickDefaultNode(n.children)
    if (hit) return hit
  }
  return nodes?.[0]?.id || ''
}

watch(treeFilter, (val) => {
  treeRef.value?.filter(val)
})

watch(
  [treeData, canUse],
  () => {
    if (!canUse.value) {
      selectedNodeId.value = ''
      return
    }
    if (!selectedNodeId.value || !wbsNodes.some((n) => n.id === selectedNodeId.value)) {
      selectedNodeId.value = pickDefaultNode(treeData.value)
    }
  },
  { immediate: true },
)

function goView(row) {
  const href = router.resolve({
    path: '/qm/inspect/archive-jump',
    query: { node_id: row.node_id || selectedNodeId.value, from: 'node-archive-list' },
  }).href
  window.open(href, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 节点档案清单</div>
      <h1 class="page-title">节点档案清单</h1>
      <p class="page-tip">
        当前：{{ isHqSelected ? '请切换到项目' : scopeProjectLabel }}
        · 左侧类型标签着色（同验评目录树）：当前节点存在已填报档案即为绿，否则灰（不看下级）
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="请先在顶部切换到具体项目后再查看节点档案清单"
      class="mb"
    />

    <div v-else class="split">
      <aside class="tree-pane">
        <div class="pane-title">验评目录树</div>
        <el-input
          v-model="treeFilter"
          clearable
          size="small"
          placeholder="筛选节点"
          class="tree-filter"
          aria-label="筛选节点"
        />
        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          highlight-current
          default-expand-all
          :expand-on-click-node="false"
          :current-node-key="selectedNodeId"
          :filter-node-method="filterTreeNode"
          :props="{ label: 'label', children: 'children' }"
          class="archive-tree"
          @node-click="onTreeSelect"
        >
          <template #default="{ data }">
            <span class="tree-node" :class="{ 'is-filled': isArchiveTreeGreen(data) }">
              <el-tag
                size="small"
                :type="archiveNodeTagType(data)"
                effect="plain"
                class="type-tag"
              >
                {{ data.type_label }}
              </el-tag>
              <span class="tree-label" :title="data.label">{{ data.label }}</span>
            </span>
          </template>
        </el-tree>
      </aside>

      <section class="list-pane">
        <div class="list-head">
          <div>
            <div class="pane-title">
              档案文档清单
              <span v-if="selectedNode" class="node-name">· {{ selectedNode.node_name }}</span>
            </div>
            <p class="list-summary">{{ docSummary }}</p>
          </div>
          <div class="filter-bar">
            <el-input
              v-model="keyword"
              clearable
              placeholder="文档名称"
              style="width: 180px"
              :prefix-icon="Search"
              aria-label="文档名称"
            />
            <el-select
              v-model="statusFilter"
              clearable
              placeholder="填报状态"
              style="width: 130px"
              aria-label="填报状态"
            >
              <el-option label="需填报" value="todo" />
              <el-option label="已填报" value="filled" />
            </el-select>
          </div>
        </div>

        <el-table :data="docs" stripe border empty-text="请选择左侧节点，或该节点暂无档案文档">
          <el-table-column prop="doc_name" label="档案文档" min-width="220" show-overflow-tooltip />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="row.filled ? 'success' : 'warning'" effect="plain">
                {{ row.filled ? '已填报' : '需填报' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="数据更新时间" width="170" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="goView(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.mb { margin-bottom: 4px; }
.split {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 12px;
  min-height: 480px;
  align-items: stretch;
}
@media (max-width: 960px) {
  .split { grid-template-columns: 1fr; }
}
.tree-pane,
.list-pane {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
  min-width: 0;
}
.tree-pane {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 220px);
  overflow: hidden;
}
.pane-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.node-name { font-weight: 500; color: #606266; }
.tree-filter { width: 100%; }
.archive-tree {
  flex: 1;
  overflow: auto;
  background: transparent;
}
.tree-node {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  line-height: 1.4;
  padding-right: 4px;
  box-sizing: border-box;
}
.type-tag { flex-shrink: 0; }
.tree-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-node.is-filled .tree-label {
  color: #67c23a;
  font-weight: 500;
}
:deep(.el-tree-node__content) {
  overflow: hidden;
  padding-right: 8px;
}
:deep(.el-tree-node__content > span:last-child),
:deep(.el-tree-node__content > .tree-node) {
  flex: 1;
  min-width: 0;
  width: 0;
}
.list-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.list-summary { margin: 4px 0 0; font-size: 12px; color: #909399; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
</style>
