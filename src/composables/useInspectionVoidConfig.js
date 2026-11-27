import { collectOrgIdsUnderNode, getOrgDisplayName } from '../mock/orgStructure'
import { listSysUsers } from '../mock/sysUsers'
import { INSPECTION_VOID_APPROVER, INSPECTION_VOID_APPROVER_ID } from '../utils/inspectionRectificationWorkflow'

const STORAGE_KEY = 'inspection-void-approvers'
const groups = ['安全', '质量']

export function inspectionVoidApproverOptions() {
  const hqOrgIds = new Set(collectOrgIdsUnderNode('org-hq'))
  return listSysUsers()
    .filter(user => user.status === true && hqOrgIds.has(user.orgId))
    .map(user => ({
      id: user.id,
      label: user.id === INSPECTION_VOID_APPROVER_ID
        ? INSPECTION_VOID_APPROVER
        : `${user.name}（${getOrgDisplayName(user.orgId)}）`,
    }))
}

export function getInspectionVoidConfig() {
  let stored
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { /* 首次使用或旧缓存异常时沿用原审批人 */ }
  return Object.fromEntries(groups.map(group => [group, stored?.[group] || INSPECTION_VOID_APPROVER_ID]))
}

export function saveInspectionVoidConfig(config) {
  const eligibleIds = new Set(inspectionVoidApproverOptions().map(person => person.id))
  if (!groups.every(group => eligibleIds.has(config[group]))) return false
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(groups.map(group => [group, config[group]]))))
  return true
}

export function resolveInspectionVoidApprover(category) {
  const id = getInspectionVoidConfig()[category === '质量' ? '质量' : '安全']
  return inspectionVoidApproverOptions().find(person => person.id === id) || null
}
