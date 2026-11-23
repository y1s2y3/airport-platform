export function inspectionDateKey(value) {
  const parts = String(value || '').match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  return parts ? [parts[1], parts[2].padStart(2, '0'), parts[3].padStart(2, '0')].join('-') : ''
}

export function isWithinInspectionDateRange(value, range) {
  if (!range || range.length !== 2) return true
  const date = inspectionDateKey(value)
  return Boolean(date && date >= range[0] && date <= range[1])
}
