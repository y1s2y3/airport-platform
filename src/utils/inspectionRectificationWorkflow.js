export const isQualityA = row => row?.inspectionCategory === '质量' && row?.hazardLevel === 'A'
export const isMajorInspectionHazard = row => ['安全', '其他'].includes(row?.inspectionCategory) && row?.hazardLevel === 'Ⅰ重大隐患'
export const usesExtendedInspectionWorkflow = row => isQualityA(row) || isMajorInspectionHazard(row)

export const INSPECTION_VOID_APPROVER_ID = 'u-007'
export const INSPECTION_VOID_APPROVER = '刘文强（指挥部安全和整改负责人）'
/** 整改单状态：施工方整改与施工方项目经理验收同属“待整改”，监理复查与总监验收同属“待验收”，审批为“待复查”。 */
export const RECTIFICATION_STATUSES = ['待整改', '待验收', '待复查', '已关闭']
export const ACCEPTANCE_STAGES = ['contractorAcceptance', 'directorAcceptance']
export function isAcceptanceStage(key) { return ACCEPTANCE_STAGES.includes(key) }
export function workflowSteps(row = {}) {
  return [
    { key: 'rectify', label: '施工单位整改', actor: row.rectifier, status: '待整改', biz: '整改', date: 'rectificationDate', note: 'rectificationNote', result: '' },
    ...(usesExtendedInspectionWorkflow(row) ? [{ key: 'contractorAcceptance', label: '施工单位项目经理验收', actor: row.contractorManager || '施工单位项目经理', status: '待整改', biz: '施工验收', date: 'contractorAcceptanceDate', note: 'contractorAcceptanceComment', result: 'contractorAcceptanceResult' }] : []),
    { key: 'review', label: '监理单位复核', actor: row.reviewer, status: '待验收', biz: '复查', date: 'reviewDate', note: 'reviewComment', result: 'reviewResult' },
    ...(usesExtendedInspectionWorkflow(row) ? [{ key: 'directorAcceptance', label: '监理单位项目总监验收', actor: row.director || '监理单位项目总监', status: '待验收', biz: '总监验收', date: 'directorAcceptanceDate', note: 'directorAcceptanceComment', result: 'directorAcceptanceResult' }] : []),
    { key: 'approval', label: row.inspectionCategory === '质量' || isMajorInspectionHazard(row) ? '指挥部项目经理审批' : '项目经理审批', actor: row.manager, status: '待复查', biz: '审批', date: 'approvalDate', note: 'approvalComment', result: 'approvalResult' },
    ...(usesExtendedInspectionWorkflow(row) ? [{ key: 'departmentConfirmation', label: '项目部长确认', actor: row.projectDepartmentHead || '项目部长', status: '待复查', biz: '项目部长确认', date: 'departmentConfirmationDate', note: 'departmentConfirmationComment', result: 'departmentConfirmationResult' }] : []),
  ]
}
/** 同一状态可能对应多个节点（如“待整改”含施工方整改、施工方项目经理验收），取第一个尚未办结的节点。 */
export function currentWorkflowStep(row) {
  if (!row || ['已关闭', '已作废'].includes(row.status)) return null
  if (row.voidRequest?.status === 'pending') return {
    key: 'voidApproval', label: '指挥部安全和整改负责人审批', actor: row.voidRequest.approver || INSPECTION_VOID_APPROVER,
    biz: '作废审批',
  }
  const steps = workflowSteps(row)
  const pending = steps.find(step => step.status === row?.status && !row?.[step.date] && !(step.result && row?.[step.result]))
  if (pending) return pending
  const legacyKey = { 待施工单位验收: 'contractorAcceptance', 待总监验收: 'directorAcceptance' }[row?.status]
  return legacyKey ? steps.find(step => step.key === legacyKey) || null : null
}
export function currentWorkflowLabel(row) {
  if (row?.status === '已作废') return '已作废'
  if (row?.status === '已关闭') return '流程结束'
  return currentWorkflowStep(row)?.label || row?.currentNode || '--'
}
/** 个人中心流程名称前缀：A/B/C 级质量问题、安全问题、其他问题。 */
export function rectifyNamePrefix(row = {}) {
  if (row.inspectionCategory === '质量') return `${row.hazardLevel || ''}级质量问题`
  if (isMajorInspectionHazard(row)) return row.inspectionCategory + '重大隐患'
  if (row.inspectionCategory === '其他') return '其他问题'
  return '安全问题'
}
/** 个人中心流程名称里的节点措辞（与业务节点一一对应）。 */
export function rectificationStepName(row = {}, key = '') {
  return {
    rectify: '施工方整改',
    contractorAcceptance: '施工方项目经理验收',
    review: row.inspectionCategory === '其他' ? '监理复核' : '监理复查',
    directorAcceptance: '监理项目总监验收',
    approval: '指挥部项目经理验收',
    departmentConfirmation: '项目部长确认',
    voidApproval: '作废审批',
  }[key] || ''
}
export function rectificationProcessName(row = {}, key = '') {
  return `隐患问题整改 · ${rectifyNamePrefix(row)}${rectificationStepName(row, key)}`
}
export function rectificationIssuedAt(row) {
  return row?.issuedAt || row?.issueDate || row?.applyDate || ''
}

export function rectificationCopyEvents(row) {
  const split = value => [...new Set(String(value || '').split('、').map(label => label.trim()).filter(Boolean))]
  return [
    { key: 'issue', title: '下发整改单抄送', date: rectificationIssuedAt(row), recipients: split(row.issueCcPersons ?? row.ccPersons) },
    { key: 'completion', title: '整改单完成抄送', date: row.approvalResult === '通过' && row.status === '已关闭' ? row.closeDate : '', recipients: split(row.completionCcPersons) },
  ].filter(event => event.date && event.recipients.length)
}

export function workflowFlowRecords(row) {
  if (!row) return []
  const logs = (row.workflowHistory || []).map(log => ({ a: log.label + (log.type === 'voidRequest' ? '' : log.result === '通过' ? '通过' : log.result === '不通过' ? '不通过' : '已提交'), d: log.date, dt: log.comment, by: log.actor }))
  if (!logs.length) for (const step of workflowSteps(row)) if (row[step.date]) logs.push({ a: step.label, d: row[step.date], dt: row[step.note], by: step.actor })
  const current = currentWorkflowStep(row)
  const issue = { a: '下发整改单', d: rectificationIssuedAt(row), by: row.inspector || row.applicant }
  const start = issue
  return [start, ...logs, { a: current?.label || (row.status === '已作废' ? '已作废' : '流程结束'), d: current ? '' : row.closeDate, by: current?.actor || '', cur: !!current }]
}
export function workflowApprovalRecords(row) {
  return workflowFlowRecords(row).map(item => ({ title: item.a, user: item.by || '', time: item.d || '', remark: item.dt || '', status: item.cur ? 'current' : 'done' }))
}
