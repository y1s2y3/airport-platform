import { resolveInspectionProjectId } from '../config/inspectionManagement.js'
import { retainPatrolInspectionTask } from '../mock/mobileInspectionTasks.js'
import { buildLedgerRows, ensureMajorHazardData, getMajorHazardData, saveLedger } from './majorHazardManualStorage.js'

/** 移动端执行时仅选择危大清单；现场巡视与清单关联，不关联施工部位。 */
export function getMajorHazardLedgerOptions(projectId) {
  if (!projectId) return []
  ensureMajorHazardData(projectId)
  return buildLedgerRows(getMajorHazardData(projectId)).map((ledger) => ({
    id: ledger.id, sourceId: ledger.sourceId, name: ledger.name, categoryName: ledger.categoryName,
    label: `${ledger.name}（${ledger.categoryName || '未分类'}）`,
  }))
}

/** 一张已完成的巡检单在同一清单中只产生一条引用；再次保存更新原单，不新增行。 */
export function syncInspectionTaskToMajorHazard(task = {}) {
  if (task.isMajorHazardPatrol !== '是' || task.status !== '已完成') return { synced: 0, reason: 'not-applicable' }
  const projectId = task.majorHazardProjectId || task.projectId || task.project_id || resolveInspectionProjectId(task.majorHazardProjectName || task.project || '')
  if (!task.id || !projectId || (!task.majorHazardLedgerId && !task.majorHazardSourceId && !task.majorHazardName)) return { synced: 0, reason: 'missing-link' }
  const previous = getMajorHazardData(projectId).ledgers.find((item) => item.id === task.majorHazardLedgerId
    || item.sourceId === task.majorHazardSourceId || item.name === task.majorHazardName)
  const linkedBefore = previous?.patrolRecords?.some((record) => record.inspectionTaskId === task.id)
  retainPatrolInspectionTask(task)
  ensureMajorHazardData(projectId)
  const data = getMajorHazardData(projectId)
  const ledger = buildLedgerRows(data).find((item) => item.id === task.majorHazardLedgerId
    || item.sourceId === task.majorHazardSourceId || item.name === task.majorHazardName)
  if (!ledger) return { synced: 0, reason: 'ledger-not-found' }
  const records = ledger.patrolRecords || (ledger.patrolRecords = [])
  if (records.some((record) => record.inspectionTaskId === task.id)) return { synced: linkedBefore ? 0 : 1, ledgerId: ledger.id, projectId }
  records.push({ id: 'mh-patrol-' + task.id, inspectionTaskId: task.id })
  const saved = saveLedger(projectId, ledger)
  return { synced: 1, ledgerId: saved.id, projectId }
}
