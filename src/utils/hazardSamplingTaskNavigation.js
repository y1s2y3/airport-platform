import { selectedProjectId } from '../composables/useCurrentProject.js'
import { sampling, projectSamplingRole, canViewTask } from '../mock/hazardSampling.js'

const KEY = 'hazard-supervisor-task-contexts'
export const supervisorTaskLocation = id => ({ path: `/hazard-issues/sampling-task/${encodeURIComponent(id)}`, query:{viewer:selectedProjectId.value==='hq'?'hq':'project'} })
/** 恢复项目上下文前，重新验证当前人员的查看权限。 */
export function rememberSupervisorTask(task) {
  if (!canViewTask(task, projectSamplingRole.value, selectedProjectId.value)) return
  let contexts = {}
  try { contexts = JSON.parse(sessionStorage.getItem(KEY) || '{}') } catch { contexts = {} }
  contexts[task.id] = selectedProjectId.value
  sessionStorage.setItem(KEY, JSON.stringify(contexts))
}
export function restoreSupervisorTaskContext(id) {
  if (!id || !['supervisor','manager'].includes(projectSamplingRole.value)) return
  let contexts = {}
  try { contexts = JSON.parse(sessionStorage.getItem(KEY) || '{}') } catch { return }
  const projectId = contexts[id]
  const task = sampling.value.tasks.find(item => item.id === id)
  if (projectId && canViewTask(task, projectSamplingRole.value, projectId)) selectedProjectId.value = projectId
}
export function samplingSourceLocation(row, task) {
  const query = { from: 'sampling-task', samplingTask: task.id, viewer:selectedProjectId.value==='hq'?'hq':'project' }
  if (row.source === 'inspection') return { path: `/safety-inspection/hazard/${encodeURIComponent(row.sourceId)}`, query }
  if (row.source === 'externalQuality') return { path: `/hazard-issues/quality/${encodeURIComponent(row.sourceId)}`, query }
  return { path: `/hazard-issues/${row.source}/${encodeURIComponent(row.sourceId)}`, query }
}
export function samplingReturnLocation(query) {
  return query.from === 'sampling-task' && query.samplingTask ? supervisorTaskLocation(String(query.samplingTask)) : '/hazard-issues/summary'
}
