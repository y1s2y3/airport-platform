import * as XLSX from 'xlsx'
import {
  createEmptyPersonnel,
  savePersonnel,
  lookupCreditCode,
  lookupUnitType,
  workTypeOptions,
  unitTypeOptions,
  personnelCategoryOptions,
  genderOptions,
} from '../mock/laborRealName'
import { REALNAME_ENTRY_STATUS } from '../constants/laborPersonStatus'
import { appendOperationLog } from '../mock/systemLogs'

/** 模板表头（第 1 行） */
export const PERSONNEL_IMPORT_HEADERS = [
  '姓名',
  '手机号码',
  '证件号码',
  '性别',
  '工种/职务',
  '参建单位名称',
  '参建单位类型',
  '所属班组',
  '人员类别',
  '入退场状态',
]

const HEADER_ALIASES = {
  姓名: 'name',
  手机号码: 'phone',
  手机号: 'phone',
  证件号码: 'idNumber',
  身份证号: 'idNumber',
  性别: 'gender',
  '工种/职务': 'workType',
  工种: 'workType',
  参建单位名称: 'unitName',
  参建单位: 'unitName',
  参建单位类型: 'unitType',
  所属班组: 'team',
  班组: 'team',
  人员类别: 'personnelCategory',
  入退场状态: 'entryStatus',
  入场状态: 'entryStatus',
}

function cellText(value) {
  if (value == null) return ''
  return String(value).trim()
}

function normalizeHeader(text) {
  return cellText(text).replace(/\*/g, '').trim()
}

function parseEntryStatus(text) {
  const val = cellText(text)
  if (!val || val === '已入场') return REALNAME_ENTRY_STATUS.ENTERED
  if (val === '已退场') return REALNAME_ENTRY_STATUS.EXITED
  return val
}

function validateRow(row, index, existingIdCards, existingPhones) {
  const errors = []
  const line = index + 2

  if (!row.name) errors.push(`第 ${line} 行：姓名不能为空`)
  if (!row.phone) errors.push(`第 ${line} 行：手机号码不能为空`)
  else if (!/^1\d{10}$/.test(row.phone)) errors.push(`第 ${line} 行：手机号码格式不正确`)

  if (!row.idNumber) errors.push(`第 ${line} 行：证件号码不能为空`)
  else if (!/(^\d{15}$)|(^\d{17}[\dXx]$)/.test(row.idNumber)) {
    errors.push(`第 ${line} 行：证件号码格式不正确`)
  } else if (existingIdCards.has(row.idNumber)) {
    errors.push(`第 ${line} 行：证件号码 ${row.idNumber} 已在当前项目中存在`)
  }

  if (row.phone && existingPhones.has(row.phone)) {
    errors.push(`第 ${line} 行：手机号码 ${row.phone} 已在当前项目中存在`)
  }

  if (row.gender && !genderOptions.includes(row.gender)) {
    errors.push(`第 ${line} 行：性别应为「男」或「女」`)
  }

  if (row.workType && !workTypeOptions.includes(row.workType)) {
    errors.push(`第 ${line} 行：工种/职务「${row.workType}」不在可选范围内`)
  }

  if (row.unitType && !unitTypeOptions.includes(row.unitType)) {
    errors.push(`第 ${line} 行：参建单位类型「${row.unitType}」不在可选范围内`)
  }

  if (row.personnelCategory && !personnelCategoryOptions.includes(row.personnelCategory)) {
    errors.push(`第 ${line} 行：人员类别「${row.personnelCategory}」不在可选范围内`)
  }

  const entryStatus = parseEntryStatus(row.entryStatus)
  if (![REALNAME_ENTRY_STATUS.ENTERED, REALNAME_ENTRY_STATUS.EXITED].includes(entryStatus)) {
    errors.push(`第 ${line} 行：入退场状态应为「已入场」或「已退场」`)
  }

  return errors
}

function mapSheetRow(headerKeys, row) {
  const obj = {}
  headerKeys.forEach((key, idx) => {
    if (!key) return
    obj[key] = cellText(row[idx])
  })
  return obj
}

function buildHeaderKeys(headerRow) {
  return headerRow.map((cell) => HEADER_ALIASES[normalizeHeader(cell)] || null)
}

