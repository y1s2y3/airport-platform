<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  acceptancePlans,
  buildWbsTree,
  checkUnlock,
  createSpecialTask,
  createTask,
  inspectionTasks,
  ORG_LABEL,
  PLAN_TYPE,
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
  /** 允许目录树全部节点发起（下级须全部通过） */
  allowAllNodes: { type: Boolean, default: false },
  /** 专项验收模式：不挂目录树，须挂计划并选择专项类型 */
  specialMode: { type: Boolean, default: false },
  /** 实体验收：列表/选树仅到单位工程层级 */
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

const APPROVE_PATH_BY_TASK_TYPE = {
  1: '/qm/inspect/batch/approve',
  2: '/qm/inspect/part/approve',
  3: '/qm/inspect/part/approve',
  4: '/qm/inspect/part/approve',
  5: '/qm/inspect/unit/approve',
  6: '/qm/inspect/special/approve',
  7: '/qm/inspect/complete/approve',
  8: '/qm/inspect/unit/approve',
}

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const createVisible = ref(false)
const createForm = reactive({
  wbs_node_id: '',
  plan_id: '',
  special_type: '',
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
      return `${t.task_no}${name}${t.location_name || ''}${typeName}`.includes(kw)
    })
  }
  return rows
})

/** 验评目录树；单位工程模式仅展示单位工程；allowAllNodes 时全部可选 */
const wbsTreeOptions = computed(() => {
  const pid = !isHqSelected.value && scopeProjectId.value ? scopeProjectId.value : undefined
  if (props.unitLevelOnly) {
    return wbsNodes
      .filter((n) => n.node_type === 1 && (!pid || n.project_id === pid))
      .slice()
      .sort((a, b) => (a.sort_no || 0) - (b.sort_no || 0))
      .map((n) => ({
        id: n.id,
        label: n.node_name,
        node_type: n.node_type,
        type_label: '单位工程',
        children: [],
        disabled: false,
        raw: n,
      }))
  }
  const mark = (nodes) =>
    (nodes || []).map((n) => ({
      ...n,
      disabled: props.allowAllNodes ? false : !props.nodeTypes.includes(n.node_type),
      children: n.children?.length ? mark(n.children) : [],
    }))
  return mark(buildWbsTree(pid))
})

const selectedNodeLabel = computed(() => {
  const n = wbsNodes.find((x) => x.id === createForm.wbs_node_id)
  if (!n) return ''
  return `${n.node_name}${n.location_code ? `（${n.location_code}）` : ''}`
})

const selectedNodeUnlock = computed(() => {
  if (!createForm.wbs_node_id) return null
  const n = wbsNodes.find((x) => x.id === createForm.wbs_node_id)
  if (!n) return null
  return checkUnlock(n)
})

const planOptions = computed(() => {
  let plans = acceptancePlans.filter((p) => [1, 2].includes(p.status))
  if (props.specialMode) {
    plans = plans.filter((p) => Number(p.plan_type) === 2)
  }
  if (!isHqSelected.value && scopeProjectId.value) {
    plans = plans.filter((p) => p.project_id === scopeProjectId.value)
  }
  return plans
})

const selectedSpecialMeta = computed(() =>
  SPECIAL_ACCEPT_TYPES.find((t) => t.code === createForm.special_type) || null,
)

function nodeName(id) {
  if (!id) return '—'
  return wbsNodes.find((n) => n.id === id)?.node_name || id
}

function planNo(plan_id) {
  if (!plan_id) return '—'
  return acceptancePlans.find((p) => p.id === plan_id)?.plan_no || plan_id
}

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

function openCreate() {
  if (isHqSelected.value) return ElMessage.warning('请先切换到具体项目')
  createForm.wbs_node_id = ''
  createForm.plan_id = ''
  createForm.special_type = ''
  createForm.location_name = ''
  createForm.remark = ''
  createVisible.value = true
}

