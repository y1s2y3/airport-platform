<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions.js'
import {
  batchTypes,
  buildWbsTree,
  ensureWbsScaffold,
  formTemplates,
  removeWbsNode,
  resolveBatchTypeName,
  resolveTemplateName,
  SPECIAL_ACCEPT_TYPES,
  upsertWbsNode,
  WBS_EDITABLE_NODE_TYPES,
  WBS_SYSTEM_NODE_TYPES,
  WBS_TREE_NODE_TYPE_LABEL,
  WBS_TREE_NODE_TYPES,
  wbsNodes,
} from '../../mock/qm.js'
import './qm-hq-stats.css'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const fromHq = computed(() => route.query.from === 'hq')
const queryProjectId = computed(() => String(route.query.projectId || '').trim())

/** 指挥部下钻：不切顶栏项目，用 query.projectId 查看；项目级仍用顶栏 scope */
const viewProjectId = computed(() => {
  if (fromHq.value && queryProjectId.value) return queryProjectId.value
  if (!isHqSelected.value && scopeProjectId.value) return scopeProjectId.value
  return ''
})

const viewProjectLabel = computed(() => {
  if (!viewProjectId.value) return ''
  const found = COC_PROJECT_OPTIONS.find((p) => p.id === viewProjectId.value)
  return found?.label || viewProjectId.value
})

const canViewTree = computed(() => !!viewProjectId.value)
/** 仅项目级可维护；指挥部二级页只读查看 */
const canMaintain = computed(
  () => !fromHq.value && !isHqSelected.value && !!scopeProjectId.value,
)

function goBackToHQ() {
  router.push('/qm/inspect/dashboard')
}
const keyword = ref('')
const treeRef = ref(null)
const selectedNodeId = ref('')
const visible = ref(false)
const form = reactive({
  id: '',
  project_id: '',
  parent_id: '',
  node_type: 6,
  node_name: '',
  location_code: '',
  batch_type_id: '',
  form_template_id: '',
  specialty: '结构',
  special_type: '',
  is_hidden_work: 0,
  is_critical: 0,
  batch_scheme_id: '',
  sort_no: 0,
})

const treeData = computed(() => {
  if (!canViewTree.value) return []
  ensureWbsScaffold(viewProjectId.value)
  return buildWbsTree(viewProjectId.value)
})

/** 新增可选类型：按父节点约束 */
const creatableTypeOptions = computed(() => {
  const parent = wbsNodes.find((n) => n.id === form.parent_id)
  if (!parent) {
    return WBS_EDITABLE_NODE_TYPES.filter((t) => t === 1 || t === 7).map((t) => ({
      value: t,
      label: WBS_TREE_NODE_TYPE_LABEL[t],
    }))
  }
  let allow = []
  if (parent.node_type === 9) allow = [1]
  else if (parent.node_type === 10) allow = [7]
  else if (parent.node_type === 1) allow = [2, 3]
  else if (parent.node_type === 2) allow = [3]
  else if (parent.node_type === 3) allow = [4, 5]
  else if (parent.node_type === 4) allow = [5]
  else if (parent.node_type === 5) allow = [6]
  else if (parent.node_type === 8) allow = []
  else allow = WBS_EDITABLE_NODE_TYPES
  return allow.map((t) => ({ value: t, label: WBS_TREE_NODE_TYPE_LABEL[t] }))
})

const selectedNode = computed(
  () => wbsNodes.find((n) => n.id === selectedNodeId.value) || null,
)

/** 直接下级（不含更深层级） */
const directChildren = computed(() => {
  if (!selectedNodeId.value) return []
  return wbsNodes
    .filter(
      (n) =>
        n.parent_id === selectedNodeId.value &&
        WBS_TREE_NODE_TYPES.includes(n.node_type),
    )
    .slice()
    .sort((a, b) => (a.sort_no || 0) - (b.sort_no || 0))
})

/** 右侧列表：当前节点（首行）+ 直接下级 */
const tableRows = computed(() => {
  if (!selectedNode.value) return []
  return [selectedNode.value, ...directChildren.value]
})

