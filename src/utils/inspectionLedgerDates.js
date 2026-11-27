export function inspectionDateKey(value) {
  const parts = String(value || '').match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  return parts ? [parts[1], parts[2].padStart(2, '0'), parts[3].padStart(2, '0')].join('-') : ''
}

export function isInspectionRectificationOverdue(row, now = new Date()) {
  if (!row?.deadline) return null
  if (row.closed || row.status !== '待整改') return false
  const deadline = inspectionDateKey(row.deadline)
  if (!deadline) return null
  const today = inspectionDateKey(now.toLocaleDateString('sv-SE'))
  return deadline < today
}

export function isWithinInspectionDateRange(value, range) {
  if (!range || range.length !== 2) return true
  const date = inspectionDateKey(value)
  return Boolean(date && date >= range[0] && date <= range[1])
}
