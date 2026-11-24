import { computed, reactive, watch } from 'vue'
import { getProjectRectifierLabel, getProjectReviewerLabel, getConfiguredPersonLabel, getProjectApproverLabel, getInspectionCopyDefaults, getInspectionPersonConfig } from './useInspectionPersonConfig'
import { addMobileInspectionTask, getMobileInspectionTask, listMobileInspectionTasks, markInspectionTaskVoided } from '../mock/mobileInspectionTasks'
import { getCurrentUserSnapshot } from '../mock/currentUser'
import { getHeaderProjectLabel } from './useCurrentProject'
import { normalizeHazardCategory } from '../config/inspectionManagement'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { createInspectionWorkflowExamples } from '../mock/inspectionWorkflowExamples.js'

import { inspectionDateKey } from '../utils/inspectionLedgerDates'
import { workflowSteps, currentWorkflowStep, isAcceptanceStage, rectificationIssuedAt, rectificationCopyEvents, INSPECTION_VOID_APPROVER, currentWorkflowLabel } from '../utils/inspectionRectificationWorkflow'
import { canExecuteInspectionStep, inspectionOperator, isInspectionCopyRecipient, canRequestInspectionVoid } from '../utils/inspectionWorkflowIdentity'
import { inspectorCandidates } from './useInspectionPersonConfig'
const workflowListeners = new Set()
export function registerInspectionWorkflowListener(listener) { workflowListeners.add(listener) }
function notifyWorkflow(record, handledStep = null) { for (const listener of workflowListeners) listener(record, handledStep) }

const nowText = () => new Date().toLocaleString('sv-SE', { hour12: false })

const photoFilesByRecordId = new Map()
export const getRectificationPhotoFiles = id => photoFilesByRecordId.get(id)

function photoLabels(list, prefix = '整改照片') {
  if (!Array.isArray(list) || !list.length) return []
  return list.map((item, index) => {
    const raw = typeof item === 'string' ? item : item?.name || ''
    if (raw && !raw.startsWith('blob:') && !raw.startsWith('data:')) return raw
    return `${prefix}${index + 1}.jpg`
  })
}

/** 移动端整改记录 → Web 隐患清单行（同一真相源） */
export function mapMobileRecordToHazardRow(record) {
  const issueDate = inspectionDateKey(rectificationIssuedAt(record))
  return {
    id: record.id,
    rectifyNo: record.rectifyNo,
    taskNo: record.taskNo,
    inspectionCategory: record.inspectionCategory,
    inspectionCategories: record.inspectionCategories,
    hazardCategory: normalizeHazardCategory(record.hazardCategory),
    hazardLevel: record.hazardLevel || '',
    rectifyRequirement: record.rectifyRequirement || '',
    project: record.project,
    projectFullName: record.project,
    project_id: record.projectId,
    rectifier: record.rectifier,
    reviewer: record.reviewer,
    ccPersons: record.ccPersons || '',
    manager: record.manager,
    inspector: record.inspector,
    issueDate,
    issuedAt: rectificationIssuedAt(record),
    registeredAt: record.registeredAt,
    issueCcPersons: record.issueCcPersons ?? record.ccPersons ?? '',
    completionCcPersons: record.completionCcPersons || '',
    deadline: record.deadline,
    status: record.status,
    rectDate: record.rectificationDate || record.submitDate || '',
    reviewDate: record.reviewDate || '',
    closeDate: record.closeDate || '',
    desc: record.hazard,
    hazardPhotos: [...(record.hazardPhotos || [])],
    rectificationPhotos: [...(record.rectificationPhotos || [])],
    rectificationNote: record.rectificationNote || '',
    reviewComment: record.reviewComment || '',
    reviewResult: record.reviewResult || '',
    approvalComment: record.approvalComment || '',
    isRejected: !!record.isRejected,
    rejectReason: record.rejectReason || '',
    approvalRejected: !!record.approvalRejected,
    approvalReason: record.approvalReason || '',
    contractorManager: record.contractorManager,
    director: record.director,
    contractorAcceptanceDate: record.contractorAcceptanceDate,
    contractorAcceptanceComment: record.contractorAcceptanceComment,
    contractorAcceptanceResult: record.contractorAcceptanceResult,
    directorAcceptanceDate: record.directorAcceptanceDate,
    directorAcceptanceComment: record.directorAcceptanceComment,
    directorAcceptanceResult: record.directorAcceptanceResult,
    projectDepartmentHead: record.projectDepartmentHead,
    departmentConfirmationDate: record.departmentConfirmationDate,
    departmentConfirmationComment: record.departmentConfirmationComment,
    departmentConfirmationResult: record.departmentConfirmationResult,
    voidRequest: record.voidRequest,
    workflowHistory: record.workflowHistory,
    currentNode: currentWorkflowLabel(record),
    source: 'mobile-rectify',
  }
}

