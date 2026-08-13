<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  buildWbsTree,
  createTask,
  deletePendingTask,
  ELEC_ARCHIVE_STATUS,
  elecArchiveStatusTagType,
  getTaskDisplayStatus,
  inspectionTasks,
  nodeRequiredDocsEmpty,
  reDeclareAcceptance,
  resolveProjectName,
  saveTaskDraft,
  specialTypeLabel,
  TASK_STATUS_FILTER_OPTIONS,
  TASK_TYPE_LABEL,
  wbsNodeTypeTagType,
  wbsNodes,
} from '../../../mock/qm.js'
import ConstructionLocationSelect from '../../../components/ConstructionLocationSelect.vue'

const props = defineProps({
  taskTypes: { type: Array, required: true },
  title: { type: String, default: '验评任务' },
  breadcrumb: { type: String, default: '质量验评' },
  editPath: { type: String, required: true },
  nodeTypes: { type: Array, default: () => [6] },
  allowAllNodes: { type: Boolean, default: false },
  specialMode: { type: Boolean, default: false },
  entityMode: { type: Boolean, default: false },
  unitLevelOnly: { type: Boolean, default: false },
})

const EDIT_PATH_BY_TASK_TYPE = {
  1: '/qm/inspect/batch/edit',
  2: '/qm/inspect/part/edit',
  3: '/qm/inspect/part/edit',
  4: '/qm/inspect/part/edit',
  5: '/qm/inspect/unit/edit',
  6: '/qm/inspect/special/edit',
  7: '/qm/inspect/complete/edit',
  8: '/qm/inspect/unit/edit',
}

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const listTick = ref(0)

const createVisible = ref(false)
const creating = ref(false)
/** 空=发起；非空=编辑待提交单 */
const editingTaskId = ref('')
const createForm = reactive({
  task_name: '',
  wbs_node_id: '',
  location_name: '',
  location_id: '',
  location_ids: [],
  is_hidden_work: 0,
  need_archive: 0,
})
const archiveLocked = ref(false)
/** 编辑回填时跳过「选节点带出隐蔽标记」 */
const suppressNodePrefill = ref(false)
const dialogTitle = computed(() => (editingTaskId.value ? '编辑验收' : '发起验收'))

const list = computed(() => {
  void listTick.value
  let rows = inspectionTasks.filter((t) => props.taskTypes.includes(t.task_type))
  if (!isHqSelected.value && scopeProjectId.value) {
    rows = rows.filter((t) => t.project_id === scopeProjectId.value)
  }
  if (statusFilter.value !== '') {
    rows = rows.filter((t) => String(t.status) === String(statusFilter.value))
  }
  const kw = keyword.value.trim()
  if (kw) {
    rows = rows.filter((t) => {
      const name = resolveProjectName(t.project_id)
      const typeName = specialTypeLabel(t.special_type)
      return `${t.task_no}${t.task_name || ''}${name}${t.location_name || ''}${typeName}`.includes(kw)
    })
  }
  return rows
})

function takeEntityBranch(roots) {
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if (n.node_type === 9) return [n]
      const hit = walk(n.children)
      if (hit) return hit
    }
    return null
  }
  return walk(roots) || []
}

function takeSpecialBranch(roots) {
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if (n.node_type === 10) return [n]
      const hit = walk(n.children)
      if (hit) return hit
    }
    return null
  }
  return walk(roots) || []
}

function isNodeSelectable(nodeType) {
  const t = Number(nodeType)
  if (props.specialMode) return t === 7
  if (props.entityMode || props.allowAllNodes) return [1, 2, 3, 4, 5, 6].includes(t)
  if (props.unitLevelOnly) return t === 1
  return props.nodeTypes.includes(t)
}

function collectExpandKeys(nodes, expandTypes, acc = []) {
  for (const n of nodes || []) {
    if (expandTypes.includes(Number(n.node_type))) acc.push(n.id)
    if (n.children?.length) collectExpandKeys(n.children, expandTypes, acc)
  }
  return acc
}

