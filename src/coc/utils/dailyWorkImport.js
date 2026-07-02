import * as XLSX from 'xlsx'
import { EXCEL_COL_MAP, DAILY_WORK_DATA_START_ROW, emptyDailyWorkRecord } from '../config/dailyWorkSchema.js'
import { classifyDailyWorkRecord } from './dailyWorkClassifier.js'

function cellText(value) {
  if (value == null) return ''
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    const hh = String(value.getHours()).padStart(2, '0')
    const mm = String(value.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
  }
  return String(value).trim()
}

/** Sheet 名 2026.6.14 → 2026-06-14 */
export function parseSheetDate(sheetName) {
  const m = String(sheetName || '').match(/(\d{4})[.\-/年](\d{1,2})[.\-/月](\d{1,2})/)
  if (!m) return ''
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
}

function rowToObject(row) {
  const obj = {}
  row.forEach((cell, idx) => {
    const col = idx + 1
    const key = EXCEL_COL_MAP[col]
    if (key) obj[key] = cellText(cell)
  })
  return obj
}

function isHeaderLike(rowObj) {
  const cat = rowObj.dangerWorkCategory || ''
  return cat.includes('危险作业') && cat.includes('类别')
}

function hasRowData(rowObj) {
  return Object.values(rowObj).some((v) => v && String(v).trim())
}

/** 合并单元格向下继承的字段：空单元格不得覆盖已有上下文 */
const INHERIT_CONTEXT_KEYS = [
  'leadUnit',
  'projectName',
  'contractor',
  'workArea',
  'workContent',
  'ownerProjectManager',
  'ownerSafetyManager',
  'contractorProjectManager',
  'contractorSafetyManager',
  'supervisorProjectManager',
  'supervisorSafetyManager',
  'startTime',
  'endTime',
  'majorWorkContent',
  'majorProjectCategory',
  'majorStartTime',
  'majorEndTime',
  'majorOwnerSafetyManager',
  'majorContractorSafetyManager',
  'majorSupervisorSafetyManager',
  'majorControlMeasures',
]

function pickNonEmptyFields(rowObj) {
  const out = {}
  Object.entries(rowObj).forEach(([key, value]) => {
    const text = cellText(value)
    if (text) out[key] = text
  })
  return out
}

function mergeContext(context, rowObj) {
  const next = { ...context }
  INHERIT_CONTEXT_KEYS.forEach((k) => {
    const text = cellText(rowObj[k])
    if (text) next[k] = text
  })
  return next
}

/**
 * 将 Sheet 合并单元格的值展开到区域内每一格（便于 sheet_to_json 读取）
 */
export function expandMergedSheetRows(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
  const merges = sheet?.['!merges'] || []
  merges.forEach(({ s, e }) => {
    const origin = cellText(rows[s.r]?.[s.c])
    if (!origin) return
    for (let r = s.r; r <= e.r; r += 1) {
      if (!rows[r]) rows[r] = []
      for (let c = s.c; c <= e.c; c += 1) {
        if (r === s.r && c === s.c) continue
        if (!cellText(rows[r][c])) rows[r][c] = origin
      }
    }
  })
  return rows
}

/**
 * 解析单个 Sheet（与线下统计表结构一致）
 * 合并单元格场景：管理单位/项目/单位信息向下继承
 */
export function parseDailyWorkSheet(sheetName, sheetRows, options = {}) {
  const { includeNormalRows = false } = options
  const reportDate = parseSheetDate(sheetName)
  const records = []
  let context = emptyDailyWorkRecord(reportDate)

  sheetRows.forEach((row, rowIndex) => {
    if (rowIndex + 1 < DAILY_WORK_DATA_START_ROW) return
    const rowObj = rowToObject(row)
    if (!hasRowData(rowObj) || isHeaderLike(rowObj)) return

    context = mergeContext(context, rowObj)

    const base = {
      ...emptyDailyWorkRecord(reportDate),
      ...context,
      ...pickNonEmptyFields(rowObj),
      reportDate,
      source: 'import',
      sheetName,
    }

    const { danger, major } = classifyDailyWorkRecord(base)
    if (!danger && !major) {
      if (includeNormalRows && (base.workArea || base.workContent || base.dangerWorkCategory)) {
        records.push(base)
      }
      return
    }

    records.push(base)
  })

  return records
}

export function parseDailyWorkWorkbook(arrayBuffer, preferredSheet, options = {}) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const sheetNames = wb.SheetNames || []
  let sheetName = preferredSheet
  if (!sheetName || !sheetNames.includes(sheetName)) {
    sheetName = sheetNames.find((n) => parseSheetDate(n)) || sheetNames[0]
  }
  const sheet = wb.Sheets[sheetName]
  if (!sheet) throw new Error('未找到可解析的工作表')
  const rows = expandMergedSheetRows(sheet)
  const records = parseDailyWorkSheet(sheetName, rows, options)
  return { sheetName, reportDate: parseSheetDate(sheetName), records, sheetNames }
}

export async function parseDailyWorkFile(file, preferredSheet) {
  const buffer = await file.arrayBuffer()
  return parseDailyWorkWorkbook(buffer, preferredSheet)
}