export const mobileRectificationRecords = reactive([
  {
    id: 'rec-001',
    rectifyNo: 'ZG202607001',
    taskNo: 'AQXJ20260728001',
    inspectionCategory: '安全',
    projectId: 'p-000',
    project: '飞行区跑道延长工程',
    rectifier: getProjectRectifierLabel('p-000'),
    reviewer: getProjectReviewerLabel('p-000'),
    manager: '赵经理（项目经理）',
    deadline: '2026-07-30',
    status: '待整改',
    currentNode: '整改人整改',
    applicant: '陈工（监理工程师）',
    applyDate: '2026-07-25 09:00:00',
    overdue: false,
    hazardCategory: '施工用电',
    hazard: '五芯电缆破损，线路未按规范敷设',
    hazardPhotos: ['隐患照片1.jpg', '隐患照片2.jpg'],
  },
  {
    id: 'rec-006',
    rectifyNo: 'ZG202607006',
    taskNo: 'AQXJ20260721003',
    inspectionCategory: '安全',
    projectId: 'p-001',
    project: 'T3航站楼扩建工程',
    rectifier: getProjectRectifierLabel('p-001'),
    reviewer: getProjectReviewerLabel('p-001'),
    manager: '李经理（项目经理）',
    deadline: '2026-07-22',
    status: '待整改',
    currentNode: '整改人重新整改',
    applicant: '陈工（监理工程师）',
    applyDate: '2026-07-20 14:00:00',
    overdue: true,
    isRejected: true,
    rejectReason: '整改不彻底，脚手架专项方案仍未按要求补报并通过审核',
    hazardCategory: '脚手架与操作平台',
    hazard: '脚手架施工方案未报审即施工',
    hazardPhotos: ['隐患照片1.jpg'],
    rectificationDate: '2026-07-20',
    rectificationPhotos: ['整改照片1.jpg'],
    rectificationNote: '已补报脚手架专项施工方案',
    reviewDate: '2026-07-22',
    reviewResult: '不通过',
    reviewComment: '整改不彻底，脚手架专项方案仍未按要求补报并通过审核',
  },
  {
    id: 'rec-002',
    rectifyNo: 'ZG202607002',
    taskNo: 'AQXJ20260728001',
    inspectionCategory: '安全',
    projectId: 'p-000',
    project: '飞行区跑道延长工程',
    rectifier: getProjectRectifierLabel('p-000'),
    reviewer: getProjectReviewerLabel('p-000'),
    manager: '赵经理（项目经理）',
    deadline: '2026-07-28',
    status: '待验收',
    currentNode: '复查人复查',
    applicant: '王工（项目安全员）',
    applyDate: '2026-07-25 10:30:00',
    submitDate: '2026-07-25',
    overdue: false,
    hazardCategory: '施工用电',
    hazard: '五芯电缆破损，线路未按规范敷设',
    hazardPhotos: ['隐患照片1.jpg'],
    rectificationDate: '2026-07-25',
    rectificationPhotos: ['整改照片1.jpg'],
    rectificationNote: '已更换合规电缆并按规范重新敷设',
  },
  {
    id: 'rec-003',
    rectifyNo: 'ZG202607003',
    taskNo: 'ZLXJ20260721003',
    inspectionCategory: '质量',
    projectId: 'p-001',
    project: 'T3航站楼扩建工程',
    rectifier: getProjectRectifierLabel('p-001'),
    reviewer: getProjectReviewerLabel('p-001'),
    manager: '李经理（项目经理）',
    deadline: '2026-07-28',
    status: '待验收',
    currentNode: '复查人复查',
    applicant: '刘工（专职安全员）',
    applyDate: '2026-07-27 16:30:00',
    submitDate: '2026-07-27',
    overdue: false,
    isSecondRound: true,
    hazardCategory: '脚手架与操作平台',
    hazard: '脚手架施工方案未报审即施工',
    hazardPhotos: ['隐患照片1.jpg'],
    rectificationDate: '2026-07-27',
    rectificationPhotos: ['整改照片1.jpg'],
    rectificationNote: '已重新补报方案并通过审核',
    rejectReason: '整改不彻底',
  },
  {
    id: 'rec-007',
    rectifyNo: 'ZG202607007',
    taskNo: 'AQXJ20260730001',
    inspectionCategory: '安全',
    projectId: 'p-000',
    project: '飞行区跑道延长工程',
    rectifier: getProjectRectifierLabel('p-000'),
    reviewer: getProjectReviewerLabel('p-000'),
    manager: '赵经理（项目经理）',
    deadline: '2026-07-31',
    status: '待复查',
    currentNode: '项目经理审批',
    applicant: '陈工（监理工程师）',
    applyDate: '2026-07-30 17:20:00',
    submitDate: '2026-07-30',
    overdue: false,
    hazardCategory: '临边洞口',
    hazard: '临边防护栏杆局部缺失',
    hazardPhotos: ['临边防护隐患照片.jpg'],
    rectificationDate: '2026-07-30',
    rectificationPhotos: ['临边防护整改后照片.jpg'],
    rectificationNote: '已恢复缺失栏杆并加固连接节点。',
    reviewDate: '2026-07-30',
    reviewResult: '通过',
    reviewComment: '整改到位，同意提交项目经理审批。',
  },
  {
    id: 'rec-008',
    rectifyNo: 'ZG202607008',
    taskNo: 'ZLXJ20260730002',
    inspectionCategory: '质量',
    projectId: 'p-001',
    project: 'T3航站楼扩建工程',
    rectifier: getProjectRectifierLabel('p-001'),
    reviewer: getProjectReviewerLabel('p-001'),
    manager: '李经理（项目经理）',
    deadline: '2026-08-01',
    status: '待验收',
    currentNode: '复查人重新复查',
    applicant: '李经理（项目经理）',
    applyDate: '2026-07-30 18:10:00',
    submitDate: '2026-07-30',
    overdue: false,
    approvalRejected: true,
    approvalReason: '复查依据不充分，请补充现场核验意见',
    hazardCategory: '文明施工',
    hazard: '混凝土外观存在蜂窝麻面',
    hazardPhotos: ['隐患照片1.jpg'],
    rectificationDate: '2026-07-30',
    rectificationPhotos: ['整改照片1.jpg'],
    rectificationNote: '已完成缺陷修补并养护',
    reviewDate: '2026-07-30',
    reviewResult: '通过',
    reviewComment: '现场已修补，建议提交审批',
  },
  {
    id: 'rec-004',
    rectifyNo: 'ZG202607004',
    taskNo: 'ZLXJ20260728005',
    inspectionCategory: '质量',
    projectId: 'p-000',
    project: '飞行区跑道延长工程',
    rectifier: getProjectRectifierLabel('p-000'),
    reviewer: getProjectReviewerLabel('p-000'),
    manager: '赵经理（项目经理）',
    deadline: '2026-07-20',
    status: '已关闭',
    currentNode: '流程结束',
    applicant: '陈工（监理工程师）',
    applyDate: '2026-07-18 09:00:00',
    closeDate: '2026-07-25',
    overdue: false,
    hazardCategory: '施工用电',
    hazard: '电缆破损，存在安全隐患',
    hazardPhotos: ['隐患照片1.jpg', '隐患照片2.jpg'],
    rectificationDate: '2026-07-22',
    rectificationPhotos: ['整改照片1.jpg', '整改照片2.jpg'],
    rectificationNote: '已更换破损电缆',
    reviewDate: '2026-07-25',
    reviewResult: '通过',
    reviewComment: '整改合格，同意关闭',
    approvalDate: '2026-07-25',
    approvalComment: '同意关闭',
  },
  {
    id: 'rec-011',
    rectifyNo: 'ZG202607011',
    taskNo: 'AQXJ20260721003',
    inspectionCategory: '安全',
    projectId: 'p-001',
    project: 'T3航站楼扩建工程',
    rectifier: getProjectRectifierLabel('p-001'),
    reviewer: getProjectReviewerLabel('p-001'),
    manager: '李经理（项目经理）',
    deadline: '2026-07-25',
    status: '已关闭',
    currentNode: '流程结束',
    applicant: '陈工（监理工程师）',
    applyDate: '2026-07-20 09:00:00',
    closeDate: '2026-07-30',
    overdue: false,
    isSecondRound: true,
    hazardCategory: '施工消防',
    hazard: '消防器材过期未更换',
    hazardPhotos: ['隐患照片1.jpg', '隐患照片2.jpg'],
    rectificationDate: '2026-07-28',
    rectificationPhotos: ['整改照片1.jpg', '整改照片2.jpg'],
    rectificationNote: '已全部更换并设置检查记录卡',
    reviewDate: '2026-07-30',
    reviewResult: '通过',
    reviewComment: '整改到位，同意关闭',
    approvalDate: '2026-07-30',
    approvalComment: '同意关闭',
  },
  ...createInspectionWorkflowExamples(),
].map((record) => ({
  ...record,
  // 旧台账示例仍可查看详情，但不再重复投影到消息中心的待办清单。
  legacyWorkflowExample: !record.workflowExample,
  hazardCategory: normalizeHazardCategory(record.hazardCategory),
})))

