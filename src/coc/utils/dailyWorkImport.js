import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import {
  DANGER_WORK_FIELDS,
  MAJOR_PROJECT_FIELDS,
  EXCEL_COL_MAP,
  DAILY_WORK_DATA_START_ROW,
  DAILY_WORK_DEFAULT_LEAD_UNIT,
  MAJOR_WORK_REGISTER_FIELDS,
  MAJOR_WORK_REGISTER_COL_MAP,
  MAJOR_PROJECT_CATEGORY_OPTIONS,
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

export async function parseDailyWorkFile(file, preferredSheet, options = {}) {
  const buffer = await file.arrayBuffer()
  return parseDailyWorkWorkbook(buffer, preferredSheet, options)
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

/** 导出仅危险作业侧 A–O，不含危大兼容列 */
const DANGER_EXPORT_COL_COUNT = 15

function buildDangerExportHeaderRow() {
  const row = Array(DANGER_EXPORT_COL_COUNT).fill('')
  DANGER_WORK_FIELDS.forEach((field) => {
    row[colLetterToNumber(field.col) - 1] = field.label
  })
  return row
}

function recordToDangerExcelRow(record) {
  const row = Array(DANGER_EXPORT_COL_COUNT).fill('')
  DANGER_WORK_FIELDS.forEach((field) => {
    const val = record[field.key]
    if (val != null && String(val).trim()) row[colLetterToNumber(field.col) - 1] = val
  })
  return row
}

const TEMPLATE_INSTRUCTIONS = [
  '填报说明：',
  '1. 管理单位默认「深圳机场集团/建设工程指挥部」；施工项目名称须为系统内项目全称，导入时不存在则整批拦截。',
  '2. 施工单位由项目画像回显（界面）；导入可填全称，不做画像存在性改写。',
  '3. 施工项目名称≤200字，施工区域≤200字，风险管控措施≤2000字。',
  '4. 作业类别仅可单选枚举；作业开始/结束时间为 yyyy-MM-dd HH:mm，且须落在施工日当天 00:00–23:59。',
  '5. 项目负责人仅单人，格式：姓名/11位手机号；安全监管人可多人，英文逗号分隔（例：李XX/135xxxx4567,王XX/138xxxx1234）。',
  '6. 导出按当前筛选写出，不做项目存在性限制。',
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

function sheetNameFromReportDate(reportDate) {
  const m = String(reportDate || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!m) return ''
  return `${m[1]}.${Number(m[2])}.${Number(m[3])}`
}

function buildExportSheetRows(sheetName, records) {
  const displayDate = formatDisplayDateLabel(sheetName)
  const title = `建设工程指挥部危险作业统计表（施工日期：${displayDate}00:00-${displayDate}24:00）`
  const padding = Array(DAILY_WORK_DATA_START_ROW - 1)
    .fill(null)
    .map(() => Array(DANGER_EXPORT_COL_COUNT).fill(''))
  padding[1] = [title]
  padding[2] = [TEMPLATE_INSTRUCTIONS]
  padding[3] = [title]
  padding[4] = buildDangerExportHeaderRow()
  const dataRows = (records || []).map((record) => recordToDangerExcelRow(record))
  return [...padding, ...dataRows]
}

/**
 * 导出每日施工作业（按施工日期分 Sheet；仅危险作业侧 A–O，不含危大兼容列）
 * @param {Array} records 待导出记录（通常为当前筛选结果）
 * @returns {{ ok: boolean, count: number, sheetCount: number, error?: string }}
 */
export function exportDailyWorkRecords(records, options = {}) {
  const list = Array.isArray(records) ? records : []
  if (!list.length) {
    return { ok: false, count: 0, sheetCount: 0, error: '当前没有可导出的记录' }
  }

  const groups = new Map()
  list.forEach((record) => {
    const sheetName = sheetNameFromReportDate(record.reportDate) || '未标注日期'
    if (!groups.has(sheetName)) groups.set(sheetName, [])
    groups.get(sheetName).push(record)
  })

  const wb = XLSX.utils.book_new()
  ;[...groups.entries()]
    .sort(([a], [b]) => String(b).localeCompare(String(a)))
    .forEach(([sheetName, rows]) => {
      const safeName = String(sheetName).slice(0, 31) || '导出'
      const ws = XLSX.utils.aoa_to_sheet(buildExportSheetRows(safeName, rows))
      ws['!cols'] = Array(DANGER_EXPORT_COL_COUNT).fill({ wch: 18 })
      XLSX.utils.book_append_sheet(wb, ws, safeName)
    })

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  XLSX.writeFile(wb, options.fileName || `每日施工作业导出_${stamp}.xlsx`)
  return { ok: true, count: list.length, sheetCount: groups.size }
}

/* ---------- 危大工程信息登记：独立 11 列模板下载 / 导入解析校验 / 导出 ---------- */

const MAJOR_REGISTER_SHEET_NAME = '危大工程信息登记'

/** 模板/导出表头：必填列前加 *（导入解析时会自动去掉 * 再匹配字段） */
function buildMajorRegisterHeaderRow(withRequiredMark = false) {
  return MAJOR_WORK_REGISTER_FIELDS.map((field) =>
    withRequiredMark && field.required ? `*${field.label}` : field.label,
  )
}

function majorRegisterDataRow(record) {
  return MAJOR_WORK_REGISTER_FIELDS.map((field) => {
    const value = record?.[field.key]
    return value == null ? '' : String(value)
  })
}

/** 去掉表头前缀 *（兼容模版表头与手工修改的表头） */
function normalizeHeaderLabel(value) {
  return String(value == null ? '' : value)
    .replace(/^[\s*＊]+/, '')
    .trim()
}

/* ---------- 带表头浅蓝底的最小 xlsx 生成（SheetJS 社区版不写单元格样式） ---------- */

const XLSX_HEADER_FILL = 'FFD9E2F3'

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function columnLetter(index) {
  let n = index + 1
  let text = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    text = String.fromCharCode(65 + rem) + text
    n = Math.floor((n - 1) / 26)
  }
  return text
}

function buildMajorRegisterSheetXml(headerRow, dataRows, title = '', withValidation = false) {
  const colCount = headerRow.length
  const cols = MAJOR_WORK_REGISTER_FIELDS.map((field, index) => {
    const width = field.type === 'textarea' ? 30 : 22
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
  }).join('')

  const buildRow = (values, rowIndex, styleId) => {
    const cells = values
      .map((value, colIndex) => {
        const ref = `${columnLetter(colIndex)}${rowIndex}`
        return `<c r="${ref}" t="inlineStr" s="${styleId}"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
      })
      .join('')
    const height = styleId === 1 ? ' ht="30" customHeight="1"' : styleId === 3 ? ' ht="32" customHeight="1"' : ''
    return `<row r="${rowIndex}"${height}>${cells}</row>`
  }

  const hasTitle = Boolean(String(title || '').trim())
  const headerRowIndex = hasTitle ? 2 : 1
  const rows = []
  if (hasTitle) {
    rows.push(
      `<row r="1" ht="32" customHeight="1"><c r="A1" t="inlineStr" s="3"><is><t xml:space="preserve">${xmlEscape(title)}</t></is></c></row>`,
    )
  }
  rows.push(buildRow(headerRow, headerRowIndex, 1))
  dataRows.forEach((row, idx) => rows.push(buildRow(row, headerRowIndex + idx + 1, 2)))

  const lastRef = `${columnLetter(colCount - 1)}${headerRowIndex + dataRows.length}`
  const lastCol = columnLetter(colCount - 1)
  const mergeXml = hasTitle ? `<mergeCells count="1"><mergeCell ref="A1:${lastCol}1"/></mergeCells>` : ''
  const freezeRow = headerRowIndex + 1

  // 枚举列（危大工程作业类别）在模版里做成下拉（数据验证）
  let validationXml = ''
  if (withValidation) {
    const validations = MAJOR_WORK_REGISTER_FIELDS.map((field, index) => ({ field, index }))
      .filter(({ field }) => field.type === 'select')
      .map(({ field, index }) => {
        const col = columnLetter(index)
        const options = MAJOR_PROJECT_CATEGORY_OPTIONS.join(',')
        const errorText = `请从下拉列表中选择：${MAJOR_PROJECT_CATEGORY_OPTIONS.join(' / ')}`
        return (
          `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" ` +
          `promptTitle="${xmlEscape(field.label)}" prompt="请从下拉列表中选择" ` +
          `errorTitle="${xmlEscape(field.label)}" error="${xmlEscape(errorText)}" ` +
          `sqref="${col}${headerRowIndex + 1}:${col}500">` +
          `<formula1>"${xmlEscape(options)}"</formula1></dataValidation>`
        )
      })
    if (validations.length) {
      validationXml = `<dataValidations count="${validations.length}">${validations.join('')}</dataValidations>`
    }
  }

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<dimension ref="A1:${lastRef}"/>` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRowIndex}" topLeftCell="A${freezeRow}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    '<sheetFormatPr defaultRowHeight="20"/>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${rows.join('')}</sheetData>` +
    mergeXml +
    validationXml +
    '<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    '</worksheet>'
  )
}

function buildMajorRegisterStylesXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="3">' +
    '<font><sz val="11"/><color theme="1"/><name val="等线"/><family val="2"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FF1F2329"/><name val="等线"/><family val="2"/></font>' +
    '<font><b/><sz val="14"/><color rgb="FF1F2329"/><name val="等线"/><family val="2"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    `<fill><patternFill patternType="solid"><fgColor rgb="${XLSX_HEADER_FILL}"/><bgColor indexed="64"/></patternFill></fill>` +
    '</fills>' +
    '<borders count="2">' +
    '<border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border>' +
    '<left style="thin"><color rgb="FFBFBFBF"/></left>' +
    '<right style="thin"><color rgb="FFBFBFBF"/></right>' +
    '<top style="thin"><color rgb="FFBFBFBF"/></top>' +
    '<bottom style="thin"><color rgb="FFBFBFBF"/></bottom>' +
    '<diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="4">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="常规" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  )
}

async function buildMajorRegisterXlsxBlob({ headerRow, dataRows, title = '', withValidation = false }) {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>',
  )
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
  )
  zip.file(
    'xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets><sheet name="${xmlEscape(MAJOR_REGISTER_SHEET_NAME)}" sheetId="1" r:id="rId1"/></sheets>` +
      '</workbook>',
  )
  zip.file(
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>',
  )
  zip.file('xl/styles.xml', buildMajorRegisterStylesXml())
  zip.file('xl/worksheets/sheet1.xml', buildMajorRegisterSheetXml(headerRow, dataRows, title, withValidation))
  const isBrowser = typeof document !== 'undefined'
  return zip.generateAsync({
    type: isBrowser ? 'blob' : 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** 生成危大工程信息登记 xlsx（供下载/导出与自检复用）：表头必填列可带 *、浅蓝底；可带合并标题行与枚举下拉 */
export async function buildMajorWorkRegisterXlsxBlob({
  dataRows = [],
  withRequiredMark = false,
  title = '',
  withValidation = false,
} = {}) {
  return buildMajorRegisterXlsxBlob({
    headerRow: buildMajorRegisterHeaderRow(withRequiredMark),
    dataRows,
    title,
    withValidation,
  })
}

function downloadExcelBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

/** 下载危大工程信息登记导入模版（第 1 行表头，必填列带 * 且浅蓝底；危大工程作业类别为下拉选择；第 2 行起填数据） */
export async function downloadMajorWorkRegisterTemplate(options = {}) {
  const blob = await buildMajorWorkRegisterXlsxBlob({ withRequiredMark: true, withValidation: true })
  downloadExcelBlob(blob, options.fileName || '危大工程信息登记导入模版.xlsx')
  return { ok: true }
}

function normalizeDateTimeCell(value) {
  if (value == null) return ''
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    const hh = String(value.getHours()).padStart(2, '0')
    const mm = String(value.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
  }
  const text = String(value).trim().replace(/\//g, '-').replace(/[Tt]/g, ' ')
  const full = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/)
  if (full) {
    return `${full[1]}-${String(full[2]).padStart(2, '0')}-${String(full[3]).padStart(2, '0')} ${String(full[4]).padStart(2, '0')}:${full[5]}`
  }
  const dateOnly = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dateOnly) return `${dateOnly[1]}-${String(dateOnly[2]).padStart(2, '0')}-${String(dateOnly[3]).padStart(2, '0')} 00:00`
  return ''
}

function validateContactCell(value) {
  const text = String(value || '').trim()
  if (!text) return false
  return text.split(/[,，;；]/).every((part) => {
    const item = part.trim()
    if (!item) return false
    const phone = item.includes('/') ? item.split('/').pop().trim() : item
    return /\d{11}/.test(phone)
  })
}

function normalizeNameKey(value) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function resolveImportProjectName(value, options) {
  const text = String(value || '').trim()
  if (!text) return { ok: true, name: options.defaultProjectName || '' }
  const pool = Array.isArray(options.projectNames) ? options.projectNames.filter(Boolean) : []
  const key = normalizeNameKey(text)
  const exact = pool.find((name) => normalizeNameKey(name) === key)
  if (exact) return { ok: true, name: exact }
  const fuzzy = pool.find((name) => {
    const poolKey = normalizeNameKey(name)
    return poolKey.includes(key) || key.includes(poolKey)
  })
  if (!fuzzy) return { ok: false, name: '' }
  // 模糊命中时保留用户填写的名称（避免把全称改写成简称）
  return { ok: true, name: text }
}

/**
 * 解析危大工程信息登记工作簿（11 列，自动定位表头行，兼容“表头在第 1 行”的简表）
 * @param {ArrayBuffer} arrayBuffer
 * @param {{ sheetName?: string, defaultProjectName?: string, projectNames?: string[] }} options
 */
export function parseMajorWorkRegisterWorkbook(arrayBuffer, options = {}) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const sheetName = options.sheetName && wb.SheetNames.includes(options.sheetName)
    ? options.sheetName
    : wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  if (!ws) return { records: [], errors: [{ row: 0, message: '未找到可解析的工作表' }], sheetName: '' }
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })

  let headerIndex = -1
  for (let i = 0; i < rows.length; i += 1) {
    const line = rows[i] || []
    if (line.some((cell) => String(cell).includes('管理单位')) && line.some((cell) => String(cell).includes('施工单位'))) {
      headerIndex = i
      break
    }
  }
  if (headerIndex < 0) {
    return { records: [], errors: [{ row: 0, message: '未找到表头行（需包含「管理单位」「施工单位」等列名）' }], sheetName }
  }

  const header = (rows[headerIndex] || []).map((cell) => normalizeHeaderLabel(cell))
  const columnIndex = {}
  MAJOR_WORK_REGISTER_FIELDS.forEach((field) => {
    const idx = header.findIndex((label) => label === field.label)
    if (idx >= 0) columnIndex[field.key] = idx
  })
  const missing = MAJOR_WORK_REGISTER_FIELDS
    .filter((field) => columnIndex[field.key] === undefined)
    .map((field) => field.label)
  if (missing.length) {
    return { records: [], errors: [{ row: headerIndex + 1, message: `模板缺少列：${missing.join('、')}` }], sheetName }
  }

  const records = []
  const errors = []
  const requiredLabels = MAJOR_WORK_REGISTER_FIELDS.filter((field) => field.required).map((field) => field.label)

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const line = rows[i] || []
    const excelRow = i + 1
    const blank = line.every((cell) => String(cell == null ? '' : cell).trim() === '')
    if (blank) continue

    const values = {}
    MAJOR_WORK_REGISTER_FIELDS.forEach((field) => {
      values[field.key] = String(line[columnIndex[field.key]] ?? '').trim()
    })

    const rowErrors = []
    requiredLabels.forEach((label) => {
      const field = MAJOR_WORK_REGISTER_FIELDS.find((item) => item.label === label)
      if (!values[field.key]) rowErrors.push(`【${label}】不能为空`)
    })

    const startTime = normalizeDateTimeCell(values.majorStartTime)
    const endTime = normalizeDateTimeCell(values.majorEndTime)
    if (values.majorStartTime && !startTime) rowErrors.push('【作业开始时间】格式应为 yyyy-MM-dd HH:mm')
    if (values.majorEndTime && !endTime) rowErrors.push('【作业结束时间】格式应为 yyyy-MM-dd HH:mm')
    if (startTime && endTime && endTime <= startTime) rowErrors.push('【作业结束时间】必须晚于开始时间')

    ;['majorOwnerSafetyManager', 'majorContractorSafetyManager', 'majorSupervisorSafetyManager'].forEach((key) => {
      const field = MAJOR_WORK_REGISTER_FIELDS.find((item) => item.key === key)
      if (values[key] && !validateContactCell(values[key])) {
        rowErrors.push(`【${field.label}】格式应为「姓名/11位手机号」`)
      }
    })

    if (values.majorProjectCategory && !MAJOR_PROJECT_CATEGORY_OPTIONS.includes(values.majorProjectCategory)) {
      rowErrors.push(`【危大工程作业类别】须为「${MAJOR_PROJECT_CATEGORY_OPTIONS.join('、')}」之一`)
    }

    const project = resolveImportProjectName(values.projectName, options)
    if (!project.ok) rowErrors.push('【施工项目名称】不在系统项目列表中，或页面未选择项目')
    if (!values.projectName && !options.defaultProjectName) rowErrors.push('【施工项目名称】不能为空（页面未选择项目）')

    if (rowErrors.length) {
      errors.push({ row: excelRow, message: rowErrors.join('；') })
      continue
    }

    records.push({
      leadUnit: values.leadUnit || DAILY_WORK_DEFAULT_LEAD_UNIT,
      projectName: project.name,
      contractor: values.contractor,
      majorWorkContent: values.majorWorkContent,
      majorProjectCategory: values.majorProjectCategory,
      majorStartTime: startTime,
      majorEndTime: endTime,
      majorOwnerSafetyManager: values.majorOwnerSafetyManager,
      majorContractorSafetyManager: values.majorContractorSafetyManager,
      majorSupervisorSafetyManager: values.majorSupervisorSafetyManager,
      majorControlMeasures: values.majorControlMeasures,
      reportDate: startTime.slice(0, 10),
      source: 'import',
    })
  }

  return { records, errors, sheetName, total: records.length + errors.length }
}

/** 读取上传的 Excel 文件并解析危大工程信息登记数据 */
export async function parseMajorWorkRegisterFile(file, options = {}) {
  const buffer = await file.arrayBuffer()
  return parseMajorWorkRegisterWorkbook(buffer, options)
}

/** 导出危大工程信息登记（按当前筛选结果，单 Sheet 11 列）：第 1 行合并标题、第 2 行表头（浅蓝底）、第 3 行起数据 */
export async function exportMajorWorkRegisterRecords(records, options = {}) {
  const list = Array.isArray(records) ? records : []
  if (!list.length) return { ok: false, count: 0, error: '当前没有可导出的记录' }
  const dataRows = list.map((record) => majorRegisterDataRow(record))
  const blob = await buildMajorWorkRegisterXlsxBlob({ dataRows, withRequiredMark: true, title: options.title || '' })
  downloadExcelBlob(blob, options.fileName || '危大工程信息登记.xlsx')
  return { ok: true, count: list.length }
}