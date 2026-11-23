import { shallowRef } from 'vue'
import { selectedProjectId } from '../composables/useCurrentProject.js'
import { getCurrentHazardIssueProjectKey, getHazardIssueProjectOptions, getHazardIssueRows } from '../utils/hazardIssueSummary.js'
import {
  projectSamplingRole,
  SAMPLING_STORAGE_KEY,
  sampling,
  samplingActorId,
} from './hazardSampling.js'
import { buildAssignedReviewExamples } from './hazardSamplingExamples.js'
import { getSamplingPeople } from './samplingPeople.js'
import { demoActingUserId } from './currentUser.js'

export const SAMPLING_NOTICE_MODULE = '隐患抽检'
const STATUS_KEY = 'airport-hazard-sampling-notice-status-v1'
const ID_PREFIX = 'sampling-notice:'

function parse(raw) {
  try { return JSON.parse(raw) } catch { return null }
}
function readStatuses() {
  try { return parse(localStorage.getItem(STATUS_KEY)) || {} } catch { return {} }
}

const statuses = shallowRef(readStatuses())
const crossTabTasks = shallowRef([])
window.addEventListener('storage', event => {
  if (event.key === STATUS_KEY) statuses.value = parse(event.newValue) || {}
  if (event.key === SAMPLING_STORAGE_KEY) {
    const tasks = parse(event.newValue)?.tasks
    crossTabTasks.value = Array.isArray(tasks) ? tasks : []
  }
})

function demoPair(tasks, key) {
  return [
    tasks.find(task => task.id === 'EX-SELECTED-CJ-' + key),
    tasks.find(task => task.id === 'EX-SELECTED-FC-' + key),
  ].filter(Boolean)
}

const demoCache = new Map()
function exampleNotices(projectKey) {
  if (demoCache.has(projectKey)) return demoCache.get(projectKey)
  const projects = getHazardIssueProjectOptions().filter(project => project.masterId)
  const preferred = projects.find(project => project.key === projectKey)
  const rows = getHazardIssueRows()
  for (const project of new Set([preferred, ...projects])) {
    if (!project) continue
    const cached = demoPair(sampling.value.tasks, project.key)
    const tasks = cached.length === 2 ? cached : buildAssignedReviewExamples(rows, [project]).tasks
    if (tasks.length < 2) continue
    demoCache.set(projectKey, tasks)
    return tasks
  }
  return []
}

function toNotice(task) {
  const isSampling = task.stage === 'supervisor'
  const type = isSampling ? '抽检任务' : '全面复查任务'
  const issuer = isSampling ? '指挥部' : task.sender?.startsWith('系统') ? '系统' : '抽检人'
  const id = ID_PREFIX + task.id
  return {
    id,
    module: SAMPLING_NOTICE_MODULE,
    title: issuer + '下发' + type + '提醒' + (task.example ? '（示例）' : ''),
    content: `下发人：${task.sender || issuer}，接收人：${task.recipient}。${task.projectName}已下发${type}，任务编号 ${task.id}，涉及 ${task.ids.length} 张单据。请及时办理。`,
    time: new Date(task.createdAt).toLocaleString('sv-SE'),
    readStatus: statuses.value[id] === 'read' ? '已读' : '未读',
  }
}

export function listSamplingTaskNotices({ projectId = selectedProjectId.value, account = '' } = {}) {
  const projectKey = getCurrentHazardIssueProjectKey(projectId)
  const examples = exampleNotices(projectKey)
  const person = getSamplingPeople(projectKey).find(item => item.id === account || item.name === account)
  const recipient = demoActingUserId.value || person?.id || samplingActorId(projectKey, projectSamplingRole.value)
  const tasks = new Map([...crossTabTasks.value, ...sampling.value.tasks].map(task => [task.id, task]))
  const received = [...tasks.values()].filter(task => recipient && !task.example && task.projectKey === projectKey
    && task.assigneeId === recipient && ['supervisor', 'manager'].includes(task.stage))
  return [...received.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), ...examples]
    .map(toNotice)
    .filter(notice => statuses.value[notice.id] !== 'deleted')
}

export const isSamplingTaskNotice = id => typeof id === 'string' && id.startsWith(ID_PREFIX)

export function updateSamplingNoticeStatus(ids, status) {
  const next = { ...statuses.value, ...readStatuses() }
  let changed = 0
  for (const id of ids) {
    if (!isSamplingTaskNotice(id) || next[id] === status || next[id] === 'deleted') continue
    next[id] = status
    changed++
  }
  if (!changed) return 0
  statuses.value = next
  try { localStorage.setItem(STATUS_KEY, JSON.stringify(next)) } catch { /* 仍可在本页读取状态。 */ }
  return changed
}