const ASSIGNMENT_ARCHIVE_KEY = 'airport-inspection-assigned-records-v1'
function readAssignedRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(ASSIGNMENT_ARCHIVE_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter(item => item?.id && item.voidRequest) : []
  } catch { return [] }
}
function restoreAssignedRecords() {
  for (const saved of readAssignedRecords()) {
    const current = mobileRectificationRecords.find(item => item.id === saved.id)
    if (current) Object.assign(current, saved)
    else mobileRectificationRecords.unshift(saved)
    if (saved.voidDemoScope) ensureInspectionVoidDemo(saved.voidDemoScope)
    if (saved.status === '已作废') markInspectionTaskVoided(saved)
  }
}
function persistAssignedRecords() {
  const value = JSON.stringify(mobileRectificationRecords.filter(item => item.voidRequest))
  try {
    if (localStorage.getItem(ASSIGNMENT_ARCHIVE_KEY) !== value) localStorage.setItem(ASSIGNMENT_ARCHIVE_KEY, value)
  } catch { /* 当前会话仍可继续办理。 */ }
}
/** 已废弃流程节点：清理本地缓存中仍「待项目经理确认」的历史单。 */
function dropLegacyManagerConfirmationRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(ASSIGNMENT_ARCHIVE_KEY) || '[]')
    if (!Array.isArray(saved)) return
    const kept = saved.filter((item) => !(item?.requiresManagerConfirmation && !item?.managerConfirmationDate))
    if (kept.length !== saved.length) localStorage.setItem(ASSIGNMENT_ARCHIVE_KEY, JSON.stringify(kept))
  } catch { /* 无存储权限时忽略。 */ }
}
dropLegacyManagerConfirmationRecords()
for (let i = mobileRectificationRecords.length - 1; i >= 0; i--) {
  const item = mobileRectificationRecords[i]
  if (item.requiresManagerConfirmation && !item.managerConfirmationDate && !item.managerConfirmationResult) mobileRectificationRecords.splice(i, 1)
}
restoreAssignedRecords()
// 示例单被办理或作废后，另补独立演示单，保证各类示例可再次演示。
export function ensureInspectionWorkflowExamples() {
  const availableRecords = []
  for (const template of createInspectionWorkflowExamples().filter(item => !item.exampleHidden)) {
    const expectedStage = currentWorkflowStep(template)?.key
    const related = mobileRectificationRecords.filter(item => item.id === template.id || item.demoTemplateId === template.id)
    const available = related.find(item => currentWorkflowStep(item)?.key === expectedStage)
    if (available) { availableRecords.push(available); continue }
    for (const item of related) item.workflowExample = false
    let sequence = 1
    while (mobileRectificationRecords.some(item => item.id === `${template.id}-demo-${sequence}`)) sequence++
    const created = {
      ...template, id: `${template.id}-demo-${sequence}`, demoTemplateId: template.id,
      rectifyNo: `${template.rectifyNo}-D${sequence}`, legacyWorkflowExample: false,
      hazardCategory: normalizeHazardCategory(template.hazardCategory),
    }
    mobileRectificationRecords.unshift(created)
    availableRecords.push(created)
    notifyWorkflow(created)
  }
  return availableRecords
}
ensureInspectionWorkflowExamples()
/** 作废审批示例：绑定独立演示巡检单，审批通过后该巡检任务同步显示「已作废」。 */
function ensureVoidApprovalTask(record) {
  if (!record) return
  const taskId = 'inspection-void-approval-task'
  if (!getMobileInspectionTask(taskId)) {
    addMobileInspectionTask({
      id: taskId, taskNo: 'AQXJ-VOID-APPROVAL', taskName: '整改单作废审批演示巡检单',
      projectId: record.projectId, project: record.project, inspectionCategory: record.inspectionCategory || '安全',
      status: '已完成', result: 'hazard', source: '系统自建', inspector: record.inspector,
      submittedAt: record.registeredAt,
      hazardItems: [{ rectifyId: record.id, rectifyNo: record.rectifyNo, hazardCategory: record.hazardCategory, hazardLevel: record.hazardLevel, desc: record.hazard }],
    })
  }
  record.inspectionTaskId = taskId
}
ensureVoidApprovalTask(mobileRectificationRecords.find(item => item.id === 'inspection-example-void-approval'))

