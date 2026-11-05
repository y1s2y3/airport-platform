/** Readonly date-ledger columns. Aggregates never overwrite their source records. */
import { personFilled, summaryRows } from './dailyDispatchCheckRules.js'
import { savedInspectionState } from './dailyDispatchCardStatus.js'
export const PROJECT_CHECK_SCOPE = 'all'
export const DAILY_LEDGER_COLUMNS = [
  { key: 'date', label: '检查日期', width: 120 },
  { key: 'personnel', label: '人员履职', width: 140, status: true },
  { key: 'safetyQuality', label: '安全质量检查情况', width: 185, status: true },
  { key: 'camera', label: '摄像头检查情况', width: 190, status: true },
  { key: 'projectDuty', label: '项目部值班人员检查情况', width: 205, status: true },
  { key: 'projectManager', label: '项目经理检查情况', width: 200, status: true },
]
export function dailyLedgerColumns(keys = DAILY_LEDGER_COLUMNS.map(column => column.key)) {
  const selected = new Set(['date', ...keys])
  return DAILY_LEDGER_COLUMNS.filter(column => selected.has(column.key))
}

const LABELS = { problem: '发现问题', other: '其他', normal: '正常', empty: '--' }
function aggregate(states, scope, personnel = false) {
  const counts = { problem: 0, other: 0, normal: 0, empty: 0, legacy: 0 }
  for (const state of states) counts[state]++
  const state = ['problem', 'other', 'normal'].find(key => counts[key] > 0) || 'empty'
  const detail = ['problem', 'other', 'normal'].filter(key => counts[key]).map(key => `${LABELS[key]}${counts[key]}项`)
  if (counts.empty) detail.push(`未形成有效结果${counts.empty}项`)
  if (counts.legacy) detail.push(`历史格式待识别${counts.legacy}项`)
  const priority = personnel ? '其他、正常' : '发现问题、其他、正常'
  const hint = states.length ? `${scope}：${detail.join('，')}。按${priority}的顺序展示；未填写不将已有正常降级，显示正常不代表全部已填写。` : `${scope}内暂无已保存的有效检查结果。`
  return { state, label: LABELS[state], hint, counts }
}
export function dailyLedgerStatuses(day, { projectScope } = {}) {
  if (!['all', 'unified'].includes(projectScope)) throw new Error('Project check summary scope must be explicit')
  const allRows = day?.hq?.rows || []
  const unifiedRows = day?.hq?.version ? allRows.filter(row => row.unified) : []
  const projectRows = projectScope === 'all' ? allRows : unifiedRows
  const hq = (keys, personnel = false) => unifiedRows.flatMap(row => keys.map(key => savedInspectionState(row[key], personnel)))
  // Aggregate the two independently submitted project inspections without merging their status.
  const project = part => projectRows.map(row => {
    const record = day?.people?.[row.projectId]?.[part]
    if (!personFilled(record)) return 'empty'
    return record.schemaVersion === 4 ? savedInspectionState(record.check, false) : 'legacy'
  })
  return {
    personnel: aggregate(hq(['personnel'], true), '当日统一调度项目的人员履职', true),
    safetyQuality: aggregate(hq(['safety', 'quality']), '当日统一调度项目的安全与质量检查'),
    camera: aggregate(hq(['camera']), '当日统一调度项目的摄像头检查'),
    projectDuty: aggregate(project('duty'), '当日纳入表单项目的值班人员检查'),
    projectManager: aggregate(project('manager'), '当日纳入表单项目的项目经理检查'),
  }
}
export function dailyLedgerRows(days, range, options) {
  const byDate = new Map(days.map(day => [day.date, day]))
  return summaryRows(days, range).map(row => ({ ...row, ...dailyLedgerStatuses(byDate.get(row.date), options) }))
}