/** 发起验收：验收节点取验评目录树结构（实体/专项分支） */
const createNodeTree = computed(() => {
  const pid = scopeProjectId.value || undefined
  const full = buildWbsTree(pid)
  let source = full
  if (props.specialMode) source = takeSpecialBranch(full)
  else if (props.entityMode || props.allowAllNodes) source = takeEntityBranch(full)

  const mark = (nodes) =>
    (nodes || []).map((n) => ({
      id: n.id,
      label: n.label,
      node_type: n.node_type,
      type_label: n.type_label,
      disabled: !isNodeSelectable(n.node_type),
      children: n.children?.length ? mark(n.children) : undefined,
    }))
  return mark(source)
})

const createNodeExpandedKeys = computed(() => {
  const expandTypes = props.specialMode ? [8, 10] : [8, 9]
  return collectExpandKeys(createNodeTree.value, expandTypes)
})

const createNodeTreeKey = computed(
  () =>
    `create-wbs-${scopeProjectId.value || ''}-${props.specialMode ? 's' : 'e'}-${createNodeExpandedKeys.value.join('_')}`,
)

function nodeName(id) {
  if (!id) return '—'
  return wbsNodes.find((n) => n.id === id)?.node_name || id
}

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

function openCreate() {
  if (isHqSelected.value) return ElMessage.warning('请先切换到具体项目')
  editingTaskId.value = ''
  createForm.task_name = ''
  createForm.wbs_node_id = ''
  createForm.location_name = ''
  createForm.location_id = ''
  createForm.location_ids = []
  createForm.is_hidden_work = 0
  createForm.need_archive = 0
  archiveLocked.value = false
  createVisible.value = true
}

function openEdit(row) {
  if (Number(row.status) !== 0) return ElMessage.warning('仅待提交可编辑')
  suppressNodePrefill.value = true
  editingTaskId.value = row.id
  createForm.task_name = row.task_name || ''
  createForm.wbs_node_id = row.wbs_node_id || ''
  const ids = Array.isArray(row.location_ids)
    ? [...row.location_ids]
    : row.location_id
      ? [row.location_id]
      : []
  createForm.location_ids = ids
  createForm.location_id = ids[0] || ''
  createForm.location_name = row.location_name || ''
  createForm.is_hidden_work = Number(row.is_hidden_work) === 1 ? 1 : 0
  createForm.need_archive = Number(row.need_archive) === 1 ? 1 : 0
  const empty = row.wbs_node_id ? nodeRequiredDocsEmpty(row.wbs_node_id) : false
  archiveLocked.value = empty
  if (empty) createForm.need_archive = 0
  createVisible.value = true
  nextTick(() => {
    suppressNodePrefill.value = false
  })
}

watch(
  () => createForm.wbs_node_id,
  (id) => {
    if (!id) {
      archiveLocked.value = false
      createForm.need_archive = 0
      if (!editingTaskId.value && !suppressNodePrefill.value) createForm.is_hidden_work = 0
      // 无验收节点时不可选部位
      if (!suppressNodePrefill.value) {
        createForm.location_id = ''
        createForm.location_ids = []
        createForm.location_name = ''
      }
      return
    }
    const empty = nodeRequiredDocsEmpty(id)
    archiveLocked.value = empty
    if (empty) createForm.need_archive = 0
    // 用户改选节点时带出目录树隐蔽标记（专项不展示）；部位一对多跨分项可选，不清空
    if (!props.specialMode && !suppressNodePrefill.value) {
      const n = wbsNodes.find((x) => x.id === id)
      createForm.is_hidden_work = Number(n?.is_hidden_work) === 1 ? 1 : 0
    }
  },
)