/** 业务台账「已作废」示例：每个项目各一条整改单 + 关联巡检任务，任意项目下都能演示筛选与删除。 */
const DELETED_KEY_PREFIX = 'airport-inspection-deleted:'
function readDeleted(key) { try { return localStorage.getItem(DELETED_KEY_PREFIX + key) === '1' } catch { return false } }
function markDeleted(key) { try { localStorage.setItem(DELETED_KEY_PREFIX + key, '1') } catch { /* 忽略存储失败 */ } }
export function ensureInspectionVoidedExamples() {
  COC_PROJECT_OPTIONS.forEach((project, index) => {
    const recordId = `inspection-voided-example-${project.id}`
    const taskId = `inspection-voided-example-task-${project.id}`
    const seq = String(index + 1).padStart(2, '0')
    const inspector = getConfiguredPersonLabel(project.id, '安全', 'inspectorId') || '陈工（监理工程师）'
    if (!getMobileInspectionTask(taskId) && !readDeleted(taskId)) {
      addMobileInspectionTask({
        id: taskId,
        taskNo: `AQXJ-VOIDED-DEMO-${seq}`,
        taskName: `已作废示例巡检单（${project.label}）`,
        projectId: project.id, project: project.label,
        inspectionCategory: '安全', inspectionCategories: ['安全'],
        inspectionType: '部门检查', status: '已完成', result: 'hazard', source: '系统自建',
        inspector,
        submittedAt: '2026-11-20 10:00:00', inspectionDate: '2026-11-20', hazardCount: 1, hasRectify: true,
        hazardItems: [{
          rectifyId: recordId, rectifyNo: `ZG-VOIDED-DEMO-${seq}`,
          hazardCategory: '临边洞口', hazardLevel: 'Ⅲ一般隐患', desc: '已作废示例：同一隐患重复登记，经审批作废', hasRectify: true,
        }],
      })
    }
    if (!mobileRectificationRecords.some((item) => item.id === recordId) && !readDeleted(recordId)) {
      mobileRectificationRecords.unshift({
        id: recordId,
        rectifyNo: `ZG-VOIDED-DEMO-${seq}`,
        inspectionTaskId: taskId,
        taskNo: `AQXJ-VOIDED-DEMO-${seq}`,
        inspectionCategory: '安全', inspectionCategories: ['安全'],
        hazardCategory: '临边洞口', hazardLevel: 'Ⅲ一般隐患',
        hazard: '已作废示例：同一隐患重复登记，经审批作废',
        rectifyRequirement: '经核实为重复登记，本单已审批作废。',
        projectId: project.id, project: project.label,
        rectifier: getProjectRectifierLabel(project.id, '安全'),
        reviewer: getProjectReviewerLabel(project.id, '安全'),
        manager: getProjectApproverLabel(project.id, '安全'),
        inspector, applicant: inspector,
        status: '已作废', currentNode: '已作废',
        registeredAt: '2026-11-20 10:00:00', issueDate: '2026-11-20', issuedAt: '2026-11-20 10:00:00',
        applyDate: '2026-11-20 10:00:00', closeDate: '2026-11-21 09:30:00', deadline: '2026-11-27',
        voidRequest: {
          status: 'approved', reason: '同一隐患重复登记，申请作废',
          requestedAt: '2026-11-20 15:00:00', applicant: inspector,
          approver: INSPECTION_VOID_APPROVER,
          decidedAt: '2026-11-21 09:30:00', comment: '核实为重复登记，同意作废。',
        },
        workflowHistory: [{ stage: 'voidRequest', label: '申请作废整改单', actor: inspector, date: '2026-11-20 15:00:00', comment: '同一隐患重复登记，申请作废' },
          { stage: 'voidApproval', label: '作废审批', actor: INSPECTION_VOID_APPROVER, date: '2026-11-21 09:30:00', comment: '核实为重复登记，同意作废。', result: '通过' }],
      })
    }
    const current = getMobileInspectionTask(taskId)
    if (current && !current.rectificationVoided) {
      current.rectificationVoided = true
      current.voidedAt = '2026-11-21 09:30:00'
    }
  })
}
ensureInspectionVoidedExamples()
watch(mobileRectificationRecords, persistAssignedRecords, { deep: true })
// 另一标签页发生作废申请时，及时刷新待办。
window.addEventListener('storage', event => {
  if (event.key !== ASSIGNMENT_ARCHIVE_KEY) return
  restoreAssignedRecords()
  for (const row of mobileRectificationRecords.filter(item => item.voidRequest)) notifyWorkflow(row, { assignment: true })
})
export const getMobileRectification = (id) => mobileRectificationRecords.find((item) => item.id === id)

