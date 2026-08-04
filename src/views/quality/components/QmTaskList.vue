<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  ARCHIVE_FORM_STATUS,
  buildWbsTree,
  checkUnlock,
  createSpecialTask,
  createTask,
  getArchiveInstance,
  inspectionTasks,
  ORG_LABEL,
  resolveProjectName,
  SPECIAL_ACCEPT_TYPES,
  specialTypeLabel,
  TASK_STATUS,
  TASK_TYPE_LABEL,
  taskStatusTagType,
  wbsNodeTypeTagType,
  wbsNodes,
} from '../../../mock/qm.js'

const props = defineProps({
  /** 过滤的 task_type 列表 */
  taskTypes: { type: Array, required: true },
  title: { type: String, default: '验评任务' },
  breadcrumb: { type: String, default: '质量验评' },
  editPath: { type: String, required: true },
  approvePath: { type: String, required: true },
  /** 创建任务时可选节点类型；allowAllNodes 时忽略禁用 */
  nodeTypes: { type: Array, default: () => [6] },
  /** 允许目录树全部可选节点发起（下级须全部通过） */
  allowAllNodes: { type: Boolean, default: false },
  /** 专项验收模式：从目录树专项节点发起 */
  specialMode: { type: Boolean, default: false },
  /** 实体工程验收：树限定在实体工程验收分支 */
  entityMode: { type: Boolean, default: false },
  /** 兼容旧 prop */
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
  9: '/qm/inspect/unit/edit',
  10: '/qm/inspect/special/edit',
}

const APPROVE_PATH_BY_TASK_TYPE = {
  1: '/qm/inspect/batch/approve',
  2: '/qm/inspect/part/approve',
  3: '/qm/inspect/part/approve',
  4: '/qm/inspect/part/approve',
  5: '/qm/inspect/unit/approve',
  6: '/qm/inspect/special/approve',
  7: '/qm/inspect/complete/approve',
  8: '/qm/inspect/unit/approve',
  9: '/qm/inspect/unit/approve',
  10: '/qm/inspect/special/approve',
}

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const createVisible = ref(false)
const createForm = reactive({
  wbs_node_id: '',
  task_name: '',
  location_name: '',
  remark: '',
})

const list = computed(() => {
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

/** 截取实体工程验收分支（含容器节点本身，V2.3.1 §5.2 容器可挂汇总任务） */
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

/** 截取专项验收分支（含容器节点本身） */
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

const wbsTreeOptions = computed(() => {
  const pid = !isHqSelected.value && scopeProjectId.value ? scopeProjectId.value : undefined
  const full = buildWbsTree(pid)

  let source = full
  if (props.entityMode || props.unitLevelOnly) source = takeEntityBranch(full)
  else if (props.specialMode) source = takeSpecialBranch(full)

  const mark = (nodes) =>
    (nodes || []).map((n) => {
      const selectable = props.allowAllNodes
        ? [1, 2, 3, 4, 5, 6].includes(n.node_type) || (props.entityMode && n.node_type === 9)
        : props.nodeTypes.includes(n.node_type) || (props.specialMode && n.node_type === 10)
      return {
        ...n,
        disabled: !selectable,
        children: n.children?.length ? mark(n.children) : [],
      }
    })
  return mark(source)
})

const selectedNodeLabel = computed(() => {
  const n = wbsNodes.find((x) => x.id === createForm.wbs_node_id)
  if (!n) return ''
  const typeExtra =
    n.node_type === 7 && n.special_type ? ` · ${specialTypeLabel(n.special_type)}` : ''
  return `${n.node_name}${n.location_code ? `（${n.location_code}）` : ''}${typeExtra}`
})

const selectedNodeUnlock = computed(() => {
  if (!createForm.wbs_node_id) return null
  const n = wbsNodes.find((x) => x.id === createForm.wbs_node_id)
  if (!n) return null
  return checkUnlock(n)
})

const selectedSpecialMeta = computed(() => {
  const n = wbsNodes.find((x) => x.id === createForm.wbs_node_id)
  if (!n?.special_type) return null
  return SPECIAL_ACCEPT_TYPES.find((t) => t.code === n.special_type) || null
})

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
  createForm.wbs_node_id = ''
  createForm.task_name = ''
  createForm.location_name = ''
  createForm.remark = ''
  createVisible.value = true
}

function submitCreate() {
  if (!createForm.task_name.trim()) {
    return ElMessage.warning('请填写任务名称')
  }
  if (!createForm.wbs_node_id) {
    return ElMessage.warning(props.specialMode ? '请选择专项节点' : '请选择验评节点')
  }
  const node = wbsNodes.find((n) => n.id === createForm.wbs_node_id)
  if (!node) return ElMessage.error('节点不存在')

  if (props.specialMode) {
    if (![7, 10].includes(Number(node.node_type))) {
      return ElMessage.warning('请选择专项节点（消防/人防等）或专项验收容器')
    }
    // 专项容器(10)挂汇总任务走通用创建；专项节点(7)走专项创建
    const r =
      Number(node.node_type) === 10
        ? createTask({
            project_id: node.project_id || scopeProjectId.value,
            wbs_node_id: createForm.wbs_node_id,
            task_name: createForm.task_name.trim(),
            remark: createForm.remark,
          })
        : createSpecialTask({
            project_id: scopeProjectId.value,
            wbs_node_id: createForm.wbs_node_id,
            task_name: createForm.task_name.trim(),
            location_name: createForm.location_name,
            remark: createForm.remark,
          })
    if (!r.ok) return ElMessage.error(r.msg)
    createVisible.value = false
    ElMessage.success(`已创建 ${r.task.task_no}，可点击「填报」继续`)
    return
  }

  if (!props.allowAllNodes && !props.nodeTypes.includes(node.node_type)) {
    return ElMessage.warning('请选择适用的验评节点类型')
  }
  const r = createTask({
    project_id: node.project_id || scopeProjectId.value,
    wbs_node_id: createForm.wbs_node_id,
    task_name: createForm.task_name.trim(),
    remark: createForm.remark,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  createVisible.value = false
  ElMessage.success(`已创建 ${r.task.task_no}，可点击「填报」继续`)
}

function resolveEditPath(row) {
  if (props.specialMode) return props.editPath
  if (props.allowAllNodes || props.entityMode) {
    return EDIT_PATH_BY_TASK_TYPE[row.task_type] || props.editPath
  }
  return EDIT_PATH_BY_TASK_TYPE[row.task_type] || props.editPath
}

function resolveApprovePath(row) {
  if (props.specialMode) return props.approvePath
  return APPROVE_PATH_BY_TASK_TYPE[row.task_type] || props.approvePath
}

function goEdit(row) {
  router.push(`${resolveEditPath(row)}?id=${row.id}`)
}

function goApprove(row) {
  router.push(`${resolveApprovePath(row)}?id=${row.id}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">{{ breadcrumb }}</div>
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-tip">
        当前：{{ isHqSelected ? '请切换到项目查看业务单' : scopeProjectLabel }}
        ·
        {{
          specialMode
            ? '从目录树专项节点发起 → 上传法定资料 → 报验签章'
            : entityMode || allowAllNodes
              ? '检验批至单位工程逐级验收；下级全部通过后方可发起本级任务'
              : '自检填报 → 提交报验 → 审批签章'
        }}
      </p>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        :placeholder="specialMode ? '任务单号/项目/类型/部位' : '任务单号/项目/部位'"
        style="width: 240px"
        :prefix-icon="Search"
      />
      <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px">
        <el-option v-for="(label, val) in TASK_STATUS" :key="val" :label="label" :value="String(val)" />
      </el-select>
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建任务</el-button>
    </div>

    <el-table :data="list" stripe border>
      <el-table-column prop="task_no" label="验评单号" width="130" fixed />
      <el-table-column label="任务名称" min-width="150">
        <template #default="{ row }">{{ row.task_name || nodeName(row.wbs_node_id) }}</template>
      </el-table-column>
      <el-table-column v-if="specialMode" label="专项类型" width="120">
        <template #default="{ row }">{{ specialTypeLabel(row.special_type) }}</template>
      </el-table-column>
      <el-table-column v-else label="任务类型" width="120">
        <template #default="{ row }">{{ TASK_TYPE_LABEL[row.task_type] }}</template>
      </el-table-column>
      <el-table-column label="项目名称" min-width="150">
        <template #default="{ row }">{{ resolveProjectName(row.project_id) }}</template>
      </el-table-column>
      <el-table-column label="节点" min-width="150">
        <template #default="{ row }">{{ nodeName(row.wbs_node_id) }}</template>
      </el-table-column>
      <el-table-column prop="location_name" label="部位" min-width="120" />
      <el-table-column label="当前状态" width="120">
        <template #default="{ row }">
          <el-tag :type="taskStatusTagType(row.status)" size="small">
            {{ TASK_STATUS[row.status] }}
          </el-tag>
          <el-tag v-if="row.is_draft === 1" size="small" type="info" effect="plain" class="draft-tag">
            草稿
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="档案" width="110">
        <template #default="{ row }">
          <template v-if="getArchiveInstance(row.id)">
            <el-tag size="small" type="success" effect="plain">
              {{ ARCHIVE_FORM_STATUS[getArchiveInstance(row.id).form_status] }}
            </el-tag>
          </template>
          <span v-else class="archive-none">未登记</span>
        </template>
      </el-table-column>
      <el-table-column label="施工单位" min-width="140">
        <template #default="{ row }">{{ ORG_LABEL[row.contractor_org_id] || row.contractor_org_id }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button v-if="Number(row.status) === 0" link type="primary" @click="goEdit(row)">填报</el-button>
          <el-button v-if="Number(row.status) === 1" link type="primary" @click="goApprove(row)">审批</el-button>
          <el-button v-if="[3, 4, 5].includes(Number(row.status))" link type="warning" @click="goEdit(row)">
            整改
          </el-button>
          <el-button link type="primary" @click="goEdit(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="createVisible"
      :title="specialMode ? '新建专项验收' : '新建验评任务'"
      width="560px"
      destroy-on-close
    >
      <el-form label-width="120px">
        <el-form-item label="任务名称" required>
          <el-input
            v-model="createForm.task_name"
            maxlength="50"
            show-word-limit
            placeholder="必填，如：T2航站楼三层混凝土浇筑验评；同一节点可创建多个任务，请用名称区分"
          />
        </el-form-item>
        <el-form-item :label="specialMode ? '专项节点' : '验评节点'" required>
          <el-tree-select
            v-model="createForm.wbs_node_id"
            :data="wbsTreeOptions"
            node-key="id"
            :props="{ label: 'label', children: 'children', value: 'id', disabled: 'disabled' }"
            check-strictly
            filterable
            default-expand-all
            clearable
            :placeholder="specialMode ? '从专项验收目录选择节点' : '从实体工程目录选择节点'"
            style="width: 100%"
          >
            <template #default="{ data }">
              <span class="tree-node">
                <el-tag size="small" :type="wbsNodeTypeTagType(data.node_type)" effect="plain" class="type-tag">
                  {{ data.type_label }}
                </el-tag>
                <span>{{ data.label }}</span>
              </span>
            </template>
          </el-tree-select>
          <p v-if="selectedNodeLabel" class="node-hint">已选：{{ selectedNodeLabel }}</p>
          <p v-if="selectedSpecialMeta" class="node-tip">
            填报时须上传：{{ selectedSpecialMeta.requiredDocs.map((d) => d.label).join('、') }}
          </p>
          <p v-if="selectedNodeUnlock && !selectedNodeUnlock.ok" class="node-warn">
            {{ selectedNodeUnlock.msg }}
          </p>
          <p v-else-if="selectedNodeUnlock?.ok" class="node-ok">已满足发起条件，可创建验评任务</p>
          <p class="node-tip">
            {{
              specialMode
                ? '请先在验评目录树「专项验收」下维护消防、人防等节点'
                : '下级节点全部通过后，当前节点方可发起验收任务'
            }}
          </p>
        </el-form-item>
        <el-form-item v-if="specialMode" label="验收部位">
          <el-input v-model="createForm.location_name" placeholder="选填，如 T2航站楼全区域" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.remark" type="textarea" placeholder="备注说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">创建</el-button>
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
.tree-node { display: inline-flex; align-items: center; gap: 6px; }
.type-tag { flex-shrink: 0; }
.draft-tag { margin-left: 4px; }
.archive-none { font-size: 12px; color: #909399; }
.node-hint { margin: 6px 0 0; font-size: 12px; color: #409eff; }
.node-ok { margin: 4px 0 0; font-size: 12px; color: #67c23a; }
.node-warn { margin: 4px 0 0; font-size: 12px; color: #e6a23c; line-height: 1.5; }
.node-tip { margin: 4px 0 0; font-size: 12px; color: #909399; line-height: 1.5; }
</style>
