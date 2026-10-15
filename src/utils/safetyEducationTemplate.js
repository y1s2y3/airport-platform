import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { educationTypeLabels, educationTypeChoices, educationQualifiedOptions } from '../mock/laborRealName.js'

/**
 * 三级安全教育记录导入模板（仅 .xlsx）
 * 列：姓名 / 身份证号 / 手机号 / 培训类型 / 培训日期 / 培训时长 / 是否合格
 * 下拉：培训类型=三级教育/岗前培训/专项培训；是否合格=是/否（模板填中文，落库转英文编码）
 * 枚举与编码单一来源：src/mock/laborRealName.js
 * 注：SheetJS 社区版不写 dataValidation，故用 JSZip 注入下拉校验（Excel 打开即为下拉选项）
 */
export const SAFETY_EDUCATION_TEMPLATE_HEADERS = [
  '姓名',
  '身份证号',
  '手机号',
  '培训类型',
  '培训日期',
  '培训时长',
  '是否合格',
]

export const SAFETY_EDUCATION_TEMPLATE_FILE_NAME = '安全教育记录导入模板.xlsx'

/** 单次导入行数上限（含被跳过的行） */
export const SAFETY_EDUCATION_MAX_ROWS = 500

const SHEET_NAME = '安全教育记录'
const SAMPLE_NAME = '示例：张三'
const MAIN_SHEET_XML_PATH = 'xl/worksheets/sheet1.xml'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** 模板下拉校验（列区间 + 枚举）；下拉区间与单次导入行数上限一致 */
const LIST_VALIDATIONS = [
  { sqref: `D2:D${SAFETY_EDUCATION_MAX_ROWS}`, title: '培训类型', options: educationTypeLabels },
  { sqref: `G2:G${SAFETY_EDUCATION_MAX_ROWS}`, title: '是否合格', options: educationQualifiedOptions },
]

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildDataValidationsXml() {
  const items = LIST_VALIDATIONS.map((item) => {
    const formula = `"${item.options.join(',')}"`
    return `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="${escapeXml(item.title)}" error="请选择：${escapeXml(item.options.join('、'))}" sqref="${item.sqref}"><formula1>${escapeXml(formula)}</formula1></dataValidation>`
  }).join('')
  return `<dataValidations count="${LIST_VALIDATIONS.length}">${items}</dataValidations>`
}

/** 生成模板 Blob（含两个 Sheet 与下拉校验） */
export async function buildSafetyEducationTemplateBlob() {
  const sample = [SAMPLE_NAME, '440300199001011234', '13800000000', '三级教育', '2026-01-06', '8小时', '是']
  const blankRows = Array.from({ length: 30 }, () => ['', '', '', '', '', '', ''])

  const mainSheet = XLSX.utils.aoa_to_sheet([SAFETY_EDUCATION_TEMPLATE_HEADERS, sample, ...blankRows])
  mainSheet['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }]

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ['字段', '必填', '填写要求'],
    ['姓名', '必填', '须与人员实名制台账中的姓名完全一致'],
    ['身份证号', '必填', '15 位或 18 位；须与系统证件号一致（已脱敏含 * 时仅作提示、不校验）'],
    ['手机号', '选填', '11 位数字；与系统手机号不一致时该行提示差异，不影响导入'],
    ['培训类型', '必填', `下拉：${educationTypeLabels.join(' / ')}`],
    ['培训日期', '必填', '格式 YYYY-MM-DD，如 2026-01-06'],
    ['培训时长', '选填', '如 8小时'],
    ['是否合格', '必填', `下拉：${educationQualifiedOptions.join(' / ')}`],
    [],
    ['单次导入行数上限', `${SAFETY_EDUCATION_MAX_ROWS} 行`, '含被跳过的行；超出整单不导入'],
    [],
    ['培训类型（界面）', '库表存储编码'],
    ...educationTypeChoices.map((item) => [item.label, item.value]),
    [],
    ['是否合格（界面）', '库表存储值'],
    ['是', 'true'],
    ['否', 'false'],
  ])
  guideSheet['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 56 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, mainSheet, SHEET_NAME)
  XLSX.utils.book_append_sheet(workbook, guideSheet, '填写说明')

  const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const zip = await JSZip.loadAsync(arrayBuffer)
  const sheetXml = await zip.file(MAIN_SHEET_XML_PATH).async('string')
  zip.file(MAIN_SHEET_XML_PATH, sheetXml.replace('</sheetData>', `</sheetData>${buildDataValidationsXml()}`))
  return zip.generateAsync({ type: 'blob', mimeType: XLSX_MIME })
}

function saveBlob(blob, fileName) {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 下载安全教育记录导入模板 */
export async function downloadSafetyEducationTemplate() {
  const blob = await buildSafetyEducationTemplateBlob()
  saveBlob(blob, SAFETY_EDUCATION_TEMPLATE_FILE_NAME)
  return blob
}

function normalizeCell(value) {
  if (value instanceof Date) return value
  return String(value ?? '').trim()
}

function pad2(num) {
  return String(num).padStart(2, '0')
}

function buildDate(year, month, day) {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return ''
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ''
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** 兼容 Excel 日期单元格（Date / 日期序列号）与常见文本格式，统一为 YYYY-MM-DD */
export function normalizeEducationDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return buildDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate())
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeEducationDate(String(Math.trunc(value)))
  }
  const text = String(value ?? '').trim()
  if (!text) return ''

  const cn = text.match(/^(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})\s*日?$/)
  if (cn) return buildDate(Number(cn[1]), Number(cn[2]), Number(cn[3]))

  const short = text.match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{2}|\d{4})$/)
  if (short) {
    let year = Number(short[3])
    if (year < 100) year += year >= 70 ? 1900 : 2000
    return buildDate(year, Number(short[1]), Number(short[2]))
  }

  // 无日期格式的单元格：Excel 日期序列号（1900 日期系统）
  if (/^\d{5}$/.test(text)) {
    const serial = Number(text)
    if (serial > 20000 && serial < 80000) {
      const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
      return buildDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
    }
  }
  return ''
}

