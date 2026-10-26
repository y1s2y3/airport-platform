import { computed, ref, watch } from 'vue'
import { useCurrentProject, selectedProjectId } from '../composables/useCurrentProject.js'
import { getHazardIssueRows, getCurrentHazardIssueProjectKey } from '../utils/hazardIssueSummary.js'

const KEY = 'airport-hazard-sampling-v2'
/** 抽检规则：全局一套，仅保留取单时间范围、抽取比例、最少抽取数量。 */
export const DEFAULT_RULE = { days: 90, percent: 30, minimum: 3 }
export const SAMPLING_STATUS = { PASS: '已通过', FAIL: '未通过', PENDING: '未复核' }
const RECIPIENTS = { supervisor: '责任监理', manager: '项目经理' }
const emptyState = () => ({ rule: { ...DEFAULT_RULE }, tasks: [], history: [] })
let saved
try { saved = JSON.parse(localStorage.getItem(KEY) || 'null') } catch { saved = null }
const usable = saved && saved.rule && typeof saved.rule.days === 'number' && Array.isArray(saved.tasks) && Array.isArray(saved.history)
export const sampling = ref(usable ? saved : emptyState())
watch(sampling, value => localStorage.setItem(KEY, JSON.stringify(value)), { deep: true })
export const projectSamplingRole = ref(sessionStorage.getItem('hazard-sampling-role') || 'manager')
watch(projectSamplingRole, value => sessionStorage.setItem('hazard-sampling-role', value))
export function useSamplingRole() {
  const { isHqSelected } = useCurrentProject()
  return computed(() => isHqSelected.value ? 'hq' : projectSamplingRole.value)
}
/** 可抽检范围：安全巡检取「已复查 / 已关闭」，其余来源取「已关闭 / 已完成」。待验收不在其中。 */
export function eligible(row) { return row.source === 'inspection' ? ['已复查', '已关闭'].includes(row.status) : ['已关闭', '已完成'].includes(row.status) }
/** 抽检状态：以最近一次指挥部抽检结论为准；监理、项目经理的结论不改变它。 */
export function hqSamplingStatus(row) {
  const logs = sampling.value.history.filter(log => log.rowId === row.id && log.stage === 'hq')
  if (!logs.length) return SAMPLING_STATUS.PENDING
  return logs[logs.length - 1].result === '不合格' ? SAMPLING_STATUS.FAIL : SAMPLING_STATUS.PASS
}
export function reviewedAt(row) {
  if (row.source === 'inspection') return row.raw.reviewDate || ''
  if (row.source === 'externalQuality') return row.raw.approvalLogs?.at(-1)?.time || ''
  return row.raw.statusLogs?.find(log => log.toStatus === '已关闭')?.time || ''
}
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
export const ruleFor = () => ({ ...DEFAULT_RULE, ...sampling.value.rule })
export function visibleHistory(rowId, role) {
  return sampling.value.history.filter(log => log.rowId === rowId && (role === 'hq' || (role === 'supervisor' && log.stage !== 'hq') || (role === 'manager' && log.stage === 'manager')))
}
export function visibleTasks(role, projectId) {
  const key = getCurrentHazardIssueProjectKey(projectId)
  return sampling.value.tasks.filter(task => role === 'hq' || (task.projectKey === key && task.stage === role))
}
export function taskComplete(task) { return task.ids.every(id => task.results[id]) }
export function actionableTask(row, role, taskId) {
  return sampling.value.tasks.find(task => task.stage === role && task.projectKey === row.projectKey && task.ids.includes(row.id) && !task.results[row.id] && (!taskId || task.id === taskId) && !task.submittedAt)
}
function addTask(stage, batch, ids) {
  const task = { id: uid(stage === 'supervisor' ? 'CJ' : 'FC'), stage, projectKey: batch.projectKey, projectName: batch.projectName, batchId: batch.batchId, start: batch.start, end: batch.end, poolIds: [...batch.poolIds], ids: [...ids], results: {}, recipient: RECIPIENTS[stage], createdAt: new Date().toISOString(), submittedAt: '', discrepancy: false, resolution: '' }
  sampling.value.tasks.push(task)
  return task
}
export function generateSample(row) {
  const rule = ruleFor()
  const prior = sampling.value.tasks.find(t => t.stage === 'supervisor' && t.poolIds.includes(row.id) && t.ids.includes(row.id) && !t.submittedAt)
  if (prior) return prior
  const anchor = reviewedAt(row)
  if (!anchor) throw new Error('原单据缺少复查通过时间，请补齐原记录时间后重试')
  const end = String(anchor).slice(0, 10)
  const start = new Date(new Date(`${end}T00:00:00`).getTime() - (rule.days - 1) * 86400000).toLocaleDateString('sv-SE')
  const pool = getHazardIssueRows().filter(r => eligible(r) && r.projectKey === row.projectKey && reviewedAt(r) && reviewedAt(r).slice(0, 10) >= start && reviewedAt(r).slice(0, 10) <= end)
  const mandatory = pool.filter(r => sampling.value.history.some(h => h.rowId === r.id && h.stage === 'hq' && h.result === '不合格'))
  if (pool.length < Math.max(2, rule.minimum)) throw new Error(`当前范围仅 ${pool.length} 张单据，无法满足盲抽最少数量，请扩大时间范围或调整规则后重试`)
  const count = Math.min(pool.length, Math.max(Math.ceil(pool.length * rule.percent / 100), mandatory.length, rule.minimum))
  const shuffle = items => { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const random = new Uint32Array(1); crypto.getRandomValues(random); const j = random[0] % (i + 1); [result[i], result[j]] = [result[j], result[i]] } return result }
  const rest = shuffle(pool.filter(r => !mandatory.some(m => m.id === r.id)))
  const ids = shuffle([...mandatory, ...rest.slice(0, count - mandatory.length)]).map(r => r.id)
  return addTask('supervisor', { projectKey: row.projectKey, projectName: row.projectName, batchId: uid('PC'), start, end, poolIds: pool.map(r => r.id) }, ids)
}

