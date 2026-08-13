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
  ensureSpecialWorkTypePrefix,
  normalizePersonnelCategory,
  isSpecialByWorkType,
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
  '工人类型',
  '在岗状态',
]

/** 表头 → 中间行键（与 PRD 实体字段 snake_case 一致） */
const HEADER_ALIASES = {
  姓名: 'name',
  手机号码: 'phone',
  手机号: 'phone',
  证件号码: 'id_number',
  身份证号: 'id_number',
  性别: 'gender',
  '工种/职务': 'work_type',
  工种: 'work_type',
  参建单位名称: 'unit_name',
  参建单位: 'unit_name',
  参建单位类型: 'unit_type',
  所属班组: 'team',
  班组: 'team',
  工人类型: 'personnel_category',
  人员类别: 'personnel_category',
  在岗状态: 'entry_status',
  入退场状态: 'entry_status',
  入场状态: 'entry_status',
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
  if (!val || val === '在岗' || val === '已入场') return REALNAME_ENTRY_STATUS.ENTERED
  if (val === '离场' || val === '已退场') return REALNAME_ENTRY_STATUS.EXITED
  return val
}

function validateRow(row, index, existingIdCards, existingPhones) {
  const errors = []
  const line = index + 2

  if (!row.name) errors.push(`第 ${line} 行：姓名不能为空`)
  if (!row.phone) errors.push(`第 ${line} 行：手机号码不能为空`)
  else if (!/^1\d{10}$/.test(row.phone)) errors.push(`第 ${line} 行：手机号码格式不正确`)

  if (!row.id_number) errors.push(`第 ${line} 行：证件号码不能为空`)
  else if (!/(^\d{15}$)|(^\d{17}[\dXx]$)/.test(row.id_number)) {
    errors.push(`第 ${line} 行：证件号码格式不正确`)
  } else if (existingIdCards.has(row.id_number)) {
    errors.push(`第 ${line} 行：证件号码 ${row.id_number} 已在当前项目中存在`)
  }

  if (row.phone && existingPhones.has(row.phone)) {
    errors.push(`第 ${line} 行：手机号码 ${row.phone} 已在当前项目中存在`)
  }

  if (row.gender && !genderOptions.includes(row.gender)) {
    errors.push(`第 ${line} 行：性别应为「男」或「女」`)
  }

  if (row.work_type && !workTypeOptions.includes(row.work_type)) {
    errors.push(`第 ${line} 行：工种/职务「${row.work_type}」不在可选范围内`)
  }

  if (row.unit_type && !unitTypeOptions.includes(row.unit_type)) {
    errors.push(`第 ${line} 行：参建单位类型「${row.unit_type}」不在可选范围内`)
  }

  if (row.personnel_category) {
    const allowed = [...personnelCategoryOptions, '劳务人员', '特种作业人员']
    if (!allowed.includes(row.personnel_category)) {
      errors.push(`第 ${line} 行：工人类型「${row.personnel_category}」不在可选范围内（管理人员 / 建筑工人）`)
    }
  }

  const entry_status = parseEntryStatus(row.entry_status)
  if (![REALNAME_ENTRY_STATUS.ENTERED, REALNAME_ENTRY_STATUS.EXITED].includes(entry_status)) {
    errors.push(`第 ${line} 行：在岗状态应为「在岗」或「离场」`)
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
  const entry_status = parseEntryStatus(row.entry_status)
  return {
    _index: index + 1,
    name: row.name,
    phone: row.phone,
    id_number: row.id_number,
    gender: row.gender || '男',
    work_type: row.work_type || '—',
    unit_name: row.unit_name || '—',
    unit_type: row.unit_type || '—',
    team: row.team || '—',
    personnel_category: normalizePersonnelCategory(row.personnel_category || '建筑工人'),
    entry_status: entry_status === REALNAME_ENTRY_STATUS.EXITED ? '离场' : '在岗',
  }
}

export function parsePersonnelImportWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames?.[0]
  if (!sheetName) throw new Error('Excel 文件中没有工作表')

  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
  if (rows.length < 2) throw new Error('模板至少需要表头行和一行数据')

  const headerKeys = buildHeaderKeys(rows[0])
  if (!headerKeys.includes('name') || !headerKeys.includes('phone') || !headerKeys.includes('id_number')) {
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

export function validatePersonnelImportRows(project_id, rows, existingList = []) {
  const existingIdCards = new Set(
    existingList.map((item) => item.basic.id_number_raw || item.basic.id_number).filter(Boolean),
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
    existingIdCards.add(row.id_number)
    existingPhones.add(row.phone)
    validRows.push(row)
  })

  return {
    preview: validRows.map((row, index) => rowToPreview(row, index)),
    validRows,
    errors,
  }
}

function rowToPersonnel(project_id, row) {
  const personnel = createEmptyPersonnel(project_id)
  const unit_name = row.unit_name || ''
  personnel.basic.name = row.name
  personnel.basic.phone = row.phone
  personnel.basic.id_number_raw = row.id_number
  personnel.basic.id_number = row.id_number
  personnel.basic.gender = row.gender || '男'
  personnel.unit.unit_name = unit_name
  personnel.unit.credit_code = unit_name ? lookupCreditCode(unit_name) : ''
  personnel.unit.unit_type = row.unit_type || (unit_name ? lookupUnitType(unit_name) : '劳务分包')
  personnel.unit.team = row.team || ''
  personnel.unit.personnel_category = normalizePersonnelCategory(row.personnel_category || '建筑工人')
  personnel.entry_status = parseEntryStatus(row.entry_status)
  const work_type = row.work_type || '普工'
  // 导入：工种以「特种-」开头，或历史「特种作业人员」类别，均识别为特种
  const treatAsSpecial =
    isSpecialByWorkType(work_type) || row.personnel_category === '特种作业人员'
  personnel.unit.work_type = ensureSpecialWorkTypePrefix(work_type, treatAsSpecial)
  personnel.is_special = isSpecialByWorkType(personnel.unit.work_type)
  return personnel
}

export function importPersonnelRows(project_id, rows, projectLabel = '') {
  const imported = []
  rows.forEach((row) => {
    imported.push(savePersonnel(rowToPersonnel(project_id, row), 'create'))
  })

  appendOperationLog({
    module: '人员实名制管理',
    type: '导入',
    content: `批量导入人员实名制：${projectLabel || project_id}，共 ${imported.length} 人`,
    requestUrl: `/api/labor/realname/import`,
  })

  return imported
}

export function downloadPersonnelImportTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    PERSONNEL_IMPORT_HEADERS,
    ['张三', '13800138000', '440300199001011234', '男', '钢筋工', '中建三局第一建设工程有限责任公司', '劳务分包', '钢筋一班', '建筑工人', '在岗'],
    ['李四', '13900139000', '440300199002021234', '男', '特种-电工', '广东省建筑工程集团有限公司', '单位分包', '机电班组', '建筑工人', '在岗'],
  ])
  ws['!cols'] = PERSONNEL_IMPORT_HEADERS.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '人员导入模板')
  XLSX.writeFile(wb, '人员实名制导入模板.xlsx')
}