/** 每个演示范围使用独立的巡检单和整改单，避免作废其他流程示例。 */
export function ensureInspectionVoidDemo(scopeId) {
  const id = `inspection-void-demo-${scopeId}`
  const taskId = `${id}-task`
  if (getMobileInspectionTask(taskId)) return
  const stored = mobileRectificationRecords.find(item => item.id === id)
  const projectId = scopeId === 'hq' ? 'p-000' : scopeId
  const inspector = getCurrentUserSnapshot(scopeId)
  const numberSuffix = scopeId.toUpperCase()
  const task = addMobileInspectionTask({
    id: taskId, taskNo: `AQXJ-VOID-DEMO-${numberSuffix}`, taskName: '整改单作废演示巡检单',
    projectId, project: getHeaderProjectLabel(projectId), inspectionCategory: '安全',
    status: '已完成', result: 'hazard', source: '系统自建', inspector: inspector.name,
    submittedAt: stored?.registeredAt || nowText(),
    rectificationInitiatorId: inspector.id, voidDemoScope: scopeId,
    hazardItems: [{
      rectifyId: id, rectifyNo: `ZG-VOID-DEMO-${numberSuffix}`,
      hazardCategory: '临边洞口', hazardLevel: 'Ⅲ一般隐患',
      desc: '整改单作废演示：临边防护隐患重复登记',
    }],
  })
  if (!stored) createMobileRectificationsFromTask(task, task.hazardItems)
  else if (stored.status === '已作废') markInspectionTaskVoided(stored)
}

