import { getCurrentUserSnapshot, getEffectiveUserId } from '../mock/currentUser'
import { getInspectorById, inspectorCandidates } from '../composables/useInspectionPersonConfig'
import { currentWorkflowStep, INSPECTION_VOID_APPROVER_ID, rectificationIssuedAt } from './inspectionRectificationWorkflow'

export function inspectionOperator() {
  const snapshot = getCurrentUserSnapshot()
  const id = getEffectiveUserId(snapshot)
  const person = inspectorCandidates.find(item => item.id === id)
  return { id, name: person?.name || snapshot.name, label: person ? `${person.name}（${person.role}）` : snapshot.name }
}
function isInspectionInitiator(record, operator) {
  return record.initiatorId ? record.initiatorId === operator.id : [operator.label, operator.name].includes(record.inspector || record.applicant)
}

export function canRequestInspectionVoid(record) {
  if (!record || !rectificationIssuedAt(record) || ['已关闭', '已作废'].includes(record.status) || record.voidRequest?.status === 'pending') return false
  return isInspectionInitiator(record, inspectionOperator())
}

export function canDeleteInspectionRectification(record) {
  if (record?.status !== '已作废' || record.deletion) return false
  const operator = inspectionOperator()
  return operator.id === INSPECTION_VOID_APPROVER_ID || isInspectionInitiator(record, operator)
}

export function canExecuteInspectionStep(record, stage) {
  // 示例单据在指挥部/项目级都可查看与演示办理，保证两级示例数据一致。
  if (record?.workflowExample) return true
  if (record?.status === '已作废') return false
  if (record?.voidRequest?.status === 'pending') return stage === 'voidApproval' && inspectionOperator().id === INSPECTION_VOID_APPROVER_ID
  if (stage === 'voidApproval') return false
  return true
}
export function isInspectionCopyRecipient(recipients, projectId, category) {
  const operator = inspectionOperator()
  const labels = Array.isArray(recipients) ? recipients : String(recipients || '').split('、')
  const aliases = [operator.label, operator.name]
  if (operator.id === 'u-proj-' + projectId) {
    const manager = getInspectorById('manager-' + projectId)
    if (manager) aliases.push(manager.name + '（' + manager.role + '）', manager.name + '（项目经理）')
    if (category === '质量') {
      const qualityManager = getInspectorById('quality-hq-manager')
      aliases.push(qualityManager.name + '（' + qualityManager.role + '）')
    }
  }
  return labels.some(label => aliases.includes(label))
}