function submitCreate() {
  if (props.specialMode) {
    if (!createForm.plan_id) return ElMessage.warning('请选择验收计划')
    if (!createForm.special_type) return ElMessage.warning('请选择专项验收类型')
    const r = createSpecialTask({
      project_id: scopeProjectId.value,
      plan_id: createForm.plan_id,
      special_type: createForm.special_type,
      location_name: createForm.location_name,
      remark: createForm.remark,
    })
    if (!r.ok) return ElMessage.error(r.msg)
    createVisible.value = false
    ElMessage.success(`已创建 ${r.task.task_no}，可点击「填报」继续`)
    return
  }

  if (!createForm.wbs_node_id) return ElMessage.warning('请选择验评节点')
  const node = wbsNodes.find((n) => n.id === createForm.wbs_node_id)
  if (!props.allowAllNodes && node && !props.nodeTypes.includes(node.node_type)) {
    return ElMessage.warning('请选择适用的验评节点类型（如检验批）')
  }
  const r = createTask({
    project_id: node?.project_id || scopeProjectId.value,
    wbs_node_id: createForm.wbs_node_id,
    plan_id: createForm.plan_id || '',
    remark: createForm.remark,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  createVisible.value = false
  ElMessage.success(`已创建 ${r.task.task_no}，可点击「填报」继续`)
}

function resolveEditPath(row) {
  if (props.allowAllNodes || props.specialMode || props.unitLevelOnly) return props.editPath
  return EDIT_PATH_BY_TASK_TYPE[row.task_type] || props.editPath
}

function resolveApprovePath(row) {
  if (props.allowAllNodes || props.specialMode || props.unitLevelOnly) return props.approvePath
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
            ? '挂接专项验收计划 → 选择专项类型 → 按类型上传必传资料 → 报验签章'
            : unitLevelOnly
              ? '列表仅展示单位工程验收；下级分部/分项/检验批通过后方可发起单位工程报验'
              : allowAllNodes
                ? '目录树全节点可发起验评（下级须全部通过）→ 自检填报 → 审批签章'
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
      <el-table-column v-if="specialMode" label="专项类型" width="120">
        <template #default="{ row }">{{ specialTypeLabel(row.special_type) }}</template>
      </el-table-column>
      <el-table-column v-else label="任务类型" width="120">
        <template #default="{ row }">{{ TASK_TYPE_LABEL[row.task_type] }}</template>
      </el-table-column>
      <el-table-column label="项目名称" min-width="150">
        <template #default="{ row }">{{ resolveProjectName(row.project_id) }}</template>
      </el-table-column>
      <el-table-column v-if="!specialMode" label="节点" min-width="150">
        <template #default="{ row }">{{ nodeName(row.wbs_node_id) }}</template>
      </el-table-column>
      <el-table-column prop="location_name" label="部位" min-width="120" />
      <el-table-column label="计划" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.unplanned_flag === 1" type="warning" size="small">未挂计划</el-tag>
          <span v-else>{{ planNo(row.plan_id) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="当前状态" width="110">
        <template #default="{ row }">
          <el-tag :type="taskStatusTagType(row.status)" size="small">
            {{ TASK_STATUS[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="归档" width="90">
        <template #default="{ row }">
          {{ { 0: '未归档', 1: '归档中', 2: '已归档', 3: '退回' }[row.archive_status] }}
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
        <template v-if="specialMode">
          <el-form-item label="验收计划" required>
            <el-select
              v-model="createForm.plan_id"
              filterable
              placeholder="请选择专项验收计划"
              style="width: 100%"
            >
              <el-option
                v-for="p in planOptions"
                :key="p.id"
                :label="`${p.plan_no} ${p.plan_name}`"
                :value="p.id"
              >
                <span>{{ p.plan_no }} {{ p.plan_name }}</span>
                <span class="opt-sub">{{ PLAN_TYPE[p.plan_type] || '专项' }} · {{ p.plan_date }}</span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="专项类型" required>
            <el-select
              v-model="createForm.special_type"
              filterable
              placeholder="如：消防验收"
              style="width: 100%"
            >
              <el-option
                v-for="t in SPECIAL_ACCEPT_TYPES"
                :key="t.code"
                :label="t.label"
                :value="t.code"
              />
            </el-select>
            <p v-if="selectedSpecialMeta" class="node-tip">
              填报时须上传：{{ selectedSpecialMeta.requiredDocs.map((d) => d.label).join('、') }}
            </p>
          </el-form-item>
          <el-form-item label="验收部位">
            <el-input v-model="createForm.location_name" placeholder="选填，如 T2航站楼全区域" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="验评节点" required>
            <el-tree-select
              v-model="createForm.wbs_node_id"
              :data="wbsTreeOptions"
              node-key="id"
              :props="{ label: 'label', children: 'children', value: 'id', disabled: 'disabled' }"
              check-strictly
              filterable
              default-expand-all
              clearable
              placeholder="从验评目录树选择节点"
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
            <p
              v-if="selectedNodeUnlock && !selectedNodeUnlock.ok"
              class="node-warn"
            >
              {{ selectedNodeUnlock.msg }}
            </p>
            <p v-else-if="selectedNodeUnlock?.ok" class="node-ok">下级已满足发起条件，可创建验评任务</p>
            <p class="node-tip">
              {{
                unitLevelOnly
                  ? '仅可选单位工程；须下级全通过后方可创建'
                  : allowAllNodes
                    ? '支持目录树全部节点发起验评；非叶子节点须下级全部通过后方可创建'
                    : '灰色节点不可选；请选择本任务适用类型（如检验批）'
              }}
            </p>
          </el-form-item>
          <el-form-item label="验收计划">
            <el-select v-model="createForm.plan_id" clearable placeholder="选填；空=不挂计划" style="width: 100%">
              <el-option
                v-for="p in planOptions"
                :key="p.id"
                :label="`${p.plan_no} ${p.plan_name}`"
                :value="p.id"
              />
            </el-select>
          </el-form-item>
        </template>
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
.node-hint { margin: 6px 0 0; font-size: 12px; color: #409eff; }
.node-ok { margin: 4px 0 0; font-size: 12px; color: #67c23a; }
.node-warn { margin: 4px 0 0; font-size: 12px; color: #e6a23c; line-height: 1.5; }
.node-tip { margin: 4px 0 0; font-size: 12px; color: #909399; line-height: 1.5; }
.opt-sub { float: right; color: #909399; font-size: 12px; margin-left: 12px; }
</style>