/** 将巡检中逐条生成的整改单同步进整改复查台账。 */
export function createMobileRectificationsFromTask(task = {}, hazardItems = []) {
  hazardItems.forEach((hazard, index) => {
    const id = hazard.rectifyId || `rectify-${task.id || Date.now()}-${index + 1}`
    if (getMobileRectification(id)) return
    const category = task.inspectionCategory || '安全'
    const project = task.projectId || task.project_id || task.project
    const copyDefaults = getInspectionCopyDefaults(project, category)
    const copyLabels = value => [...new Set((Array.isArray(value) ? value : String(value || '').split('、')).filter(Boolean))].join('、')
    const issueCcPersons = copyLabels(hazard.issueCcPersons ?? hazard.ccPersons ?? copyDefaults.issueCcPersons)
    const completionCcPersons = copyLabels(hazard.completionCcPersons ?? copyDefaults.completionCcPersons)
    const registeredAt = task.submittedAt ? String(task.submittedAt).replaceAll('/', '-') : nowText()
    const initiator = inspectionOperator()
    const record = {
      id,
      rectifyNo: hazard.rectifyNo || id,
      inspectionTaskId: task.id,
      initiatorId: task.rectificationInitiatorId || initiator.id,
      ...(task.voidDemoScope ? { voidDemoScope: task.voidDemoScope } : {}),
      taskNo: task.taskNo || '--',
      inspectionCategories: task.inspectionCategories,
      inspectionCategory: task.inspectionCategory || '安全',
      hazardCategory: normalizeHazardCategory(hazard.hazardCategory),
      hazardLevel: hazard.hazardLevel || '',
      rectifyRequirement: String(hazard.rectifyRequirement || '').trim(),
      projectId: task.projectId || task.project_id || '',
      project: task.project || '--',
      rectifier: hazard.rectifyPerson || hazard.rectifier || getProjectRectifierLabel(project, category),
      reviewer: hazard.reviewPerson || hazard.reviewer || getProjectReviewerLabel(project, category),
      ccPersons: issueCcPersons,
      issueCcPersons,
      completionCcPersons,
      manager: getProjectApproverLabel(project, category),
      managerId: getInspectionPersonConfig(project, category)?.managerId || '',
      contractorManager: getConfiguredPersonLabel(project, category, 'contractorManagerId'),
      director: getConfiguredPersonLabel(project, category, 'directorId'),
      projectDepartmentHead: getConfiguredPersonLabel(project, category, 'departmentHeadId'),
      workflowHistory: [],
      registeredAt,
      issuedAt: registeredAt,
      deadline: hazard.rectifyDeadline || '',
      status: '待整改',
      currentNode: '整改人整改',
      applicant: task.inspector || task.executor || '巡检人',
      inspector: task.inspector || task.executor || '巡检人',
      applyDate: registeredAt,
      overdue: false,
      hazard: hazard.desc || '',
      hazardPhotos: photoLabels(hazard.photos || [], '隐患照片'),
    }
    record.currentNode = currentWorkflowStep(record)?.label || '施工单位整改'
    photoFilesByRecordId.set(id, { hazards: [...(hazard.photos || [])], rounds: [] })
    mobileRectificationRecords.unshift(record)
    notifyWorkflow(record)
  })
}

export function listMobileHazardsAsInspectionRows() {
  return mobileRectificationRecords.filter(record => record.status !== '已作废').map(mapMobileRecordToHazardRow)
}

/** 台账用：含已作废整改单（列表可见、可删除）；统计请自行排除 status === '已作废'。 */
export function listMobileHazardsIncludingVoided() {
  return mobileRectificationRecords.map(mapMobileRecordToHazardRow)
}

