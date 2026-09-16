import { ref } from 'vue'
import { saveMeetingSignInRecord } from '../utils/meetingSignInStorage.js'

/** 本次签到会话：按项目缓存名单，记录点击过的调度项目 */
const sessionStartedAt = ref('')
const visitOrder = ref([])
/** @type {import('vue').Ref<Record<string, { projectId: string, projectName: string, entries: any[] }>>} */
const projectStates = ref({})

function formatNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function ensureSessionStarted() {
  if (!sessionStartedAt.value) {
    sessionStartedAt.value = formatNow()
  }
}

export function useMeetingSignInSession() {
  function touchProject(projectId, projectName) {
    if (!projectId) return
    ensureSessionStarted()
    if (!visitOrder.value.includes(projectId)) {
      visitOrder.value = [...visitOrder.value, projectId]
    }
    const prev = projectStates.value[projectId]
    projectStates.value = {
      ...projectStates.value,
      [projectId]: {
        projectId,
        projectName: projectName || prev?.projectName || projectId,
        entries: prev?.entries || [],
      },
    }
  }

  function saveProjectEntries(projectId, projectName, entries) {
    if (!projectId) return
    ensureSessionStarted()
    touchProject(projectId, projectName)
    projectStates.value = {
      ...projectStates.value,
      [projectId]: {
        projectId,
        projectName: projectName || projectStates.value[projectId]?.projectName || projectId,
        entries: Array.isArray(entries) ? entries.map((e) => ({ ...e })) : [],
      },
    }
  }

  function getProjectEntries(projectId) {
    return projectStates.value[projectId]?.entries || null
  }

  function endSessionAndSave() {
    ensureSessionStarted()
    const order = visitOrder.value.length
      ? visitOrder.value
      : Object.keys(projectStates.value)

    const projectGroups = order
      .map((id) => projectStates.value[id])
      .filter(Boolean)
      .map((state) => ({
        projectId: state.projectId,
        projectName: state.projectName,
        attendees: (state.entries || [])
          .filter((e) => e.joined)
          .map((e) => ({
            id: e.id,
            name: e.name,
            role: e.role || e.position || '—',
            joinTime: e.joinTime || '',
          })),
      }))
      .filter((g) => g.projectName)

    if (!projectGroups.length) {
      return null
    }

    const record = saveMeetingSignInRecord({
      meetingTime: sessionStartedAt.value,
      endedAt: formatNow(),
      dispatchProjects: projectGroups.map((g) => g.projectName),
      projectGroups,
    })

    clearSession()
    return record
  }

  function clearSession() {
    sessionStartedAt.value = ''
    visitOrder.value = []
    projectStates.value = {}
  }

  return {
    sessionStartedAt,
    visitOrder,
    projectStates,
    touchProject,
    saveProjectEntries,
    getProjectEntries,
    endSessionAndSave,
    clearSession,
    ensureSessionStarted,
  }
}