/** 统计筛选：默认总数 */
const listFilter = ref('total')

const STAT_FILTERS = [
  { key: 'total', label: '下级节点总数', valueClass: '' },
  { key: 'inProgress', label: '验收中数量', valueClass: 'primary' },
  { key: 'completed', label: '已完成数量', valueClass: 'success' },
  { key: 'pending', label: '未开始数量', valueClass: 'muted' },
  { key: 'rectifying', label: '整改中数量', valueClass: 'danger' },
]

function matchChildFilter(node, key) {
  if (key === 'total') return true
  if (key === 'inProgress') return node.accept_status === 1
  if (key === 'completed') return node.accept_status === 2
  if (key === 'pending') return node.accept_status === 0
  if (key === 'rectifying') return node.accept_status === 4
  return true
}

/** 按统计模块筛选后的列表 */
const filteredTableRows = computed(() => {
  if (!selectedNode.value) return []
  if (listFilter.value === 'total') return tableRows.value
  return directChildren.value.filter((n) => matchChildFilter(n, listFilter.value))
})

function setListFilter(key) {
  listFilter.value = key
}

const stats = computed(() => {
  const children = directChildren.value
  return {
    total: children.length,
    inProgress: children.filter((n) => n.accept_status === 1).length,
    completed: children.filter((n) => n.accept_status === 2).length,
    pending: children.filter((n) => n.accept_status === 0).length,
    rectifying: children.filter((n) => n.accept_status === 4).length,
  }
})

function isSystemNode(node) {
  return !!node && WBS_SYSTEM_NODE_TYPES.includes(node.node_type)
}

const acceptLabel = {
  0: '未开始',
  1: '验收中',
  2: '已完成',
  3: '不通过',
  4: '整改中',
  5: '待复验',
}

function acceptStatusTagType(status) {
  const map = { 0: 'info', 1: 'primary', 2: 'success', 3: 'danger', 4: 'danger', 5: 'warning' }
  return map[status] || 'info'
}

/** 节点类型标签：已完成绿色，其余灰色 */
function nodeTypeTagType(accept_status) {
  return accept_status === 2 ? 'success' : 'info'
}

const parentOptions = computed(() =>
  wbsNodes.filter(
    (n) =>
      n.project_id === form.project_id &&
      WBS_TREE_NODE_TYPES.includes(n.node_type) &&
      n.node_type !== 6 &&
      n.node_type !== 7 &&
      n.id !== form.id,
  ),
)
const formOptions = computed(() => formTemplates.filter((t) => t.status === 1))

function pickDefaultNode() {
  if (!viewProjectId.value) {
    selectedNodeId.value = ''
    return
  }
  ensureWbsScaffold(viewProjectId.value)
  const root = wbsNodes.find(
    (n) => n.project_id === viewProjectId.value && n.node_type === 8 && !n.parent_id,
  )
  selectedNodeId.value = root?.id || ''
}

function defaultChildType(parent_id) {
  const parent = wbsNodes.find((n) => n.id === parent_id)
  if (!parent) return 1
  if (parent.node_type === 9) return 1
  if (parent.node_type === 10) return 7
  if (parent.node_type === 1) return 3
  if (parent.node_type === 2) return 3
  if (parent.node_type === 3) return 5
  if (parent.node_type === 4) return 5
  if (parent.node_type === 5) return 6
  return 6
}

watch(
  () => [canViewTree.value, viewProjectId.value, treeData.value],
  async () => {
    if (!canViewTree.value) {
      selectedNodeId.value = ''
      listFilter.value = 'total'
      return
    }
    const exists = wbsNodes.some(
      (n) => n.id === selectedNodeId.value && n.project_id === viewProjectId.value,
    )
    if (!exists) {
      pickDefaultNode()
      listFilter.value = 'total'
    }
    await nextTick()
    if (selectedNodeId.value) {
      treeRef.value?.setCurrentKey(selectedNodeId.value)
    }
  },
  { immediate: true },
)

watch(keyword, (val) => {
  treeRef.value?.filter(val.trim())
})

function filterTreeNode(value, data) {
  if (!value) return true
  return String(data.label || '').includes(value)
}

