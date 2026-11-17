import { getCurrentUserSnapshot, getEffectiveUserId } from '../mock/currentUser'
import { inspectorCandidates } from '../composables/useInspectionPersonConfig'
import { currentWorkflowStep } from './inspectionRectificationWorkflow'

export function inspectionOperator() {
  const snapshot = getCurrentUserSnapshot()
  const id = getEffectiveUserId(snapshot)
  const person = inspectorCandidates.find(item => item.id === id)
  return { id, name: person?.name || snapshot.name, label: person ? `${person.name}（${person.role}）` : snapshot.name }
}
export function canExecuteInspectionStep(record, stage) {
  const assignment = record?.workflowAssignees?.[stage]
  return !assignment || assignment.id === inspectionOperator().id
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
export function isInspectionCopyRecipient(recipients) {
  const operator = inspectionOperator()
  const labels = Array.isArray(recipients) ? recipients : String(recipients || '').split('、')
  return labels.some(label => label === operator.label || label === operator.name)
}
