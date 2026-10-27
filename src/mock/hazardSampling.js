import { computed, ref, watch } from 'vue'
import { useCurrentProject, selectedProjectId } from '../composables/useCurrentProject.js'
import { getHazardIssueRows, getCurrentHazardIssueProjectKey, getHazardIssueProjectOptions } from '../utils/hazardIssueSummary.js'
import { buildSamplingExamples, buildManualSamplingExamples, buildAssignedReviewExamples, SAMPLING_EXAMPLE_VERSION } from './hazardSamplingExamples.js'
import { getSamplingPeople, getSamplingManager } from './samplingPeople.js'

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
export const samplingPersonId = ref(sessionStorage.getItem('hazard-sampling-person') || '')
watch(samplingPersonId, value => sessionStorage.setItem('hazard-sampling-person', value))
export function samplingActorId(projectKey, role) {
  if (role === 'manager') return getSamplingManager(projectKey)?.id || ''
  const people = getSamplingPeople(projectKey)
  return people.some(person => person.id === samplingPersonId.value) ? samplingPersonId.value : people[0]?.id || ''
}
export function useSamplingRole() {
  const { isHqSelected } = useCurrentProject()
  return computed(() => isHqSelected.value ? 'hq' : projectSamplingRole.value)
}
/** 所有原业务状态均可抽查；历史演示种子另保留原场景范围。 */
export function eligible(row) { return Boolean(row?.id && row.projectKey) }
const exampleEligible = row => row.source === 'inspection' ? ['已复查','已关闭'].includes(row.status) : ['已关闭','已完成'].includes(row.status)
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
/** 版本标记实现一次补入；手工任务、检查记录和配置优先保留。 */
export function ensureSamplingExamples(rows = getHazardIssueRows()) {
  if (sampling.value.exampleVersion === SAMPLING_EXAMPLE_VERSION) { enrichExampleTasks(); sampling.value.tasks.forEach(completeTaskIfReady); return }
  const examples = buildSamplingExamples(rows, getHazardIssueProjectOptions(), exampleEligible, reviewedAt)
  const manualExamples = buildManualSamplingExamples(rows, getHazardIssueProjectOptions())
  examples.tasks.push(...manualExamples.tasks)
  examples.history.push(...manualExamples.history)
  const assignedExamples = buildAssignedReviewExamples(rows, getHazardIssueProjectOptions())
  examples.tasks.push(...assignedExamples.tasks)
  examples.history.push(...assignedExamples.history)
  const exampleLogs = new Map(examples.history.map(log => [log.id, log]))
  for (const log of sampling.value.history) {
    if (!log.roundId && exampleLogs.get(log.id)?.roundId) log.roundId = exampleLogs.get(log.id).roundId
  }
  const taskIds = new Set(sampling.value.tasks.map(task => task.id))
  const logIds = new Set(sampling.value.history.map(log => log.id))
  sampling.value.tasks.push(...examples.tasks.filter(task => !taskIds.has(task.id)))
  sampling.value.history = [...examples.history.filter(log => !logIds.has(log.id)), ...sampling.value.history]
  sampling.value.exampleVersion = SAMPLING_EXAMPLE_VERSION
  enrichExampleTasks()
  sampling.value.tasks.forEach(completeTaskIfReady)
}
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
function enrichExampleTasks() {
  sampling.value.tasks.filter(task => task.example && task.stage === 'manager' && task.ids.length === task.poolIds.length).forEach(task => { task.percent = 100 })
  for (const task of sampling.value.tasks.filter(item => item.example && !item.assigneeId)) {
    const people = getSamplingPeople(task.projectKey)
    const person = task.stage === 'manager' ? getSamplingManager(task.projectKey) : people[task.id.endsWith('-pending') || task.id.endsWith('-complete') ? Math.min(1, people.length - 1) : 0]
    if (person) { task.assigneeId = person.id; task.assigneeName = person.name; task.recipient = person.label }
    task.sender ||= '指挥部检查人'
    task.percent ||= task.exampleRule?.percent || 30
    task.rangeBasis ||= '历史检查范围'
  }
}
export function visibleHistory(rowId, role) {
  return sampling.value.history.filter(log => log.rowId === rowId && (role === 'hq' || (role === 'supervisor' && log.stage !== 'hq') || (role === 'manager' && log.stage === 'manager')))
}
export function visibleTasks(role, projectId) {
  const key = getCurrentHazardIssueProjectKey(projectId)
  return sampling.value.tasks.filter(task => role === 'hq' || (task.projectKey === key && (task.assigneeId ? task.assigneeId === samplingActorId(key, role) : task.stage === role)))
}
export function taskComplete(task) {
  return Boolean(task?.ids.length) && task.ids.every(id => sampling.value.history.some(log => log.id === task.results[id] && log.taskId === task.id && log.rowId === id && log.stage === task.stage && ['合格','不合格'].includes(log.result) && (task.stage !== 'manager' || log.completed && log.files?.length)))
}
function completeTaskIfReady(task) {
  if (!task || task.submittedAt || !['supervisor','manager'].includes(task.stage) || !taskComplete(task)) return false
  const times = task.ids.map(id => sampling.value.history.find(log => log.id === task.results[id]).time).filter(Boolean).sort((a,b) => new Date(a) - new Date(b))
  task.submittedAt = times.at(-1) || new Date().toISOString()
  if (task.stage === 'supervisor') task.discrepancy = !sampling.value.history.some(log => log.taskId === task.id && log.stage === 'supervisor' && log.result === '不合格')
  return true
}
export function actionableTask(row, role, taskId) {
  return visibleTasks(projectSamplingRole.value, selectedProjectId.value).find(task => task.stage === role && task.projectKey === row.projectKey && task.ids.includes(row.id) && !task.results[row.id] && (!taskId || task.id === taskId) && !task.submittedAt)
}
function addTask(stage, batch, ids, selectedAssigneeId = '') {
  const person = selectedAssigneeId ? getSamplingPeople(batch.projectKey).find(item => item.id === selectedAssigneeId) : stage === 'manager' ? getSamplingManager(batch.projectKey) : getSamplingPeople(batch.projectKey).find(item => item.id === batch.assigneeId)
  const task = { id: uid(stage === 'supervisor' ? 'CJ' : 'FC'), stage, projectKey: batch.projectKey, projectName: batch.projectName, batchId: batch.batchId, start: batch.start, end: batch.end, poolIds: [...batch.poolIds], ids: [...ids], results: {}, recipient: person?.label || RECIPIENTS[stage], assigneeId:person?.id || '', assigneeName:person?.name || '', sender:selectedAssigneeId ? batch.sender : stage === 'manager' ? '系统（抽检不合格触发）' : batch.sender || '指挥部检查人', percent:stage === 'manager' ? 100 : batch.percent || null, rangeBasis:batch.rangeBasis || '登记时间', originRowId:batch.originRowId || '', parentTaskId:stage === 'manager' ? batch.id || '' : '', createdAt: new Date().toISOString(), submittedAt: '', discrepancy: false, resolution: '' }
  sampling.value.tasks.push(task)
  return task
}
export function registrationDay(row) {
  const parts = String(row?.registeredAt || '').match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  return parts ? `${parts[1]}-${parts[2].padStart(2,'0')}-${parts[3].padStart(2,'0')}` : ''
}
export function samplingPreview(row, dates, percent) {
  const anchor = registrationDay(row)
  if (!anchor) throw new Error('本单缺少问题登记时间，无法确定检查范围')
  if (!Array.isArray(dates) || dates.length !== 2 || !dates.every(value => /^\d{4}-\d{2}-\d{2}$/.test(value))) throw new Error('请选择检查时间范围')
  const [start,end] = dates
  if (start > end || anchor < start || anchor > end) throw new Error('检查时间范围必须包含本单登记时间')
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) throw new Error('抽检比例须为1～100的整数（%）')
  const pool = getHazardIssueRows().filter(item => item.projectKey === row.projectKey && registrationDay(item) >= start && registrationDay(item) <= end)
  if (!pool.some(item => item.id === row.id)) throw new Error('检查范围未包含本单')
  const count = Math.ceil(pool.length * percent / 100)
  if (count < 2) throw new Error(`范围共${pool.length}张，按比例抽取${count}张；为保留盲抽请扩大范围或提高比例，至少下发2张`)
  return { pool, count, start, end }
}

