export const isQualityA = row => row?.inspectionCategory === '质量' && row?.hazardLevel === 'A'
/** 整改单状态：施工方整改与施工方项目经理验收同属“待整改”，监理复查与总监验收同属“待验收”，审批为“待复查”。 */
export const RECTIFICATION_STATUSES = ['待整改', '待验收', '待复查', '已关闭']
export const ACCEPTANCE_STAGES = ['contractorAcceptance', 'directorAcceptance']
export function isAcceptanceStage(key) { return ACCEPTANCE_STAGES.includes(key) }
export function workflowSteps(row = {}) {
  return [
    { key: 'rectify', label: '施工单位整改', actor: row.rectifier, status: '待整改', biz: '整改', date: 'rectificationDate', note: 'rectificationNote', result: '' },
    ...(isQualityA(row) ? [{ key: 'contractorAcceptance', label: '施工单位项目经理验收', actor: row.contractorManager, status: '待整改', biz: '施工验收', date: 'contractorAcceptanceDate', note: 'contractorAcceptanceComment', result: 'contractorAcceptanceResult' }] : []),
    { key: 'review', label: '监理单位复核', actor: row.reviewer, status: '待验收', biz: '复查', date: 'reviewDate', note: 'reviewComment', result: 'reviewResult' },
    ...(isQualityA(row) ? [{ key: 'directorAcceptance', label: '监理单位项目总监验收', actor: row.director, status: '待验收', biz: '总监验收', date: 'directorAcceptanceDate', note: 'directorAcceptanceComment', result: 'directorAcceptanceResult' }] : []),
    { key: 'approval', label: row.inspectionCategory === '质量' ? '指挥部项目经理审批' : '项目经理审批', actor: row.manager, status: '待复查', biz: '审批', date: 'approvalDate', note: 'approvalComment', result: 'approvalResult' },
  ]
}
/** 同一状态可能对应多个节点（如“待整改”含施工方整改、施工方项目经理验收），取第一个尚未办结的节点。 */
export function currentWorkflowStep(row) {
  const steps = workflowSteps(row)
  const pending = steps.find(step => step.status === row?.status && !row?.[step.date] && !(step.result && row?.[step.result]))
  if (pending) return pending
  const legacyKey = { 待施工单位验收: 'contractorAcceptance', 待总监验收: 'directorAcceptance' }[row?.status]
  return legacyKey ? steps.find(step => step.key === legacyKey) || null : null
}
/** 个人中心流程名称前缀：A/B/C 级质量问题、安全问题、其他问题。 */
export function rectifyNamePrefix(row = {}) {
  if (row.inspectionCategory === '质量') return `${row.hazardLevel || ''}级质量问题`
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
  }[key] || ''
}
export function rectificationProcessName(row = {}, key = '') {
  return `隐患问题整改 · ${rectifyNamePrefix(row)}${rectificationStepName(row, key)}`
}
export function workflowFlowRecords(row) {
  if (!row) return []
  const logs = (row.workflowHistory || []).map(log => ({ a: log.label + (log.type === 'assignment' ? '指派' : log.result === '通过' ? '通过' : log.result === '不通过' ? '不通过' : '已提交'), d: log.date, dt: log.comment, by: log.actor, ...(log.type === 'assignment' ? { type: 'assignment', from: log.from || log.actor, to: log.to || String(log.comment || '').split('指派给')[1] || '' } : {}) }))
  if (!logs.length) for (const step of workflowSteps(row)) if (row[step.date]) logs.push({ a: step.label, d: row[step.date], dt: row[step.note], by: step.actor })
  const current = currentWorkflowStep(row)
  return [{ a: '下发整改单', d: row.issuedAt || row.applyDate, by: row.inspector || row.applicant }, ...logs, { a: current?.label || '流程结束', d: current ? '' : row.closeDate, by: current?.actor || '', cur: !!current }]
}
export function workflowApprovalRecords(row) {
  return workflowFlowRecords(row).map(item => ({ title: item.a, user: item.by || '', time: item.d || '', remark: item.dt || '', from: item.from, to: item.to, status: item.type === 'assignment' ? 'assignment' : item.cur ? 'current' : 'done' }))
}
