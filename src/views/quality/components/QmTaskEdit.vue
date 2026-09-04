<script setup>
import { computed, defineAsyncComponent, nextTick, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Clock } from '@element-plus/icons-vue'
import QmCompletePrereqPanel from './QmCompletePrereqPanel.vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  addAttachment,
  approvalRecords,
  APPROVER_ROLES,
  buildCompleteGate,
  checkUnlock,
  createSpecialTask,
  createTask,
  ensureTaskItems,
  FILE_CATEGORY,
  findTask,
  getApprovalChain,
  getAttachments,
  getCurrentManualNode,
  getTaskMaterialLinks,
  getTaskSampleLinks,
  getTaskAsbuiltLinks,
  defaultManualLevelLabel,
  QM_APPROVER_CANDIDATES,
  removeAttachment,
  resolveApproverName,
  resolveProjectName,
  ORG_LABEL,
  saveTaskDraft,
  SPECIAL_ACCEPT_TYPES,
  specialTypeLabel,
  submitInspect,
  TASK_TYPE_LABEL,
  taskMaterialLinks,
  taskSampleLinks,
  taskAsbuiltLinks,
  validateManualApprovalFlow,
  wbsNodes,
  ELEC_ARCHIVE_STATUS,
  listNodeArchiveDocs,
  candidatesByRole,
  refreshTaskElecArchiveStatus,
} from '../../../mock/qm.js'
import { listAsbuiltForInspectLink } from '../../../mock/asbuilt.js'
import { listSelectableForInspect } from '../../../mock/mat.js'
import { listSelectableForInspect as listSampleForInspect } from '../../../mock/sample.js'
import ConstructionLocationSelect from '../../../components/ConstructionLocationSelect.vue'

/** 档案面板较大，异步加载，避免拖慢新建首屏 */
const QmArchivePanel = defineAsyncComponent(() => import('./QmArchivePanel.vue'))

const props = defineProps({
  title: { type: String, default: '验评填报' },
  listPath: { type: String, required: true },
  /** 指定任务 ID（优先于路由 query） */
  taskId: { type: String, default: '' },
  /** 嵌入父页：去掉返回列表与外层重复标题 */
  embedded: { type: Boolean, default: false },
  /** 嵌入时由父页展示前置情况，本组件不再重复 */
  hidePrereq: { type: Boolean, default: false },
})