function rowToPreview(row, index) {
  const entryStatus = parseEntryStatus(row.entryStatus)
  return {
    _index: index + 1,
    name: row.name,
    phone: row.phone,
    idNumber: row.idNumber,
    gender: row.gender || '男',
    workType: row.workType || '—',
    unitName: row.unitName || '—',
    unitType: row.unitType || '—',
    team: row.team || '—',
    personnelCategory: row.personnelCategory || '劳务人员',
    entryStatus: entryStatus === REALNAME_ENTRY_STATUS.EXITED ? '已退场' : '已入场',
  }
}

export function parsePersonnelImportWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames?.[0]
  if (!sheetName) throw new Error('Excel 文件中没有工作表')

  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
  if (rows.length < 2) throw new Error('模板至少需要表头行和一行数据')

  const headerKeys = buildHeaderKeys(rows[0])
  if (!headerKeys.includes('name') || !headerKeys.includes('phone') || !headerKeys.includes('idNumber')) {
    throw new Error('表头缺少必填列：姓名、手机号码、证件号码')
  }

  const dataRows = []
  rows.slice(1).forEach((row, idx) => {
    const mapped = mapSheetRow(headerKeys, row)
    if (!Object.values(mapped).some(Boolean)) return
    dataRows.push({ ...mapped, _rowIndex: idx })
  })

  if (!dataRows.length) throw new Error('未解析到有效数据行')

  return { sheetName, rows: dataRows }
}

export async function parsePersonnelImportFile(file) {
  const buffer = await file.arrayBuffer()
  return parsePersonnelImportWorkbook(buffer)
}

export function validatePersonnelImportRows(projectId, rows, existingList = []) {
  const existingIdCards = new Set(
    existingList.map((item) => item.basic.idNumberRaw || item.basic.idNumber).filter(Boolean),
  )
  const existingPhones = new Set(existingList.map((item) => item.basic.phone).filter(Boolean))
  const errors = []
  const validRows = []

  rows.forEach((row, index) => {
    const rowErrors = validateRow(row, row._rowIndex ?? index, existingIdCards, existingPhones)
    if (rowErrors.length) {
      errors.push(...rowErrors)
      return
    }
    existingIdCards.add(row.idNumber)
    existingPhones.add(row.phone)
    validRows.push(row)
  })

  return {
    preview: validRows.map((row, index) => rowToPreview(row, index)),
    validRows,
    errors,
  }
}

function rowToPersonnel(projectId, row) {
  const personnel = createEmptyPersonnel(projectId)
  const unitName = row.unitName || ''
  personnel.basic.name = row.name
  personnel.basic.phone = row.phone
  personnel.basic.idNumberRaw = row.idNumber
  personnel.basic.idNumber = row.idNumber
  personnel.basic.gender = row.gender || '男'
  personnel.unit.workType = row.workType || '普工'
  personnel.unit.unitName = unitName
  personnel.unit.creditCode = unitName ? lookupCreditCode(unitName) : ''
  personnel.unit.unitType = row.unitType || (unitName ? lookupUnitType(unitName) : '劳务分包')
  personnel.unit.team = row.team || ''
  personnel.unit.personnelCategory = row.personnelCategory || '劳务人员'
  personnel.entryStatus = parseEntryStatus(row.entryStatus)
  personnel.isSpecial = personnel.unit.personnelCategory === '特种作业人员'
  return personnel
}

export function importPersonnelRows(projectId, rows, projectLabel = '') {
  const imported = []
  rows.forEach((row) => {
    imported.push(savePersonnel(rowToPersonnel(projectId, row), 'create'))
  })

  appendOperationLog({
    module: '安全管理',
    type: '导入',
    content: `批量导入人员实名制：${projectLabel || projectId}，共 ${imported.length} 人`,
    requestUrl: `/api/safety/labor/realname/import`,
  })

  return imported
}

export function downloadPersonnelImportTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    PERSONNEL_IMPORT_HEADERS,
    ['张三', '13800138000', '440300199001011234', '男', '钢筋工', '中建三局第一建设工程有限责任公司', '劳务分包', '钢筋一班', '劳务人员', '已入场'],
    ['李四', '13900139000', '440300199002021234', '男', '电工', '广东省建筑工程集团有限公司', '单位分包', '机电班组', '特种作业人员', '已入场'],
  ])
  ws['!cols'] = PERSONNEL_IMPORT_HEADERS.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '人员导入模板')
  XLSX.writeFile(wb, '人员实名制导入模板.xlsx')
}
