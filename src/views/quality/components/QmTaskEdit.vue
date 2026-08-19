<script setup>
import { computed, defineAsyncComponent, nextTick, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import QmCompletePrereqPanel from './QmCompletePrereqPanel.vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  addAttachment,
  approvalRecords,
  APPROVER_ROLES,
  buildCompleteGate,
  buildWbsTree,
  checkUnlock,
  createSpecialTask,
  createTask,
  ensureTaskItems,
  FILE_CATEGORY,
  findTask,
  getApprovalChain,
  getAttachments,
  getItemsByTaskId,
  getArchiveInstance,
  getTaskMaterialLinks,
  getTaskSampleLinks,
  getTaskAsbuiltLinks,
  defaultManualLevelLabel,
  QM_APPROVER_CANDIDATES,
  removeAttachment,
  resolveProjectName,
  ORG_LABEL,
  saveTaskDraft,
  SPECIAL_ACCEPT_TYPES,
  specialTypeLabel,
  submitInspect,
  TASK_STATUS,
  TASK_TYPE_LABEL,
  findRectify,
  rectificationOrders,
  taskMaterialLinks,
  taskSampleLinks,
  taskAsbuiltLinks,
  validateManualApprovalFlow,
  wbsNodes,
  ELEC_ARCHIVE_STATUS,
  listNodeArchiveDocs,
  listApproverCandidatesForNodeType,
  getApprovalPostForNodeType,
  refreshTaskElecArchiveStatus,
} from '../../../mock/qm.js'
import { listAsbuiltForInspectLink } from '../../../mock/asbuilt.js'
import { listSelectableForInspect as listMatForInspect } from '../../../mock/mat.js'
import { listSelectableForInspect as listEqForInspect } from '../../../mock/eq.js'
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
const rectifyMeasure = ref('')
const activeTpl = ref('')
const formDataLocal = ref({})
/** 触发现场资料列表刷新 */
const siteAttTick = ref(0)
/** 触发③材料/定样关联区块刷新 */
const linkTick = ref(0)
/** 填报三步向导当前步（0 系统数据 / 1 档案 / 2 审批流程确认） */
const activeStep = ref(0)
/** 只读详情切页：系统信息（含审批记录） / 档案（第三方嵌入） */
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
  // 新建或草稿/待验评可编辑时需要节点树
  const editableDraft =
    !!task.value &&
    (Number(task.value.is_draft) === 1 || Number(task.value.status) === 0)
  if (!isCreateMode.value && !editableDraft) {
    wbsTreeOptions.value = []
    wbsDefaultExpandedKeys.value = []
    return
  }
  const pid = (task.value?.project_id || scopeProjectId.value) || undefined
  const full = buildWbsTree(pid)
  let source = full
  const special = isSpecialContext.value
  if (special) source = takeSpecialBranch(full)
  else source = takeEntityBranch(full)

  const mark = (nodes) =>
    (nodes || []).map((n) => {
      const selectable = special
        ? n.node_type === 7
        : [1, 2, 3, 4, 5, 6].includes(n.node_type)
      const typeLabel = n.type_label || ''
      const children = n.children?.length ? mark(n.children) : undefined
      return {
        id: n.id,
        label: typeLabel ? `[${typeLabel}] ${n.label}` : n.label,
        node_type: n.node_type,
        disabled: !selectable,
        children,
      }
    })
  const tree = mark(source)
  wbsTreeOptions.value = tree
  const expandTypes = special ? [8, 10] : [8, 9]
  wbsDefaultExpandedKeys.value = collectExpandToUnitLevel(tree, expandTypes)
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
  { immediate: true },
)

