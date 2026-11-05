/** Readonly date-card projection. It never writes or recalculates stored metrics. */
import { problemText, text, isLegacyCheck } from './dailyDispatchCheckRules.js'

const GROUPS = [
  { key: 'personnel', label: '人员履职', labelLines: ['人员履职'], fields: ['personnel'] },
  { key: 'safetyQuality', label: '安全质量检查情况', labelLines: ['安全质量', '检查情况'], fields: ['safety', 'quality'] },
  { key: 'camera', label: '摄像头检查情况', labelLines: ['摄像头', '检查情况'], fields: ['camera'] },
]
const LABELS = { normal: '正常', problem: '发现问题', other: '其他', legacy: '历史记录', empty: '—' }

export function savedInspectionState(check, personnel) {
  if (check?.type === 'normal') return 'normal'
  if (!personnel && check?.type === 'problem' && (check.problems || []).some(problemText)) return 'problem'
  if (check?.type === 'other' && text(personnel ? check.text : check.other)) return 'other'
  if (isLegacyCheck(check)) return 'legacy'
  return 'empty'
}

export function dailyCardStatuses(day) {
  const rows = day?.hq?.version ? (day.hq.rows || []).filter(row => row.unified) : []
  return GROUPS.map(({ key, label, labelLines, fields }) => {
    const present = new Set(rows.flatMap(row => fields.map(field => savedInspectionState(row[field], field === 'personnel'))))
    const keys = present.has('problem') ? ['problem'] : ['normal', 'other', 'legacy', 'empty'].filter(state => present.has(state))
    if (!keys.length) keys.push('empty')
    const hint = keys.length > 1 ? '当日统一调度范围内存在不同结果；—表示未填写。仅显示已提交内容，查看详情可了解各项目情况。'
      : keys[0] === 'problem' ? '当日统一调度范围内至少有一项有效问题，查看详情可了解各项目情况。'
      : keys[0] === 'normal' ? '当日统一调度范围内对应检查全部正常。'
      : keys[0] === 'other' ? '当日统一调度范围内对应检查全部为其他说明。'
      : keys[0] === 'legacy' ? '包含历史格式内容，详情中保留原文，不自动转换检查状态。'
      : '暂无已提交的有效检查结果。'
    return { key, label, labelLines, states: keys.map(state => ({ key: state, label: LABELS[state] })), hint }
  })
}