const route = useRoute()
const router = useRouter()
const { scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const task = ref(null)
const items = ref([])
const activeTpl = ref('')
const formDataLocal = ref({})
/** 触发现场资料列表刷新 */
const siteAttTick = ref(0)
/** 触发③材料/定样关联区块刷新 */
const linkTick = ref(0)
/** 填报三步向导当前步（0 系统数据 / 1 档案 / 2 审批流程确认） */
const activeStep = ref(0)
/** 详情页已取消切页栏，保留变量兼容旧逻辑 */
const detailTab = ref('system')
/** 档案面板：list 列表 / fill 表格填写（填写页隐藏向导按钮） */
const archiveViewMode = ref('list')
let lastLoadedId = ''
/** 新建草稿改路由时禁止 load 把向导步骤打回 0 */
let suppressWizardStepReset = false
/** 新建/填报第一步：任务名称、验收节点 */
const headerMeta = reactive({
  task_name: '',
  wbs_node_id: '',
  location_name: '',
  is_hidden_work: 0,
  remark: '',
})
/** 本系统流程配置（级别 / 岗位 / 审批人 / 是否签章 / 抄送人） */
const manualFlow = ref([])
const roleOptions = APPROVER_ROLES.map((r) => ({
  value: r.key,
  label: r.label,
  group: r.groupLabel,
}))
const roleGroups = (() => {
  const map = new Map()
  for (const opt of roleOptions) {
    if (!map.has(opt.group)) map.set(opt.group, [])
    map.get(opt.group).push(opt)
  }
  return [...map.entries()].map(([label, options]) => ({ label, options }))
})()
const personOptions = QM_APPROVER_CANDIDATES.map((u) => ({
  value: u.id,
  label: `${u.name}（${u.org || u.role}）`,
  role: u.role,
}))

function createEmptyFlowLevel(level = 1) {
  return {
    id: `maf-${Date.now()}-${level}-${Math.random().toString(36).slice(2, 6)}`,
    level,
    label: defaultManualLevelLabel(level),
    role: '',
    approver_ids: [],
    need_seal: 0,
    cc_ids: [],
    mode: 'countersign',
  }
}

function normalizeFlowRow(row, idx) {
  const level = Number(row.level) || idx + 1
  return {
    id: row.id || `maf-${Date.now()}-${level}`,
    level,
    label: row.label || defaultManualLevelLabel(level),
    role: row.role || '',
    approver_ids: Array.isArray(row.approver_ids) ? [...row.approver_ids] : [],
    need_seal: Number(row.need_seal) === 1 ? 1 : 0,
    cc_ids: Array.isArray(row.cc_ids) ? [...row.cc_ids] : [],
    mode: row.mode === 'orsign' ? 'orsign' : 'countersign',
  }
}

function syncManualFlowFromTask() {
  const flow = task.value?.manual_approval_flow
  if (Array.isArray(flow) && flow.length) {
    manualFlow.value = flow.map((row, idx) => normalizeFlowRow(row, idx))
  } else {
    manualFlow.value = [createEmptyFlowLevel(1)]
  }
}

function renumberManualFlow() {
  manualFlow.value = manualFlow.value.map((row, idx) => ({
    ...row,
    level: idx + 1,
    label: defaultManualLevelLabel(idx + 1),
  }))
}

function addManualFlowLevel() {
  const level = manualFlow.value.length + 1
  manualFlow.value.push(createEmptyFlowLevel(level))
}

function removeManualFlowLevel(idx) {
  if (manualFlow.value.length <= 1) {
    ElMessage.warning('至少保留一级审批')
    return
  }
  manualFlow.value.splice(idx, 1)
  renumberManualFlow()
}

function approverOptionsForRow(row) {
  if (!row?.role) return []
  return personOptions.filter((p) => p.role === row.role)
}

function onFlowRoleChange(row) {
  row.approver_ids = []
}

/** 新建自动生成草稿中，避免重复创建 */
const creatingDraft = ref(false)

const isCreateMode = computed(
  () => String(route.query.create) === '1' && !route.query.id && !props.taskId,
)
const isSpecialCreate = computed(
  () => isCreateMode.value && String(route.query.mode || '') === 'special',
)
/** 专项上下文：新建专项，或草稿/任务本身为专项类型 */
const isSpecialContext = computed(() => {
  if (isSpecialCreate.value) return true
  if (task.value && Number(task.value.task_type) === 6) return true
  return String(props.listPath || '').includes('special')
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

/** 验收节点树：浅层缓存 + 纯对象，避免每次选中触发深拷贝/响应式穿透 */
const wbsTreeOptions = shallowRef([])
/** 默认展开到单位工程层级：展开竣工/实体（或专项）容器，露出单位工程/专项节点 */
const wbsDefaultExpandedKeys = shallowRef([])

function collectExpandToUnitLevel(nodes, expandTypes, acc = []) {
  for (const n of nodes || []) {
    if (expandTypes.includes(Number(n.node_type))) acc.push(n.id)
    if (n.children?.length) collectExpandToUnitLevel(n.children, expandTypes, acc)
  }
  return acc
}

function rebuildWbsTreeOptions() {
  // 发起验收已改走列表弹窗；填报页头信息只读，不再构建整棵验评树（避免进页卡顿）
  wbsTreeOptions.value = []
  wbsDefaultExpandedKeys.value = []
}

watch(
  () => [
    isCreateMode.value,
    isSpecialContext.value,
    scopeProjectId.value,
    task.value?.id,
    task.value?.status,
    task.value?.is_draft,
    task.value?.project_id,
  ],
  () => rebuildWbsTreeOptions(),
)

const wbsTreeSelectKey = computed(
  () =>
    `wbs-${task.value?.project_id || scopeProjectId.value || ''}-${isSpecialContext.value ? 's' : 'e'}`,
)

const selectedNodeLabel = computed(() => {
  const n = wbsNodes.find((x) => x.id === headerMeta.wbs_node_id)
  if (!n) return ''
  const typeExtra =
    n.node_type === 7 && n.special_type ? ` · ${specialTypeLabel(n.special_type)}` : ''
  return `${n.node_name}${n.location_code ? `（${n.location_code}）` : ''}${typeExtra}`
})

const selectedNodeUnlock = computed(() => {
  if (!headerMeta.wbs_node_id) return null
  const n = wbsNodes.find((x) => x.id === headerMeta.wbs_node_id)
  if (!n) return null
  return checkUnlock(n)
})

const selectedSpecialMeta = computed(() => {
  const n = wbsNodes.find((x) => x.id === headerMeta.wbs_node_id)
  if (!n?.special_type) return null
  return SPECIAL_ACCEPT_TYPES.find((t) => t.code === n.special_type) || null
})

/** 新建页解锁规则提示（实体/专项分类节点均不可选） */
const createUnlockTip = computed(() => {
  if (isSpecialContext.value) {
    return '请选择消防、人防等专项节点发起验收；「专项验收」仅为分类，不可发起。专项节点可直接发起'
  }
  return '请选择单位工程及以下节点发起验收；「实体工程验收」仅为分类，不可发起。下级节点全部通过后，上级节点方可发起（检验批可直接发起）'
})

/** 填报页审批人配置（对齐品牌报审：监理 + 项目经理）
 * 须在 load / immediate watch 之前声明，否则 syncApproverFormFromTask 会触发 TDZ 导致整页白屏 */
const approverForm = reactive({
  supervisor_approver_user_id: '',
  supervisor_approver_name: '',
  pm_approver_user_id: '',
  pm_approver_name: '',
})
const supervisorCandidates = computed(() => candidatesByRole('jl_pro') || [])
const pmCandidates = computed(() => candidatesByRole('js_pm') || [])

function formatQmApproverLabel(u) {
  if (!u) return ''
  return `${u.name}${u.org ? `（${u.org}）` : ''}`
}

function syncApproverFormFromTask() {
  const t = task.value
  if (!t) {
    approverForm.supervisor_approver_user_id = ''
    approverForm.supervisor_approver_name = ''
    approverForm.pm_approver_user_id = ''
    approverForm.pm_approver_name = ''
    return
  }
  approverForm.supervisor_approver_user_id = t.supervisor_approver_user_id || ''
  approverForm.supervisor_approver_name = t.supervisor_approver_name || ''
  approverForm.pm_approver_user_id = t.pm_approver_user_id || ''
  approverForm.pm_approver_name = t.pm_approver_name || ''
  // 无历史选择时默认带出各岗位首个候选人，便于演示
  if (!approverForm.supervisor_approver_user_id && supervisorCandidates.value[0]) {
    const u = supervisorCandidates.value[0]
    approverForm.supervisor_approver_user_id = u.id
    approverForm.supervisor_approver_name = u.name
  }
  if (!approverForm.pm_approver_user_id && pmCandidates.value[0]) {
    const u = pmCandidates.value[0]
    approverForm.pm_approver_user_id = u.id
    approverForm.pm_approver_name = u.name
  }
}

function onApproverChange(role) {
  if (role === 'supervisor') {
    const u = supervisorCandidates.value.find((x) => x.id === approverForm.supervisor_approver_user_id)
    approverForm.supervisor_approver_name = u?.name || ''
  } else {
    const u = pmCandidates.value.find((x) => x.id === approverForm.pm_approver_user_id)
    approverForm.pm_approver_name = u?.name || ''
  }
}

function collectApproverPatch() {
  return {
    supervisor_approver_user_id: approverForm.supervisor_approver_user_id,
    supervisor_approver_name: approverForm.supervisor_approver_name,
    pm_approver_user_id: approverForm.pm_approver_user_id,
    pm_approver_name: approverForm.pm_approver_name,
  }
}

function load(forcedId) {
  // watch 回调首参是监听源的新值，不能当作任务 id；仅显式传入字符串时才使用
  const raw =
    (typeof forcedId === 'string' && forcedId) || props.taskId || route.query.id || ''
  const id = Array.isArray(raw) ? raw[0] : raw
  if (id !== lastLoadedId) {
    lastLoadedId = id || (isCreateMode.value ? '__create__' : '')
    if (!suppressWizardStepReset) {
      activeStep.value = 0
    }
    detailTab.value = 'system'
  }
  if (!id) {
    task.value = null
    if (isCreateMode.value) {
      headerMeta.task_name = ''
      headerMeta.wbs_node_id = ''
      headerMeta.location_name = ''
      headerMeta.is_hidden_work = 0
      headerMeta.remark = ''
      manualFlow.value = [createEmptyFlowLevel(1)]
    }
    return
  }
  const found = findTask(id)
  if (!found) {
    task.value = null
    return
  }
  task.value = found
  ensureTaskItems(task.value)
  items.value = []
  formDataLocal.value = JSON.parse(JSON.stringify(task.value.form_data || {}))
  syncManualFlowFromTask()
  syncApproverFormFromTask()
  activeTpl.value = task.value.form_template_id || ''
  if (activeTpl.value && !formDataLocal.value[activeTpl.value]) {
    formDataLocal.value[activeTpl.value] = {}
  }
  headerMeta.task_name = task.value.task_name || ''
  headerMeta.wbs_node_id = task.value.wbs_node_id || ''
  headerMeta.location_name = task.value.location_name || ''
  headerMeta.is_hidden_work = Number(task.value.is_hidden_work) === 1 ? 1 : 0
  headerMeta.remark = task.value.remark || ''
}

function formatFirstPass(flag) {
  if (flag == null || flag === '') return ''
  return Number(flag) === 1 ? '是' : '否'
}

watch(
  () => [props.taskId, route.query.id, route.query.create, route.query.mode],
  () => load(),
  { immediate: true },
)

watch(activeTpl, (id) => {
  if (!id) return
  if (!formDataLocal.value[id]) formDataLocal.value[id] = {}
})

/**
 * 新建模式下创建草稿任务（同一页继续填影像/材料，不跳步）
 * @param {{ quiet?: boolean }} [opts] quiet 仅抑制成功提示，校验失败仍提示
 */
function ensureTaskCreated(opts = {}) {
  const quiet = !!opts.quiet
  if (task.value) return { ok: true }
  if (creatingDraft.value) return { ok: false }
  if (!headerMeta.task_name.trim()) {
    ElMessage.warning('请填写任务名称')
    return { ok: false }
  }
  if (!headerMeta.wbs_node_id) {
    ElMessage.warning(isSpecialCreate.value ? '请选择验收节点（专项）' : '请选择验收节点')
    return { ok: false }
  }
  const node = wbsNodes.find((n) => n.id === headerMeta.wbs_node_id)
  if (!node) {
    ElMessage.error('节点不存在')
    return { ok: false }
  }
  const unlock = checkUnlock(node)
  if (!unlock.ok) {
    ElMessage.warning(unlock.msg)
    return { ok: false }
  }

  creatingDraft.value = true
  let r
  try {
    if (isSpecialCreate.value) {
      if (Number(node.node_type) !== 7) {
        ElMessage.warning('请选择专项节点（消防/人防等）；「专项验收」仅为分类不可选')
        return { ok: false }
      }
      r = createSpecialTask({
        project_id: scopeProjectId.value || node.project_id,
        wbs_node_id: headerMeta.wbs_node_id,
        task_name: headerMeta.task_name.trim(),
        location_name: headerMeta.location_name,
        remark: headerMeta.remark,
      })
    } else {
      r = createTask({
        project_id: node.project_id || scopeProjectId.value,
        wbs_node_id: headerMeta.wbs_node_id,
        task_name: headerMeta.task_name.trim(),
        location_name: headerMeta.location_name,
        is_hidden_work: headerMeta.is_hidden_work,
        remark: headerMeta.remark,
      })
    }
  } finally {
    creatingDraft.value = false
  }
  if (!r?.ok) {
    ElMessage.error(r?.msg || '创建失败')
    return { ok: false }
  }
  // 改路由前占位，并禁止 load 重置向导步骤
  suppressWizardStepReset = true
  const keptHeader = {
    task_name: headerMeta.task_name,
    wbs_node_id: headerMeta.wbs_node_id,
    location_name: headerMeta.location_name,
    is_hidden_work: headerMeta.is_hidden_work,
    remark: headerMeta.remark,
  }
  lastLoadedId = r.task.id
  task.value = r.task
  ensureTaskItems(task.value)
  items.value = []
  formDataLocal.value = JSON.parse(JSON.stringify(task.value.form_data || {}))
  syncApproverFormFromTask()
  activeTpl.value = task.value.form_template_id || ''
  headerMeta.task_name = keptHeader.task_name
  headerMeta.wbs_node_id = keptHeader.wbs_node_id
  headerMeta.location_name = keptHeader.location_name
  headerMeta.is_hidden_work = keptHeader.is_hidden_work
  headerMeta.remark = keptHeader.remark
  router.replace({ path: route.path, query: { id: r.task.id } })
  nextTick(() => {
    suppressWizardStepReset = false
  })
  if (!quiet) {
    ElMessage.success(`已生成草稿 ${r.task.task_no}`)
  }
  return { ok: true, task: r.task, justCreated: true }
}

/** 新建选节点时带出节点上的隐蔽工程标记，仍可改 */
watch(
  () => headerMeta.wbs_node_id,
  (id) => {
    if (!isCreateMode.value || task.value || !id) return
    const n = wbsNodes.find((x) => x.id === id)
    if (!n) return
    headerMeta.is_hidden_work = Number(n.is_hidden_work) === 1 ? 1 : 0
  },
)

/** 专项验收不展示隐蔽工程选项 */
const showHiddenWorkOption = computed(
  () => !isSpecialContext.value && (!task.value || Number(task.value.task_type) !== 6),
)

const nodeName = computed(() => {
  if (!task.value?.wbs_node_id) {
    return task.value?.special_type ? specialTypeLabel(task.value.special_type) : '—'
  }
  return wbsNodes.find((n) => n.id === task.value?.wbs_node_id)?.node_name || '—'
})

const records = computed(() =>
  task.value ? approvalRecords.filter((r) => r.task_id === task.value.id) : [],
)

/** 待提交可填报（V2 无草稿）；须在 flowSteps 之前声明 */
const canEdit = computed(() => {
  if (!task.value) return false
  return Number(task.value.status) === 0
})

/** 按验收类型的默认审批流程：施工报验 → 审批链 → 办结 */
const flowSteps = computed(() => {
  if (!task.value) return []
  let chain = []
  if (canEdit.value) {
    chain = [
      approverForm.supervisor_approver_name
        ? `监理单位审批（${approverForm.supervisor_approver_name}）`
        : '监理单位审批',
      approverForm.pm_approver_name
        ? `项目经理审批（${approverForm.pm_approver_name}）`
        : '项目经理审批',
    ]
  } else if (Array.isArray(task.value.manual_approval_flow) && task.value.manual_approval_flow.length) {
    chain = [...task.value.manual_approval_flow]
      .sort((a, b) => Number(a.level) - Number(b.level))
      .map((n) => {
        const who = (n.approver_names && n.approver_names[0]) || ''
        return who ? `${n.label}（${who}）` : n.label
      })
  } else {
    chain = getApprovalChain(task.value)
  }
  const typeLabel = TASK_TYPE_LABEL[task.value.task_type] || '验评'
  return [
    { title: '施工报验', desc: '自检提交' },
    ...chain.map((role) => ({ title: role, desc: '审核签章' })),
    { title: '办结通过', desc: typeLabel },
  ]
})

const flowTip = computed(() => {
  if (!task.value) return ''
  const typeLabel = TASK_TYPE_LABEL[task.value.task_type] || '验评'
  const titles = flowSteps.value.map((s) => s.title)
  if (titles.length <= 2) {
    return `${typeLabel}：请配置审批人后再提交`
  }
  return `${typeLabel}审批流程：${titles.join(' → ')}`
})

const QM_APPROVAL_ACTION_LABEL = { 1: '提交', 2: '通过', 3: '不通过' }

function qmApprovalActionTagType(action) {
  const a = Number(action)
  if (a === 1 || a === 2) return 'success'
  if (a === 3) return 'danger'
  return 'warning'
}

function qmTimelineType(status) {
  if (status === 'done') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'current') return 'warning'
  return 'info'
}

/** 详情「审批过程」步骤条（样式对齐品牌报审） */
const approvalProcessSteps = computed(() => {
  if (!task.value) return []
  const t = task.value
  const status = Number(t.status)
  const recs = records.value
  const typeLabel = TASK_TYPE_LABEL[t.task_type] || '验评'

  let midNodes = []
  if (Array.isArray(t.manual_approval_flow) && t.manual_approval_flow.length) {
    midNodes = [...t.manual_approval_flow]
      .sort((a, b) => Number(a.level) - Number(b.level))
      .map((n) => {
        const who = (n.approver_names && n.approver_names[0]) || ''
        return {
          label: n.label || '审批',
          title: who ? `${n.label}（${who}）` : n.label || '审批',
        }
      })
  } else if (t.supervisor_approver_name || t.pm_approver_name || status === 0) {
    midNodes = [
      {
        label: '监理单位审批',
        title: t.supervisor_approver_name
          ? `监理单位审批（${t.supervisor_approver_name}）`
          : '监理单位审批',
      },
      {
        label: '项目经理审批',
        title: t.pm_approver_name ? `项目经理审批（${t.pm_approver_name}）` : '项目经理审批',
      },
    ]
  } else {
    midNodes = getApprovalChain(t).map((label) => ({ label, title: label }))
  }

  const currentNode = status === 1 ? getCurrentManualNode(t) : null
  const currentLabel = currentNode?.label || ''

  function midStep(node) {
    const rejectRec = [...recs]
      .reverse()
      .find(
        (r) =>
          Number(r.action) === 3 &&
          (r.node_name === node.label || r.operator_role === node.label),
      )
    if (rejectRec) {
      return { status: 'error', desc: rejectRec.action_time || '已驳回' }
    }
    const passRec = [...recs]
      .reverse()
      .find(
        (r) =>
          Number(r.action) === 2 &&
          (r.node_name === node.label || r.operator_role === node.label),
      )
    if (passRec) {
      return { status: 'success', desc: passRec.action_time || '已通过' }
    }
    if (status === 2) {
      return { status: 'success', desc: '已通过' }
    }
    if (status === 1 && currentLabel === node.label) {
      return { status: 'process', desc: '审批中' }
    }
    return { status: 'wait', desc: '等待' }
  }

  return [
    {
      title: '施工报验',
      ...(status === 0
        ? { status: 'wait', desc: '待提交' }
        : { status: 'success', desc: t.submit_time || '已提交' }),
    },
    ...midNodes.map((n) => ({ title: n.title, ...midStep(n) })),
    {
      title: '办结通过',
      ...(status === 2
        ? { status: 'success', desc: t.finish_time || typeLabel }
        : status === 3
          ? { status: 'error', desc: '未通过' }
          : { status: 'wait', desc: '等待' }),
    },
  ]
})

/** 详情「审批过程」时间线（卡片样式对齐品牌报审） */
const approvalTimeline = computed(() => {
  if (!task.value) return []
  const t = task.value
  const steps = []
  for (const r of records.value) {
    const action = Number(r.action)
    const who =
      resolveApproverName(r.operator_id) ||
      r.operator_role ||
      '—'
    steps.push({
      key: r.id,
      title: r.node_name || r.operator_role || '节点',
      action,
      actionLabel: QM_APPROVAL_ACTION_LABEL[action] || '办理',
      operator: who,
      time: r.action_time || '—',
      remark: r.opinion || '',
      status: action === 3 ? 'rejected' : 'done',
    })
  }
  if (Number(t.status) === 1) {
    const node = getCurrentManualNode(t)
    if (node) {
      const who = (node.approver_names && node.approver_names[0]) || '审批人'
      steps.push({
        key: `pending-${node.level || node.label}`,
        title: node.label || '待审批',
        action: '',
        actionLabel: '待办理',
        operator: who,
        time: '',
        remark: '等待审批（个人中心待办）',
        status: 'current',
      })
    }
  }
  return steps
})

/** 填报页与详情均展示本系统数据（已去掉「系统信息」切页栏） */
const showSystemContent = computed(() => true)

/** 档案嵌入向导已废止；详情不再嵌档案面板 */
const showArchiveContent = computed(() => false)

/** 本系统内不配多级审批链（填报页用品牌式双审批人） */
const showManualFlowConfig = computed(() => false)

const elecArchiveDocs = computed(() => {
  if (!task.value?.wbs_node_id || Number(task.value.need_archive) !== 1) return []
  return listNodeArchiveDocs(task.value.wbs_node_id)
})

/** 任务信息回显：项目名称（系统当前项目 / 任务所属项目） */
const displayProjectName = computed(() => {
  if (task.value?.project_id) return resolveProjectName(task.value.project_id)
  const node = wbsNodes.find((n) => n.id === headerMeta.wbs_node_id)
  if (node?.project_id) return resolveProjectName(node.project_id)
  return scopeProjectLabel.value || resolveProjectName(scopeProjectId.value) || '—'
})

/** 任务信息回显：施工单位（任务 contractor_org / 新建默认施工单位） */
const DEFAULT_CONTRACTOR_ORG_ID = 'org-sg-01'
const displayContractorName = computed(() => {
  const orgId = task.value?.contractor_org_id || DEFAULT_CONTRACTOR_ORG_ID
  return ORG_LABEL[orgId] || orgId || '—'
})

const displayApplicantName = computed(() => {
  const id = task.value?.applicant_id || task.value?.created_by || ''
  if (!id) return '—'
  return resolveApproverName(id) || id
})

const isCompleteTask = computed(() => Number(task.value?.task_type) === 7)

/** 竣工填报页顶部：实体/专项完成情况 */
const completeGate = computed(() => {
  if (props.hidePrereq) return null
  if (!task.value || Number(task.value.task_type) !== 7) return null
  return buildCompleteGate(task.value.project_id)
})

/** 任务级现场资料 */
const taskSiteAttachments = computed(() => {
  void siteAttTick.value
  if (!task.value) return []
  return getAttachments('TASK', task.value.id)
})

const siteMediaList = computed(() =>
  taskSiteAttachments.value.filter((a) => [1, 2].includes(Number(a.file_category))),
)

const siteMaterialList = computed(() =>
  taskSiteAttachments.value.filter((a) => ![1, 2].includes(Number(a.file_category)) && !a.doc_slot),
)

function formatFileSize(size) {
  const n = Number(size) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function isVideoExt(ext) {
  return ['mp4', 'mov', 'avi', 'wmv', 'webm'].includes(String(ext || '').toLowerCase())
}

function extFromFileName(name = '') {
  const i = String(name).lastIndexOf('.')
  return i >= 0 ? String(name).slice(i + 1).toLowerCase() : ''
}

/** 调起系统文件选择对话框（可浏览文件夹选文件） */
function pickLocalFiles({ accept = '', multiple = true } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.style.display = 'none'
    const finish = (files) => {
      input.remove()
      resolve(files)
    }
    input.addEventListener('change', () => {
      finish(Array.from(input.files || []))
    })
    input.addEventListener('cancel', () => finish([]))
    document.body.appendChild(input)
    input.click()
  })
}

async function onAddSiteMedia(kind) {
  if (!task.value) {
    const created = ensureTaskCreated({ quiet: true })
    if (!created.ok) return
  }
  if (!task.value) return
  const isVideo = kind === 'video'
  const files = await pickLocalFiles({
    accept: isVideo
      ? 'video/*,.mp4,.mov,.avi,.wmv,.webm'
      : 'image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp',
    multiple: true,
  })
  if (!files.length) return

  let okCount = 0
  for (const file of files) {
    const file_ext = extFromFileName(file.name) || (isVideo ? 'mp4' : 'jpg')
    const r = addAttachment({
      biz_type: 'TASK',
      biz_id: task.value.id,
      task_id: task.value.id,
      file_category: isVideo ? 2 : 1,
      file_name: file.name,
      file_ext,
      file_size: file.size || 0,
      mime_type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
      shoot_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      shoot_location: task.value.location_name || headerMeta.location_name || '',
    })
    if (!r.ok) {
      ElMessage.error(r.msg)
      continue
    }
    okCount += 1
  }
  if (!okCount) return
  siteAttTick.value += 1
  ElMessage.success(
    isVideo ? `已上传 ${okCount} 个现场短视频` : `已上传 ${okCount} 张工程影像`,
  )
}

async function onAddSiteMaterial() {
  if (!task.value) {
    const created = ensureTaskCreated({ quiet: true })
    if (!created.ok) return
  }
  if (!task.value) return
  const files = await pickLocalFiles({
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.jpg,.jpeg,.png',
    multiple: true,
  })
  if (!files.length) return

  let okCount = 0
  for (const file of files) {
    const file_ext = extFromFileName(file.name) || 'bin'
    const r = addAttachment({
      biz_type: 'TASK',
      biz_id: task.value.id,
      task_id: task.value.id,
      file_category: 3,
      file_name: file.name,
      file_ext,
      file_size: file.size || 0,
      mime_type: file.type || 'application/octet-stream',
    })
    if (!r.ok) {
      ElMessage.error(r.msg)
      continue
    }
    okCount += 1
  }
  if (!okCount) return
  siteAttTick.value += 1
  ElMessage.success(`已上传 ${okCount} 份附件资料`)
}

function onRemoveSiteAtt(row) {
  const r = removeAttachment(row.id)
  if (!r.ok) return ElMessage.error(r.msg)
  siteAttTick.value += 1
  ElMessage.success('已删除')
}

/** ③材料/定版定样关联（可选区块） */
const materialLinks = computed(() => {
  void linkTick.value
  return task.value ? getTaskMaterialLinks(task.value.id) : []
})
const sampleLinks = computed(() => {
  void linkTick.value
  return task.value ? getTaskSampleLinks(task.value.id) : []
})
const asbuiltLinks = computed(() => {
  void linkTick.value
  return task.value ? getTaskAsbuiltLinks(task.value.id) : []
})

const asbuiltPickVisible = ref(false)
const asbuiltPickRows = computed(() => {
  if (!task.value) return []
  const projectId = task.value.project_id || scopeProjectId.value
  const linked = new Set(asbuiltLinks.value.map((l) => l.acceptance_id))
  return listAsbuiltForInspectLink(projectId, {
    wbsNodeId: task.value.wbs_node_id || '',
  }).filter((r) => !linked.has(r.acceptance_id))
})

/** 关联材料设备弹窗 */
const matPickVisible = ref(false)
const matPickKeyword = ref('')
const matPickLocationId = ref('')
const matPickLocationIds = ref([])
const matPickUsePart = ref('')
const matPickSelection = ref([])

const matPickRows = computed(() => {
  if (!task.value) return []
  const projectId = task.value.project_id || scopeProjectId.value
  const linked = new Set(materialLinks.value.map((l) => l.material_id))
  const opts = {
    keyword: matPickKeyword.value,
    usePart: matPickUsePart.value,
    locationId: matPickLocationId.value,
  }
  return listSelectableForInspect(projectId, opts).filter((r) => !linked.has(r.material_id))
})

/** 关联定版定样弹窗 */
const samplePickVisible = ref(false)
const samplePickKeyword = ref('')
const samplePickLocationId = ref('')
const samplePickLocationIds = ref([])
const samplePickUsePart = ref('')
const samplePickSelection = ref([])

const samplePickRows = computed(() => {
  if (!task.value) return []
  const projectId = task.value.project_id || scopeProjectId.value
  const linked = new Set(sampleLinks.value.map((l) => l.sample_id))
  return listSampleForInspect(projectId, {
    keyword: samplePickKeyword.value,
    usePart: samplePickUsePart.value,
    locationId: samplePickLocationId.value,
  }).filter((r) => !linked.has(r.sample_id))
})

function onLinkMaterial() {
  if (!task.value) {
    const created = ensureTaskCreated({ quiet: true })
    if (!created.ok) return
  }
  if (!task.value) return
  matPickKeyword.value = ''
  matPickLocationId.value = ''
  matPickLocationIds.value = []
  matPickUsePart.value = ''
  matPickSelection.value = []
  matPickVisible.value = true
}

function onConfirmMatPick() {
  if (!task.value) return
  const rows = matPickSelection.value || []
  if (!rows.length) return ElMessage.warning('请勾选至少一条材料/设备')
  const linked = new Set(materialLinks.value.map((l) => l.material_id))
  let n = 0
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  rows.forEach((row) => {
    if (!row?.material_id || linked.has(row.material_id)) return
    taskMaterialLinks.push({
      id: `tml-${Date.now()}-${n}`,
      task_id: task.value.id,
      material_id: row.material_id,
      material_name: row.material_name,
      batch_no: row.batch_no || '',
      supplier: row.supplier || '',
      brand_name: row.brand_name || '',
      quantity_text: row.quantity_text || '',
      use_part: row.use_part || '',
      source_label: row.source_label || '',
      link_time: now,
    })
    linked.add(row.material_id)
    n += 1
  })
  if (!n) return ElMessage.warning('所选记录均已关联')
  linkTick.value += 1
  matPickVisible.value = false
  ElMessage.success(`已关联 ${n} 条材料/设备`)
}

function onUnlinkMaterial(row) {
  const idx = taskMaterialLinks.findIndex((l) => l.id === row.id)
  if (idx >= 0) taskMaterialLinks.splice(idx, 1)
  linkTick.value += 1
  ElMessage.success('已解除关联')
}

function onLinkSample() {
  if (!task.value) {
    const created = ensureTaskCreated({ quiet: true })
    if (!created.ok) return
  }
  if (!task.value) return
  samplePickKeyword.value = ''
  samplePickLocationId.value = ''
  samplePickLocationIds.value = []
  samplePickUsePart.value = ''
  samplePickSelection.value = []
  samplePickVisible.value = true
}

function onConfirmSamplePick() {
  if (!task.value) return
  const rows = samplePickSelection.value || []
  if (!rows.length) return ElMessage.warning('请勾选至少一条定版定样')
  const linked = new Set(sampleLinks.value.map((l) => l.sample_id))
  let n = 0
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  rows.forEach((row) => {
    if (!row?.sample_id || linked.has(row.sample_id)) return
    taskSampleLinks.push({
      id: `tsl-${Date.now()}-${n}`,
      task_id: task.value.id,
      sample_id: row.sample_id,
      sample_name: row.sample_name,
      sample_category: row.sample_category || '',
      brand_name: row.brand_name || '',
      use_part: row.use_part || '',
      link_time: now,
    })
    linked.add(row.sample_id)
    n += 1
  })
  if (!n) return ElMessage.warning('所选记录均已关联')
  linkTick.value += 1
  samplePickVisible.value = false
  ElMessage.success(`已关联 ${n} 条定版定样`)
}

function onUnlinkSample(row) {
  const idx = taskSampleLinks.findIndex((l) => l.id === row.id)
  if (idx >= 0) taskSampleLinks.splice(idx, 1)
  linkTick.value += 1
  ElMessage.success('已解除关联')
}

function onOpenAsbuiltPick() {
  if (!task.value) {
    const created = ensureTaskCreated({ quiet: true })
    if (!created.ok) return
  }
  if (!task.value) return
  if (!asbuiltPickRows.value.length) {
    return ElMessage.warning('暂无可关联的已通过实模一致验收单，请先在「实模一致验收」完成审批')
  }
  asbuiltPickVisible.value = true
}

function onPickAsbuilt(row) {
  if (!task.value || !row) return
  if (asbuiltLinks.value.some((l) => l.acceptance_id === row.acceptance_id)) {
    return ElMessage.warning('该验收单已关联')
  }
  taskAsbuiltLinks.push({
    id: `tal-${Date.now()}`,
    task_id: task.value.id,
    acceptance_id: row.acceptance_id,
    biz_no: row.biz_no,
    title: row.title,
    compare_url: row.compare_url,
    report_names: row.report_names,
    node_paths: row.node_paths || '',
    status: row.status,
    link_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
  })
  linkTick.value += 1
  asbuiltPickVisible.value = false
  ElMessage.success(`已关联实模一致验收「${row.biz_no}」`)
}

function onUnlinkAsbuilt(row) {
  const idx = taskAsbuiltLinks.findIndex((l) => l.id === row.id)
  if (idx >= 0) taskAsbuiltLinks.splice(idx, 1)
  linkTick.value += 1
  ElMessage.success('已解除关联')
}

function openAsbuiltCompare(url) {
  if (!url || url === '#') return ElMessage.info('演示环境无真实对比页')
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** 保存填报 */
function onSaveDraft() {
  if (!task.value) return ElMessage.warning('请从列表发起验收后再填报')
  // 任务名称/节点/部位/隐蔽工程以发起时为准，填报页不可改
  const r = saveTaskDraft(task.value, {
    task_name: task.value.task_name,
    remark: task.value.remark || '',
    location_name: task.value.location_name,
    is_hidden_work: task.value.is_hidden_work,
    wbs_node_id: task.value.wbs_node_id,
    form_data: formDataLocal.value,
    ...collectApproverPatch(),
  })
  if (!r.ok) return ElMessage.error(r.msg)
  refreshTaskElecArchiveStatus(task.value)
  ElMessage.success('已保存')
}

function onSubmit() {
  if (!task.value) return ElMessage.warning('请从列表发起验收后再填报')
  if (!approverForm.supervisor_approver_user_id) {
    return ElMessage.warning('请选择监理单位审批人')
  }
  if (!approverForm.pm_approver_user_id) {
    return ElMessage.warning('请选择项目经理审批人')
  }
  const draftSave = saveTaskDraft(task.value, {
    task_name: task.value.task_name,
    remark: task.value.remark || '',
    location_name: task.value.location_name,
    is_hidden_work: task.value.is_hidden_work,
    wbs_node_id: task.value.wbs_node_id,
    form_data: formDataLocal.value,
    ...collectApproverPatch(),
  })
  if (!draftSave.ok) return ElMessage.error(draftSave.msg)
  refreshTaskElecArchiveStatus(task.value)
  const r = submitInspect(task.value, collectApproverPatch())
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已提交报验；审批请在个人中心处理')
  if (props.embedded) {
    load()
    return
  }
  router.push(props.listPath)
}

function goWizardNext() {
  /* V2 无三步向导 */
}

function saveStepQuietly() {
  return { ok: true }
}
</script>

<template>
  <div v-if="!task && !isCreateMode" :class="embedded ? 'qm-embed' : 'qm-page page-card'">
    <el-empty description="未找到验评任务">
      <el-button v-if="!embedded" type="primary" @click="router.push(listPath)">返回列表</el-button>
    </el-empty>
  </div>
  <div v-else :class="embedded ? 'qm-embed' : 'qm-page page-card'">
    <div v-if="!embedded" class="edit-topbar">
      <div class="edit-topbar-left">
        <div class="page-breadcrumb">质量验评 / {{ title }}</div>
        <h1 class="page-title">
          <template v-if="task">{{ task.task_no }} · {{ TASK_TYPE_LABEL[task.task_type] }}</template>
          <template v-else>{{ isSpecialCreate ? '新建专项验收' : '新建实体工程验收' }}</template>
        </h1>
      </div>
      <div class="edit-topbar-center" />
      <div class="edit-topbar-right">
        <el-button size="small" @click="router.push(listPath)">返回列表</el-button>
      </div>
    </div>

    <div class="edit-body">
    <template v-if="completeGate && showSystemContent">
      <div class="section-title">前置完成情况</div>
      <QmCompletePrereqPanel :gate="completeGate" compact class="mb" />
    </template>

    <!-- 嵌入模式：步骤仍放在数据区上方 -->
    <el-steps
      v-if="false"
      :active="activeStep"
      align-center
      finish-status="success"
      class="mb wizard-steps"
    >
      <el-step title="填报系统数据" />
    </el-steps>

    <!-- 填报 / 详情：本系统数据 -->
    <template v-if="showSystemContent">
    <!-- 顶部：发起时已填字段，填报页只读展示（与详情字段口径一致，不含检查项） -->
    <template v-if="canEdit && !isCompleteTask">
      <div class="section-title">任务信息</div>
      <el-form label-width="110px" class="header-meta-form mb" @submit.prevent>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="验评单号">
              <span class="readonly-text">{{ task.task_no || '—' }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="验收类型">
              <span class="readonly-text">{{ TASK_TYPE_LABEL[task.task_type] || '—' }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目名称">
              <span class="readonly-text">{{ displayProjectName }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="施工单位名称">
              <span class="readonly-text">{{ displayContractorName }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="验收任务名称">
              <span class="readonly-text">{{ task.task_name || headerMeta.task_name || '—' }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="验收节点">
              <span class="readonly-text">{{ nodeName }}</span>
            </el-form-item>
          </el-col>
          <el-col v-if="isSpecialContext" :span="12">
            <el-form-item label="专项类型">
              <span class="readonly-text">{{ specialTypeLabel(task.special_type) || '—' }}</span>
            </el-form-item>
          </el-col>
          <el-col v-if="!isSpecialContext" :span="12">
            <el-form-item label="施工部位">
              <span class="readonly-text">{{ task.location_name || headerMeta.location_name || '—' }}</span>
            </el-form-item>
          </el-col>
          <el-col v-if="showHiddenWorkOption" :span="12">
            <el-form-item label="是否隐蔽工程">
              <span class="readonly-text">{{
                Number(task.is_hidden_work ?? headerMeta.is_hidden_work) === 1 ? '是' : '否'
              }}</span>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </template>

    <!-- ① 基本信息（竣工：验评单号等只读，无验收说明） -->
    <template v-if="task && isCompleteTask && !canEdit">
      <div class="section-title">基本信息 · 竣工验收</div>
      <el-descriptions :column="2" border size="small" class="mb">
        <el-descriptions-item label="验评单号">{{ task.task_no || '—' }}</el-descriptions-item>
        <el-descriptions-item label="工程/部位">{{ task.location_name || '—' }}</el-descriptions-item>
        <el-descriptions-item label="一次通过">{{ formatFirstPass(task.first_pass_flag) || '—' }}</el-descriptions-item>
      </el-descriptions>
    </template>

    <!-- 只读详情：字段对齐个人中心任务信息（不含检查项；专项无部位/隐蔽） -->
    <template v-else-if="task && !canEdit && !isCompleteTask">
      <div class="section-title">基本信息</div>
      <el-descriptions :column="2" border size="small" class="mb">
        <el-descriptions-item label="验评单号">{{ task.task_no || '—' }}</el-descriptions-item>
        <el-descriptions-item label="验收类型">
          {{ TASK_TYPE_LABEL[task.task_type] || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="项目名称">{{ displayProjectName }}</el-descriptions-item>
        <el-descriptions-item label="施工单位">{{ displayContractorName }}</el-descriptions-item>
        <el-descriptions-item label="验收任务名称">{{ task.task_name || headerMeta.task_name || '—' }}</el-descriptions-item>
        <el-descriptions-item label="验收节点">{{ nodeName }}</el-descriptions-item>
        <el-descriptions-item v-if="task.task_type === 6" label="专项类型">
          {{ specialTypeLabel(task.special_type) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="task.task_type !== 6" label="施工部位">{{ task.location_name || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="task.task_type !== 6" label="是否隐蔽工程">
          {{ task.is_hidden_work === 1 ? '是' : '否' }}
        </el-descriptions-item>
        <el-descriptions-item label="申请人">{{ displayApplicantName }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ task.submit_time || '—' }}</el-descriptions-item>
      </el-descriptions>
    </template>

    <template v-if="task || (canEdit && activeStep === 0)">
    <el-alert
      v-if="canEdit && task && !taskSiteAttachments.filter((a) => [1, 2].includes(Number(a.file_category))).length"
      type="warning"
      :closable="false"
      show-icon
      class="mb"
      title="提交报验前须至少上传一份工程影像（图片或视频，默认必填）"
    />
    <!-- 第一行：工程影像 | 附件资料 -->
    <div class="site-materials mb">
      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">
              工程影像
              <el-tag size="small" type="danger" effect="plain" class="req-tag">默认必填</el-tag>
            </div>
            <div class="site-block-tip">支持图片、视频（现场照片 / 现场短视频）</div>
          </div>
          <div v-if="canEdit" class="filter-bar">
            <el-button size="small" native-type="button" @click.stop="onAddSiteMedia('image')">
              上传图片
            </el-button>
            <el-button size="small" native-type="button" @click.stop="onAddSiteMedia('video')">
              上传视频
            </el-button>
          </div>
        </div>
        <el-table :data="siteMediaList" border size="small" empty-text="暂无工程影像">
          <el-table-column label="类型" width="72">
            <template #default="{ row }">
              <el-tag size="small" :type="isVideoExt(row.file_ext) || row.file_category === 2 ? 'warning' : 'success'">
                {{ isVideoExt(row.file_ext) || row.file_category === 2 ? '视频' : '图片' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="file_name" label="文件名" min-width="120" show-overflow-tooltip />
          <el-table-column label="类别" width="100">
            <template #default="{ row }">{{ FILE_CATEGORY[row.file_category] || '—' }}</template>
          </el-table-column>
          <el-table-column label="大小" width="80">
            <template #default="{ row }">{{ formatFileSize(row.file_size) }}</template>
          </el-table-column>
          <el-table-column prop="upload_time" label="上传时间" width="150" />
          <el-table-column v-if="canEdit" label="操作" width="72" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onRemoveSiteAtt(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">
              附件资料
              <el-tag size="small" type="info" effect="plain" class="req-tag">可选</el-tag>
            </div>
            <div class="site-block-tip">支持 PDF / Word / Excel 等文件</div>
          </div>
          <div v-if="canEdit" class="filter-bar">
            <el-button size="small" native-type="button" @click.stop="onAddSiteMaterial">上传附件</el-button>
          </div>
        </div>
        <el-table :data="siteMaterialList" border size="small" empty-text="暂无附件资料">
          <el-table-column label="格式" width="72">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ String(row.file_ext || '').toUpperCase() || 'FILE' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="file_name" label="文件名" min-width="120" show-overflow-tooltip />
          <el-table-column label="类别" width="100">
            <template #default="{ row }">{{ FILE_CATEGORY[row.file_category] || '—' }}</template>
          </el-table-column>
          <el-table-column label="大小" width="80">
            <template #default="{ row }">{{ formatFileSize(row.file_size) }}</template>
          </el-table-column>
          <el-table-column prop="upload_time" label="上传时间" width="150" />
          <el-table-column v-if="canEdit" label="操作" width="72" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onRemoveSiteAtt(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 第二行：电子档案文件 | 材料设备 -->
    <div class="site-materials mb">
      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">
              电子档案文件
              <el-tag size="small" type="success" effect="plain" class="req-tag">自动带入·只读</el-tag>
            </div>
            <div class="site-block-tip">
              按验收节点自动带入；电子档案状态：{{ ELEC_ARCHIVE_STATUS[task?.elec_archive_status] || '—' }}
            </div>
          </div>
        </div>
        <el-table
          v-if="Number(task?.need_archive) === 1"
          :data="elecArchiveDocs"
          border
          size="small"
          empty-text="暂无档案文档"
        >
          <el-table-column prop="doc_name" label="文档名称" min-width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.filled ? 'success' : 'warning'" effect="plain">
                {{ row.filled ? '已填报' : '需填报' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="本单无需电子档案归档" :image-size="48" />
      </div>

      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">
              材料设备
              <el-tag size="small" type="info" effect="plain" class="req-tag">可选</el-tag>
            </div>
            <div class="site-block-tip">从材料设备台账选择已通过记录，可按施工部位筛选后勾选</div>
          </div>
          <div v-if="canEdit" class="filter-bar">
            <el-button size="small" native-type="button" @click.stop="onLinkMaterial">关联材料设备</el-button>
          </div>
        </div>
        <el-table :data="materialLinks" border size="small" empty-text="暂无关联材料设备">
          <el-table-column prop="source_label" label="类型" width="70">
            <template #default="{ row }">{{ row.source_label || '—' }}</template>
          </el-table-column>
          <el-table-column prop="material_id" label="进场单号" width="110" show-overflow-tooltip />
          <el-table-column prop="material_name" label="名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="use_part" label="施工部位" min-width="100" show-overflow-tooltip>
            <template #default="{ row }">{{ row.use_part || '—' }}</template>
          </el-table-column>
          <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip>
            <template #default="{ row }">{{ row.brand_name || '—' }}</template>
          </el-table-column>
          <el-table-column prop="quantity_text" label="规格及数量" width="110" show-overflow-tooltip>
            <template #default="{ row }">{{ row.quantity_text || '—' }}</template>
          </el-table-column>
          <el-table-column prop="supplier" label="供应商" min-width="90" show-overflow-tooltip />
          <el-table-column v-if="canEdit" label="操作" width="72" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onUnlinkMaterial(row)">解除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 第三行：定版定样 | 实模对比报告 -->
    <div class="site-materials mb">
      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">
              定版定样
              <el-tag size="small" type="info" effect="plain" class="req-tag">可选</el-tag>
            </div>
            <div class="site-block-tip">从样板管理选择已通过定版定样，可按施工部位筛选后勾选</div>
          </div>
          <div v-if="canEdit" class="filter-bar">
            <el-button size="small" native-type="button" @click.stop="onLinkSample">关联定版定样</el-button>
          </div>
        </div>
        <el-table :data="sampleLinks" border size="small" empty-text="暂无关联定版定样">
          <el-table-column prop="sample_id" label="报审编号" width="120" show-overflow-tooltip />
          <el-table-column prop="sample_name" label="名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="sample_category" label="类型" width="100" />
          <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip>
            <template #default="{ row }">{{ row.brand_name || '—' }}</template>
          </el-table-column>
          <el-table-column prop="use_part" label="使用部位" min-width="100" show-overflow-tooltip>
            <template #default="{ row }">{{ row.use_part || '—' }}</template>
          </el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="72" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onUnlinkSample(row)">解除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">
              实模对比报告
              <el-tag size="small" type="info" effect="plain" class="req-tag">可选·引用</el-tag>
            </div>
            <div class="site-block-tip">
              从「实模一致验收」选用已通过单据，引用其 PDF 报告与对比地址（不在本页上传）
            </div>
          </div>
          <div v-if="canEdit" class="filter-bar">
            <el-button size="small" native-type="button" @click.stop="onOpenAsbuiltPick">
              关联实模一致
            </el-button>
          </div>
        </div>
        <el-table :data="asbuiltLinks" border size="small" empty-text="暂未关联实模一致验收">
          <el-table-column prop="biz_no" label="验收单号" width="120" />
          <el-table-column prop="title" label="任务名称" min-width="110" show-overflow-tooltip />
          <el-table-column prop="node_paths" label="所选节点" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.node_paths || '—' }}</template>
          </el-table-column>
          <el-table-column prop="report_names" label="报告附件" min-width="120" show-overflow-tooltip />
          <el-table-column label="对比地址" min-width="90">
            <template #default="{ row }">
              <el-button
                v-if="row.compare_url"
                link
                type="primary"
                @click="openAsbuiltCompare(row.compare_url)"
              >
                打开
              </el-button>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="72" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onUnlinkAsbuilt(row)">解除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div v-if="canEdit" class="approver-config mb">
      <div class="section-title">审批人配置</div>
      <p class="flow-tip">提交前须指定监理单位与项目经理审批人（交互对齐品牌报审）。</p>
      <el-form label-width="120px" class="approver-form">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="监理单位审批" required>
              <el-select
                v-model="approverForm.supervisor_approver_user_id"
                placeholder="请选择监理单位审批人"
                filterable
                clearable
                style="width: 100%"
                aria-label="请选择监理单位审批人"
                @change="onApproverChange('supervisor')"
              >
                <el-option
                  v-for="u in supervisorCandidates"
                  :key="u.id"
                  :label="formatQmApproverLabel(u)"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目经理审批" required>
              <el-select
                v-model="approverForm.pm_approver_user_id"
                placeholder="请选择项目经理审批人"
                filterable
                clearable
                style="width: 100%"
                aria-label="请选择项目经理审批人"
                @change="onApproverChange('pm')"
              >
                <el-option
                  v-for="u in pmCandidates"
                  :key="u.id"
                  :label="formatQmApproverLabel(u)"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    </template>

    <!-- 详情：审批过程（样式对齐品牌报审） -->
    <template v-if="!canEdit">
    <section class="approve-flow-section mb">
      <header class="approve-flow-head">
        <el-icon class="approve-flow-icon"><Clock /></el-icon>
        <h3 class="approve-flow-title">审批过程</h3>
      </header>
      <div class="approve-flow-body">
        <el-steps class="process-steps" align-center>
          <el-step
            v-for="(s, idx) in approvalProcessSteps"
            :key="`proc-${s.title}-${idx}`"
            :title="s.title"
            :description="s.desc"
            :status="s.status"
          />
        </el-steps>

        <el-timeline v-if="approvalTimeline.length" class="approval-timeline">
          <el-timeline-item
            v-for="step in approvalTimeline"
            :key="step.key"
            :type="qmTimelineType(step.status)"
            :hollow="step.status === 'current'"
            :timestamp="step.time || '进行中'"
            placement="top"
          >
            <div class="flow-card" :class="step.status">
              <div class="flow-title">
                <span>{{ step.title }}</span>
                <el-tag v-if="step.status === 'current'" size="small" type="warning">当前</el-tag>
                <el-tag
                  v-else-if="step.actionLabel"
                  size="small"
                  :type="qmApprovalActionTagType(step.action)"
                  effect="light"
                >
                  {{ step.actionLabel }}
                </el-tag>
              </div>
              <div class="flow-meta">处理人：{{ step.operator }}</div>
              <div v-if="step.remark" class="flow-remark">意见：{{ step.remark }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无审批记录" :image-size="60" />
      </div>
    </section>
    </template>
    </template>

    <!-- 第 2 步 / 详情·档案：第三方档案嵌入 -->
    <template v-if="showArchiveContent">
      <p v-if="!canEdit" class="archive-embed-tip mb">以下为档案系统嵌入页，在此查阅与填报档案表格。</p>
      <QmArchivePanel
        :task="task"
        class="mb"
        @changed="load"
        @view-mode-change="archiveViewMode = $event"
      />
    </template>

    <!-- 第 3 步：审批流程 · 确认提交 -->
    <template v-if="task && canEdit && activeStep === 2">
      <template v-if="showManualFlowConfig">
        <div class="section-title">流程配置</div>
        <p class="flow-tip">请配置审批链：默认一级，可新增多级；提交后按此配置推进审批。</p>
        <div class="filter-bar mb">
          <el-button type="primary" size="small" native-type="button" @click="addManualFlowLevel">
            新增一级
          </el-button>
        </div>
        <el-table :data="manualFlow" border size="small" class="mb">
          <el-table-column label="级别" width="110">
            <template #default="{ row }">{{ row.label }}</template>
          </el-table-column>
          <el-table-column label="岗位" min-width="180">
            <template #default="{ row }">
              <el-select
                v-model="row.role"
                filterable
                clearable
                placeholder="选择岗位"
                style="width: 100%"
                @change="onFlowRoleChange(row)" aria-label="选择岗位">
                <el-option-group v-for="g in roleGroups" :key="g.label" :label="g.label">
                  <el-option
                    v-for="opt in g.options"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-option-group>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="审批人" min-width="200">
            <template #default="{ row }">
              <el-select
                v-model="row.approver_ids"
                multiple
                filterable
                collapse-tags
                collapse-tags-tooltip
                :disabled="!row.role"
                :placeholder="row.role ? '选择审批人' : '请先选择岗位'"
                style="width: 100%" aria-label="row.role ? '选择审批人' : '请先选择岗位'">
                <el-option
                  v-for="opt in approverOptionsForRow(row)"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="是否签章" width="110" align="center">
            <template #default="{ row }">
              <el-switch
                v-model="row.need_seal"
                :active-value="1"
                :inactive-value="0"
                inline-prompt
                active-text="是"
                inactive-text="否"
              />
            </template>
          </el-table-column>
          <el-table-column label="抄送人" min-width="200">
            <template #default="{ row }">
              <el-select
                v-model="row.cc_ids"
                multiple
                filterable
                collapse-tags
                collapse-tags-tooltip
                clearable
                placeholder="选填"
                style="width: 100%" aria-label="选填">
                <el-option
                  v-for="opt in personOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ $index }">
              <el-button link type="danger" @click="removeManualFlowLevel($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <div class="section-title">审批流程</div>
      <p class="flow-tip">{{ flowTip }}</p>
      <div class="flow-box mb">
        <el-steps :active="0" process-status="process" finish-status="success" align-center>
          <el-step
            v-for="(step, idx) in flowSteps"
            :key="`confirm-${step.title}-${idx}`"
            :title="step.title"
            :description="step.desc"
          />
        </el-steps>
      </div>
    </template>

    <!-- 向导操作条 -->
    <div v-if="canEdit" class="filter-bar mb self-check-actions">
      <el-button native-type="button" @click="onSaveDraft">保存</el-button>
      <el-button type="primary" native-type="button" @click="onSubmit">提交报验</el-button>
    </div>

    <el-dialog
      v-model="asbuiltPickVisible"
      title="关联实模一致验收"
      width="720px"
      destroy-on-close
    >
      <p class="flow-tip" style="margin-top: 0">
        仅展示本项目已通过的实模一致验收单；优先匹配与当前验收节点相关的单据。
      </p>
      <el-table :data="asbuiltPickRows" border size="small" empty-text="暂无可选单据">
        <el-table-column prop="biz_no" label="验收单号" width="130" />
        <el-table-column prop="title" label="任务名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="report_names" label="报告" min-width="160" show-overflow-tooltip />
        <el-table-column prop="node_paths" label="所选节点" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="onPickAsbuilt(row)">选用</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="asbuiltPickVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="matPickVisible"
      title="关联材料设备"
      width="860px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div class="filter-bar" style="margin-bottom: 12px">
        <ConstructionLocationSelect
          v-model:location-id="matPickLocationId"
          v-model:location-ids="matPickLocationIds"
          v-model:location-name="matPickUsePart"
          :project-id="task?.project_id || scopeProjectId"
          :scope-wbs-node-id="task?.wbs_node_id || ''"
          scope-mode="focus"
          hide-config
          placeholder="按施工部位筛选"
          style="width: 280px"
        />
        <el-input
          v-model="matPickKeyword"
          clearable
          placeholder="单号 / 名称 / 品牌 / 供应商"
          style="width: 240px" aria-label="单号 / 名称 / 品牌 / 供应商"/>
      </div>
      <el-table
        :data="matPickRows"
        border
        size="small"
        empty-text="暂无可关联的已通过材料/设备"
        max-height="420"
        row-key="material_id"
        @selection-change="(rows) => (matPickSelection = rows)"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="source_label" label="类型" width="70" />
        <el-table-column prop="material_id" label="进场单号" width="110" />
        <el-table-column prop="material_name" label="名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="use_part" label="施工部位" min-width="120" show-overflow-tooltip />
        <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip />
        <el-table-column prop="quantity_text" label="规格及数量" width="110" />
        <el-table-column prop="supplier" label="供应商" min-width="110" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="matPickVisible = false">取消</el-button>
        <el-button type="primary" @click="onConfirmMatPick">确认关联</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="samplePickVisible"
      title="关联定版定样"
      width="860px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div class="filter-bar" style="margin-bottom: 12px">
        <ConstructionLocationSelect
          v-model:location-id="samplePickLocationId"
          v-model:location-ids="samplePickLocationIds"
          v-model:location-name="samplePickUsePart"
          :project-id="task?.project_id || scopeProjectId"
          :scope-wbs-node-id="task?.wbs_node_id || ''"
          scope-mode="focus"
          hide-config
          placeholder="按施工部位筛选"
          style="width: 280px"
        />
        <el-input
          v-model="samplePickKeyword"
          clearable
          placeholder="单号 / 名称 / 类别"
          style="width: 240px" aria-label="单号 / 名称 / 类别"/>
      </div>
      <el-table
        :data="samplePickRows"
        border
        size="small"
        empty-text="暂无可关联的已通过定版定样"
        max-height="420"
        row-key="sample_id"
        @selection-change="(rows) => (samplePickSelection = rows)"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="sample_id" label="报审编号" width="120" />
        <el-table-column prop="sample_name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="sample_category" label="类型" width="110" />
        <el-table-column prop="use_part" label="使用部位" min-width="130" show-overflow-tooltip />
        <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.brand_name || '—' }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="samplePickVisible = false">取消</el-button>
        <el-button type="primary" @click="onConfirmSamplePick">确认关联</el-button>
      </template>
    </el-dialog>
    </div>
  </div>
</template>

<style scoped>
.qm-page {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}
.qm-embed { display: flex; flex-direction: column; gap: 12px; }
.edit-topbar {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(280px, 1.6fr) minmax(88px, 1fr);
  align-items: center;
  gap: 10px 16px;
  padding: 16px 20px;
  margin: 0 0 14px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  min-height: 80px;
}
.edit-topbar-left {
  justify-self: start;
  min-width: 0;
}
.edit-topbar-center {
  justify-self: center;
  width: 100%;
  max-width: 560px;
  min-width: 0;
}
.edit-topbar-right {
  justify-self: end;
}
.edit-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px 16px 16px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.detail-tabs {
  margin-bottom: 4px;
}
.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}
.detail-tabs :deep(.el-tabs__content) {
  display: none;
}
.archive-embed-tip {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}
.complete-meta-form {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 16px 4px;
  background: #fff;
}
.opt-sub { float: right; color: #909399; font-size: 12px; margin-left: 12px; }
.page-breadcrumb { font-size: 12px; color: #909399; line-height: 1.2; }
.page-title {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.section-title { font-weight: 600; margin-top: 8px; }
.section-sub {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin: 4px 0 8px;
}
.flow-tip {
  margin: 0 0 10px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
.flow-box {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafafa;
  padding: 16px 12px 8px;
}
.wizard-steps { padding: 0; }
.edit-topbar .wizard-steps :deep(.el-step__title) {
  font-size: 13px;
  line-height: 1.25;
  max-width: 10em;
}
.edit-topbar .wizard-steps :deep(.el-step__description) {
  display: none;
}
.edit-topbar .wizard-steps :deep(.el-step__icon) {
  width: 26px;
  height: 26px;
  font-size: 13px;
}
.edit-topbar .wizard-steps :deep(.el-step__head.is-process .el-step__icon),
.edit-topbar .wizard-steps :deep(.el-step__head.is-success .el-step__icon),
.edit-topbar .wizard-steps :deep(.el-step__head.is-wait .el-step__icon) {
  width: 26px;
  height: 26px;
}
.edit-topbar .wizard-steps :deep(.el-step__main) {
  white-space: nowrap;
}
.form-hint { font-size: 13px; color: #606266; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.self-check-actions { margin-top: 4px; }
.header-meta-form :deep(.el-form-item) { margin-bottom: 14px; }
.tree-node { display: inline-flex; align-items: center; gap: 6px; }
.type-tag { flex-shrink: 0; }
.node-hint { margin: 6px 0 0; font-size: 12px; color: #409eff; }
.node-ok { margin: 4px 0 0; font-size: 12px; color: #67c23a; }
.node-warn { margin: 4px 0 0; font-size: 12px; color: #e6a23c; line-height: 1.5; }
.node-tip { margin: 4px 0 0; font-size: 12px; color: #909399; line-height: 1.5; }
.readonly-text { color: #303133; line-height: 32px; }
.approve-divider { margin: 8px 0 4px; }
.approve-flow-section {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  overflow: hidden;
}
.approve-flow-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px 12px;
  background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
  border-bottom: 1px solid #f0f2f5;
}
.approve-flow-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}
.approve-flow-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  line-height: 1.4;
}
.approve-flow-body {
  padding: 16px 18px 18px;
}
.process-steps {
  margin: 4px 0 20px;
}
.approval-timeline {
  padding: 4px 8px 0;
}
.flow-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
}
.flow-card.done {
  border-color: #e1f3d8;
  background: #f0f9eb;
}
.flow-card.rejected {
  border-color: #fde2e2;
  background: #fef0f0;
}
.flow-card.current {
  border-color: #f5dab1;
  background: #fdf6ec;
}
.flow-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}
.flow-meta,
.flow-remark {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}
.approve-timeline { padding-left: 4px; }
.approve-record-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.approve-record-role { font-weight: 500; color: #303133; }
.approve-record-opinion {
  margin: 6px 0 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}
.mb { margin-bottom: 12px; }
.site-materials {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 12px;
}
.site-block {
  flex: 1;
  min-width: 0;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
  padding: 10px 12px 12px;
}
.site-block-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.site-block-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.site-block-tip {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}
.req-tag { margin-left: 8px; }
.approver-config {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
  padding: 12px 14px 4px;
}
.approver-form :deep(.el-form-item) {
  margin-bottom: 14px;
}
</style>
