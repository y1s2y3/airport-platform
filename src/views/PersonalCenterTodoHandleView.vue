<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import {
  findPersonalProcess,
  finishPersonalTodo,
  buildPenaltyApprovalFlow,
  buildDispatchHazardApprovalFlow,
  PENALTY_TODO_STATUS,
  DISPATCH_HAZARD_TODO_BIZ,
  personalTodoStore,
  handleSubcontractorTodo,
} from '../mock/personalCenter.js'
import {
  getApplicationDetail,
  pmApprove,
  supervisorApprove,
} from '../mock/brand.js'
import { supervisorApproveSample, pmApproveSample } from '../mock/sample.js'
import { getEntryDetail, supervisorApproveEntry, formatBatchNo } from '../mock/mat.js'
import {
  getEntryDetail as getEqEntryDetail,
  supervisorApproveEntry as supervisorApproveEqEntry,
} from '../mock/eq.js'
import { supervisorApproveAsbuilt, pmApproveAsbuilt } from '../mock/asbuilt.js'
import BrandCandidateAttachBlock from './quality/brand/BrandCandidateAttachBlock.vue'
import {
  submitPenaltyRecipientReport,
  submitPenaltyAppeal,
  acceptPenaltyRecord,
  rejectPenaltyAcceptance,
  resolvePenaltyAppeal,
  issueDispatchPenaltyRecord,
  getDispatchPenaltyRecords,
  PENALTY_STATUSES,
} from '../coc/utils/dispatchMeetingStorage.js'
import { userOptions, getUserLabel } from '../composables/useInspectionPlan.js'
import { submitManagerApproval } from '../composables/useMobileRectification.js'
import DispatchImageAttachments from '../coc/components/DispatchImageAttachments.vue'
import PenaltyDetailPanels from '../coc/components/PenaltyDetailPanels.vue'
import {
  getDispatchHazards,
  submitDispatchHazardRectify,
  acceptDispatchHazard,
  rejectDispatchHazard,
  resolveDispatchHazardPhotoSrc,
  resolveDispatchHazardPhotoName,
} from '../utils/dispatchHazardStorage.js'
import { findSubcontractorApplication } from '../mock/subcontractorManagement.js'

const route = useRoute()
const router = useRouter()

const FROM_TABS = new Set(['todo', 'done', 'started', 'cc'])
const fromTab = computed(() => {
  const from = String(route.query.from || 'todo')
  return FROM_TABS.has(from) ? from : 'todo'
})
const isReadonly = computed(() => fromTab.value !== 'todo')
const pageTitle = computed(() => (isReadonly.value ? '详情' : '待办处理'))
const emptyText = computed(() =>
  isReadonly.value ? '记录不存在或已删除' : '待办不存在或已处理',
)

const todoId = computed(() => String(route.query.id || ''))
const todo = computed(() =>
  todoId.value ? findPersonalProcess(todoId.value, fromTab.value) : null,
)

const bizToPenaltyStatus = {
  [PENALTY_TODO_STATUS.PROCESSING]: PENALTY_STATUSES.PROCESSING,
  [PENALTY_TODO_STATUS.PENDING_ACCEPTANCE]: PENALTY_STATUSES.PENDING_ACCEPTANCE,
  [PENALTY_TODO_STATUS.APPEALING]: PENALTY_STATUSES.APPEALING,
}

const mergedPenalty = computed(() => {
  if (!todo.value || todo.value.type !== 'penalty') return null
  const base = { ...(todo.value.penalty || {}) }
  const live = getDispatchPenaltyRecords().find((item) => item.id === todo.value.penaltyId)
  const merged = live
    ? { ...base, ...live, id: live.id || base.id || todo.value.penaltyId }
    : { ...base, id: base.id || todo.value.penaltyId }
  if (!merged.status) {
    merged.status = bizToPenaltyStatus[todo.value.bizStatus] || PENALTY_STATUSES.PROCESSING
  }
  return merged
})

const mergedDispatchHazard = computed(() => {
  if (!todo.value || todo.value.type !== 'dispatch_hazard') return null
  const base = { ...(todo.value.hazard || {}) }
  const live = getDispatchHazards().find((item) => item.id === todo.value.hazardId)
  return live
    ? { ...base, ...live, id: live.id || base.id || todo.value.hazardId }
    : { ...base, id: base.id || todo.value.hazardId }
})

const subcontractorLiveDetail = computed(() => {
  const id = todo.value?.subcontractorApplicationId
  if (!id || todo.value?.type !== 'subcontractor') return null
  return findSubcontractorApplication(id)
})

const approvalFlow = computed(() => {
  if (!todo.value) return []
  if (todo.value.type === 'penalty') return buildPenaltyApprovalFlow(todo.value)
  if (todo.value.type === 'dispatch_hazard') return buildDispatchHazardApprovalFlow(todo.value)
  if (todo.value.type === 'subcontractor' && subcontractorLiveDetail.value?.approvalFlow?.length) {
    return subcontractorLiveDetail.value.approvalFlow
  }
  return todo.value.approvalFlow || []
})

const todoSourceLabel = computed(() => {
  if (!todo.value) return ''
  if (todo.value.sourceLabel) return todo.value.sourceLabel
  if (todo.value.category) return todo.value.category
  if (todo.value.type === 'penalty') return '处罚单'
  if (todo.value.type === 'dispatch_hazard') return '调度隐患'
  if (todo.value.type === 'brand') return '品牌报审'
  if (todo.value.type === 'subcontractor') return '分包报审'
  if (todo.value.type === 'sample') return '样板管理'
  if (todo.value.type === 'mat_entry') return '材料进场管理'
  if (todo.value.type === 'eq_entry') return '设备进场管理'
  if (todo.value.type === 'asbuilt') return '实模一致验收'
  if (todo.value.type === 'qm_inspect') return '质量验评'
  if (todo.value.type === 'inspection') return '巡检管理'
  if (todo.value.processName?.includes('品牌报审')) return '品牌报审'
  if (todo.value.processName?.includes('检验批') || todo.value.processName?.includes('验收')) {
    return '质量验评'
  }
  if (todo.value.processName?.includes('巡检') || todo.value.processName?.includes('隐患')) {
    return '巡检管理'
  }
  return '流程'
})

function hazardTypeLabel(type) {
  return type === 'quality' ? '质量' : '安全'
}

function sourceTypeLabel(type) {
  return { live: '实时', playback: '回放', meeting: '会议' }[type] || type || '—'
}

const dispatchHazardRectifyPhotoUrls = computed(() =>
  (mergedDispatchHazard.value?.rectifyPhotos || []).map((photo, index) =>
    resolveDispatchHazardPhotoSrc(photo, index),
  ),
)

const processTab = ref('report')
const dispatchHazardForm = reactive({
  remark: '',
  photos: [],
  decision: 'pass',
  rejectRemark: '',
})
const reportForm = reactive({
  penaltyClause: '',
  amount: '',
  reportResult: '',
  acceptor: '',
  attachments: [],
})
const appealForm = reactive({
  reason: '',
  attachments: [],
})
const acceptForm = reactive({
  decision: 'pass',
  remark: '',
})
const appealHandleForm = reactive({
  decision: 'pass',
  remark: '',
})
const commonForm = reactive({
  decision: 'pass',
  remark: '',
})
const inspectionForm = reactive({
  decision: 'pass',
  processDate: '',
  remark: '',
  inspector: '',
  companions: [],
  inspectionResult: '',
  attachments: [],
  hazardDescription: '',
  issueRectify: false,
  rectifier: '',
  reviewer: '',
  rectifyDeadline: '',
})

const inspectionActionMeta = computed(() => {
  const type = todo.value?.inspectionBizType || '巡检'
  const map = {
    巡检: { title: '巡检处理', remarkLabel: '巡检结果', pass: '完成巡检', reject: '退回任务' },
    整改: { title: '整改处理', remarkLabel: '整改说明', pass: '提交整改', reject: '退回' },
    复查: { title: '复查处理', remarkLabel: '复查意见', pass: '复查通过', reject: '复查不通过' },
    审批: { title: '项目经理审批', remarkLabel: '审批意见', pass: '审批通过', reject: '审批不通过' },
  }
  return map[type] || map.巡检
})

const personalCheckTree = computed(() => {
  const groups = new Map()
  for (const item of todo.value?.detail?.checkItems || []) {
    let id = 'general'
    let label = '安全管理行为'
    if (/临时用电|配电|电缆/.test(item)) {
      id = 'electric'
      label = '临时用电'
    } else if (/临边|高处|安全带/.test(item)) {
      id = 'height'
      label = '高处作业'
    } else if (/消防|灭火/.test(item)) {
      id = 'fire'
      label = '消防安全'
    } else if (/机械|设备|塔吊/.test(item)) {
      id = 'machine'
      label = '机械设备'
    }
    if (!groups.has(id)) groups.set(id, { id, label, items: [] })
    groups.get(id).items.push(item)
  }
  return [...groups.values()]
})
const activePersonalCheckCategoryId = ref('')
watch(personalCheckTree, (tree) => {
  if (!tree.some((item) => item.id === activePersonalCheckCategoryId.value)) {
    activePersonalCheckCategoryId.value = tree[0]?.id || ''
  }
}, { immediate: true })
const activePersonalCheckCategory = computed(() =>
  personalCheckTree.value.find((item) => item.id === activePersonalCheckCategoryId.value),
)
const brandLiveDetail = computed(() => {
  const appId = todo.value?.brandApplicationId
  if (!appId || todo.value?.type !== 'brand') return null
  return getApplicationDetail(appId)
})

