import { resolveInspectionProjectId, formatInspectionCategories } from '../config/inspectionManagement.js'
import {
  buildLedgerRows,
  ensureMajorHazardData,
  getMajorHazardData,
  saveLedger,
} from './majorHazardManualStorage.js'

/**
 * 巡检管理与危大工程之间的轻量关联契约。
 * 任务仅选择危大工程名称；提交完成后，系统将该次巡视自动写入该工程当前在施的施工部位。
 */
export function getMajorHazardLedgerOptions(projectId) {
  if (!projectId) return []
  ensureMajorHazardData(projectId)
  const data = getMajorHazardData(projectId)
  return buildLedgerRows(data).map((ledger) => ({
    id: ledger.id,
    sourceId: ledger.sourceId,
    name: ledger.name,
    categoryName: ledger.categoryName,
    label: `${ledger.name}（${ledger.categoryName || '未分类'}）`,
  }))
}

function inspectionDateOf(task) {
  return String(task.inspectionDate || task.inspDate || task.submittedAt || new Date().toISOString()).slice(0, 10)
}

function taskInspectors(task) {
  return [...new Set([task.inspector, task.executor, ...(task.companions || [])].filter(Boolean))]
}

function taskSnapshot(task) {
  return {
    id: task.id,
    taskNo: task.taskNo || '',
    taskName: task.taskName || '',
    source: task.source || '',
    inspectionCategory: task.inspectionCategory || formatInspectionCategories(task.inspectionCategories),
    inspectionCategories: task.inspectionCategories || [],
    project: task.project || '',
    projectId: task.projectId || task.project_id || '',
    project_id: task.project_id || task.projectId || '',
    inspectionDate: inspectionDateOf(task),
    deadline: task.deadline || '',
    status: task.status || '',
    inspector: task.inspector || task.executor || '',
    executor: task.executor || task.inspector || '',
    companions: [...(task.companions || [])],
    itemCount: Number(task.itemCount || 0),
    hazardCount: Number(task.hazardCount || 0),
    result: task.result || '',
    normalPhotos: [...(task.normalPhotos || [])],
    hazardItems: [...(task.hazardItems || [])],
  }
}

/**
 * 已完成的危大工程现场巡视任务自动归档到危大工程过程管控的“现场巡视”台账。
 * 同一任务对同一施工部位只会写入一次，重复保存/编辑不会制造重复台账。
 */
export function syncInspectionTaskToMajorHazard(task = {}) {
  if (task.isMajorHazardPatrol !== '是' || task.status !== '已完成') return { synced: 0, reason: 'not-applicable' }

  const projectId = task.projectId || task.project_id || resolveInspectionProjectId(task.project || '')
  if (!projectId || (!task.majorHazardLedgerId && !task.majorHazardSourceId && !task.majorHazardName)) {
    return { synced: 0, reason: 'missing-link' }
  }

  ensureMajorHazardData(projectId)
  const data = getMajorHazardData(projectId)
  const ledger = buildLedgerRows(data).find((item) =>
    item.id === task.majorHazardLedgerId
    || item.sourceId === task.majorHazardSourceId
    || item.name === task.majorHazardName,
  )
  if (!ledger) return { synced: 0, reason: 'ledger-not-found' }

  const date = inspectionDateOf(task)
  const inspectors = taskInspectors(task)
  const activeParts = (ledger.parts || []).filter((part) => {
    const accepted = part.process?.acceptance?.status === '已完成' && part.process?.acceptance?.result === '合格'
    return !accepted && part.startDate && part.startDate <= date
  })
  if (!activeParts.length) return { synced: 0, reason: 'no-active-part' }

  const snapshot = taskSnapshot(task)
  let synced = 0
  activeParts.forEach((part) => {
    const node = part.process?.patrol
    if (!node) return
    const records = Array.isArray(node.records) ? node.records : (node.records = [])
    if (records.some((record) => (record.inspectionTaskIds || []).includes(task.id))) return
    const record = {
      id: `mh-patrol-task-${task.id}-${part.id}`,
      inspectionTaskIds: [task.id],
      inspectionTasks: [snapshot],
      inspectionTaskCount: 1,
      inspectionTaskNo: snapshot.taskNo,
      inspectionTaskName: snapshot.taskName,
      inspectionDate: date,
      date,
      inspectors: inspectors.join('、'),
      responsible: inspectors.join('、'),
      hazardCount: snapshot.hazardCount,
      status: snapshot.hazardCount > 0 ? '需关注' : '已完成',
      content: snapshot.taskName,
      attachmentInfo: '',
      createdBy: '巡检管理自动同步',
      createdAt: task.submittedAt || `${date} 00:00:00`,
    }
    records.push(record)
    Object.assign(node, {
      status: record.status,
      date,
      responsible: record.responsible,
      content: record.content,
      attachmentInfo: '',
    })
    synced += 1
  })
  if (synced) saveLedger(projectId, ledger)
  return { synced, ledgerId: ledger.id, projectId }
}
