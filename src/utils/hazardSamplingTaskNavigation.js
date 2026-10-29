import { selectedProjectId } from '../composables/useCurrentProject.js'
import { getCurrentHazardIssueProjectKey } from './hazardIssueSummary.js'
import { sampling, projectSamplingRole, samplingActorId } from '../mock/hazardSampling.js'

const KEY = 'hazard-supervisor-task-contexts'
export const supervisorTaskLocation = id => ({ path: `/hazard-issues/sampling-task/${encodeURIComponent(id)}`, query:{viewer:selectedProjectId.value==='hq'?'hq':'project'} })
/** 本人收到的任务，或抽检人下派的全面复查任务，都记住项目上下文，刷新后仍可回到正确页面。 */
function mentionedByActor(task) {
  if (!task) return false
  const actor = samplingActorId(task.projectKey, projectSamplingRole.value)
  if (task.stage === projectSamplingRole.value && (task.assigneeId ? task.assigneeId === actor : true)) return true
  if (task.stage !== 'manager' || projectSamplingRole.value !== 'supervisor') return false
  const parent = sampling.value.tasks.find(item => item.stage === 'supervisor' && (item.id === task.parentTaskId || (!item.parentTaskId && item.batchId === task.batchId && item.projectKey === task.projectKey)))
  return Boolean(parent && parent.assigneeId === actor)
}
export function rememberSupervisorTask(task) {
  if (!task || !['supervisor','manager'].includes(task.stage) || task.projectKey !== getCurrentHazardIssueProjectKey(selectedProjectId.value)) return
  if (!mentionedByActor(task)) return
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
  if (projectId && task?.projectKey === getCurrentHazardIssueProjectKey(projectId)) selectedProjectId.value = projectId
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
