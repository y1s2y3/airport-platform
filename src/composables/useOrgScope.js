import { computed } from 'vue'
import { useCurrentProject } from './useCurrentProject'
import { useCurrentUser } from '../mock/currentUser'
import {
  getScopedOrgTree,
  getOrgNodeOptionsForScope,
  getParentOrgOptionsForScope,
  getDefaultNodeIdForScope,
  isOrgUnderProject,
} from '../mock/orgStructure'

export function useOrgScope() {
  const { isHqSelected, selectedProjectId } = useCurrentProject()
  const { currentUser, currentUserRoleIds } = useCurrentUser()

  const projectId = computed(() => selectedProjectId.value)

  const defaultOrgNodeId = computed(() =>
    getDefaultNodeIdForScope(isHqSelected.value, projectId.value),
  )

  function getVisibleOrgTree(keyword = '') {
    return getScopedOrgTree({
      projectId: isHqSelected.value ? '' : projectId.value,
      keyword,
    })
  }

  const orgNodeOptions = computed(() =>
    getOrgNodeOptionsForScope(isHqSelected.value, projectId.value),
  )

  function getParentOrgOptions(excludeId = '') {
    return getParentOrgOptionsForScope(isHqSelected.value, projectId.value, excludeId)
  }

  function isUserInCurrentProject(orgId) {
    if (isHqSelected.value) return true
    return isOrgUnderProject(orgId, projectId.value)
  }

  function isRoleVisibleToCurrentUser(roleId) {
    if (isHqSelected.value) return true
    return currentUserRoleIds.value.includes(roleId)
  }

  return {
    isHqSelected,
    projectId,
    currentUser,
    currentUserRoleIds,
    defaultOrgNodeId,
    getVisibleOrgTree,
    orgNodeOptions,
    getParentOrgOptions,
    isUserInCurrentProject,
    isRoleVisibleToCurrentUser,
  }
}
