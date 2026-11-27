import { getCurrentUserSnapshot, getEffectiveUserId } from '../mock/currentUser'
import { getInspectorById, inspectorCandidates, listInspectionPersonCandidates } from '../composables/useInspectionPersonConfig'
import { currentWorkflowStep, INSPECTION_VOID_APPROVER_ID, rectificationIssuedAt } from './inspectionRectificationWorkflow'
import { appLoginAccount } from '../mock/appSession'
import { webLoginAccount } from '../mock/webSession'
import { listSysUsers } from '../mock/sysUsers'

export function inspectionOperator() {
  const snapshot = getCurrentUserSnapshot()
  const id = getEffectiveUserId(snapshot)
  const person = inspectorCandidates.find(item => item.id === id)
  return { id, name: person?.name || snapshot.name, label: person ? `${person.name}（${person.role}）` : snapshot.name }
}
function isInspectionInitiator(record, operator) {
  return record.initiatorId ? record.initiatorId === operator.id : [operator.label, operator.name].includes(record.inspector || record.applicant)
}

export function canRequestInspectionVoid(record, options = {}) {
  if (!record || !rectificationIssuedAt(record) || ['已关闭', '已作废'].includes(record.status) || record.voidRequest?.status === 'pending') return false
  // 「我发起的」列表按列表语义视为本人发起，列表内单据允许直接提交作废申请。
  return options.assumeInitiator ? true : isInspectionRecordInitiator(record)
}

export function canDeleteInspectionRectification(record) {
  if (record?.status !== '已作废' || record.deletion) return false
  // 演示用的已作废/作废审批示例单不绑定登录身份，任何演示账号（含建管 APP 账号）都能演示删除。
  if (record.demoVoidedExample || record.voidDemoScope || /^inspection-(voided|example)-/.test(String(record.id || ''))) return true
  return isInspectionVoidApprover(record) || isInspectionRecordInitiator(record)
}

export function signedInInspectionUser() {
  const account = /^#\/app(?:\/|$)/.test(globalThis.location?.hash || '')
    ? appLoginAccount.value
    : webLoginAccount.value
  if (!account) return inspectionOperator()
  const user = listSysUsers().find(item => item.loginAccount === account)
  if (user?.status === true) {
    const person = getInspectorById(user.id)
    return { id: user.id, name: user.name, label: person ? `${person.name}（${person.role}）` : user.name }
  }
  // 原型内置的巡检演示人员以人员编号登录，与系统用户账号分开识别。
  const demo = !user && inspectorCandidates.find(person => person.id === account)
  return demo
    ? { id: demo.id, name: demo.name, label: `${demo.name}（${demo.role}）` }
    : { id: '', name: '', label: '' }
}

export function isInspectionRecordInitiator(record) {
  return Boolean(record && isInspectionInitiator(record, signedInInspectionUser()))
}

export function isInspectionVoidApprover(record) {
  return signedInInspectionUser().id === (record?.voidRequest?.approverId || INSPECTION_VOID_APPROVER_ID)
}

export function canExecuteInspectionStep(record, stage) {
  if (!stage) return true
  if (!record || record.deletion) return false
  const step = currentWorkflowStep(record)
  if (step?.key !== stage) return false
  if (stage === 'voidApproval') return isInspectionVoidApprover(record)
  return matchesInspectionPerson(step.actor, record.projectId || record.project_id)
}
function matchesInspectionPerson(people, projectId) {
  const operator = signedInInspectionUser()
  if (!operator.id) return false
  const labels = (Array.isArray(people) ? people : String(people || '').split('、')).map(label => String(label).trim())
  const candidates = listInspectionPersonCandidates().filter(person =>
    !person.id.startsWith('manager-p-') || !projectId || person.id === 'manager-' + projectId,
  )
  return labels.some(label => {
    if (label === operator.id) return true
    const byLabel = candidates.filter(person => label === `${person.name}（${person.role}）`)
    if (byLabel.length) return byLabel.length === 1 && byLabel[0].id === operator.id
    // 历史单可能只有姓名或旧岗位名，只有姓名能唯一定位人员时才匹配。
    const name = label.split(/[（(]/)[0].trim()
    const byName = candidates.filter(person => person.name === name)
    return name === operator.name && byName.length === 1 && byName[0].id === operator.id
  })
}

export function isInspectionCopyRecipient(recipients, projectId) {
  return matchesInspectionPerson(recipients, projectId)
}
