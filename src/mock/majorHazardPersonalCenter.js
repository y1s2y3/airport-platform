/**
 * 危大工程管理 → 个人中心（辨识审批 + 日历异常预警同步）
 * 从 0831 备份增量迁入，供 personalCenter.js 挂接。
 */
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import {
  buildCalendarAlerts,
  buildLedgerRows,
  ensureMajorHazardData,
  getMajorHazardData,
  majorHazardApproverLabel,
  saveIdentification,
  updateAlertStatus,
} from '../utils/majorHazardManualStorage.js'

function personalProcessTime() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

function stableWarningHash(value) {
  let hash = 0
  for (const char of String(value || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash).toString().padStart(8, '0').slice(-8)
}

function majorHazardWarningCenterItem(project, alert) {
  const actionTime = alert.handledAt || `${new Date().toISOString().slice(0, 10)} 08:00:00`
  return {
    id: `wc-major-hazard-${project.id}-${stableWarningHash(alert.id)}`,
    module: '危大工程管理',
    projectName: project.label,
    isExample: Boolean(alert.isExample),
    safetyResponsible: alert.part?.safetyResponsible || alert.handler || '项目安全负责人',
    warningNo: `MHYC${stableWarningHash(`${project.id}:${alert.id}`)}`,
    alertType: alert.type,
    location: alert.part?.name || '—',
    sourceName: alert.ledgerName,
    description: `${alert.content}（${alert.ledgerName} / ${alert.part?.name || '未填写施工部位'}）`,
    handler: alert.handler || '项目安全负责人',
    requiresDisposal: true,
    warnType: '处置任务',
    status: alert.status === '已处理' ? '已关闭' : '待处理',
    time: actionTime,
    majorHazardProjectId: project.id,
    majorHazardAlertId: alert.id,
    majorHazardLedgerSourceId: alert.ledgerSourceId,
    disposalResult: alert.disposalResult || '',
    disposalNote: alert.disposalNote || '',
    disposalAttachments: alert.disposalAttachments || [],
    dismissed: false,
  }
}

/** 将各项目危大工程异常同步为个人中心预警处置任务 */
export function syncMajorHazardWarningCenter(personalWarningCenterStore) {
  if (!personalWarningCenterStore?.items) return
  for (const project of COC_PROJECT_OPTIONS) {
    ensureMajorHazardData(project.id)
    const data = getMajorHazardData(project.id)
    const alerts = buildCalendarAlerts(data, buildLedgerRows(data))
    for (const alert of alerts) {
      const row = majorHazardWarningCenterItem(project, alert)
      const existing = personalWarningCenterStore.items.find((item) => item.id === row.id)
      if (!existing) {
        personalWarningCenterStore.items.unshift(row)
        continue
      }
      Object.assign(existing, row, { dismissed: existing.dismissed || false })
    }
  }
}

/** 预警中心处置回写危大工程管理异常 */
export function applyMajorHazardWarningDispose(row, { content = '', attachments = [], operator = '张明' } = {}) {
  if (row?.module !== '危大工程管理' || !row.majorHazardProjectId || !row.majorHazardAlertId) return false
  // 危大工程异常不支持「误报」，与备份口径一致，统一按「已处理」回写
  updateAlertStatus(row.majorHazardProjectId, row.majorHazardAlertId, '已处理', {
    disposalResult: '已处理',
    disposalNote: content || '',
    disposalAttachments: attachments,
    operator,
  })
  return true
}

/** 危大工程辨识：个人中心待办 / 已办 / 我发起的示例 */
export function seedMajorHazardIdentificationPersonalCenter() {
  return {
    todos: [
      {
        id: 'todo-major-hazard-identification-1',
        type: 'major_hazard_identification',
        sourceLabel: '危大工程管理',
        category: '危大工程管理',
        bizType: '危大辨识审批',
        processName: '危大工程辨识审批·航站区地下室基坑支护工程',
        applicant: '李建国',
        dept: '工程管理部',
        applyTime: '2026-09-02 10:20:00',
        majorHazardProjectId: 'p-000',
        majorHazardIdentificationId: 'mh-demo-identify-pit',
        detail: {
          identificationNo: 'WD-BS-2026-001',
          project: '深圳机场扩建工程',
          wbsName: '航站区地下室工程',
          workName: '基坑支护及降水工程',
          workPart: '航站区地下室基坑',
          hazardCategory: '基坑工程',
          identificationBasis: '基坑开挖深度超过 5m，属于危险性较大的分部分项工程。',
          superMajor: '是',
          supervisorApprover: '李总监（总监理工程师）',
          projectManagerApprover: '陈项目经理（项目经理）',
          currentNode: '监理单位审批',
          summary: '已完成危大工程辨识，依次提请监理单位、项目经理审批后纳入危大工程清单。',
        },
        approvalFlow: [
          { title: '发起危大辨识', time: '2026-09-02 10:20:00', user: '李建国', remark: '已提交危大工程辨识申请', status: 'done' },
          { title: '监理单位审批', time: '', user: '李总监（总监理工程师）', remark: '待审批', status: 'current' },
          { title: '项目经理审批', time: '', user: '陈项目经理（项目经理）', remark: '待审批', status: 'pending' },
        ],
      },
    ],
    done: [
      {
        id: 'done-major-hazard-identification-1',
        type: 'major_hazard_identification',
        sourceLabel: '危大工程管理',
        category: '危大工程管理',
        bizType: '危大辨识审批',
        processName: '危大工程辨识审批·飞行区高大模板支撑体系',
        applicant: '陈海',
        dept: '工程管理部',
        applyTime: '2026-08-18 09:15:00',
        handleTime: '2026-08-19 16:40:00',
        handleLabel: '审批通过',
        majorHazardProjectId: 'p-000',
        majorHazardIdentificationId: 'mh-demo-identify-formwork',
        detail: {
          identificationNo: 'WD-BS-2026-002',
          project: '深圳机场扩建工程',
          wbsName: '飞行区配套工程',
          workName: '高大模板支撑体系搭设工程',
          workPart: '综合管廊顶板',
          hazardCategory: '模板工程及支撑体系',
          identificationBasis: '依据项目危大字典和辨识结果，该工程标记为超危工程。',
          superMajor: '是',
          supervisorApprover: '赵专监（专业监理工程师）',
          projectManagerApprover: '吴项目经理（项目经理）',
          currentNode: '已办结',
          summary: '监理单位、项目经理审批通过，已同步纳入危大工程清单并编制专项施工方案。',
        },
        approvalFlow: [
          { title: '发起危大辨识', time: '2026-08-18 09:15:00', user: '陈海', remark: '已提交危大工程辨识申请', status: 'done' },
          { title: '监理单位审批', time: '2026-08-18 15:20:00', user: '赵专监（专业监理工程师）', remark: '同意提请项目经理审批', status: 'done' },
          { title: '项目经理审批', time: '2026-08-19 16:40:00', user: '吴项目经理（项目经理）', remark: '同意纳入危大工程清单', status: 'done' },
          { title: '办结归档', time: '2026-08-19 16:40:00', user: '系统', remark: '危大辨识流程已办结', status: 'done' },
        ],
      },
    ],
    started: [
      {
        id: 'start-major-hazard-identification-1',
        type: 'major_hazard_identification',
        sourceLabel: '危大工程管理',
        category: '危大工程管理',
        bizType: '危大辨识审批',
        processName: '危大工程辨识审批·航站区地下室脚手架工程',
        status: '审批中',
        applicant: '当前用户',
        dept: '工程管理部',
        applyTime: '2026-09-01 15:10:00',
        endTime: '',
        majorHazardProjectId: 'p-000',
        majorHazardIdentificationId: 'mh-demo-identify-scaffold',
        detail: {
          identificationNo: 'WD-BS-2026-003',
          project: '深圳机场扩建工程',
          wbsName: '航站区地下室工程',
          workName: '落地式脚手架工程',
          workPart: '地下室外墙施工区',
          hazardCategory: '脚手架工程',
          identificationBasis: '搭设高度 24m 及以上的落地式钢管脚手架，属于危大工程。',
          superMajor: '否',
          supervisorApprover: '李总监（总监理工程师）',
          projectManagerApprover: '郑项目经理（项目经理）',
          currentNode: '监理单位审批',
          summary: '已完成危大工程辨识，等待监理单位、项目经理审批。',
        },
        approvalFlow: [
          { title: '发起危大辨识', time: '2026-09-01 15:10:00', user: '当前用户', remark: '已提交危大工程辨识申请', status: 'done' },
          { title: '监理单位审批', time: '', user: '李总监（总监理工程师）', remark: '待审批', status: 'current' },
          { title: '项目经理审批', time: '', user: '郑项目经理（项目经理）', remark: '待审批', status: 'pending' },
        ],
      },
    ],
  }
}

function buildMajorHazardIdentificationDetail(identification, projectName) {
  const identifiedItems = (identification.items || []).filter((item) => item.conclusion === '√')
  const supervisorApprover = majorHazardApproverLabel(identification.supervisorApproverId) || '—'
  const projectManagerApprover = majorHazardApproverLabel(identification.projectManagerApproverId) || '—'
  return {
    identificationNo: identification.identificationNo || `WD-BS-${String(identification.id || '').replace(/^mh-identify-/, '') || '新建'}`,
    project: projectName || '当前项目',
    wbsName: '待危大清单维护',
    workName: identifiedItems.map((item) => item.description).join('；') || '未辨识出危大工程',
    workPart: '待危大清单维护',
    hazardCategory: identification.categoryName || '—',
    identificationBasis: '依据危大工程字典完成辨识，审批通过后同步纳入危大工程清单。',
    superMajor: identifiedItems.some((item) => item.isSuperMajor === '是') ? '是' : '否',
    supervisorApprover,
    projectManagerApprover,
    currentNode: '监理单位审批',
    summary: `本次辨识出 ${identifiedItems.length} 项危大工程，依次提请监理单位、项目经理审批。`,
  }
}

/** 危大辨识提交后生成待办与我发起的 */
export function createMajorHazardIdentificationTodo(
  { projectId, projectName, identification } = {},
  { personalTodoStore, personalStarted, findPersonalTodo },
) {
  if (!projectId || !identification?.id) return null
  const todoId = `todo-major-hazard-identification-${identification.id}`
  const startedId = `start-major-hazard-identification-${identification.id}`
  const applyTime = personalProcessTime()
  const detail = buildMajorHazardIdentificationDetail(identification, projectName)
  const flow = [
    {
      title: '发起危大辨识',
      time: applyTime,
      user: identification.identifiedBy || '当前用户',
      remark: '已提交危大工程辨识申请',
      status: 'done',
    },
    {
      title: '监理单位审批',
      time: '',
      user: detail.supervisorApprover === '—' ? '监理单位审批人' : detail.supervisorApprover,
      remark: '待审批',
      status: 'current',
    },
    {
      title: '项目经理审批',
      time: '',
      user: detail.projectManagerApprover === '—' ? '项目经理' : detail.projectManagerApprover,
      remark: '待审批',
      status: 'pending',
    },
  ]
  const todo = {
    id: todoId,
    type: 'major_hazard_identification',
    sourceLabel: '危大工程管理',
    category: '危大工程管理',
    bizType: '危大辨识审批',
    processName: `危大工程辨识审批·${identification.categoryName || '未命名类别'}`,
    applicant: identification.identifiedBy || '当前用户',
    dept: '工程管理部',
    applyTime,
    detail,
    majorHazardProjectId: projectId,
    majorHazardIdentificationId: identification.id,
    approvalFlow: flow.map((item) => ({ ...item })),
  }

  for (let index = personalTodoStore.todos.length - 1; index >= 0; index -= 1) {
    const item = personalTodoStore.todos[index]
    if (
      item.type === 'major_hazard_identification' &&
      item.majorHazardProjectId === projectId &&
      item.majorHazardIdentificationId === identification.id
    ) {
      personalTodoStore.todos.splice(index, 1)
    }
  }
  personalTodoStore.todos.unshift(todo)

  const started = {
    id: startedId,
    type: 'major_hazard_identification',
    sourceLabel: '危大工程管理',
    category: '危大工程管理',
    bizType: '危大辨识',
    processName: `危大工程辨识·${identification.categoryName || '未命名类别'}`,
    status: '审批中',
    applicant: identification.identifiedBy || '当前用户',
    dept: '工程管理部',
    applyTime,
    endTime: '',
    detail: { ...detail },
    majorHazardProjectId: projectId,
    majorHazardIdentificationId: identification.id,
    approvalFlow: flow.map((item) => ({ ...item })),
  }
  const startedIndex = personalStarted.findIndex((item) => item.id === startedId)
  if (startedIndex >= 0) personalStarted.splice(startedIndex, 1, started)
  else personalStarted.unshift(started)
  return todo
}

/** 个人中心审批危大辨识后，同步辨识记录与我发起的 */
export function handleMajorHazardIdentificationTodo(
  id,
  { approved, opinion = '' } = {},
  { findPersonalTodo, personalStarted },
) {
  const todo = findPersonalTodo(id)
  if (!todo || todo.type !== 'major_hazard_identification') return { ok: false, msg: '未找到危大工程辨识待办' }
  if (!todo.majorHazardProjectId || !todo.majorHazardIdentificationId) {
    return { ok: false, msg: '该危大工程辨识待办缺少业务关联信息' }
  }

  ensureMajorHazardData(todo.majorHazardProjectId)
  const data = getMajorHazardData(todo.majorHazardProjectId)
  const identification = data.identifications.find((item) => item.id === todo.majorHazardIdentificationId)
  if (!identification) return { ok: false, msg: '未找到对应的危大工程辨识记录' }

  const now = personalProcessTime()
  const handleLabel = approved ? '审批通过' : '审批驳回'
  const approvalStatus = approved ? '已通过' : '已驳回'
  const approvalFlow = (todo.approvalFlow || []).map((step) =>
    step.status === 'current' || step.status === 'pending'
      ? { ...step, status: 'done', time: now, user: '当前用户', remark: opinion || handleLabel }
      : { ...step },
  )
  approvalFlow.push({
    title: '办结归档',
    time: now,
    user: '系统',
    remark: approved ? '危大辨识审批通过' : '危大辨识审批已驳回',
    status: 'done',
  })

  todo.approvalFlow = approvalFlow
  todo.detail = {
    ...todo.detail,
    currentNode: '已办结',
    summary: approved ? '审批通过，已同步纳入危大工程清单。' : `审批已驳回：${opinion || '请到「危大辨识」列表修改后重新提交。'}`,
  }
  saveIdentification(todo.majorHazardProjectId, {
    ...identification,
    approvalStatus,
    approvalOpinion: opinion,
    approvedAt: now,
  })

  const started = personalStarted.find(
    (item) =>
      item.type === 'major_hazard_identification' &&
      item.majorHazardProjectId === todo.majorHazardProjectId &&
      item.majorHazardIdentificationId === todo.majorHazardIdentificationId,
  )
  if (started) {
    Object.assign(started, {
      status: approvalStatus,
      endTime: now,
      detail: {
        ...started.detail,
        currentNode: '已办结',
        summary: approved
          ? '审批通过，已同步纳入危大工程清单。'
          : `审批已驳回：${opinion || '请到「危大辨识」列表修改后重新提交。'}`,
      },
      approvalFlow: approvalFlow.map((item) => ({ ...item })),
    })
  }
  return { ok: true, approved }
}