const wbsTreeSelectKey = computed(
  () =>
    `wbs-${task.value?.project_id || scopeProjectId.value || ''}-${isSpecialContext.value ? 's' : 'e'}-${wbsDefaultExpandedKeys.value.join('_')}`,
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
  items.value = getItemsByTaskId(task.value.id).map((i) => ({ ...i }))
  formDataLocal.value = JSON.parse(JSON.stringify(task.value.form_data || {}))
  syncManualFlowFromTask()
  const tplIds = [...new Set(items.value.map((i) => i.form_template_id).filter(Boolean))]
  activeTpl.value = tplIds[0] || task.value.form_template_id || ''
  if (activeTpl.value && !formDataLocal.value[activeTpl.value]) {
    formDataLocal.value[activeTpl.value] = {}
  }
  const rectify = task.value.current_rectify_id
    ? findRectify(task.value.current_rectify_id)
    : rectificationOrders.find((r) => r.source_task_id === task.value.id && r.status !== 3)
  rectifyMeasure.value = rectify?.measure || ''
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
  items.value = getItemsByTaskId(task.value.id).map((i) => ({ ...i }))
  formDataLocal.value = JSON.parse(JSON.stringify(task.value.form_data || {}))
  const tplIds = [...new Set(items.value.map((i) => i.form_template_id).filter(Boolean))]
  activeTpl.value = tplIds[0] || task.value.form_template_id || ''
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

/** 页头档案摘要（Q12 一任务一档案文档） */
const archiveBrief = computed(() => {
  if (!task.value) return '未登记'
  const inst = getArchiveInstance(task.value.id)
  return inst ? `已登记 ${inst.archive_doc_id}` : '未登记'
})

/** 按验收类型的默认审批流程：施工报验 → 审批链 → 办结 */
const flowSteps = computed(() => {
  if (!task.value) return []
  const chain = canEdit.value
    ? manualFlow.value.map((n, i) => n.label || defaultManualLevelLabel(i + 1))
    : getApprovalChain(task.value)
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
  const chain = canEdit.value
    ? manualFlow.value.map((n, i) => n.label || defaultManualLevelLabel(i + 1))
    : getApprovalChain(task.value)
  if (!chain.length) {
    return `${typeLabel}：请在上方配置审批流程后再提交`
  }
  const path = ['施工报验', ...chain, '办结通过'].join(' → ')
  return `${typeLabel}审批流程：${path}`
})

/** 待提交可填报（V2 无草稿） */
const canEdit = computed(() => {
  if (!task.value) return false
  return Number(task.value.status) === 0
})

/** 系统信息区：填报页或详情「系统信息」 */
const showSystemContent = computed(
  () => canEdit.value || (!canEdit.value && detailTab.value === 'system'),
)

/** 档案嵌入向导已废止；详情不再嵌档案面板 */
const showArchiveContent = computed(() => false)

/** 本系统内不配多级审批链 */
const showManualFlowConfig = computed(() => false)

const elecArchiveDocs = computed(() => {
  if (!task.value?.wbs_node_id || Number(task.value.need_archive) !== 1) return []
  return listNodeArchiveDocs(task.value.wbs_node_id)
})

const submitDialogVisible = ref(false)
const submitApproverId = ref('')
const submitCandidates = computed(() => {
  const node = wbsNodes.find((n) => n.id === task.value?.wbs_node_id)
  return listApproverCandidatesForNodeType(node?.node_type) || []
})
const submitPostLabel = computed(() => {
  const node = wbsNodes.find((n) => n.id === task.value?.wbs_node_id)
  return getApprovalPostForNodeType(node?.node_type)?.approval_post_name || '—'
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

const isCompleteTask = computed(() => Number(task.value?.task_type) === 7)

const currentRectify = computed(() => {
  if (!task.value?.current_rectify_id) return null
  return findRectify(task.value.current_rectify_id)
})

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
  const mats = listMatForInspect(projectId, opts)
  const eqs = listEqForInspect(projectId, opts)
  return [...mats, ...eqs].filter((r) => !linked.has(r.material_id))
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
  })
  if (!r.ok) return ElMessage.error(r.msg)
  refreshTaskElecArchiveStatus(task.value)
  ElMessage.success('已保存')
}