/** 与新增报审对齐的备选列表（含备注、附件勾选槽位） */
const brandCandidates = computed(() => {
  if (brandLiveDetail.value?.candidates?.length) return brandLiveDetail.value.candidates
  return (todo.value?.brandCandidates || []).map((c) => ({
    ...c,
    remark: c.remark || '',
    attachSlots: c.attachSlots || [],
  }))
})

const brandNodeLabel = computed(() => {
  if (todo.value?.brandNode === 'supervisor') return '待监理审'
  if (todo.value?.brandNode === 'pm') return '待项目经理审'
  return todo.value?.detail?.currentNode || ''
})

const matEntryDetail = computed(() => {
  const id = todo.value?.matEntryId
  if (!id || todo.value?.type !== 'mat_entry') return null
  return getEntryDetail(id)
})

const eqEntryDetail = computed(() => {
  const id = todo.value?.eqEntryId
  if (!id || todo.value?.type !== 'eq_entry') return null
  return getEqEntryDetail(id)
})

function resetForms() {
  processTab.value = 'report'
  Object.assign(dispatchHazardForm, {
    remark: '',
    photos: [],
    decision: 'pass',
    rejectRemark: '',
  })
  Object.assign(reportForm, {
    penaltyClause: mergedPenalty.value?.penaltyClause || '',
    amount: mergedPenalty.value?.amount || '',
    reportResult: '',
    acceptor: mergedPenalty.value?.acceptor || '',
    attachments: [],
  })
  Object.assign(appealForm, { reason: '', attachments: [] })
  Object.assign(acceptForm, { decision: 'pass', remark: '' })
  Object.assign(appealHandleForm, { decision: 'pass', remark: '' })
  Object.assign(commonForm, { decision: 'pass', remark: '' })
  Object.assign(inspectionForm, {
    decision: 'pass',
    processDate: new Date().toISOString().slice(0, 10),
    remark: '',
    inspector: todo.value?.detail?.executor || '',
    companions: [...(todo.value?.detail?.companions || [])],
    inspectionResult: todo.value?.detail?.inspectionResult || '',
    attachments: [],
    hazardDescription: '',
    issueRectify: false,
    rectifier: todo.value?.detail?.rectifier || '',
    reviewer: todo.value?.detail?.reviewer || '',
    rectifyDeadline: todo.value?.detail?.deadline?.slice?.(0, 10) || '',
  })
}

watch(
  todo,
  (row) => {
    if (row?.type === 'labor_warning' && row.laborWarningId) {
      router.replace({
        name: 'LaborWarningDetail',
        params: { id: row.laborWarningId },
        query: {
          from: 'personal-center',
          tab: fromTab.value === 'done' ? 'done' : 'todo',
          todoId: row.id,
        },
      })
      return
    }
    if (row) resetForms()
  },
  { immediate: true },
)

function goBack() {
  const tab = fromTab.value
  router.push({ path: '/personal-center', query: tab === 'todo' ? {} : { tab } })
}

function flowType(status) {
  if (status === 'done') return 'success'
  if (status === 'current') return 'primary'
  return 'info'
}

function ensurePenaltyReadyForProcess(penaltyId) {
  if (!penaltyId) return
  const hit = getDispatchPenaltyRecords().find((item) => item.id === penaltyId)
  if (hit?.status === PENALTY_STATUSES.PENDING) {
    issueDispatchPenaltyRecord(penaltyId)
  }
}

function afterSubmit(handleLabel, message) {
  finishPersonalTodo(todoId.value, handleLabel)
  ElMessage.success(message)
  goBack()
}

function enqueueDispatchHazardAcceptTodo(hazard) {
  if (!hazard?.id) return
  const exists = personalTodoStore.todos.some(
    (item) => item.type === 'dispatch_hazard' && item.hazardId === hazard.id && item.bizType === DISPATCH_HAZARD_TODO_BIZ.ACCEPT,
  )
  if (exists) return
  personalTodoStore.todos.unshift({
    id: `todo-dispatch-hazard-accept-${hazard.id}-${Date.now()}`,
    type: 'dispatch_hazard',
    sourceLabel: '调度隐患',
    category: 'COC调度',
    bizType: DISPATCH_HAZARD_TODO_BIZ.ACCEPT,
    hazardId: hazard.id,
    processName: `调度隐患验收·${String(hazard.description || hazard.id).slice(0, 18)}`,
    applicant: hazard.rectifier || '整改人',
    dept: '总包项目部',
    applyTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    hazard: { ...hazard },
    approvalFlow: [],
  })
}

function submitDispatchHazardRectifyTodo() {
  const row = todo.value
  const hazard = mergedDispatchHazard.value
  if (!row || !hazard?.id) return
  if (!dispatchHazardForm.remark.trim()) return ElMessage.warning('请填写整改说明')
  if (!dispatchHazardForm.photos.length) return ElMessage.warning('请上传至少一张整改照片')
  const photos = dispatchHazardForm.photos
    .map((item, index) => ({
      name: item.name || resolveDispatchHazardPhotoName(item, index),
      url: item.url || '',
    }))
    .filter((item) => item.name || item.url)
  const result = submitDispatchHazardRectify(hazard.id, {
    remark: dispatchHazardForm.remark.trim(),
    photos,
    operator: '当前用户',
    operatorRole: '施工方',
  })
  if (!result || result.rectifyStatus !== '待验收') {
    return ElMessage.warning('提交失败，请确认当前隐患仍为待整改')
  }
  enqueueDispatchHazardAcceptTodo(result)
  afterSubmit('提交整改', '整改已提交，已生成验收待办')
}

function submitDispatchHazardAcceptTodo() {
  const row = todo.value
  const hazard = mergedDispatchHazard.value
  if (!row || !hazard?.id) return
  if (dispatchHazardForm.decision === 'pass') {
    const result = acceptDispatchHazard(hazard.id, {
      remark: dispatchHazardForm.remark.trim() || '现场核查整改到位，予以关闭',
      operator: '当前用户',
      operatorRole: '安质部',
    })
    if (!result || result.rectifyStatus !== '已关闭') {
      return ElMessage.warning('验收失败，请确认当前隐患仍为待验收')
    }
    afterSubmit('验收通过', '验收通过，隐患已关闭')
    return
  }
  if (!dispatchHazardForm.rejectRemark.trim()) return ElMessage.warning('请填写驳回原因')
  const result = rejectDispatchHazard(hazard.id, {
    remark: dispatchHazardForm.rejectRemark.trim(),
    operator: '当前用户',
    operatorRole: '安质部',
  })
  if (!result || result.rectifyStatus !== '待整改') {
    return ElMessage.warning('驳回失败，请确认当前隐患仍为待验收')
  }
  personalTodoStore.todos.unshift({
    id: `todo-dispatch-hazard-rectify-${result.id}-${Date.now()}`,
    type: 'dispatch_hazard',
    sourceLabel: '调度隐患',
    category: 'COC调度',
    bizType: DISPATCH_HAZARD_TODO_BIZ.RECTIFY,
    hazardId: result.id,
    processName: `调度隐患整改·${String(result.description || result.id).slice(0, 18)}`,
    applicant: '安质部',
    dept: '指挥部安质部',
    applyTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    hazard: { ...result },
    approvalFlow: [],
  })
  afterSubmit('验收驳回', '已驳回，已重新生成整改待办')
}

function submitProcessReport() {
  if (!reportForm.penaltyClause.trim()) return ElMessage.warning('请填写条款')
  if (!reportForm.amount.trim()) return ElMessage.warning('请填写金额')
  if (!reportForm.reportResult.trim()) return ElMessage.warning('请填写上报结果')
  if (!reportForm.acceptor.trim()) return ElMessage.warning('请选择验收人')
  const row = todo.value
  if (!row) return
  if (row.penaltyId) {
    ensurePenaltyReadyForProcess(row.penaltyId)
    submitPenaltyRecipientReport(row.penaltyId, {
      penaltyClause: reportForm.penaltyClause.trim(),
      amount: reportForm.amount.trim(),
      reportResult: reportForm.reportResult.trim(),
      acceptor: reportForm.acceptor.trim(),
      reportAttachments: reportForm.attachments.map((item, index) => ({
        name: item.name?.startsWith('上报结果附件')
          ? item.name
          : `上报结果附件-${index + 1}${String(item.name || '').match(/\.[a-z0-9]+$/i)?.[0] || '.jpg'}`,
        url: item.url,
      })),
    })
  }
  afterSubmit('上报结果', '上报成功，状态更新为待验收')
}

function submitProcessAppeal() {
  if (!appealForm.reason.trim()) return ElMessage.warning('请填写申诉理由')
  const row = todo.value
  if (!row) return
  if (row.penaltyId) {
    ensurePenaltyReadyForProcess(row.penaltyId)
    submitPenaltyAppeal(row.penaltyId, {
      appealReason: appealForm.reason.trim(),
      appealAttachments: appealForm.attachments.map((item, index) => ({
        name: item.name?.startsWith('申诉附件')
          ? item.name
          : `申诉附件-${index + 1}${String(item.name || '').match(/\.[a-z0-9]+$/i)?.[0] || '.jpg'}`,
        url: item.url || '',
      })),
    })
  }
  afterSubmit('提交申诉', '申诉已提交，状态更新为申诉中')
}

function submitAcceptHandle() {
  if (!acceptForm.remark.trim()) return ElMessage.warning('请填写说明')
  const row = todo.value
  if (!row) return
  const remark = acceptForm.remark.trim()
  if (acceptForm.decision === 'pass') {
    if (row.penaltyId) acceptPenaltyRecord(row.penaltyId, '当前用户', remark)
    afterSubmit('验收通过', '验收通过，处罚单已关闭')
  } else {
    if (row.penaltyId) rejectPenaltyAcceptance(row.penaltyId, remark)
    afterSubmit('验收驳回', '已驳回，处罚单退回处理中')
  }
}

