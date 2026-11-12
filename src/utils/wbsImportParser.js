/**
 * WBS 模板导入 · 解析与校验
 *
 * 需求变更 CR-05（PRD V1.8，2026-11-12）：
 * - 只读取第 2 个工作表「WBS导入表」（按工作表序号定位，改名不影响）
 * - 必填列（模板 * 标注）：单位工程、单位工程代号、分部工程、分部代号、分项工程、分项代号
 * - 选填列：子单位工程/代号、子分部工程/代号、检验批/代号、三级施工部位及代号
 * - 代号：单位工程代号 4 位数字、分部代号 2 位数字、分项代号 2 位数字、检验批代号英文+数字+符号 ≤20 位
 * - 选填层（子单位/子分部/检验批/施工部位）名称与代号必须成对
 * - 施工部位挂在分项下：一级需分项、二级需一级、三级需二级
 * - 完整路径（各级代号拼接）全表唯一
 */
import * as XLSX from 'xlsx'

export const WBS_IMPORT_SHEET_INDEX = 1
export const WBS_IMPORT_SHEET_NAME = 'WBS导入表'

/** 模板 18 列表头（顺序与模板一致） */
export const WBS_IMPORT_COLUMNS = [
  { key: 'unit', header: '单位工程', required: true },
  { key: 'unitCode', header: '单位工程代号', required: true },
  { key: 'subUnit', header: '子单位工程' },
  { key: 'subUnitCode', header: '子单位代号' },
  { key: 'part', header: '分部工程', required: true },
  { key: 'partCode', header: '分部代号', required: true },
  { key: 'subPart', header: '子分部工程' },
  { key: 'subPartCode', header: '子分部代号' },
  { key: 'item', header: '分项工程', required: true },
  { key: 'itemCode', header: '分项代号', required: true },
  { key: 'inspection', header: '检验批' },
  { key: 'inspectionCode', header: '检验批代号' },
  { key: 'loc1', header: '一级施工部位' },
  { key: 'loc1Code', header: '一级部位代号' },
  { key: 'loc2', header: '二级施工部位' },
  { key: 'loc2Code', header: '二级部位代号' },
  { key: 'loc3', header: '三级施工部位' },
  { key: 'loc3Code', header: '三级部位代号' },
]

/** 成对的名称/代号字段（填一个必须填另一个） */
const PAIRS = [
  ['subUnit', 'subUnitCode', '子单位工程与子单位代号'],
  ['subPart', 'subPartCode', '子分部工程与子分部代号'],
  ['inspection', 'inspectionCode', '检验批与检验批代号'],
  ['loc1', 'loc1Code', '一级施工部位与一级部位代号'],
  ['loc2', 'loc2Code', '二级施工部位与二级部位代号'],
  ['loc3', 'loc3Code', '三级施工部位与三级部位代号'],
]

const UNIT_CODE_RE = /^\d{4}$/
const PART_CODE_RE = /^\d{2}$/
const ITEM_CODE_RE = /^\d{2}$/
/** 检验批代号：英文 + 数字 + 符号，1～20 位（不允许空白/中文） */
export const INSPECTION_CODE_RE = /^[\x21-\x7E]{1,20}$/
/** 施工部位代号：沿用系统规则，英文+数字 1～10 位 */
export const LOCATION_CODE_RE = /^[A-Za-z0-9]{1,10}$/

const HEADER_STRIP_RE = /[\s*＊]/g

function cellText(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\u00a0/g, ' ').trim()
}

function normalizeHeader(value) {
  return cellText(value).replace(HEADER_STRIP_RE, '')
}

function isEmptyRow(row) {
  return row.every((v) => !cellText(v))
}