function openSubmitDialog() {
  if (!task.value) return ElMessage.warning('请从列表发起验收后再填报')
  const draftSave = saveTaskDraft(task.value, {
    task_name: task.value.task_name,
    remark: task.value.remark || '',
    location_name: task.value.location_name,
    is_hidden_work: task.value.is_hidden_work,
    wbs_node_id: task.value.wbs_node_id,
    form_data: formDataLocal.value,
  })
  if (!draftSave.ok) return ElMessage.error(draftSave.msg)
  refreshTaskElecArchiveStatus(task.value)
  if (!submitCandidates.value.length) {
    return ElMessage.error('流程中心未配置该节点类型审批岗位候选人或岗位下无人')
  }
  submitApproverId.value = submitCandidates.value[0]?.id || ''
  submitDialogVisible.value = true
}

function onSubmit() {
  openSubmitDialog()
}

function confirmSubmit() {
  if (!task.value) return
  const r = submitInspect(task.value, { approver_id: submitApproverId.value })
  if (!r.ok) return ElMessage.error(r.msg)
  submitDialogVisible.value = false
  ElMessage.success('已提交报验；审批请在个人中心处理')
  if (props.embedded) {
    load()
    return
  }
  router.push(props.listPath)
}

/** 整改入口已废止（V2） */
void findRectify
void rectificationOrders

function goWizardNext() {
  /* V2 无三步向导 */
}

function saveStepQuietly() {
  return { ok: true }
}

