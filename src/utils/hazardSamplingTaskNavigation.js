import { selectedProjectId } from '../composables/useCurrentProject.js'
import { getCurrentHazardIssueProjectKey } from './hazardIssueSummary.js'
import { sampling, projectSamplingRole, samplingActorId } from '../mock/hazardSampling.js'

const KEY = 'hazard-supervisor-task-contexts'
export const supervisorTaskLocation = id => ({ path: `/hazard-issues/sampling-task/${encodeURIComponent(id)}`, query:{viewer:selectedProjectId.value==='hq'?'hq':'project'} })
export function rememberSupervisorTask(task) {
  if (!task || !['supervisor','manager'].includes(task.stage) || task.projectKey !== getCurrentHazardIssueProjectKey(selectedProjectId.value)) return
  if (task.assigneeId ? task.assigneeId !== samplingActorId(task.projectKey, projectSamplingRole.value) : task.stage !== projectSamplingRole.value) return
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
  if (projectId && task?.projectKey === getCurrentHazardIssueProjectKey(projectId) && (task.assigneeId ? task.assigneeId === samplingActorId(task.projectKey, projectSamplingRole.value) : task.stage === projectSamplingRole.value)) selectedProjectId.value = projectId
}
export function samplingSourceLocation(row, task) {
  const query = { from: 'sampling-task', samplingTask: task.id, viewer:selectedProjectId.value==='hq'?'hq':'project' }
  if (row.source === 'inspection') return { path: `/safety-inspection/hazard/${encodeURIComponent(row.sourceId)}`, query }
  if (row.source === 'externalQuality') return { path: `/hazard-issues/quality/${encodeURIComponent(row.sourceId)}`, query }
  query.hazardId = row.sourceId
  return { path: row.source === 'supervision' ? '/coc-admin/supervision-meeting' : '/coc-admin/dispatch-hazard', query }
}
export function samplingReturnLocation(query) {
  return query.from === 'sampling-task' && query.samplingTask ? supervisorTaskLocation(String(query.samplingTask)) : '/hazard-issues/summary'
}