export function submitReview(row, role, payload, taskId) {
  if (role !== 'hq' && row.projectKey !== getCurrentHazardIssueProjectKey(selectedProjectId.value)) throw new Error('只能办理当前项目的单据')
  if (!eligible(row)) throw new Error('该单据尚未达到抽检状态')
  if (!['hq', 'supervisor', 'manager'].includes(role)) throw new Error('当前身份无办理权限')
  const task = role === 'hq' ? null : actionableTask(row, role, taskId)
  if (role !== 'hq' && !task) throw new Error('该单据没有分配给当前角色的待办任务')
  if (!payload.result || (payload.result === '不合格' && !payload.note.trim())) throw new Error('请填写检查结论和不合格原因')
  if ((payload.result === '不合格' || role === 'manager') && !payload.files.length) throw new Error('请上传支撑附件')
  if (role === 'manager' && (payload.result !== '合格' || !payload.completed)) throw new Error('请在线下整改完成后，确认已完成复查且合格')
  const log = { id: uid('JL'), rowId: row.id, projectKey: row.projectKey, stage: role, taskId: task?.id || '', person: role === 'hq' ? '指挥部检查人' : RECIPIENTS[role], time: new Date().toISOString(), result: payload.result, note: payload.note, files: payload.files, completed: role === 'manager' }
  sampling.value.history.push(log)
  if (task) task.results[row.id] = log.id
  if (role === 'hq' && payload.result === '不合格') {
    try { return { log, task: generateSample(row) } } catch (error) { log.pendingReason = error.message; return { log, warning: error.message } }
  }
  if (role === 'supervisor' && payload.result === '不合格' && !sampling.value.tasks.some(t => t.stage === 'manager' && t.batchId === task.batchId)) addTask('manager', task, task.poolIds)
  return { log }
}

async function attachmentDatabase() {
  return new Promise((resolve, reject) => { const request = indexedDB.open('airport-sampling-files', 1); request.onupgradeneeded = () => request.result.createObjectStore('files'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}
export async function saveSamplingAttachment(file) {
  const db = await attachmentDatabase(); const id = uid('FILE')
  await new Promise((resolve, reject) => { const tx = db.transaction('files','readwrite'); tx.objectStore('files').put(file,id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error) }); db.close()
  return { id, name: file.name }
}
export async function downloadSamplingAttachment(file) {
  const db = await attachmentDatabase()
  const blob = await new Promise((resolve,reject) => { const request = db.transaction('files').objectStore('files').get(file.id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) }); db.close()
  if (!blob) throw new Error('当前浏览器没有该附件，请重新上传')
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000)
}
export function submitTask(task, role) {
  if (task.stage !== role || !taskComplete(task)) throw new Error('请完成每张单据的复查后提交')
  if (task.submittedAt) return
  task.submittedAt = new Date().toISOString()
  if (role === 'supervisor') task.discrepancy = !sampling.value.history.some(h => h.taskId === task.id && h.result === '不合格')
}