/** 整改提交在个人中心处理；业务详情仅只读展示整改信息 */
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
        <p v-if="task" class="page-tip">
          {{ resolveProjectName(task.project_id) }} · {{ nodeName }} · {{ TASK_STATUS[task.status] }}
          <el-tag v-if="task.is_draft === 1" size="small" type="info" effect="plain">草稿</el-tag>
          · 档案：{{ archiveBrief }}
        </p>
      </div>
      <div class="edit-topbar-center">
        <p v-if="canEdit" class="v2-fill-hint">待提交填报：工程影像、附件、材料设备、样板；可关联实模一致验收资料；电子档案文件自动带入（只读）</p>
      </div>
      <div class="edit-topbar-right">
        <el-button size="small" @click="router.push(listPath)">返回列表</el-button>
      </div>
    </div>
    <div v-else-if="task" class="embed-status">
      <el-tag size="small" type="info">{{ task.task_no }}</el-tag>
      <el-tag size="small" :type="Number(task.status) === 0 ? 'warning' : 'success'">
        {{ TASK_STATUS[task.status] }}
      </el-tag>
      <el-tag v-if="task.is_draft === 1" size="small" type="info" effect="plain">草稿</el-tag>
      <span class="embed-status-tip">档案：{{ archiveBrief }}</span>
    </div>

    <div class="edit-body">
    <!-- 只读详情：系统信息 / 档案 双切页（档案为第三方嵌入） -->
    <el-tabs
      v-if="!canEdit && task"
      v-model="detailTab"
      class="detail-tabs mb"
    >
      <el-tab-pane label="系统信息" name="system" />
      <el-tab-pane v-if="false" label="档案" name="archive" />
    </el-tabs>

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

    <!-- 第 1 步 / 详情·系统信息：本系统数据 -->
    <template v-if="showSystemContent">
    <!-- 顶部：发起时已填字段，填报页只读展示 -->
    <template v-if="canEdit && !isCompleteTask">
      <div class="section-title">任务信息</div>
      <el-form label-width="110px" class="header-meta-form mb" @submit.prevent>
        <el-row :gutter="24">
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
          <el-col :span="12">
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

    <!-- 只读详情：编辑态已有「任务信息」，勿再叠一层 ① 基本信息（上传静默建任务后易误显） -->
    <template v-else-if="task && !canEdit && !isCompleteTask">
      <div class="section-title">基本信息</div>
      <el-descriptions :column="3" border size="small" class="mb">
        <el-descriptions-item label="验评单号">{{ task.task_no || '—' }}</el-descriptions-item>
        <el-descriptions-item label="验收任务名称">{{ task.task_name || headerMeta.task_name || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="task.task_type === 6" label="专项类型">
          {{ specialTypeLabel(task.special_type) }}
        </el-descriptions-item>
        <el-descriptions-item label="验收节点">{{ nodeName }}</el-descriptions-item>
        <el-descriptions-item label="施工部位">{{ task.location_name || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="task.task_type !== 6" label="是否隐蔽工程">
          {{ task.is_hidden_work === 1 ? '是' : '否' }}
        </el-descriptions-item>
        <el-descriptions-item label="业主终审">{{ task.owner_final_required === 1 ? '需要' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="一次通过">{{ formatFirstPass(task.first_pass_flag) }}</el-descriptions-item>
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
          <el-table-column label="类型" width="88">
            <template #default="{ row }">
              <el-tag size="small" :type="isVideoExt(row.file_ext) || row.file_category === 2 ? 'warning' : 'success'">
                {{ isVideoExt(row.file_ext) || row.file_category === 2 ? '视频' : '图片' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
          <el-table-column label="类别" width="120">
            <template #default="{ row }">{{ FILE_CATEGORY[row.file_category] || '—' }}</template>
          </el-table-column>
          <el-table-column label="大小" width="90">
            <template #default="{ row }">{{ formatFileSize(row.file_size) }}</template>
          </el-table-column>
          <el-table-column prop="upload_time" label="上传时间" width="160" />
          <el-table-column v-if="canEdit" label="操作" width="80" fixed="right">
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
          <el-table-column label="格式" width="80">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ String(row.file_ext || '').toUpperCase() || 'FILE' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="file_name" label="文件名" min-width="220" show-overflow-tooltip />
          <el-table-column label="类别" width="140">
            <template #default="{ row }">{{ FILE_CATEGORY[row.file_category] || '—' }}</template>
          </el-table-column>
          <el-table-column label="大小" width="90">
            <template #default="{ row }">{{ formatFileSize(row.file_size) }}</template>
          </el-table-column>
          <el-table-column prop="upload_time" label="上传时间" width="160" />
          <el-table-column v-if="canEdit" label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onRemoveSiteAtt(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="site-materials mb">
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
          <el-table-column prop="material_name" label="材料设备名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="use_part" label="施工部位" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.use_part || '—' }}</template>
          </el-table-column>
          <el-table-column prop="batch_no" label="批次/编号" width="130" show-overflow-tooltip />
          <el-table-column prop="supplier" label="供应商" min-width="110" show-overflow-tooltip />
          <el-table-column v-if="canEdit" label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onUnlinkMaterial(row)">解除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">
              定版定样关联
              <el-tag size="small" type="info" effect="plain" class="req-tag">可选</el-tag>
            </div>
            <div class="site-block-tip">从样板管理选择已通过定版定样，可按施工部位筛选后勾选</div>
          </div>
          <div v-if="canEdit" class="filter-bar">
            <el-button size="small" native-type="button" @click.stop="onLinkSample">关联定样</el-button>
          </div>
        </div>
        <el-table :data="sampleLinks" border size="small" empty-text="暂无关联定版定样">
          <el-table-column prop="sample_name" label="定样名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="sample_category" label="类别" width="110" />
          <el-table-column prop="use_part" label="施工部位" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.use_part || '—' }}</template>
          </el-table-column>
          <el-table-column prop="link_time" label="关联时间" width="160" />
          <el-table-column v-if="canEdit" label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onUnlinkSample(row)">解除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="site-materials mb">
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
          <el-table-column prop="biz_no" label="验收单号" width="130" />
          <el-table-column prop="title" label="任务名称" min-width="140" show-overflow-tooltip />
          <el-table-column prop="report_names" label="报告附件" min-width="160" show-overflow-tooltip />
          <el-table-column label="对比地址" min-width="120">
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
          <el-table-column v-if="canEdit" label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onUnlinkAsbuilt(row)">解除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

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
          <el-table-column prop="doc_name" label="文档名称" min-width="200" />
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
    </div>

    </template>

    <template v-if="task && task.status === 4 && currentRectify">
      <div class="section-title">整改信息 · {{ currentRectify.order_no }}</div>
      <el-descriptions :column="3" border size="small" class="mb">
        <el-descriptions-item label="问题描述" :span="3">{{ currentRectify.problem_desc }}</el-descriptions-item>
        <el-descriptions-item label="整改期限">{{ currentRectify.deadline || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态变更时间">{{ currentRectify.status_changed_at || '—' }}</el-descriptions-item>
        <el-descriptions-item label="复验轮次">{{ currentRectify.round_count ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="整改措施" :span="3">
          {{ currentRectify.measure || rectifyMeasure || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="关联档案文档状态" :span="3">
          <el-tag size="small" type="warning" effect="plain">{{ currentRectify.archive_doc_status || '—' }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </template>

    <!-- 详情·系统信息：审批记录（含办理留痕） -->
    <template v-if="!canEdit">
    <el-divider class="approve-divider" />
    <div class="section-title">审批记录</div>
    <p class="flow-tip">{{ flowTip }}</p>
    <el-timeline v-if="records.length" class="approve-timeline mb">
      <el-timeline-item
        v-for="r in records"
        :key="r.id"
        :timestamp="r.action_time"
        :type="r.action === 3 ? 'danger' : r.action === 2 ? 'success' : 'primary'"
      >
        <div class="approve-record-line">
          <span class="approve-record-role">{{ r.operator_role }}</span>
          <el-tag
            size="small"
            :type="r.action === 3 ? 'danger' : r.action === 2 ? 'success' : 'info'"
            effect="plain"
          >
            {{ { 1: '提交', 2: '通过', 3: '不通过' }[r.action] || '办理' }}
          </el-tag>
        </div>
        <p v-if="r.opinion" class="approve-record-opinion">{{ r.opinion }}</p>
      </el-timeline-item>
    </el-timeline>
    <el-empty
      v-else
      description="暂无办理记录；上方为按验收类型预设的审批流程"
      :image-size="56"
    />
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
                @change="onFlowRoleChange(row)"
              >
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
                style="width: 100%"
              >
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
                style="width: 100%"
              >
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

    <el-dialog v-model="submitDialogVisible" title="选择审批人" width="480px" destroy-on-close>
      <p class="form-hint mb">审批岗位（流程中心）：{{ submitPostLabel }}</p>
      <el-form label-width="100px">
        <el-form-item label="审批人" required>
          <el-select v-model="submitApproverId" filterable placeholder="请选择" style="width: 100%">
            <el-option
              v-for="u in submitCandidates"
              :key="u.id"
              :label="`${u.name}（${u.org || ''}）`"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="submitDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSubmit">确认提交</el-button>
      </template>
    </el-dialog>

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
          style="width: 240px"
        />
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
        <el-table-column prop="quantity_text" label="数量" width="90" />
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
          style="width: 240px"
        />
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
        <el-table-column prop="sample_id" label="定样单号" width="120" />
        <el-table-column prop="sample_name" label="定样名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="sample_category" label="类别" width="110" />
        <el-table-column prop="use_part" label="施工部位" min-width="130" show-overflow-tooltip />
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
.embed-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.embed-status-tip { font-size: 12px; color: #909399; }
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
.page-tip {
  margin: 4px 0 0;
  font-size: 12px;
  color: #606266;
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
.v2-fill-hint {
  margin: 0;
  font-size: 13px;
  color: #606266;
  text-align: center;
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
</style>