function submitAppealHandle() {
  if (!appealHandleForm.remark.trim()) return ElMessage.warning('请填写说明')
  const row = todo.value
  if (!row) return
  const remark = appealHandleForm.remark.trim()
  const approved = appealHandleForm.decision === 'pass'
  if (row.penaltyId) resolvePenaltyAppeal(row.penaltyId, approved, '当前用户', remark)
  afterSubmit(
    approved ? '申诉通过并关闭' : '申诉驳回',
    approved ? '申诉已通过，处罚单已关闭' : '申诉已驳回，状态恢复为处理中',
  )
}

function submitCommonHandle() {
  const approved = commonForm.decision === 'pass'
  const row = todo.value
  const needRemark =
    !approved ||
    (row?.type !== 'sample' &&
      row?.type !== 'brand' &&
      row?.type !== 'subcontractor' &&
      row?.type !== 'mat_entry' &&
      row?.type !== 'eq_entry' &&
      row?.type !== 'asbuilt')
  if (needRemark && !commonForm.remark.trim()) {
    return ElMessage.warning(approved ? '请填写说明' : '请填写退回意见')
  }
  if (row?.type === 'subcontractor' && row.subcontractorApplicationId) {
    const action = approved ? 'agree' : 'reject'
    const opinion = commonForm.remark.trim()
    const r = handleSubcontractorTodo(row.id, { action, opinion })
    if (!r.ok) return ElMessage.error(r.msg)
    if (r.finished && !r.rejected) {
      return afterSubmit(
        '审批通过',
        '终审通过，已同步至项目画像「专业分包及劳务分包」，并抄送副指挥长',
      )
    }
    if (r.finished && r.rejected) {
      return afterSubmit('已驳回', '已驳回，报审单退回施工单位')
    }
    return afterSubmit('同意', `已同意，下一节点「${r.nextNodeTitle || '待流转'}」待办已生成`)
  }
  if (row?.type === 'asbuilt' && row.asbuiltAcceptanceId) {
    const action = approved ? 'approve' : 'reject'
    const comment = commonForm.remark.trim()
    if (row.asbuiltNode === 'supervisor') {
      const r = supervisorApproveAsbuilt(row.asbuiltAcceptanceId, { action, comment })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '监理通过' : '监理驳回',
        approved ? '已通过，指挥部项目经理终审待办已生成' : '已驳回，流程结束',
      )
    }
    if (row.asbuiltNode === 'pm') {
      const r = pmApproveAsbuilt(row.asbuiltAcceptanceId, { action, comment })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '终审通过' : '终审驳回',
        approved ? '终审通过，实模一致验收办结' : '已驳回，流程结束',
      )
    }
  }
  if (row?.type === 'eq_entry' && row.eqEntryId) {
    const action = approved ? 'agree' : 'reject'
    const opinion = commonForm.remark.trim()
    const r = supervisorApproveEqEntry(row.eqEntryId, { action, opinion })
    if (!r.ok) return ElMessage.error(r.msg)
    return afterSubmit(
      approved ? '监理同意' : '监理退回',
      approved ? '设备进场审批通过' : '已退回施工单位',
    )
  }
  if (row?.type === 'mat_entry' && row.matEntryId) {
    const action = approved ? 'agree' : 'reject'
    const opinion = commonForm.remark.trim()
    const r = supervisorApproveEntry(row.matEntryId, { action, opinion })
    if (!r.ok) return ElMessage.error(r.msg)
    return afterSubmit(
      approved ? '监理同意' : '监理退回',
      approved ? '进场审批通过' : '已退回施工单位',
    )
  }
  if (row?.type === 'brand' && row.brandApplicationId) {
    const action = approved ? 'agree' : 'reject'
    const opinion = commonForm.remark.trim()
    if (row.brandNode === 'supervisor') {
      const r = supervisorApprove(row.brandApplicationId, { action, opinion })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '监理同意' : '监理退回',
        approved
          ? '已同意，项目经理终审待办已生成（个人中心）'
          : '已退回施工单位',
      )
    }
    if (row.brandNode === 'pm') {
      const r = pmApprove(row.brandApplicationId, {
        action,
        opinion,
      })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '终审通过并入库' : '终审退回',
        approved ? '终审通过，已完成品牌入库' : '已退回施工单位',
      )
    }
  }
  if (row?.type === 'sample' && row.sampleApplicationId && row.sampleBizType) {
    const action = approved ? 'agree' : 'reject'
    const opinion = commonForm.remark.trim()
    if (row.sampleNode === 'supervisor') {
      const r = supervisorApproveSample(row.sampleBizType, row.sampleApplicationId, {
        action,
        opinion,
      })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '监理同意' : '监理退回',
        approved ? '已同意，项目经理终审待办已生成' : '已退回施工单位',
      )
    }
    if (row.sampleNode === 'pm') {
      const r = pmApproveSample(row.sampleBizType, row.sampleApplicationId, { action, opinion })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '终审通过' : '终审退回',
        approved
          ? row.sampleBizType === 'process'
            ? '终审通过，已生成二维码'
            : '终审通过，已入台账视图'
          : '已退回施工单位',
      )
    }
  }
  afterSubmit(approved ? '审批通过' : '审批驳回', approved ? '已审批通过' : '已驳回')
}

function submitInspectionHandle() {
  const row = todo.value
  if (!row) return
  const bizType = row.inspectionBizType
  if (bizType === '巡检') {
    if (!inspectionForm.inspectionResult) return ElMessage.warning('请选择巡检结果')
    if (inspectionForm.inspectionResult === 'hazard') {
      if (!inspectionForm.hazardDescription.trim()) return ElMessage.warning('请填写隐患说明')
      if (inspectionForm.issueRectify && !inspectionForm.rectifier) return ElMessage.warning('请选择整改人')
      if (inspectionForm.issueRectify && !inspectionForm.reviewer) return ElMessage.warning('请选择复查人')
      if (inspectionForm.issueRectify && !inspectionForm.rectifyDeadline) return ElMessage.warning('请选择整改截止日期')
    }
  } else {
    if (!inspectionForm.processDate) return ElMessage.warning(`请选择${bizType === '整改' ? '整改' : bizType === '复查' ? '复查' : '审批'}日期`)
    if (bizType === '整改' && inspectionForm.attachments.length === 0) return ElMessage.warning('请至少上传一张整改照片')
    if (!inspectionForm.remark.trim()) {
      return ElMessage.warning(`请填写${inspectionActionMeta.value.remarkLabel}`)
    }
  }

  const approved = inspectionForm.decision === 'pass'
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  const remark = inspectionForm.remark.trim()
  const nextStatus = bizType === '巡检'
    ? '已完成'
    : bizType === '整改'
      ? '待复查'
      : bizType === '复查'
        ? (approved ? '已复查' : '待整改')
        : (approved ? '已关闭' : '待复查')
  row.detail = {
    ...(row.detail || {}),
    status: nextStatus,
    closeDate: bizType === '审批' && approved ? inspectionForm.processDate : row.detail?.closeDate,
    processDate: bizType === '巡检' ? row.detail?.processDate : inspectionForm.processDate,
    processResult: approved ? inspectionActionMeta.value.pass : inspectionActionMeta.value.reject,
    processRemark: remark,
    inspector: row.detail?.executor || inspectionForm.inspector || row.detail?.inspector,
    companions: [...inspectionForm.companions],
    inspectionResult: inspectionForm.inspectionResult || row.detail?.inspectionResult,
    inspectionDate: bizType === '巡检' ? new Date().toISOString().slice(0, 10) : row.detail?.inspectionDate,
    normalPhotos: inspectionForm.inspectionResult === 'normal' ? inspectionForm.attachments.map((item) => item.name) : row.detail?.normalPhotos,
    hazardItems: inspectionForm.inspectionResult === 'hazard'
      ? [{
          desc: inspectionForm.hazardDescription.trim(),
          photos: inspectionForm.attachments.map((item) => item.name),
          issueRectify: inspectionForm.issueRectify,
          rectifier: inspectionForm.rectifier,
          reviewer: inspectionForm.reviewer,
          rectifyDeadline: inspectionForm.rectifyDeadline,
        }]
      : row.detail?.hazardItems,
    rectificationDate: bizType === '整改' ? inspectionForm.processDate : row.detail?.rectificationDate,
    rectificationPhotos: bizType === '整改' ? inspectionForm.attachments.map((item) => item.name) : row.detail?.rectificationPhotos,
    rectificationNote: bizType === '整改' ? remark : row.detail?.rectificationNote,
    reviewDate: bizType === '复查' ? inspectionForm.processDate : row.detail?.reviewDate,
    reviewResult: bizType === '复查' ? (approved ? '通过' : '不通过') : row.detail?.reviewResult,
    reviewComment: bizType === '复查' ? remark : row.detail?.reviewComment,
    approvalDate: bizType === '审批' ? inspectionForm.processDate : row.detail?.approvalDate,
    approvalResult: bizType === '审批' ? (approved ? '通过' : '不通过') : row.detail?.approvalResult,
    approvalComment: bizType === '审批' ? remark : row.detail?.approvalComment,
  }

  if (bizType === '审批' && row.rectifyId) {
    const ok = submitManagerApproval(row.rectifyId, approved, {
      approvalDate: inspectionForm.processDate,
      approvalComment: remark,
    })
    if (!ok) return ElMessage.error('未找到关联整改单，无法完成审批')
  }

  const currentIndex = (row.approvalFlow || []).findIndex((step) => step.status === 'current')
  const completed = (row.approvalFlow || []).map((step, index) => {
    if (index !== currentIndex) return { ...step }
    return {
      ...step,
      status: 'done',
      time: now,
      user: step.user || '当前用户',
      remark: remark
        ? `${approved ? inspectionActionMeta.value.pass : inspectionActionMeta.value.reject}：${remark}`
        : (approved ? inspectionActionMeta.value.pass : inspectionActionMeta.value.reject),
    }
  })

  if (approved) {
    if (bizType === '审批') {
      row.approvalFlow = completed.map((step, index) =>
        index === completed.length - 1
          ? { ...step, status: 'done', time: now, user: '系统', remark: '项目经理审批通过，流程已关闭' }
          : step,
      )
      row.detail.currentNode = '流程关闭'
    } else {
      const nextIndex = currentIndex + 1
      row.approvalFlow = completed.map((step, index) =>
        index === nextIndex ? { ...step, status: 'current', remark: '待处理' } : step,
      )
      row.detail.currentNode = row.approvalFlow[nextIndex]?.title || '流程关闭'
    }
  } else if (bizType === '审批') {
    row.approvalFlow = [
      ...completed,
      { title: '复查人重新复查', time: '', user: row.detail?.reviewer || '复查人', remark: '项目经理审批不通过，退回复查', status: 'current' },
      { title: '流程关闭', time: '', user: '系统', remark: '待流转', status: 'pending' },
    ]
    row.detail.currentNode = '复查人重新复查'
  } else {
    const returnTitle = bizType === '复查' ? '整改人重新整改' : '退回重新处理'
    row.approvalFlow = [
      ...completed,
      { title: returnTitle, time: '', user: bizType === '复查' ? row.detail?.rectifier : row.applicant, remark, status: 'current' },
    ]
    row.detail.currentNode = returnTitle
  }

  afterSubmit(
    approved ? inspectionActionMeta.value.pass : inspectionActionMeta.value.reject,
    bizType === '审批' && approved
      ? '审批通过，整改单已关闭'
      : bizType === '审批'
        ? '审批不通过，已退回复查人重新复查'
        : `${inspectionActionMeta.value.title}已提交`,
  )
}
</script>