const ID_CARD_PATTERN = /^(\d{15}|\d{17}[\dXx])$/
const PHONE_PATTERN = /^\d{11}$/

/**
 * 解析并校验三级安全教育记录 .xlsx
 * - 表头必须为 7 列固定顺序，否则整单拒绝
 * - 空行、模板示例行跳过；行内错误按行返回（由调用方跳过该行、其余继续导入）
 * @param {File|Blob} file
 * @returns {Promise<{ ok: boolean, error?: string, errors: string[], rows: Array, rowErrors: Array }>}
 */
export async function parseSafetyEducationFile(file) {
  if (!file) {
    return { ok: false, error: '请选择安全教育记录文件', errors: ['请选择安全教育记录文件'], rows: [], rowErrors: [] }
  }
  const fileName = file.name || ''
  if (!/\.xlsx$/i.test(fileName)) {
    return { ok: false, error: '安全教育记录仅支持 .xlsx 格式', errors: ['安全教育记录仅支持 .xlsx 格式'], rows: [], rowErrors: [] }
  }

  let workbook
  try {
    const buffer = await file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array', raw: false, defval: '' })
  } catch {
    const msg = '文件读取失败，请确认上传的是有效 .xlsx 文件'
    return { ok: false, error: msg, errors: [msg], rows: [], rowErrors: [] }
  }

  const sheetName = workbook.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : workbook.SheetNames[0]
  if (!sheetName) {
    const msg = 'Excel 中未找到可用工作表'
    return { ok: false, error: msg, errors: [msg], rows: [], rowErrors: [] }
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false })
  if (!rawRows.length) {
    const msg = '文件内容为空，请按模板填写后再上传'
    return { ok: false, error: msg, errors: [msg], rows: [], rowErrors: [] }
  }

  const header = (rawRows[0] || []).slice(0, SAFETY_EDUCATION_TEMPLATE_HEADERS.length).map(normalizeCell)
  const headerOk = SAFETY_EDUCATION_TEMPLATE_HEADERS.every((name, index) => header[index] === name)
  if (!headerOk) {
    const msg = `表头格式不正确，当前为「${header.filter(Boolean).join(' / ') || '空'}」，须为：${SAFETY_EDUCATION_TEMPLATE_HEADERS.join(' / ')}`
    return { ok: false, error: msg, errors: [msg, '请下载导入模板后重新填报上传'], rows: [], rowErrors: [] }
  }

  const rows = []
  const rowErrors = []
  let dataRowCount = 0

  for (let i = 1; i < rawRows.length; i += 1) {
    const rowIndex = i + 1
    const cells = (rawRows[i] || []).slice(0, SAFETY_EDUCATION_TEMPLATE_HEADERS.length).map(normalizeCell)
    if (cells.every((cell) => !String(cell ?? '').trim())) continue

    const [name, idNumber, phone, educationType, trainDate, duration, passedLabel] = cells.map((cell) =>
      String(cell ?? '').trim(),
    )
    if (/^示例/.test(name)) continue

    dataRowCount += 1
    if (dataRowCount > SAFETY_EDUCATION_MAX_ROWS) {
      const msg = `单次导入不超过 ${SAFETY_EDUCATION_MAX_ROWS} 行，当前文件共 ${dataRowCount} 行以上，请拆分后分批导入`
      return { ok: false, error: msg, errors: [msg], rows: [], rowErrors: [] }
    }

    const reasons = []
    if (!name) reasons.push('姓名不能为空')

    const idPlain = idNumber.replace(/\s/g, '')
    if (!idPlain) {
      reasons.push('身份证号不能为空')
    } else if (!idPlain.includes('*') && !ID_CARD_PATTERN.test(idPlain)) {
      reasons.push('身份证号须为 15 位或 18 位（已脱敏含 * 时可不校验位数）')
    }

    if (phone && !PHONE_PATTERN.test(phone.replace(/\s/g, ''))) reasons.push('手机号须为 11 位数字')

    if (!educationType) {
      reasons.push('培训类型不能为空')
    } else if (!educationTypeLabels.includes(educationType)) {
      reasons.push(`培训类型须为「${educationTypeLabels.join('」「')}」`)
    }

    const normalizedDate = normalizeEducationDate(trainDate)
    if (!trainDate) {
      reasons.push('培训日期不能为空')
    } else if (!normalizedDate) {
      reasons.push('培训日期格式须为 YYYY-MM-DD')
    }

    if (!passedLabel) {
      reasons.push('是否合格不能为空')
    } else if (!educationQualifiedOptions.includes(passedLabel)) {
      reasons.push(`是否合格须填「${educationQualifiedOptions.join('」或「')}」`)
    }

    if (reasons.length) {
      rowErrors.push({ rowIndex, reason: reasons.join('；') })
      continue
    }

    rows.push({
      rowIndex,
      name,
      idNumber: idPlain,
      phone: phone.replace(/\s/g, ''),
      educationType,
      trainDate: normalizedDate,
      duration,
      passed: passedLabel === '是',
    })
  }

  if (!rows.length && !rowErrors.length) {
    const msg = '未识别到有效记录行，请按模板填写姓名、身份证号、培训类型、培训日期、是否合格后再上传'
    return { ok: false, error: msg, errors: [msg], rows: [], rowErrors: [] }
  }

  return { ok: true, errors: [], rows, rowErrors }
}
