import { computed, ref } from 'vue'
import { selectedProjectId, useCurrentProject } from '../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions'
import { getProjectOrgNodeId } from './orgStructure'

/** 演示：个人中心待办以指定用户身份办理（如品牌报审指定审批人） */
export const demoActingUserId = ref('')

export function setDemoActingUserId(userId) {
  demoActingUserId.value = String(userId || '').trim()
}

export function clearDemoActingUserId() {
  demoActingUserId.value = ''
}

export function getEffectiveUserId(snapshot) {
  return demoActingUserId.value || snapshot?.id || ''
}

const HQ_DEMO_USER = {
  id: 'u-007',
  name: '刘文强',
  loginAccount: 'liuwenqiang',
  roleIds: ['role-admin', 'role-company', 'role-default', 'role-bd', 'role-integration'],
  orgId: 'org-hq',
  projectId: '',
}

function buildProjectDemoUser(projectId) {
  const project = COC_PROJECT_OPTIONS.find((item) => item.id === projectId)
  const label = project?.label || projectId
  return {
    id: `u-proj-${projectId}`,
    name: `${label}项目经理`,
    loginAccount: `pm_${projectId}`,
    roleIds: ['role-pm', 'role-default', 'role-labor', 'role-coc'],
    orgId: `${getProjectOrgNodeId(projectId)}-dept-0`,
    projectId,
  }
}

export function getCurrentUserSnapshot(projectId = selectedProjectId.value) {
  if (projectId === 'hq') return { ...HQ_DEMO_USER }
  return buildProjectDemoUser(projectId)
}

export function useCurrentUser() {
  const { isHqSelected } = useCurrentProject()

  const currentUser = computed(() =>
    isHqSelected.value
      ? { ...HQ_DEMO_USER }
      : buildProjectDemoUser(selectedProjectId.value),
  )

  const currentUserRoleIds = computed(() => currentUser.value.roleIds || [])

  return {
    currentUser,
    currentUserRoleIds,
  }
}