/** 删除已作废整改单，并同步清理本地缓存。 */
export function deleteMobileRectificationRecord(id) {
  const index = mobileRectificationRecords.findIndex((item) => item.id === id)
  if (index < 0) return false
  if (mobileRectificationRecords[index].status !== '已作废') return false
  mobileRectificationRecords.splice(index, 1)
  markDeleted(id)
  persistAssignedRecords()
  return true
}

function ensureRectificationHistory(record) {
  if (record.workflowHistory?.length) return
  record.workflowHistory = workflowSteps(record).filter(step => record[step.date]).map(step => ({
    stage: step.key, label: step.label, actor: step.actor, date: record[step.date],
    comment: record[step.note] || '', result: step.result ? record[step.result] || '通过' : '通过',
  }))
}

export function requestInspectionVoid(id, reason) {
  restoreAssignedRecords()
  const record = getMobileRectification(id)
  const comment = String(reason || '').trim()
  if (!comment || !canRequestInspectionVoid(record)) return false
  const operator = inspectionOperator()
  const date = nowText()
  ensureRectificationHistory(record)
  record.voidRequest = { status: 'pending', reason: comment, requestedAt: date, applicant: operator.label, approver: INSPECTION_VOID_APPROVER }
  record.workflowHistory.push({ type: 'voidRequest', stage: 'voidRequest', label: '申请作废整改单', actor: operator.label, date, comment })
  record.currentNode = currentWorkflowLabel(record)
  persistAssignedRecords()
  notifyWorkflow(record, { voidRequest: true })
  return true
}

function decideInspectionVoid(record, pass, comment) {
  const date = nowText()
  const step = currentWorkflowStep(record)
  if (!comment || step?.key !== 'voidApproval' || !canExecuteInspectionStep(record, step.key)) return false
  Object.assign(record.voidRequest, { status: pass ? 'approved' : 'rejected', decidedAt: date, comment })
  record.workflowHistory.push({ stage: 'voidApproval', label: '作废审批', actor: step.actor, date, comment, result: pass ? '通过' : '不通过' })
  if (pass) {
    record.status = '已作废'
    record.closeDate = date
    markInspectionTaskVoided(record)
  }
  record.currentNode = currentWorkflowLabel(record)
  persistAssignedRecords()
  notifyWorkflow(record, step)
  return true
}

/** 所有端共用同一状态机，禁止跳级或重复办理；驳回后从整改节点重新开始。 */
export function submitInspectionWorkflowStep(id, expectedStage, pass, payload = {}) {
  restoreAssignedRecords()
  const record = getMobileRectification(id)
  const step = currentWorkflowStep(record)
  if (!record || !step || step.key !== expectedStage) return false
  if (!canExecuteInspectionStep(record, step.key)) return false  if (step.key === 'voidApproval') return decideInspectionVoid(record, pass, String(payload.comment || '').trim())
  const steps = workflowSteps(record), index = steps.findIndex(item => item.key === step.key)
  const date = payload.date || payload[step.date] || nowText().slice(0, 10)
  const comment = String(payload.comment || payload[step.note] || '').trim()
  if (!date || (!comment && !(pass && isAcceptanceStage(step.key)))) return false
  if (step.key === 'rectify' && (!pass || !(payload.rectificationPhotos || payload.rectPhotos || []).length)) return false
  // 历史单据首次办理时固化原始登记时间，后续 applyDate 更新不影响下发记录。
  record.issuedAt ||= record.applyDate || nowText()
  const result = pass ? '通过' : '不通过'
  ensureRectificationHistory(record)
  record.workflowHistory.push({ stage: step.key, label: step.label, actor: step.actor, date, comment, result })
  record[step.date] = date
  record[step.note] = comment
  if (step.result) record[step.result] = result
  if (step.key === 'rectify') {
    const photos = payload.rectificationPhotos || payload.rectPhotos || []
    record.rectificationPhotos = photoLabels(photos, '整改照片')
    record.workflowHistory.at(-1).photos = [...record.rectificationPhotos]
    const sources = getRectificationPhotoFiles(id) || { hazards: [], rounds: [] }
    sources.rounds.push({ historyIndex: record.workflowHistory.length - 1, photos: [...photos] })
    photoFilesByRecordId.set(id, sources)
    record.submitDate = date
  }
  const rejected = !pass && !confirming
  const nextIndex = pass ? index + 1 : confirming ? steps.length : steps.findIndex(item => item.key === 'rectify')
  // 每轮结论保留在流程记录；驳回后清空当前轮所有节点的材料和办理结果。
  for (let i = nextIndex; i < steps.length; i++) {
    const later = steps[i]
    record[later.date] = ''
    record[later.note] = ''
    if (later.result) record[later.result] = ''
  }
  if (rejected) {
    record.submitDate = ''
    record.rectificationPhotos = []
  }
  const next = steps[nextIndex]
  Object.assign(record, {
    status: next?.status || '已关闭',
    currentNode: next?.label || '流程结束',
    applicant: step.actor,
    applyDate: nowText(),
    closeDate: next ? '' : date,
    isRejected: rejected,
    rejectReason: rejected ? comment : '',
    approvalRejected: false,
    approvalReason: '',
  })
  notifyWorkflow(record, step)
  if (record.voidRequest) persistAssignedRecords()
  return true
}
export function submitRectification(id, payload = {}) {
  return submitInspectionWorkflowStep(id, 'rectify', true, { ...payload, date: payload.rectificationDate || payload.rectDate, comment: payload.rectificationNote || payload.rectNote })
}
export function submitRectificationReview(id, pass, payload = {}) {
  return submitInspectionWorkflowStep(id, 'review', pass, { ...payload, date: payload.reviewDate, comment: payload.reviewComment })
}
export function submitManagerApproval(id, pass, payload = {}) {
  return submitInspectionWorkflowStep(id, 'approval', pass, { ...payload, date: payload.approvalDate, comment: payload.approvalComment })
}