<template>
  <div class="handle-page page-card" :class="{ 'is-brand': todo?.type === 'brand' }">
    <div class="page-header">
      <div class="title-row">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <div class="title-meta">
          <div class="title-line">
            <h1 class="page-title">{{ pageTitle }}</h1>
            <el-tag
              v-if="todoSourceLabel"
              size="small"
              type="danger"
              effect="plain"
              class="source-tag"
            >
              {{ todoSourceLabel }}
            </el-tag>
            <el-tag v-if="isReadonly" size="small" type="info" effect="plain">只读</el-tag>
          </div>
          <p v-if="todo?.processName" class="page-sub">{{ todo.processName }}</p>
        </div>
      </div>
    </div>

    <el-empty v-if="!todo" :description="emptyText" :image-size="80">
      <el-button type="primary" @click="goBack">返回</el-button>
    </el-empty>

    <template v-else>
      <!-- 品牌报审：分区展示 -->
      <template v-if="todo.type === 'brand'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">报审信息</div>
            <el-tag v-if="brandNodeLabel" size="small" type="warning" effect="light">
              {{ brandNodeLabel }}
            </el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="报审编号">
              {{ todo.detail?.applicationId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目">
              {{ todo.detail?.project || todo.projectName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="材料/设备">
              {{ todo.detail?.materialName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="材料类型">
              {{ todo.detail?.materialType || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="施工部位">
              {{ todo.detail?.usePart || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="申请人">
              {{ todo.applicant || '—' }}
              <span v-if="todo.dept" class="meta-sep">· {{ todo.dept }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="申请时间">
              {{ todo.applyTime || '—' }}
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">报审品牌</div>
            <el-tag size="small" type="info" effect="plain">共 {{ brandCandidates.length }} 条</el-tag>
          </div>
          <div class="brand-cand-list">
            <div
              v-for="(c, idx) in brandCandidates"
              :key="c.candidate_id || idx"
              class="brand-cand-card"
            >
              <div class="brand-cand-card-head">
                <div class="brand-cand-card-title">
                  <span class="cand-badge">{{ idx + 1 }}</span>
                  <el-tag
                    v-if="c.is_primary || idx === 0"
                    size="small"
                    type="success"
                    effect="plain"
                  >
                    主选品牌
                  </el-tag>
                  <el-tag v-else size="small" type="info" effect="plain">备选品牌</el-tag>
                </div>
              </div>
              <div class="cand-fields">
                <div class="cand-field-row">
                  <span class="cand-label">品牌名称</span>
                  <span class="cand-value">{{ c.brand_name || '—' }}</span>
                </div>
                <div class="cand-field-row">
                  <span class="cand-label">生产厂家</span>
                  <span class="cand-value">{{ c.manufacturer || '—' }}</span>
                </div>
              </div>
              <BrandCandidateAttachBlock :candidate="c" :editable="false" />
            </div>
          </div>
        </section>
      </template>

      <!-- 样板管理 -->
      <template v-else-if="todo.type === 'sample'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">样板报审信息</div>
            <el-tag size="small" type="warning" effect="light">
              {{ todo.detail?.currentNode || (todo.sampleNode === 'pm' ? '待项目经理审' : '待监理审') }}
            </el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="报审编号">
              {{ todo.detail?.applicationId || todo.sampleApplicationId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ todo.detail?.bizType || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="名称">
              {{ todo.detail?.title || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="施工部位">
              {{ todo.detail?.usePart || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目">
              {{ todo.detail?.project || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="申请人">
              {{ todo.applicant || '—' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="todo.sampleBizType === 'material'"
              label="供应商"
            >
              {{ todo.detail?.supplier || '—' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="todo.sampleBizType === 'material'"
              label="材料指标说明"
              :span="2"
            >
              {{ todo.detail?.indicatorDesc || todo.detail?.briefing || '—' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-else
              label="关键工序样板说明"
              :span="2"
            >
              {{ todo.detail?.briefing || '—' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="todo.sampleBizType === 'material' && todo.detail?.effectImages?.length"
              label="效果图"
              :span="2"
            >
              {{ todo.detail.effectImages.map((f) => f.name || f).join('、') }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="todo.sampleBizType === 'material' && todo.detail?.approvalFiles?.length"
              label="审批文件"
              :span="2"
            >
              {{ todo.detail.approvalFiles.map((f) => f.name || f).join('、') }}
            </el-descriptions-item>
          </el-descriptions>
        </section>
      </template>

      <!-- 实模一致验收 -->
      <template v-else-if="todo.type === 'asbuilt'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">实模一致验收信息</div>
            <el-tag size="small" type="warning" effect="light">
              {{
                todo.detail?.currentNode ||
                (todo.asbuiltNode === 'pm' ? '待项目经理终审' : '待监理审')
              }}
            </el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="验收单号">
              {{ todo.detail?.bizNo || todo.asbuiltAcceptanceId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目">
              {{ todo.detail?.project || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="任务名称" :span="2">
              {{ todo.detail?.title || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="所选节点" :span="2">
              {{ todo.detail?.nodePaths || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="对比地址" :span="2">
              <a
                v-if="todo.detail?.compareUrl && todo.detail.compareUrl !== '—'"
                :href="todo.detail.compareUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ todo.detail.compareUrl }}
              </a>
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="申请人">
              {{ todo.applicant || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="提交时间">
              {{ todo.applyTime || '—' }}
            </el-descriptions-item>
          </el-descriptions>
        </section>
      </template>

      <!-- 材料进场 -->
      <template v-else-if="todo.type === 'mat_entry'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">进场报验信息</div>
            <el-tag size="small" type="warning" effect="light">审核中</el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="进场单号">
              {{ matEntryDetail?.entry_id || todo.detail?.entryId || todo.matEntryId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目">
              {{ matEntryDetail?.project_label || todo.detail?.project || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="材料名称">
              {{ matEntryDetail?.material_name || todo.detail?.materialName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="品牌">
              {{ matEntryDetail?.brand_name || todo.detail?.brandName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="定样单号">
              {{ matEntryDetail?.sample_id || todo.detail?.sampleId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="数量">
              <template v-if="matEntryDetail">
                {{ matEntryDetail.quantity }}{{ matEntryDetail.unit }}
              </template>
              <template v-else>{{ todo.detail?.quantity || '—' }}</template>
            </el-descriptions-item>
            <el-descriptions-item label="供应商">
              {{ matEntryDetail?.supplier || '—' }}
            </el-descriptions-item>
          </el-descriptions>
          <div
            v-if="matEntryDetail?.line_items?.length"
            class="mat-line-wrap"
            style="margin-top: 12px"
          >
            <div class="block-title" style="margin-bottom: 8px">材料进场明细</div>
            <el-table :data="matEntryDetail.line_items" border stripe size="small">
              <el-table-column type="index" label="#" width="50" />
              <el-table-column prop="material_name" label="材料名称" min-width="110" show-overflow-tooltip />
              <el-table-column prop="material_spec" label="规格型号" min-width="120" show-overflow-tooltip />
              <el-table-column label="数量" width="90">
                <template #default="{ row }">{{ row.quantity }}{{ row.unit }}</template>
              </el-table-column>
              <el-table-column prop="purpose" label="用途" min-width="90" show-overflow-tooltip>
                <template #default="{ row }">{{ row.purpose || '—' }}</template>
              </el-table-column>
              <el-table-column prop="use_part" label="使用部位" min-width="110" show-overflow-tooltip>
                <template #default="{ row }">{{ row.use_part || '—' }}</template>
              </el-table-column>
              <el-table-column label="批次号" width="90">
                <template #default="{ row }">{{ formatBatchNo(row.batch_no) }}</template>
              </el-table-column>
              <el-table-column prop="appearance_quality" label="外观质量" width="90">
                <template #default="{ row }">{{ row.appearance_quality || '—' }}</template>
              </el-table-column>
              <el-table-column prop="acceptance_result" label="验收结论" width="90">
                <template #default="{ row }">{{ row.acceptance_result || '—' }}</template>
              </el-table-column>
              <el-table-column prop="entry_date" label="进场日期" min-width="150" show-overflow-tooltip>
                <template #default="{ row }">{{ row.entry_date || '—' }}</template>
              </el-table-column>
              <el-table-column label="合格证" min-width="120" show-overflow-tooltip>
                <template #default="{ row }">{{ row.cert_file || matEntryDetail.cert_file || '—' }}</template>
              </el-table-column>
              <el-table-column label="质量证明文件" min-width="140" show-overflow-tooltip>
                <template #default="{ row }">{{ row.inspect_file || matEntryDetail.inspect_file || '—' }}</template>
              </el-table-column>
              <el-table-column label="现场照片" min-width="120" show-overflow-tooltip>
                <template #default="{ row }">{{ row.photo_file || matEntryDetail.photo_file || '—' }}</template>
              </el-table-column>
              <el-table-column label="其他" min-width="120" show-overflow-tooltip>
                <template #default="{ row }">{{ row.other_file || matEntryDetail.other_file || '—' }}</template>
              </el-table-column>
            </el-table>
          </div>
        </section>
      </template>

      <!-- 调度隐患（字段与「调度隐患清单 · 详情」一致） -->
      <template v-else-if="todo.type === 'dispatch_hazard' && mergedDispatchHazard">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">调度隐患信息</div>
            <el-tag size="small" effect="plain">{{ todo.bizType }}</el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="项目名称">{{ mergedDispatchHazard.projectName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="隐患类型">{{ hazardTypeLabel(mergedDispatchHazard.hazardType) }}</el-descriptions-item>
            <el-descriptions-item label="隐患描述" :span="2">{{ mergedDispatchHazard.description || '—' }}</el-descriptions-item>
            <el-descriptions-item label="隐患等级">{{ mergedDispatchHazard.hazardLevel || '—' }}</el-descriptions-item>
            <el-descriptions-item label="整改状态">{{ mergedDispatchHazard.rectifyStatus || '待整改' }}</el-descriptions-item>
            <el-descriptions-item label="整改人">{{ mergedDispatchHazard.rectifier || '—' }}</el-descriptions-item>
            <el-descriptions-item label="整改期限">{{ mergedDispatchHazard.hazardDeadline || '—' }}</el-descriptions-item>
            <el-descriptions-item label="摄像头">{{ mergedDispatchHazard.cameraName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="监控点位">{{ mergedDispatchHazard.cameraLocation || '—' }}</el-descriptions-item>
            <el-descriptions-item label="截图方式">{{ sourceTypeLabel(mergedDispatchHazard.sourceType) }}</el-descriptions-item>
            <el-descriptions-item label="登记来源">{{ mergedDispatchHazard.source || '问题截图' }}</el-descriptions-item>
            <el-descriptions-item label="登记时间" :span="2">
              {{ mergedDispatchHazard.uploadTime || todo.applyTime || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="问题截图" :span="2">
              <div class="dispatch-hazard-thumb">
                <img
                  v-if="mergedDispatchHazard.snapshot"
                  :src="mergedDispatchHazard.snapshot"
                  alt="问题截图"
                  class="dispatch-hazard-thumb__img"
                />
                <div v-else class="dispatch-hazard-thumb__empty">暂无截图</div>
              </div>
            </el-descriptions-item>
            <el-descriptions-item
              v-if="mergedDispatchHazard.rectifyStatus !== '待整改'"
              label="整改说明"
              :span="2"
            >
              {{ mergedDispatchHazard.rectifyRemark || '—' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="mergedDispatchHazard.rectifyStatus !== '待整改'"
              label="整改照片"
              :span="2"
            >
              <div v-if="mergedDispatchHazard.rectifyPhotos?.length" class="dispatch-hazard-photo-thumbs">
                <el-image
                  v-for="(photo, index) in mergedDispatchHazard.rectifyPhotos"
                  :key="`${resolveDispatchHazardPhotoName(photo, index)}-${index}`"
                  :src="resolveDispatchHazardPhotoSrc(photo, index)"
                  :preview-src-list="dispatchHazardRectifyPhotoUrls"
                  :initial-index="index"
                  fit="cover"
                  class="dispatch-hazard-thumb"
                  :alt="resolveDispatchHazardPhotoName(photo, index)"
                />
              </div>
              <span v-else>—</span>
            </el-descriptions-item>
          </el-descriptions>
        </section>
      </template>

      <!-- 设备进场 -->
      <template v-else-if="todo.type === 'eq_entry'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">设备进场报验信息</div>
            <el-tag size="small" type="warning" effect="light">审核中</el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="进场单号">
              {{ eqEntryDetail?.entry_id || todo.detail?.entryId || todo.eqEntryId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目">
              {{ eqEntryDetail?.project_label || todo.detail?.project || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="设备名称">
              {{ eqEntryDetail?.equipment_name || todo.detail?.equipmentName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="品牌">
              {{ eqEntryDetail?.brand_name || todo.detail?.brandName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="定样单号">
              {{ eqEntryDetail?.sample_id || todo.detail?.sampleId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="数量">
              <template v-if="eqEntryDetail">
                {{ eqEntryDetail.quantity }}{{ eqEntryDetail.unit }}
              </template>
              <template v-else>{{ todo.detail?.quantity || '—' }}</template>
            </el-descriptions-item>
            <el-descriptions-item label="供应商">
              {{ eqEntryDetail?.supplier || '—' }}
            </el-descriptions-item>
          </el-descriptions>
          <div
            v-if="eqEntryDetail?.line_items?.length"
            class="mat-line-wrap"
            style="margin-top: 12px"
          >
            <div class="block-title" style="margin-bottom: 8px">设备进场明细</div>
            <div
              v-for="(row, idx) in eqEntryDetail.line_items"
              :key="`${row.equipment_name || row.material_name}-${idx}`"
              class="eq-line-block"
              style="margin-bottom: 12px"
            >
              <div class="block-title" style="margin-bottom: 8px; font-size: 13px">
                设备 {{ idx + 1 }}
              </div>
              <el-table :data="[row]" border stripe size="small" style="margin-bottom: 8px">
                <el-table-column prop="equipment_name" label="设备名称" min-width="110" show-overflow-tooltip>
                  <template #default="{ row: r }">{{ r.equipment_name || r.material_name || '—' }}</template>
                </el-table-column>
                <el-table-column label="规格型号" min-width="110" show-overflow-tooltip>
                  <template #default="{ row: r }">{{ r.model || r.material_spec || '—' }}</template>
                </el-table-column>
                <el-table-column label="数量" width="90">
                  <template #default="{ row: r }">{{ r.quantity }}{{ r.unit }}</template>
                </el-table-column>
                <el-table-column prop="serial_no" label="序列号" min-width="100" show-overflow-tooltip>
                  <template #default="{ row: r }">{{ r.serial_no || '—' }}</template>
                </el-table-column>
                <el-table-column prop="use_part" label="使用部位" min-width="110" show-overflow-tooltip>
                  <template #default="{ row: r }">{{ r.use_part || '—' }}</template>
                </el-table-column>
                <el-table-column label="批次号" width="90">
                  <template #default="{ row: r }">{{ formatBatchNo(r.batch_no) }}</template>
                </el-table-column>
                <el-table-column label="合格证" min-width="110" show-overflow-tooltip>
                  <template #default="{ row: r }">{{ r.cert_file || eqEntryDetail.cert_file || '—' }}</template>
                </el-table-column>
                <el-table-column label="质量证明文件" min-width="120" show-overflow-tooltip>
                  <template #default="{ row: r }">{{ r.inspect_file || eqEntryDetail.inspect_file || '—' }}</template>
                </el-table-column>
              </el-table>
              <el-row
                v-if="row.unpack_items?.length"
                :gutter="12"
                style="margin-bottom: 4px"
              >
                <el-col
                  v-for="unpackRow in row.unpack_items"
                  :key="unpackRow.key || unpackRow.label"
                  :span="6"
                >
                  <div
                    style="margin-bottom: 8px; padding: 8px 10px; border: 1px solid #ebeef5; border-radius: 6px; background: #fff"
                  >
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px">
                      <span style="font-size: 13px; font-weight: 600; color: #606266">{{
                        unpackRow.label
                      }}</span>
                      <el-tag size="small" :type="unpackRow.ok ? 'success' : 'danger'">
                        {{ unpackRow.ok ? '合格' : '不合格' }}
                      </el-tag>
                    </div>
                    <div style="margin-top: 4px; font-size: 12px; color: #909399">
                      {{ unpackRow.remark || '无备注' }}
                    </div>
                  </div>
                </el-col>
              </el-row>
            </div>
          </div>
          <div v-else-if="eqEntryDetail?.unpack_items?.length" style="margin-top: 12px">
            <div class="block-title" style="margin-bottom: 8px; font-size: 14px">开箱清单</div>
            <el-row :gutter="12">
              <el-col
                v-for="unpackRow in eqEntryDetail.unpack_items"
                :key="unpackRow.key || unpackRow.label"
                :span="6"
              >
                <div
                  style="margin-bottom: 8px; padding: 8px 10px; border: 1px solid #ebeef5; border-radius: 6px; background: #fff"
                >
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px">
                    <span style="font-size: 13px; font-weight: 600; color: #606266">{{
                      unpackRow.label
                    }}</span>
                    <el-tag size="small" :type="unpackRow.ok ? 'success' : 'danger'">
                      {{ unpackRow.ok ? '合格' : '不合格' }}
                    </el-tag>
                  </div>
                  <div style="margin-top: 4px; font-size: 12px; color: #909399">
                    {{ unpackRow.remark || '无备注' }}
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
        </section>
      </template>

      <!-- 巡检管理 -->
      <template v-else-if="todo.type === 'inspection'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">详情信息</div>
          </div>
          <div class="inspection-stage-banner">
            <div>
              <span class="inspection-stage-label">当前业务</span>
              <strong>{{ todo.inspectionBizType }}</strong>
            </div>
            <el-tag type="warning" effect="light">{{ todo.detail?.currentNode || '—' }}</el-tag>
          </div>
          <el-descriptions v-if="todo.inspectionBizType === '巡检'" :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="巡检任务单编号">{{ todo.detail?.taskNo || '—' }}</el-descriptions-item>
            <el-descriptions-item label="计划名称">{{ todo.detail?.planName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="计划编号">{{ todo.detail?.planNo || '—' }}</el-descriptions-item>
            <el-descriptions-item label="任务来源">{{ todo.detail?.source || '—' }}</el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ todo.detail?.project || '—' }}</el-descriptions-item>
            <el-descriptions-item label="执行人">{{ todo.detail?.executor || '—' }}</el-descriptions-item>
            <el-descriptions-item label="巡检分类">
              <el-tag size="small" effect="plain">{{ todo.detail?.inspectionCategory || '—' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="同行人">{{ todo.detail?.companions?.join('、') || '—' }}</el-descriptions-item>
            <el-descriptions-item label="巡检类型">{{ todo.detail?.planType || '—' }}</el-descriptions-item>
            <el-descriptions-item :label="todo.detail?.status === '已完成' ? '巡检日期' : '截止日期'">
              {{ todo.detail?.status === '已完成' ? (todo.detail?.inspectionDate || '—') : (todo.detail?.deadline || '—') }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">{{ todo.detail?.status || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.summary" label="任务说明" :span="2">{{ todo.detail.summary }}</el-descriptions-item>
          </el-descriptions>
          <el-descriptions v-else :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="整改单编号">{{ todo.detail?.rectifyNo || '—' }}</el-descriptions-item>
            <el-descriptions-item label="巡检任务单编号">{{ todo.detail?.taskNo || '—' }}</el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ todo.detail?.project || '—' }}</el-descriptions-item>
            <el-descriptions-item label="巡检分类">
              <el-tag size="small" effect="plain">{{ todo.detail?.inspectionCategory || '—' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="整改人">{{ todo.detail?.rectifier || '—' }}</el-descriptions-item>
            <el-descriptions-item label="复查人">{{ todo.detail?.reviewer || '—' }}</el-descriptions-item>
            <el-descriptions-item label="截止日期">{{ todo.detail?.deadline || '—' }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ todo.detail?.status || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.closeDate" label="关闭日期">{{ todo.detail.closeDate }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="todo.inspectionBizType !== '巡检' && todo.detail?.hazard" class="inspection-detail-block">
            <div class="inspection-section-title">隐患信息</div>
            <div class="inspection-kv"><span>隐患说明</span><b>{{ todo.detail.hazard }}</b></div>
            <div v-if="todo.detail?.hazardPhotos?.length" class="inspection-kv"><span>隐患照片</span><b>{{ todo.detail.hazardPhotos.join('、') }}</b></div>
          </div>
          <div v-if="todo.detail?.rectificationDate || todo.detail?.rectificationNote" class="inspection-detail-block">
            <div class="inspection-section-title">整改信息</div>
            <div v-if="todo.detail?.rectificationDate" class="inspection-kv"><span>整改日期</span><b>{{ todo.detail.rectificationDate }}</b></div>
            <div v-if="todo.detail?.rectificationPhotos?.length" class="inspection-kv"><span>整改照片</span><b>{{ todo.detail.rectificationPhotos.join('、') }}</b></div>
            <div v-if="todo.detail?.rectificationNote" class="inspection-kv"><span>整改说明</span><b>{{ todo.detail.rectificationNote }}</b></div>
          </div>
          <div v-if="todo.detail?.reviewDate || todo.detail?.reviewResult || todo.detail?.reviewComment" class="inspection-detail-block">
            <div class="inspection-section-title">复查信息</div>
            <div v-if="todo.detail?.reviewDate" class="inspection-kv"><span>复查日期</span><b>{{ todo.detail.reviewDate }}</b></div>
            <div v-if="todo.detail?.reviewResult" class="inspection-kv"><span>复查结果</span><b class="inspection-pass-text">{{ todo.detail.reviewResult }}</b></div>
            <div v-if="todo.detail?.reviewComment" class="inspection-kv"><span>复查意见</span><b>{{ todo.detail.reviewComment }}</b></div>
          </div>
          <div v-if="todo.detail?.manager" class="inspection-detail-block">
            <div class="inspection-section-title">项目经理审批</div>
            <div class="inspection-kv"><span>审批人</span><b>{{ todo.detail.manager }}</b></div>
            <div class="inspection-kv"><span>审批状态</span><b>{{ todo.detail?.approvalResult || (todo.detail.status === '已关闭' ? '通过' : '审批中') }}</b></div>
            <div v-if="todo.detail?.approvalDate" class="inspection-kv"><span>审批日期</span><b>{{ todo.detail.approvalDate }}</b></div>
            <div v-if="todo.detail?.approvalComment" class="inspection-kv"><span>审批意见</span><b>{{ todo.detail.approvalComment }}</b></div>
          </div>
          <div v-if="todo.detail?.checkItems?.length" class="inspection-detail-block">
            <div class="inspection-section-title">检查项</div>
            <div class="inspection-tree-layout">
              <div class="inspection-tree-side">
                <button
                  v-for="category in personalCheckTree"
                  :key="category.id"
                  type="button"
                  class="inspection-tree-node"
                  :class="{ active: activePersonalCheckCategoryId === category.id }"
                  @click="activePersonalCheckCategoryId = category.id"
                >
                  <span>{{ category.label }}</span>
                  <b>{{ category.items.length }}</b>
                </button>
              </div>
              <div class="inspection-tree-content">
                <div class="inspection-tree-heading">
                  {{ activePersonalCheckCategory?.label || '检查项' }}（{{ activePersonalCheckCategory?.items?.length || 0 }}项）
                </div>
                <div v-for="item in activePersonalCheckCategory?.items || []" :key="item" class="inspection-tree-item">
                  {{ item }}
                </div>
              </div>
            </div>
          </div>
          <div v-if="todo.detail?.inspectionResult" class="inspection-detail-block">
            <div class="inspection-section-title">巡检结果</div>
            <el-tag :type="todo.detail.inspectionResult === 'normal' ? 'success' : 'danger'">
              {{ todo.detail.inspectionResult === 'normal' ? '全部正常' : '有隐患' }}
            </el-tag>
            <span v-if="todo.detail?.normalPhotos?.length" class="inspection-file-text">巡检照片：{{ todo.detail.normalPhotos.join('、') }}</span>
            <div v-for="(hazard, index) in todo.detail?.hazardItems || []" :key="index" class="inspection-hazard-card">
              <strong>隐患 {{ index + 1 }}</strong>
              <span>说明：{{ hazard.desc }}</span>
              <span v-if="hazard.photos?.length">照片：{{ hazard.photos.join('、') }}</span>
              <span>下发整改单：{{ hazard.issueRectify ? '是' : '否' }}</span>
              <span v-if="hazard.issueRectify">整改人：{{ hazard.rectifier }}　复查人：{{ hazard.reviewer }}　截止：{{ hazard.rectifyDeadline }}</span>
            </div>
          </div>
        </section>
      </template>

      <!-- 分包单位报审 -->
      <template v-else-if="todo.type === 'subcontractor'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">分包单位报审信息</div>
            <el-tag size="small" type="warning" effect="light">
              {{
                subcontractorLiveDetail?.approvalFlow?.find((s) => s.status === 'current')?.title ||
                todo.detail?.currentNode ||
                '待审批'
              }}
            </el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="报审编号">
              {{ todo.detail?.applicationId || todo.subcontractorApplicationId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目">
              {{ subcontractorLiveDetail?.projectName || todo.detail?.project || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="分包单位">
              {{ subcontractorLiveDetail?.name || todo.detail?.unitName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ subcontractorLiveDetail?.unitType || todo.detail?.unitType || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目负责人">
              {{
                subcontractorLiveDetail?.projectLeaderContact ||
                todo.detail?.projectLeaderContact ||
                '—'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="安全管理人员">
              {{
                subcontractorLiveDetail?.safetyManagerContact ||
                todo.detail?.safetyManagerContact ||
                '—'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="安全许可证编号" :span="2">
              {{
                subcontractorLiveDetail?.safetyLicense?.licenseNo ||
                todo.detail?.safetyLicenseNo ||
                '—'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="组织架构说明" :span="2">
              {{ subcontractorLiveDetail?.orgStructureDesc || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="申请人">{{ todo.applicant || '—' }}</el-descriptions-item>
            <el-descriptions-item label="申请时间">{{ todo.applyTime || '—' }}</el-descriptions-item>
          </el-descriptions>
        </section>
      </template>

      <!-- 其他类型：详情信息 -->
      <section v-else class="block block--panel">
        <div class="block-head">
          <div class="block-title">详情信息</div>
        </div>
        <template v-if="todo.type === 'penalty' && mergedPenalty">
          <PenaltyDetailPanels :record="mergedPenalty" />
        </template>
        <template v-else>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="流程名称" :span="2">{{ todo.processName }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ todo.applicant || '—' }}</el-descriptions-item>
            <el-descriptions-item label="申请部门">{{ todo.dept || '—' }}</el-descriptions-item>
            <el-descriptions-item label="申请时间">{{ todo.applyTime || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.handleTime" label="处理时间">{{ todo.handleTime }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.status" label="处理状态">{{ todo.status }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.endTime" label="结束时间">{{ todo.endTime || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.category" label="所属模块">{{ todo.category }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.projectName" label="项目名称">{{ todo.projectName }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.readStatus" label="阅读状态">{{ todo.readStatus }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.project" label="项目">{{ todo.detail.project }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.applicationId" label="报审编号">
              {{ todo.detail.applicationId }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.materialName" label="材料/设备">
              {{ todo.detail.materialName }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.materialType" label="材料类型">
              {{ todo.detail.materialType }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.specs" label="规格型号" :span="2">
              {{ todo.detail.specs }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.brands" label="备选品牌" :span="2">
              {{ todo.detail.brands }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.currentNode" label="当前节点">
              {{ todo.detail.currentNode }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.usePart" label="施工部位">
              {{ todo.detail.usePart }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.nodeName" label="节点">{{ todo.detail.nodeName }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.planName" label="计划" :span="2">{{ todo.detail.planName }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.specialty" label="专业">{{ todo.detail.specialty }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.summary" label="说明" :span="2">{{ todo.detail.summary }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </section>

      <!-- 审批操作：仅待办处理展示 -->
      <section v-if="!isReadonly" class="block block--panel block--action">
        <div class="block-head">
          <div class="block-title">{{ todo.type === 'inspection' ? inspectionActionMeta.title : '审批操作' }}</div>
        </div>

        <template v-if="todo.type === 'inspection'">
          <el-form label-width="108px" class="op-form inspection-op-form">
            <template v-if="todo.inspectionBizType === '巡检'">
              <el-form-item label="同行人">
                <el-select v-model="inspectionForm.companions" multiple filterable placeholder="请选择同行人" style="width: 100%" aria-label="请选择同行人">
                  <el-option v-for="u in userOptions" :key="u.id" :label="getUserLabel(u.id)" :value="getUserLabel(u.id)" />
                </el-select>
              </el-form-item>
              <el-form-item label="巡检结果" required>
                <el-radio-group v-model="inspectionForm.inspectionResult">
                  <el-radio value="normal">全部正常</el-radio>
                  <el-radio value="hazard">有隐患</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item :label="inspectionForm.inspectionResult === 'hazard' ? '隐患照片' : '巡检照片'">
                <DispatchImageAttachments v-model="inspectionForm.attachments" />
              </el-form-item>
              <template v-if="inspectionForm.inspectionResult === 'hazard'">
                <el-form-item label="隐患说明" required>
                  <el-input v-model="inspectionForm.hazardDescription" type="textarea" :rows="3" placeholder="请描述隐患情况" aria-label="请描述隐患情况"/>
                </el-form-item>
                <el-form-item label="下发整改单">
                  <el-switch v-model="inspectionForm.issueRectify" />
                </el-form-item>
                <template v-if="inspectionForm.issueRectify">
                  <el-form-item label="整改人" required>
                    <el-select v-model="inspectionForm.rectifier" filterable placeholder="请选择整改人" style="width: 100%" aria-label="请选择整改人">
                      <el-option v-for="u in userOptions" :key="u.id" :label="getUserLabel(u.id)" :value="getUserLabel(u.id)" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="复查人" required>
                    <el-select v-model="inspectionForm.reviewer" filterable placeholder="请选择复查人" style="width: 100%" aria-label="请选择复查人">
                      <el-option v-for="u in userOptions" :key="u.id" :label="getUserLabel(u.id)" :value="getUserLabel(u.id)" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="整改截止日期" required>
                    <el-date-picker v-model="inspectionForm.rectifyDeadline" type="date" value-format="YYYY-MM-DD" placeholder="请选择整改截止日期" style="width: 100%" aria-label="请选择整改截止日期"/>
                  </el-form-item>
                </template>
              </template>
            </template>

            <template v-else>
              <el-form-item :label="todo.inspectionBizType === '整改' ? '整改日期' : todo.inspectionBizType === '复查' ? '复查日期' : '审批日期'" required>
                <el-date-picker
                  v-model="inspectionForm.processDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  :placeholder="`请选择${todo.inspectionBizType === '整改' ? '整改' : todo.inspectionBizType === '复查' ? '复查' : '审批'}日期`"
                  style="width: 100%" aria-label="`请选择${todo.inspectionBizType === '整改' ? '整改' : todo.inspectionBizType === '复查' ? '复查' : '审批'}日期`"/>
              </el-form-item>
              <el-form-item v-if="todo.inspectionBizType === '整改'" label="整改照片" required>
                <DispatchImageAttachments v-model="inspectionForm.attachments" />
              </el-form-item>
              <el-form-item v-if="todo.inspectionBizType !== '整改'" :label="`${todo.inspectionBizType}结果`" required>
                <el-radio-group v-model="inspectionForm.decision">
                  <el-radio value="pass">{{ inspectionActionMeta.pass }}</el-radio>
                  <el-radio value="reject">{{ inspectionActionMeta.reject }}</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item :label="inspectionActionMeta.remarkLabel" required>
                <el-input
                  v-model="inspectionForm.remark"
                  type="textarea"
                  :rows="4"
                  :placeholder="`请填写${inspectionActionMeta.remarkLabel}`" aria-label="`请填写${inspectionActionMeta.remarkLabel}`"/>
              </el-form-item>
            </template>
          </el-form>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitInspectionHandle">
              {{ todo.inspectionBizType === '巡检' ? '提交检查结果' : todo.inspectionBizType === '整改' ? '提交整改结果' : '提交' }}
            </el-button>
          </div>
        </template>

        <template v-else-if="todo.type === 'dispatch_hazard' && todo.bizType === DISPATCH_HAZARD_TODO_BIZ.RECTIFY">
          <el-form label-width="96px" class="op-form">
            <el-form-item label="整改说明" required>
              <el-input
                v-model="dispatchHazardForm.remark"
                type="textarea"
                :rows="4"
                placeholder="请描述整改措施及完成情况" aria-label="请描述整改措施及完成情况"/>
            </el-form-item>
            <el-form-item label="整改照片" required>
              <DispatchImageAttachments
                v-model="dispatchHazardForm.photos"
                name-prefix="整改照片"
              />
            </el-form-item>
          </el-form>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitDispatchHazardRectifyTodo">提交整改</el-button>
          </div>
        </template>

        <template v-else-if="todo.type === 'dispatch_hazard' && todo.bizType === DISPATCH_HAZARD_TODO_BIZ.ACCEPT">
          <el-form label-width="96px" class="op-form">
            <el-form-item label="验收结果" required>
              <el-radio-group v-model="dispatchHazardForm.decision">
                <el-radio value="pass">验收通过</el-radio>
                <el-radio value="reject">驳回</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="dispatchHazardForm.decision === 'pass'" label="验收意见">
              <el-input
                v-model="dispatchHazardForm.remark"
                type="textarea"
                :rows="3"
                placeholder="可填写验收说明" aria-label="可填写验收说明"/>
            </el-form-item>
            <el-form-item v-else label="驳回原因" required>
              <el-input
                v-model="dispatchHazardForm.rejectRemark"
                type="textarea"
                :rows="4"
                placeholder="请说明整改不到位之处，退回继续整改" aria-label="请说明整改不到位之处，退回继续整改"/>
            </el-form-item>
          </el-form>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button
              :type="dispatchHazardForm.decision === 'pass' ? 'success' : 'danger'"
              @click="submitDispatchHazardAcceptTodo"
            >
              {{ dispatchHazardForm.decision === 'pass' ? '确认通过' : '确认驳回' }}
            </el-button>
          </div>
        </template>

        <template v-else-if="todo.type === 'penalty' && todo.bizStatus === PENALTY_TODO_STATUS.PROCESSING">
          <el-tabs v-model="processTab">
            <el-tab-pane label="上报结果" name="report">
              <el-form label-width="110px" class="op-form">
                <el-form-item label="条款" required>
                  <el-input v-model="reportForm.penaltyClause" placeholder="请输入处罚条款" aria-label="请输入处罚条款"/>
                </el-form-item>
                <el-form-item label="金额" required>
                  <el-input v-model="reportForm.amount" placeholder="如 5000 元" aria-label="如 5000 元"/>
                </el-form-item>
                <el-form-item label="上报结果" required>
                  <el-input
                    v-model="reportForm.reportResult"
                    type="textarea"
                    :rows="4"
                    placeholder="请说明整改及处理情况" aria-label="请说明整改及处理情况"/>
                </el-form-item>
                <el-form-item label="验收人" required>
                  <el-select
                    v-model="reportForm.acceptor"
                    filterable
                    clearable
                    placeholder="请选择验收人"
                    style="width: 100%" aria-label="请选择验收人">
                    <el-option
                      v-for="u in userOptions"
                      :key="u.id"
                      :label="getUserLabel(u.id)"
                      :value="getUserLabel(u.id)"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="上报结果附件">
                  <DispatchImageAttachments
                    v-model="reportForm.attachments"
                    name-prefix="上报结果附件"
                  />
                </el-form-item>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="申诉" name="appeal">
              <el-form label-width="110px" class="op-form">
                <el-form-item label="申诉理由" required>
                  <el-input
                    v-model="appealForm.reason"
                    type="textarea"
                    :rows="4"
                    placeholder="请说明申诉理由" aria-label="请说明申诉理由"/>
                </el-form-item>
                <el-form-item label="申诉附件">
                  <DispatchImageAttachments
                    v-model="appealForm.attachments"
                    name-prefix="申诉附件"
                  />
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button v-if="processTab === 'report'" type="primary" @click="submitProcessReport">
              提交上报
            </el-button>
            <el-button v-else type="primary" @click="submitProcessAppeal">提交申诉</el-button>
          </div>
        </template>

        <template v-else-if="todo.type === 'penalty' && todo.bizStatus === PENALTY_TODO_STATUS.PENDING_ACCEPTANCE">
          <el-form label-width="96px" class="op-form">
            <el-form-item label="处理意见" required>
              <el-radio-group v-model="acceptForm.decision">
                <el-radio value="pass">验收通过</el-radio>
                <el-radio value="reject">驳回</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="说明" required>
              <el-input v-model="acceptForm.remark" type="textarea" :rows="4" placeholder="请填写验收说明" aria-label="请填写验收说明"/>
            </el-form-item>
          </el-form>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitAcceptHandle">提交</el-button>
          </div>
        </template>

        <template v-else-if="todo.type === 'penalty' && todo.bizStatus === PENALTY_TODO_STATUS.APPEALING">
          <el-form label-width="120px" class="op-form">
            <el-form-item label="处理意见" required>
              <el-radio-group v-model="appealHandleForm.decision">
                <el-radio value="pass">通过并关闭处罚单</el-radio>
                <el-radio value="reject">驳回</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="说明" required>
              <el-input
                v-model="appealHandleForm.remark"
                type="textarea"
                :rows="4"
                placeholder="请填写处理说明" aria-label="请填写处理说明"/>
            </el-form-item>
          </el-form>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitAppealHandle">提交</el-button>
          </div>
        </template>

        <template v-else>
          <el-form label-width="96px" class="op-form">
            <el-form-item label="处理意见" required>
              <el-radio-group v-model="commonForm.decision">
                <el-radio value="pass">通过</el-radio>
                <el-radio value="reject">驳回</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item
              label="说明"
              :required="
                !(
                  todo.type === 'sample' ||
                  todo.type === 'brand' ||
                  todo.type === 'subcontractor' ||
                  todo.type === 'mat_entry' ||
                  todo.type === 'eq_entry' ||
                  todo.type === 'asbuilt'
                ) ||
                commonForm.decision === 'reject'
              "
            >
              <el-input
                v-model="commonForm.remark"
                type="textarea"
                :rows="3"
                :placeholder="
                  commonForm.decision === 'reject' &&
                  (todo.type === 'brand' ||
                    todo.type === 'subcontractor' ||
                    todo.type === 'sample' ||
                    todo.type === 'mat_entry' ||
                    todo.type === 'eq_entry' ||
                    todo.type === 'asbuilt')
                    ? '退回意见必填'
                    : todo.type === 'brand' ||
                        todo.type === 'subcontractor' ||
                        todo.type === 'sample' ||
                        todo.type === 'mat_entry' ||
                        todo.type === 'eq_entry' ||
                        todo.type === 'asbuilt'
                      ? '审批意见选填'
                      : '请填写审批说明'
                " aria-label="
                  commonForm.decision === 'reject' &&
                  (todo.type === 'brand' ||
                    todo.type === 'subcontractor' ||
                    todo.type === 'sample' ||
                    todo.type === 'mat_entry' ||
                    todo.type === 'eq_entry' ||
                    todo.type === 'asbuilt')
                    ? '退回意见必填'
                    : todo.type === 'brand' ||
                        todo.type === 'subcontractor' ||
                        todo.type === 'sample' ||
                        todo.type === 'mat_entry' ||
                        todo.type === 'eq_entry' ||
                        todo.type === 'asbuilt'
                      ? '审批意见选填'
                      : '请填写审批说明'
                "/>
            </el-form-item>
          </el-form>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitCommonHandle">提交</el-button>
          </div>
        </template>
      </section>

      <!-- 审批过程 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">{{ todo.type === 'inspection' ? '流程记录' : '审批过程' }}</div>
        </div>
        <el-timeline class="flow-timeline">
          <el-timeline-item
            v-for="(step, index) in approvalFlow"
            :key="`${step.title}-${index}`"
            :type="flowType(step.status)"
            :hollow="step.status === 'pending'"
            :timestamp="step.time || '待进行'"
            placement="top"
          >
            <div class="flow-card" :class="step.status">
              <div class="flow-title">
                {{ step.title }}
                <el-tag v-if="step.status === 'current'" size="small" type="warning">当前</el-tag>
              </div>
              <div class="flow-meta">处理人：{{ step.user || '—' }}</div>
              <div v-if="step.remark" class="flow-remark">{{ step.remark }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </section>
    </template>
  </div>
</template>

<style scoped>
.handle-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  background: #fff;
  padding: 16px 20px 28px;
}

.handle-page.is-brand {
  padding-bottom: 24px;
  max-width: 980px;
}

.page-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.title-meta {
  flex: 1;
  min-width: 0;
}

.title-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
}

.source-tag {
  flex-shrink: 0;
}

.page-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.block {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 14px 16px 16px;
  background: #fafbfc;
}

.block--panel {
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f2f5;
}

.block-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.desc-panel :deep(.el-descriptions__label) {
  width: 96px;
  color: #909399;
}

.meta-sep {
  color: #909399;
}

.spec-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.muted {
  font-size: 13px;
  color: #c0c4cc;
}

.brand-cand-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-cand-card {
  padding: 14px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #fff;
}

.brand-cand-card-head {
  margin-bottom: 6px;
}

.brand-cand-card-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.cand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 600;
}

.cand-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px 14px;
  background: #fafbfc;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.cand-field-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 1.5;
}

.cand-label {
  flex: 0 0 72px;
  font-size: 13px;
  color: #909399;
}

.cand-value {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #303133;
  word-break: break-all;
}

.brand-pick-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.brand-pick-card {
  display: block;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.brand-pick-card:hover {
  border-color: #c6e2ff;
  background: #f5faff;
}

.brand-pick-card.is-active {
  border-color: var(--el-color-primary);
  background: #ecf5ff;
}

.brand-pick-radio {
  width: 100%;
  height: auto;
  margin-right: 0;
  align-items: flex-start;
  white-space: normal;
}

.brand-pick-radio :deep(.el-radio__label) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 8px;
  line-height: 1.4;
}

.brand-pick-main {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.brand-pick-mfr {
  font-size: 12px;
  color: #606266;
}

.brand-pick-remark {
  font-size: 12px;
  color: #909399;
}

.flow-timeline {
  padding-left: 4px;
}

.flow-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
}

.flow-card.current {
  border-color: #f5dab1;
  background: #fdf6ec;
}

.flow-card.done {
  border-color: #e1f3d8;
  background: #f0f9eb;
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
}

.op-form {
  max-width: 720px;
  background: #fafbfc;
  padding: 14px 14px 0;
  border-radius: 8px;
  border: 1px solid #f0f2f5;
}

.op-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.block--action .op-actions {
  position: sticky;
  bottom: 0;
  margin: 12px -16px -16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #ebeef5;
  border-radius: 0 0 10px 10px;
  backdrop-filter: blur(6px);
}

.inspection-stage-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f7f0f4 0%, #fff 100%);
  border-left: 4px solid #8f0045;
}

.inspection-stage-banner > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.inspection-stage-label {
  font-size: 13px;
  color: #909399;
}

.inspection-stage-banner strong {
  color: #8f0045;
  font-size: 17px;
}

.inspection-op-form {
  max-width: 760px;
}

.inspection-detail-block {
  margin-top: 14px;
  padding: 16px 20px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: #fff;
}

.inspection-section-title {
  margin-bottom: 14px;
  padding-left: 10px;
  border-left: 3px solid #8f0045;
  color: #212529;
  font-size: 14px;
  font-weight: 600;
}

.inspection-kv {
  display: flex;
  padding: 2px 0;
  color: #212529;
  font-size: 13px;
  line-height: 1.7;
}

.inspection-kv > span {
  width: 76px;
  flex-shrink: 0;
  color: #868e96;
}

.inspection-kv > b {
  font-weight: 400;
}

.inspection-pass-text {
  color: #34a853;
}

.inspection-tree-layout {
  display: flex;
  min-height: 220px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.inspection-tree-side {
  width: 168px;
  flex-shrink: 0;
  padding: 8px 0;
  border-right: 1px solid #ebeef5;
  background: #fafafa;
}

.inspection-tree-node {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: transparent;
  color: #606266;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.inspection-tree-node span {
  flex: 1;
}

.inspection-tree-node b {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #ebeef5;
  color: #909399;
  font-size: 11px;
  font-weight: 400;
}

.inspection-tree-node.active {
  background: #fceef4;
  color: #8f0045;
  font-weight: 600;
}

.inspection-tree-node.active b {
  background: rgba(143, 0, 69, 0.12);
  color: #8f0045;
}

.inspection-tree-content {
  flex: 1;
  padding: 16px 20px;
}

.inspection-tree-heading {
  margin-bottom: 12px;
  padding-bottom: 9px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.inspection-tree-item {
  margin-bottom: 8px;
  padding: 11px 12px;
  border-radius: 6px;
  background: #fafafa;
  color: #303133;
  font-size: 13px;
}

.inspection-file-text {
  margin-left: 12px;
  color: #606266;
  font-size: 13px;
}

.inspection-hazard-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;
  padding: 10px 12px;
  border-left: 3px solid #e53935;
  border-radius: 6px;
  background: #fff5f5;
  color: #606266;
  font-size: 13px;
}

.inspection-hazard-card strong {
  color: #e53935;
}

.dispatch-hazard-thumb {
  width: 120px;
  height: 68px;
  border-radius: 4px;
  overflow: hidden;
  background: #1a1a1a;
  border: 1px solid var(--ap-border, #e4e7ed);
}

.dispatch-hazard-thumb__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dispatch-hazard-thumb__empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #a3a6ad;
  background: #f5f7fa;
}

.dispatch-hazard-photo-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dispatch-hazard-photo-thumbs .dispatch-hazard-thumb {
  cursor: pointer;
}
</style>