function handleNodeClick(data) {
  selectedNodeId.value = data.id
  listFilter.value = 'total'
}

function tableRowClassName({ row, rowIndex }) {
  if (listFilter.value === 'total' && rowIndex === 0 && row.id === selectedNodeId.value) {
    return 'current-node-row'
  }
  return ''
}

function openCreate(parent_id = '') {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护目录树')
  const pid = parent_id || selectedNodeId.value || ''
  const parent = wbsNodes.find((n) => n.id === pid)
  if (parent && (parent.node_type === 6 || parent.node_type === 7 || parent.node_type === 8)) {
    if (parent.node_type === 8) {
      return ElMessage.warning('请在「实体工程验收」或「专项验收」下添加子节点')
    }
    return ElMessage.warning('该节点下不可再添加子节点')
  }
  form.id = ''
  form.project_id = viewProjectId.value || scopeProjectId.value
  form.parent_id = pid
  form.node_type = defaultChildType(pid)
  form.node_name = ''
  form.location_code = ''
  form.batch_type_id = form.node_type === 6 ? 'bt-rebar' : ''
  form.form_template_id = form.node_type === 7 ? 'ft-special-fire' : ''
  form.specialty = form.node_type === 7 ? '消防' : '结构'
  form.special_type = form.node_type === 7 ? 'fire' : ''
  form.is_hidden_work = 0
  form.is_critical = 0
  form.batch_scheme_id = ''
  form.sort_no = 0
  visible.value = true
}

function openEdit(row) {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护目录树')
  Object.assign(form, {
    id: row.id,
    project_id: row.project_id,
    parent_id: row.parent_id || '',
    node_type: row.node_type,
    node_name: row.node_name,
    location_code: row.location_code || '',
    batch_type_id: row.batch_type_id || '',
    form_template_id: row.form_template_id || '',
    specialty: row.specialty || '',
    special_type: row.special_type || '',
    is_hidden_work: row.is_hidden_work,
    is_critical: row.is_critical,
    batch_scheme_id: row.batch_scheme_id || '',
    sort_no: row.sort_no || 0,
  })
  visible.value = true
}

function submit() {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护目录树')
  const r = upsertWbsNode({ ...form, project_id: viewProjectId.value || scopeProjectId.value }, form.id)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(form.id ? '节点已更新' : '节点已创建')
  visible.value = false
  if (!form.id && form.parent_id) {
    selectedNodeId.value = form.parent_id
  }
}

