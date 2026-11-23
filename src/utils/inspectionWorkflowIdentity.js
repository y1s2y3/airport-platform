import { getCurrentUserSnapshot, getEffectiveUserId } from '../mock/currentUser'
import { getInspectorById, inspectorCandidates } from '../composables/useInspectionPersonConfig'
import { currentWorkflowStep } from './inspectionRectificationWorkflow'

export function inspectionOperator() {
  const snapshot = getCurrentUserSnapshot()
  const id = getEffectiveUserId(snapshot)
  const person = inspectorCandidates.find(item => item.id === id)
  return { id, name: person?.name || snapshot.name, label: person ? `${person.name}（${person.role}）` : snapshot.name }
}
export function canExecuteInspectionStep(record, stage) {
  const assignment = record?.workflowAssignees?.[stage]
  if (assignment) return assignment.id === inspectionOperator().id
  if (stage !== 'managerConfirmation' || !record?.managerId || record.managerConfirmationExample) return true
  const operator = inspectionOperator()
  const manager = getInspectorById(record.managerId)
  const isDefaultProjectManager = manager?.id === 'manager-' + record.projectId || manager?.id === 'quality-hq-manager'
  return operator.id === record.managerId || (isDefaultProjectManager && operator.id === 'u-proj-' + record.projectId)
}
export function canAssignInspectionStep(record, stage) {
  const step = currentWorkflowStep(record)
  if (!step || step.key !== stage || !['rectify', 'review'].includes(stage)) return false
  const operator = inspectionOperator()
  const assignment = record.workflowAssignees?.[stage]
  if (assignment) return assignment.id === operator.id
  // 演示原型允许从待办列表直接演示首次指派，无需切换为配置中的处理人。
  // 指派后仍只允许接收人办理或再次转交。
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
