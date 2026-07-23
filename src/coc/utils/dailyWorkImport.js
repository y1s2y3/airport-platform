import * as XLSX from 'xlsx'
import {
  DANGER_WORK_FIELDS,
  MAJOR_PROJECT_FIELDS,
  EXCEL_COL_MAP,
  DAILY_WORK_DATA_START_ROW,
  emptyDailyWorkRecord,
} from '../config/dailyWorkSchema.js'
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

function colLetterToNumber(col) {
  return String(col || '')
    .toUpperCase()
    .split('')
    .reduce((sum, ch) => sum * 26 + (ch.charCodeAt(0) - 64), 0)
}

function formatSheetNameFromDate(date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}.${m}.${d}`
}

function formatDisplayDateLabel(sheetName) {
  const m = String(sheetName || '').match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)
  if (!m) return sheetName
  return `${Number(m[2])}月${Number(m[3])}日`
}

function buildTemplateHeaderRow() {
  const row = Array(24).fill('')
  ;[...DANGER_WORK_FIELDS, ...MAJOR_PROJECT_FIELDS].forEach((field) => {
    row[colLetterToNumber(field.col) - 1] = field.label
  })
  return row
}

function recordToExcelRow(record) {
  const row = Array(24).fill('')
  Object.entries(EXCEL_COL_MAP).forEach(([col, key]) => {
    const val = record[key]
    if (val != null && String(val).trim()) row[Number(col) - 1] = val
  })
  return row
}

const TEMPLATE_INSTRUCTIONS = [
  '填报说明：',
  '1. 不涉及危险作业的其他施工作业内容需单独列一栏；危大工程请在同一行右侧危大工程计划表中同步填报。',
  '2. 每日 16:30 前完成次日作业计划填报。',
  '3. 作业时间格式：yyyy-MM-dd HH:mm（如 2026-07-08 08:00）。',
  '4. 人员信息：姓名/手机号；多人之间用英文逗号分隔。',
  '5. Sheet 名称请使用施工日期，格式如 2026.7.9；导入时可指定 Sheet 名。',
].join('\n')

const TEMPLATE_SAMPLE_RECORD = {
  ...emptyDailyWorkRecord(''),
  leadUnit: '深圳机场集团/建设工程指挥部',
  projectName: '三跑道扩建机场工程（软基工程）',
  contractor: '中国电建集团航空港建设有限公司',
  workArea: 'E9-1、E9-2土面区',
  workContent: '袖阀钻孔、袖阀注浆',
  dangerWorkCategory: '动土作业',
  startTime: '',
  endTime: '',
  ownerProjectManager: '尹永强/19898161316',
  ownerSafetyManager: '李想/13713651799',
  contractorProjectManager: '阮政鹏/18065003610',
  contractorSafetyManager: '孙贯雨/18759189257',
  supervisorProjectManager: '胡庭怀/15874414098',
  supervisorSafetyManager: '聂涵剑/15974177662',
  dangerControlMeasures: '按专项方案落实班前交底、旁站监护及完工验收。',
  majorWorkContent: '土面区袖阀钻孔、袖阀注浆',
  majorProjectCategory: '不停航施工',
  majorOwnerSafetyManager: '李想/13713651799',
  majorContractorSafetyManager: '孙贯雨/18759189257',
  majorSupervisorSafetyManager: '聂涵剑/15974177662',
  majorControlMeasures: '按不停航施工专项方案组织交底、旁站与巡视检查。',
}

function buildTemplateSheetRows(sheetName) {
  const displayDate = formatDisplayDateLabel(sheetName)
  const title = `建设工程指挥部危险作业统计表（施工日期：${displayDate}00:00-${displayDate}24:00）`
  const sample = {
    ...TEMPLATE_SAMPLE_RECORD,
    reportDate: parseSheetDate(sheetName),
    startTime: `${parseSheetDate(sheetName)} 00:00`,
    endTime: `${parseSheetDate(sheetName)} 07:00`,
    majorStartTime: `${parseSheetDate(sheetName)} 00:00`,
    majorEndTime: `${parseSheetDate(sheetName)} 07:00`,
  }

  const padding = Array(DAILY_WORK_DATA_START_ROW - 1).fill(null).map(() => Array(24).fill(''))
  padding[1] = [title]
  padding[2] = [TEMPLATE_INSTRUCTIONS]
  padding[3] = [title]
  padding[4] = buildTemplateHeaderRow()

  return [...padding, recordToExcelRow(sample), Array(24).fill('')]
}

/** 下载每日施工作业 Excel 导入模版（对齐线下施工作业统计表结构） */
export function downloadDailyWorkTemplate(options = {}) {
  const targetDate = options.date instanceof Date
    ? options.date
    : (() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d
      })()
  const sheetName = options.sheetName || formatSheetNameFromDate(targetDate)
  const rows = buildTemplateSheetRows(sheetName)
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = Array(24).fill({ wch: 18 })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, options.fileName || '每日施工作业导入模版.xlsx')
}