async function confirmCreate() {
  if (!createForm.task_name.trim()) return ElMessage.warning('请填写验收任务名称')
  if (!createForm.wbs_node_id) return ElMessage.warning('请选择验收节点')
  creating.value = true
  try {
    if (editingTaskId.value) {
      const task = inspectionTasks.find((t) => t.id === editingTaskId.value)
      if (!task) return ElMessage.error('验收单不存在')
      const r = saveTaskDraft(task, {
        task_name: createForm.task_name.trim(),
        wbs_node_id: createForm.wbs_node_id,
        location_name: createForm.location_name.trim(),
        location_id: createForm.location_id || '',
        location_ids: [...(createForm.location_ids || [])],
        is_hidden_work: props.specialMode ? 0 : createForm.is_hidden_work,
        need_archive: createForm.need_archive,
      })
      if (!r.ok) return ElMessage.error(r.msg)
      createVisible.value = false
      editingTaskId.value = ''
      listTick.value += 1
      ElMessage.success('已保存')
      return
    }
    const r = createTask({
      project_id: scopeProjectId.value,
      wbs_node_id: createForm.wbs_node_id,
      task_name: createForm.task_name.trim(),
      location_name: createForm.location_name.trim(),
      location_id: createForm.location_id || '',
      location_ids: [...(createForm.location_ids || [])],
      is_hidden_work: props.specialMode ? 0 : createForm.is_hidden_work,
      need_archive: createForm.need_archive,
    })
    if (!r.ok) return ElMessage.error(r.msg)
    createVisible.value = false
    listTick.value += 1
    ElMessage.success('已发起，进入填报')
    const path = EDIT_PATH_BY_TASK_TYPE[r.task.task_type] || props.editPath
    router.push(`${path}?id=${r.task.id}`)
  } finally {
    creating.value = false
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除待提交验收单「${row.task_no}」？删除后不可恢复。`,
      '删除验收单',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  const r = deletePendingTask(row)
  if (!r.ok) return ElMessage.error(r.msg)
  listTick.value += 1
  ElMessage.success('已删除')
}

function resolveEditPath(row) {
  if (props.specialMode) return props.editPath
  return EDIT_PATH_BY_TASK_TYPE[row.task_type] || props.editPath
}

function goEdit(row) {
  router.push(`${resolveEditPath(row)}?id=${row.id}`)
}

function goDetail(row) {
  router.push(`${resolveEditPath(row)}?id=${row.id}`)
}

function goFillArchive(row) {
  const href = router.resolve({
    path: '/qm/inspect/archive-jump',
    query: { node_id: row.wbs_node_id, task_id: row.id, from: 'list' },
  }).href
  window.open(href, '_blank', 'noopener,noreferrer')
}

async function onReDeclare(row) {
  try {
    await ElMessageBox.confirm(
      `将基于「${row.task_no}」新建验收单并关联本驳回单，确认重新申报？`,
      '重新申报验收',
      { type: 'warning' },
    )
  } catch {
    return
  }
  const r = reDeclareAcceptance(row)
  if (!r.ok) return ElMessage.error(r.msg)
  listTick.value += 1
  ElMessage.success('已新建验收单')
  router.push(`${resolveEditPath(r.task)}?id=${r.task.id}`)
}

onMounted(() => {
  listTick.value += 1
})
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">{{ breadcrumb }}</div>
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-tip">
        当前：{{ isHqSelected ? '请切换到项目查看业务单' : scopeProjectLabel }}
        · 弹窗发起 → 待提交填报 → 提交时选审批人；审批在个人中心办理。一节点仅一张有效单。
      </p>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        :placeholder="specialMode ? '验收单号/项目/类型/部位' : '验收单号/项目/部位'"
        style="width: 240px"
        :prefix-icon="Search"
      />
      <el-select v-model="statusFilter" clearable placeholder="验收状态" style="width: 140px">
        <el-option
          v-for="opt in TASK_STATUS_FILTER_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">发起验收</el-button>
    </div>

    <el-table :data="list" stripe border>
      <el-table-column label="项目名称" min-width="150" fixed>
        <template #default="{ row }">{{ resolveProjectName(row.project_id) }}</template>
      </el-table-column>
      <el-table-column prop="task_no" label="验收单号" width="130" />
      <el-table-column label="验收任务名称" min-width="150">
        <template #default="{ row }">{{ row.task_name || nodeName(row.wbs_node_id) }}</template>
      </el-table-column>
      <el-table-column v-if="specialMode" label="专项类型" width="120">
        <template #default="{ row }">{{ specialTypeLabel(row.special_type) }}</template>
      </el-table-column>
      <el-table-column v-else label="验收任务类型" width="130">
        <template #default="{ row }">{{ TASK_TYPE_LABEL[row.task_type] }}</template>
      </el-table-column>
      <el-table-column label="验收节点" min-width="150">
        <template #default="{ row }">{{ nodeName(row.wbs_node_id) }}</template>
      </el-table-column>
      <el-table-column prop="location_name" label="施工部位" min-width="120" />
      <el-table-column label="验收状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getTaskDisplayStatus(row).tagType" size="small">
            {{ getTaskDisplayStatus(row).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="电子档案状态" width="120">
        <template #default="{ row }">
          <el-tag :type="elecArchiveStatusTagType(row.elec_archive_status)" size="small" effect="plain">
            {{ ELEC_ARCHIVE_STATUS[row.elec_archive_status] || '—' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <div class="op-col">
            <div class="op-row">
              <template v-if="Number(row.status) === 0">
                <el-button link type="primary" @click="goEdit(row)">
                  {{ specialMode ? '填报' : '填报验收单' }}
                </el-button>
                <el-button
                  v-if="Number(row.need_archive) === 1"
                  link
                  type="primary"
                  @click="goFillArchive(row)"
                >
                  填报电子档案
                </el-button>
              </template>
              <el-button
                v-if="Number(row.status) === 3"
                link
                type="warning"
                @click="onReDeclare(row)"
              >
                重新申报验收
              </el-button>
            </div>
            <div class="op-row">
              <el-button
                v-if="Number(row.status) === 0"
                link
                type="primary"
                @click="openEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                v-if="Number(row.status) === 0"
                link
                type="danger"
                @click="onDelete(row)"
              >
                删除
              </el-button>
              <el-button link type="primary" @click="goDetail(row)">详情</el-button>
            </div>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="createVisible" :title="dialogTitle" width="520px" destroy-on-close>
      <el-form label-width="130px">
        <el-form-item label="验收任务名称" required>
          <el-input v-model="createForm.task_name" maxlength="80" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="验收节点" required>
          <el-tree-select
            :key="createNodeTreeKey"
            v-model="createForm.wbs_node_id"
            :data="createNodeTree"
            node-key="id"
            :props="{ label: 'label', children: 'children', value: 'id', disabled: 'disabled' }"
            check-strictly
            filterable
            clearable
            :render-after-expand="false"
            :default-expanded-keys="createNodeExpandedKeys"
            :placeholder="specialMode ? '从验评目录树·专项验收选择' : '从验评目录树·实体工程选择'"
            style="width: 100%"
          >
            <template #default="{ data }">
              <span class="tree-node">
                <el-tag
                  size="small"
                  :type="wbsNodeTypeTagType(data.node_type)"
                  effect="plain"
                  class="type-tag"
                >
                  {{ data.type_label }}
                </el-tag>
                <span>{{ data.label }}</span>
              </span>
            </template>
          </el-tree-select>
        </el-form-item>
        <el-form-item label="施工部位">
          <ConstructionLocationSelect
            v-model:location-id="createForm.location_id"
            v-model:location-ids="createForm.location_ids"
            v-model:location-name="createForm.location_name"
            :project-id="scopeProjectId"
            :scope-wbs-node-id="specialMode ? '' : createForm.wbs_node_id"
            :require-scope="!specialMode"
            scope-mode="focus"
            multiple
            :placeholder="
              specialMode
                ? '可多选施工部位（非必填）'
                : '按验收节点定位所属分项，可多选且不限其他部位'
            "
          />
        </el-form-item>
        <el-form-item v-if="!specialMode" label="是否隐蔽工程">
          <el-radio-group v-model="createForm.is_hidden_work">
            <el-radio :value="1">是</el-radio>
            <el-radio :value="0">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否电子档案归档">
          <el-radio-group v-model="createForm.need_archive" :disabled="archiveLocked">
            <el-radio :value="1">是</el-radio>
            <el-radio :value="0">否</el-radio>
          </el-radio-group>
          <div v-if="archiveLocked" class="form-hint">该节点档案清单为空，默认否且不可改</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="confirmCreate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.form-hint { font-size: 12px; color: #909399; margin-top: 4px; }
.tree-node { display: inline-flex; align-items: center; gap: 6px; }
.type-tag { flex-shrink: 0; }
.op-col { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.op-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0 4px; line-height: 1.4; }
</style>
