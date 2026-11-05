/** Local ledger projections. No detail bodies or attachment URLs escape into the list. */
import { summaryRows } from './dailyDispatchCheckRules.js'
import { dailyLedgerStatuses, PROJECT_CHECK_SCOPE } from './dailyDispatchLedgerStatus.js'

function isBusinessDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const length = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  return year > 0 && day > 0 && day <= length
}

// Empty means unrestricted; incomplete or invalid input never becomes a fallback date.
export function normalizeLedgerRange(value) {
  if (value == null) return []
  if (!Array.isArray(value)) throw new Error('请选择完整的检查日期范围')
  const range = value.map(item => typeof item === 'string' ? item.trim() : item)
  if (range.every(item => item == null || item === '')) return []
  if (range.length !== 2 || !range.every(isBusinessDate) || range[0] > range[1]) throw new Error('请选择完整的检查日期范围')
  return range
}

export function filterLedgerSummaries(rows, value) {
  const [start, end] = normalizeLedgerRange(value)
  // YYYY-MM-DD is a business date, not a UTC timestamp. Both endpoints are inclusive.
  return rows.filter(row => (!start || row.date >= start) && (!end || row.date <= end))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function ledgerSummary(day) {
  return { ...summaryRows([day])[0], results: dailyLedgerStatuses(day, { projectScope: PROJECT_CHECK_SCOPE }) }
}