export const mobileWorkflowMessages = computed(() => {
  const inspectionTodo = listMobileInspectionTasks()
    .filter((item) => item.status === '未完成')
    .map((item) => ({
      id: `todo-task-${item.id}`,
      recordId: item.id,
      flowName: '巡检任务',
      currentNode: '巡检人执行',
      owner: item.executor,
      applicant: '工程指挥部',
      applyDate: item.deadline,
      status: '待办',
      action: 'task-execute',
    }))
  const rectifyTodo = mobileRectificationRecords
    .filter((item) => !item.legacyWorkflowExample && currentWorkflowStep(item) && canExecuteInspectionStep(item, currentWorkflowStep(item)?.key))
    .map((item) => ({
      id: `todo-${item.id}`,
      inspectionCategory: item.inspectionCategory,
      hazardLevel: item.hazardLevel,
      rectifyNo: item.rectifyNo,
      hazard: item.hazard,
      workflowStage: currentWorkflowStep(item)?.key,
      recordId: item.id,
      flowName: '隐患整改',
      currentNode: item.currentNode,
      owner: currentWorkflowStep(item)?.actor || '-',
      applicant: item.applicant,
      applyDate: item.applyDate,
      status: '待办',
      action: currentWorkflowStep(item)?.key === 'rectify' ? 'execute' : ['approval', 'departmentConfirmation', 'voidApproval'].includes(currentWorkflowStep(item)?.key) ? 'approve' : 'review',
    }))
  const todo = [...inspectionTodo, ...rectifyTodo]
  const initiated = mobileRectificationRecords.filter(item => !item.legacyWorkflowExample).map((item) => ({
    id: `started-${item.id}`,
    recordId: item.id,
    flowName: '隐患整改',
    currentNode: item.currentNode,
    owner: currentWorkflowStep(item)?.actor || '-',
    applicant: item.applicant,
    applyDate: item.applyDate,
    status: item.status === '已作废' ? '已作废' : item.voidRequest?.status === 'pending' ? '作废审批中' : item.status === '已关闭' ? '已办结' : '流转中',
    action: 'detail',
  }))
  const done = mobileRectificationRecords
    .filter((item) => item.status === '已关闭')
    .map((item) => ({
      id: `done-${item.id}`,
      recordId: item.id,
      flowName: '隐患整改',
      currentNode: item.departmentConfirmationResult === '通过' ? '项目部长确认通过' : '项目经理审批通过',
      owner: item.manager,
      applicant: item.applicant,
      applyDate: item.applyDate,
      status: '已办结',
      action: 'detail',
    }))

  const copiedRows = mobileRectificationRecords.flatMap(item =>
    rectificationCopyEvents(item).filter(event => isInspectionCopyRecipient(event.recipients, item.projectId, item.inspectionCategory)).map(event => ({ item, event })),
  )
  for (const item of mobileRectificationRecords.filter(row => row.legacyWorkflowExample && !row.ccPersons).slice(1, 4)) {
    copiedRows.push({ item, event: { key: 'legacy', title: '隐患整改', date: item.applyDate } })
  }
  const copied = copiedRows.map(({ item, event }) => ({
    id: `cc-${item.id}-${event.key}`,
    recordId: item.id,
    flowName: event.title,
    currentNode: item.currentNode,
    owner: item.rectifier,
    applicant: item.inspector || item.applicant,
    applyDate: event.date,
    status: '抄送',
    action: 'detail',
  }))
  return { todo, initiated, done, copied }
})