/** 解析 xlsx ArrayBuffer → { ok, fatal, errors, rows, stats } */
export function parseWbsImportFile(arrayBuffer) {
  let workbook
  try {
    workbook = XLSX.read(arrayBuffer, { type: 'array' })
  } catch {
    return { ok: false, fatal: '文件解析失败，请确认是有效的 .xlsx 文件', errors: [], rows: [], stats: null }
  }

  const sheetNames = workbook.SheetNames || []
  if (sheetNames.length <= WBS_IMPORT_SHEET_INDEX) {
    return {
      ok: false,
      fatal: '未找到第 2 个工作表「WBS导入表」，请使用《WBS导入模板.xlsx》填写后导入',
      errors: [],
      rows: [],
      stats: null,
    }
  }
  const sheet = workbook.Sheets[sheetNames[WBS_IMPORT_SHEET_INDEX]]
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '', raw: false })
  if (!matrix.length) {
    return { ok: false, fatal: '第 2 个工作表为空，未读取到可导入的 WBS 数据', errors: [], rows: [], stats: null }
  }

  // 表头匹配（去 *、去空格）
  const headerRow = matrix[0].map(normalizeHeader)
  const colIndex = {}
  const missingHeaders = []
  for (const col of WBS_IMPORT_COLUMNS) {
    const header = normalizeHeader(col.header)
    const idx = headerRow.indexOf(header)
    if (idx === -1) missingHeaders.push(col.header)
    colIndex[col.key] = idx
  }
  if (missingHeaders.length) {
    return {
      ok: false,
      fatal: `第 2 个工作表表头与模板不一致，缺少：${missingHeaders.join('、')}`,
      errors: [],
      rows: [],
      stats: null,
    }
  }

  const errors = []
  const rows = []
  const seenPaths = new Map()
  let dataRowCount = 0

  for (let r = 1; r < matrix.length; r += 1) {
    const raw = matrix[r] || []
    if (isEmptyRow(raw)) continue
    dataRowCount += 1
    const rowNo = r + 1 // Excel 行号
    const value = (key) => cellText(raw[colIndex[key]])
    const item = {
      rowNo,
      unit: value('unit'),
      unitCode: value('unitCode'),
      subUnit: value('subUnit'),
      subUnitCode: value('subUnitCode'),
      part: value('part'),
      partCode: value('partCode'),
      subPart: value('subPart'),
      subPartCode: value('subPartCode'),
      item: value('item'),
      itemCode: value('itemCode'),
      inspection: value('inspection'),
      inspectionCode: value('inspectionCode'),
      loc1: value('loc1'),
      loc1Code: value('loc1Code'),
      loc2: value('loc2'),
      loc2Code: value('loc2Code'),
      loc3: value('loc3'),
      loc3Code: value('loc3Code'),
    }
    const pushError = (column, message) => errors.push({ rowNo, column, message })

    // 1) 必填非空
    for (const col of WBS_IMPORT_COLUMNS) {
      if (!col.required) continue
      if (!item[col.key]) pushError(col.header, '必填项不能为空')
    }
    // 2) 代号格式
    if (item.unitCode && !UNIT_CODE_RE.test(item.unitCode)) {
      pushError('单位工程代号', '须为 4 位数字')
    }
    if (item.subUnitCode && !UNIT_CODE_RE.test(item.subUnitCode)) {
      pushError('子单位代号', '须为 4 位数字')
    }
    if (item.partCode && !PART_CODE_RE.test(item.partCode)) {
      pushError('分部代号', '须为 2 位数字')
    }
    if (item.subPartCode && !PART_CODE_RE.test(item.subPartCode)) {
      pushError('子分部代号', '须为 2 位数字')
    }
    if (item.itemCode && !ITEM_CODE_RE.test(item.itemCode)) {
      pushError('分项代号', '须为 2 位数字')
    }
    if (item.inspectionCode && !INSPECTION_CODE_RE.test(item.inspectionCode)) {
      pushError('检验批代号', '须为英文、数字或符号，最多 20 位')
    }
    for (const key of ['loc1Code', 'loc2Code', 'loc3Code']) {
      if (item[key] && !LOCATION_CODE_RE.test(item[key])) {
        const label = WBS_IMPORT_COLUMNS.find((c) => c.key === key)?.header || key
        pushError(label, '须为英文或数字，最多 10 位')
      }
    }
    // 3) 成对校验
    for (const [nameKey, codeKey, label] of PAIRS) {
      if (Boolean(item[nameKey]) !== Boolean(item[codeKey])) {
        pushError(label, '名称与代号必须成对填写')
      }
    }
    // 4) 施工部位上级存在
    if (item.loc2 && !item.loc1) pushError('二级施工部位', '请先填写一级施工部位')
    if (item.loc3 && !item.loc2) pushError('三级施工部位', '请先填写二级施工部位')
    if (item.loc1 && !item.item) pushError('一级施工部位', '请先填写分项工程')
    // 5) 路径唯一
    const pathKey = [
      item.unitCode,
      item.subUnitCode,
      item.partCode,
      item.subPartCode,
      item.itemCode,
      item.inspectionCode,
      item.loc1Code,
      item.loc2Code,
      item.loc3Code,
    ].join('|')
    if (pathKey.replace(/\|/g, '')) {
      if (seenPaths.has(pathKey)) {
        pushError('整体', `与第 ${seenPaths.get(pathKey)} 行路径重复`)
      } else {
        seenPaths.set(pathKey, rowNo)
      }
    }
    item.pathKey = pathKey
    rows.push(item)
  }

  if (!rows.length) {
    return { ok: false, fatal: '未读取到可导入的 WBS 数据', errors, rows: [], stats: { totalRows: 0, validRows: 0, errorCount: errors.length } }
  }

  return {
    ok: errors.length === 0,
    fatal: '',
    errors,
    rows,
    stats: { totalRows: dataRowCount, validRows: errors.length === 0 ? rows.length : 0, errorCount: errors.length },
  }
}