export function submitReview(row, role, payload, taskId) {
  if (role !== 'hq' && row.projectKey !== getCurrentHazardIssueProjectKey(selectedProjectId.value)) throw new Error('只能办理当前项目的单据')
  if (!eligible(row)) throw new Error('该单据尚未达到抽检状态')
  if (!['hq', 'supervisor', 'manager'].includes(role)) throw new Error('当前身份无办理权限')
  if (role === 'hq' && selectedProjectId.value !== 'hq') throw new Error('仅指挥部可发起抽查')
  const task = role === 'hq' ? null : actionableTask(row, role, taskId)
  if (role !== 'hq' && !task) throw new Error('该单据没有分配给当前角色的待办任务')
  if (!['合格', '不合格'].includes(payload.result) || (payload.result === '不合格' && !String(payload.note || '').trim())) throw new Error('请选择合格或不合格；不合格时必须填写说明')
  if (role === 'manager' && !payload.files?.length) throw new Error('请上传复查照片')
  if (role === 'manager' && payload.files.some(file => !/\.(jpe?g|png)$/i.test(file.name))) throw new Error('复查照片仅支持 JPG、JPEG、PNG 格式')
  if (role === 'manager' && (payload.result !== '合格' || !payload.completed)) throw new Error('请在线下整改完成后，确认已完成复查且合格')
  const prior = payload.submissionId && sampling.value.history.find(item => item.submissionId === payload.submissionId && item.rowId === row.id && item.stage === role)
  if (prior) return { log:prior, task:sampling.value.tasks.find(item => item.batchId === prior.roundId && item.stage === 'supervisor') }
  let plan
  if (role === 'hq' && payload.result === '不合格') {
    if (typeof payload.dispatch !== 'boolean') throw new Error('请选择是否下发任务')
    if (payload.dispatch) {
      plan = samplingPreview(row, payload.dates, payload.percent)
      if (!getSamplingPeople(row.projectKey).some(person => person.id === payload.assigneeId)) throw new Error('请选择本项目的一名抽检人')
    }
  }
  const existingFollow = role === 'supervisor' && payload.result === '不合格' ? sampling.value.tasks.find(item => item.stage === 'manager' && item.batchId === task.batchId) : null
  let reviewer
  if (role === 'supervisor' && payload.result === '不合格') {
    if (existingFollow) {
      if (payload.reviewAssigneeId && payload.reviewAssigneeId !== existingFollow.assigneeId) throw new Error('本批次已经下发全面复查任务，不能重复选择其他接收人')
    } else {
      reviewer = getSamplingPeople(row.projectKey).find(person => person.id === payload.reviewAssigneeId)
      if (!reviewer) throw new Error('请选择本项目的一名全面复查人')
      if (!task.poolIds?.length || !task.poolIds.includes(row.id)) throw new Error('原任务完整检查范围不可用，请核对原任务')
    }
  }
  const log = { id: uid('JL'), roundId: task?.batchId || uid('JC'), rowId: row.id, projectKey: row.projectKey, stage: role, taskId: task?.id || '', submissionId:payload.submissionId || '', dispatch:role === 'hq' && payload.result === '不合格' ? payload.dispatch : false, person: role === 'hq' ? '指挥部检查人' : task?.recipient || RECIPIENTS[role], time: new Date().toISOString(), result: payload.result, note: String(payload.note || '').trim(), files: role === 'manager' ? payload.files : [], completed: role === 'manager' }
  if (existingFollow || reviewer) { log.reviewAssigneeId = existingFollow?.assigneeId || reviewer.id; log.reviewRecipient = existingFollow?.recipient || reviewer.label }
  sampling.value.history.push(log)
  if (task) task.results[row.id] = log.id
  if (plan) {
    const rest = plan.pool.filter(item => item.id !== row.id)
    for (let index=rest.length-1;index>0;index--) { const random = new Uint32Array(1); crypto.getRandomValues(random); const target=random[0]%(index+1); [rest[index],rest[target]]=[rest[target],rest[index]] }
    const ids = [row.id, ...rest.slice(0,plan.count-1).map(item => item.id)]
    for (let index=ids.length-1;index>0;index--) { const random=new Uint32Array(1);crypto.getRandomValues(random);const target=random[0]%(index+1);[ids[index],ids[target]]=[ids[target],ids[index]] }
    return {log, task:addTask('supervisor',{projectKey:row.projectKey,projectName:row.projectName,batchId:log.roundId,start:plan.start,end:plan.end,poolIds:plan.pool.map(item=>item.id),percent:payload.percent,assigneeId:payload.assigneeId,sender:log.person,originRowId:row.id,rangeBasis:'登记时间'},ids)}
  }
  const followTask = reviewer ? addTask('manager', { ...task, sender:task.recipient }, task.poolIds, reviewer.id) : existingFollow
  if (followTask) sampling.value.history.find(item => item.id === log.id).reviewTaskId = followTask.id
  return { log, followTaskCreated:reviewer ? followTask : null, completedTask: completeTaskIfReady(task) ? task : null }
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
  if (file.example) {
    const canvas = document.createElement('canvas'); canvas.width = 1100; canvas.height = 650
    const context = canvas.getContext('2d'); context.fillStyle = '#f5f7fa'; context.fillRect(0, 0, 1100, 650)
    context.fillStyle = '#fff'; context.fillRect(35, 35, 1030, 580); context.fillStyle = '#8f0045'; context.font = 'bold 30px sans-serif'
    context.fillText('抽检与复查支撑材料 · 原型示例', 65, 90)
    context.fillStyle = '#303133'; context.font = '24px sans-serif'
    const lines = [`单据：${file.example.number}`, `检查人：${file.example.person}`, `结论：${file.example.result}`, `时间：${new Date(file.example.time).toLocaleString()}`]
    lines.forEach((line, index) => context.fillText(line, 65, 155 + index * 55))
    const title = `问题：${file.example.title}`; for (let i = 0; i < title.length; i += 33) context.fillText(title.slice(i, i + 33), 65, 410 + Math.floor(i / 33) * 38)
    context.fillStyle = '#737c89'; context.font = '20px sans-serif'; context.fillText('此附件用于演示检查证据的查看与下载，不代表实际现场检查。', 65, 565)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    return
  }
  const db = await attachmentDatabase()
  const blob = await new Promise((resolve,reject) => { const request = db.transaction('files').objectStore('files').get(file.id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) }); db.close()
  if (!blob) throw new Error('当前浏览器没有该附件，请重新上传')
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000)
}
export function submitTask(task, role) {
  if (task.projectKey !== getCurrentHazardIssueProjectKey(selectedProjectId.value)) throw new Error('只能提交当前项目的任务')
  if (task.stage !== role || !taskComplete(task)) throw new Error('请完成每张单据的复查后提交')
  if (task.submittedAt) return
  task.submittedAt = new Date().toISOString()
  if (role === 'supervisor') task.discrepancy = !sampling.value.history.some(h => h.taskId === task.id && h.result === '不合格')
}
