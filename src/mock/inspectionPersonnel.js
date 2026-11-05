/** Project candidate lists and valid selected users have separate scopes. */
import { listSysUsers } from './sysUsers.js'
import { getProjectOrgNodeId } from './orgStructure.js'

// This is the existing organisation ID for 安全与质量管理部(安委会办公室).
export const INSPECTION_DEPARTMENT_ID = 'org-quality'
export function inspectionUsers(scope) {
  return listSysUsers().filter(user => user.status === true && (scope === 'dispatch'
    ? user.orgId === INSPECTION_DEPARTMENT_ID || String(user.orgId || '').startsWith(INSPECTION_DEPARTMENT_ID + '-')
    : user.projectId === scope || (user.projectIds || []).includes(scope) || String(user.orgId || '').startsWith(getProjectOrgNodeId(scope) + '-')))
}
/** The dispatcher stays department-scoped; project selections may reference any enabled system user. */
export function inspectionSelectableUsers(scope) {
  return scope === 'dispatch' ? inspectionUsers(scope) : listSysUsers().filter(user => user.status === true)
}
export function defaultInspectionUser(_projectId, _part, operator) {
  return listSysUsers().find(user => user.status === true && user.id === operator?.id) || null
}