async function onRemove(row) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.node_name}」？`, '删除节点', { type: 'warning' })
    const r = removeWbsNode(row.id)
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success('已删除')
    if (selectedNodeId.value === row.id) pickDefaultNode()
  } catch {
    /* cancel */
  }
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        {{ fromHq ? '质量看板 / 质量验评看板' : '质量验评' }} / 验评目录树
      </div>
      <div class="hq-title-row">
        <el-button
          v-if="fromHq && canViewTree"
          link
          type="primary"
          :icon="ArrowLeft"
          @click="goBackToHQ"
        >
          返回
        </el-button>
        <h1 class="page-title">验评目录树</h1>
        <span v-if="fromHq && canViewTree" class="hq-title-project">{{ viewProjectLabel }}</span>
      </div>
      <p class="page-tip">
        树结构：项目竣工验收 → 实体工程验收(分类，不做验收) / 专项验收。当前查看：{{
          viewProjectLabel || (isHqSelected ? '请从看板选择项目查看' : scopeProjectLabel)
        }}
        <template v-if="fromHq">（指挥部只读）</template>
      </p>
    </div>

    <el-alert
      v-if="!canViewTree"
      type="warning"
      :closable="false"
      show-icon
      title="请先在顶部切换到具体项目，或从指挥部质量验评看板进入项目目录树"
      class="mb"
    />

    <div v-else class="layout">
      <aside class="tree-panel">
        <div class="panel-title">节点树</div>
        <el-input v-model="keyword" clearable placeholder="筛选节点名称" style="margin-bottom: 12px" aria-label="筛选节点名称"/>
        <el-button
          v-if="canMaintain"
          type="primary"
          size="small"
          style="margin-bottom: 8px"
          @click="openCreate()"
        >
          新增节点
        </el-button>
        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          :current-node-key="selectedNodeId"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          :filter-node-method="filterTreeNode"
          @node-click="handleNodeClick"
        >
          <template #default="{ data }">
            <span class="tree-node" :class="{ 'is-completed': data.raw?.accept_status === 2 }">
              <el-tag size="small" :type="nodeTypeTagType(data.raw?.accept_status)" effect="plain" class="type-tag">
                {{ data.type_label }}
              </el-tag>
              <span class="tree-name" :title="data.label">{{ data.label }}</span>
              <span v-if="data.raw?.accept_status === 2" class="done-dot" aria-hidden="true" />
            </span>
          </template>
        </el-tree>
      </aside>
      <section class="table-panel">
        <div v-if="selectedNode" class="node-summary">
          当前节点：
          <el-tag size="small" :type="nodeTypeTagType(selectedNode.accept_status)" effect="plain">
            {{ WBS_TREE_NODE_TYPE_LABEL[selectedNode.node_type] }}
          </el-tag>
          <strong>{{ selectedNode.node_name }}</strong>
        </div>
        <el-empty v-else description="请在左侧选择节点" :image-size="64" />

        <template v-if="selectedNode">
          <div class="stats-row">
            <div
              v-for="item in STAT_FILTERS"
              :key="item.key"
              class="stat-card"
              :class="{ active: listFilter === item.key }"
              role="button"
              tabindex="0"
              @click="setListFilter(item.key)"
              @keydown.enter.prevent="setListFilter(item.key)"
            >
              <span class="stat-label">{{ item.label }}</span>
              <span class="stat-value" :class="item.valueClass">{{ stats[item.key] }}</span>
            </div>
          </div>

          <el-table
            :data="filteredTableRows"
            stripe
            border
            height="100%"
            class="node-table"
            :row-class-name="tableRowClassName"
          >
            <el-table-column label="节点名称" min-width="240">
              <template #default="{ row, $index }">
                <span class="name-cell">
                  <el-tag
                    v-if="listFilter === 'total' && $index === 0 && row.id === selectedNodeId"
                    size="small"
                    type="primary"
                    effect="dark"
                    class="type-tag"
                  >
                    当前
                  </el-tag>
                  <el-tag size="small" :type="nodeTypeTagType(row.accept_status)" effect="plain" class="type-tag">
                    {{ WBS_TREE_NODE_TYPE_LABEL[row.node_type] }}
                  </el-tag>
                  <span>{{ row.node_name }}</span>
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="location_code" label="部位编码" width="110" />
            <el-table-column prop="specialty" label="专业" width="80" />
            <el-table-column label="验收状态" width="110">
              <template #default="{ row }">
                <el-tag :type="acceptStatusTagType(row.accept_status)" size="small">
                  {{ acceptLabel[row.accept_status] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="关键" width="60">
              <template #default="{ row }">{{ row.is_critical === 1 ? '是' : '否' }}</template>
            </el-table-column>
            <el-table-column label="检验批类型" min-width="130">
              <template #default="{ row }">{{ resolveBatchTypeName(row.batch_type_id) }}</template>
            </el-table-column>
            <el-table-column label="表单模板" min-width="140">
              <template #default="{ row }">{{ resolveTemplateName(row.form_template_id) }}</template>
            </el-table-column>
            <el-table-column v-if="canMaintain" label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                <el-button
                  v-if="![6, 7].includes(row.node_type) && row.node_type !== 8"
                  link
                  type="primary"
                  @click="openCreate(row.id)"
                >
                  添加子节点
                </el-button>
                <el-button
                  v-if="!isSystemNode(row)"
                  link
                  type="danger"
                  @click="onRemove(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <p class="hint">
            点击上方统计可筛选直接下级；默认展示总数（含当前节点）。当前筛选：{{
              STAT_FILTERS.find((i) => i.key === listFilter)?.label
            }}。
            <template v-if="fromHq">指挥部层级仅可查看，不可维护。</template>
          </p>
        </template>
      </section>
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑节点' : '新增节点'" width="560px" destroy-on-close>
      <el-form label-width="120px">
        <el-form-item label="所属项目">
          <el-input :model-value="scopeProjectLabel" disabled />
        </el-form-item>
        <el-form-item label="父节点">
          <el-select v-model="form.parent_id" clearable filterable style="width: 100%">
            <el-option
              v-for="n in parentOptions"
              :key="n.id"
              :label="`[${WBS_TREE_NODE_TYPE_LABEL[n.node_type]}] ${n.node_name}`"
              :value="n.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="节点类型" required>
          <el-select
            v-model="form.node_type"
            style="width: 100%"
            :disabled="!!form.id && isSystemNode({ node_type: form.node_type })"
          >
            <el-option
              v-for="opt in form.id
                ? Object.entries(WBS_TREE_NODE_TYPE_LABEL).map(([val, label]) => ({
                    value: Number(val),
                    label,
                  }))
                : creatableTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="节点名称" required>
          <el-input v-model="form.node_name" />
        </el-form-item>
        <el-form-item label="部位编码">
          <el-input v-model="form.location_code" placeholder="可选" aria-label="可选"/>
        </el-form-item>
        <el-form-item v-if="form.node_type === 7" label="专项类型" required>
          <el-select v-model="form.special_type" style="width: 100%">
            <el-option
              v-for="t in SPECIAL_ACCEPT_TYPES"
              :key="t.code"
              :label="t.label"
              :value="t.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.node_type === 6" label="检验批类型" required>
          <el-select v-model="form.batch_type_id" style="width: 100%">
            <el-option
              v-for="t in batchTypes.filter((x) => x.status === 1)"
              :key="t.id"
              :label="t.type_name"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="[1, 2, 3, 4, 5, 7].includes(form.node_type)" label="表单模板">
          <el-select v-model="form.form_template_id" clearable filterable style="width: 100%">
            <el-option
              v-for="t in formOptions"
              :key="t.id"
              :label="t.template_name"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.node_type === 6" label="隐蔽工程">
          <el-switch v-model="form.is_hidden_work" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item v-if="form.node_type === 6" label="关键检验批">
          <el-switch v-model="form.is_critical" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="专业"><el-input v-model="form.specialty" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; min-height: 100%; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.mb { margin-bottom: 0; }
.layout { display: grid; grid-template-columns: 340px 1fr; gap: 16px; min-height: 520px; }
.tree-panel, .table-panel {
  background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panel-title { font-weight: 600; margin-bottom: 8px; }
.node-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 13px;
  color: #606266;
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.stat-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fafbfd;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  user-select: none;
}
.stat-card:hover {
  border-color: #d4a0b0;
  background: #fff;
}
.stat-card.active {
  border-color: #91003d;
  background: #fbf5f6;
  box-shadow: 0 0 0 1px rgba(145, 0, 61, 0.12);
}
.stat-card:focus-visible {
  outline: 2px solid #91003d;
  outline-offset: 2px;
}
.stat-label { font-size: 12px; color: #909399; }
.stat-value { font-size: 20px; font-weight: 700; color: #303133; }
.stat-value.primary { color: #409eff; }
.stat-value.success { color: #67c23a; }
.stat-value.muted { color: #909399; }
.stat-value.danger { color: #f56c6c; }
.stat-value.warning { color: #e6a23c; }
.node-table { flex: 1; min-height: 280px; }
.hint { margin-top: 8px; font-size: 12px; color: #909399; }
.tree-node, .name-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1.4;
}
.tree-node {
  display: flex;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  padding-right: 4px;
  box-sizing: border-box;
}
.type-tag { flex-shrink: 0; }
.tree-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-node.is-completed .tree-name {
  color: #67c23a;
  font-weight: 500;
}
.done-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-left: 8px;
  border-radius: 50%;
  background: #67c23a;
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
:deep(.current-node-row) {
  --el-table-tr-bg-color: #ecf5ff;
}
@media (max-width: 1400px) {
  .stats-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 960px) {
  .layout { grid-template-columns: 1fr; }
  .stats-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
