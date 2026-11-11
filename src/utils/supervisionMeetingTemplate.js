import * as XLSX from 'xlsx'
import { buildWeeklyHazardTemplateBlob } from './weeklyHazardTemplateXlsx.js'

/** 隐患类型枚举（表格展示用文案） */
export const HAZARD_TYPE_OPTIONS = ['安全', '质量', '其他']
/** 隐患等级枚举 */
export const HAZARD_LEVEL_OPTIONS = ['一般', '较大', '重大']
/** 整改状态枚举（与监理隐患清单一致） */
export const HAZARD_RECTIFY_STATUS_OPTIONS = ['待整改', '已关闭']

/** 表格文案 → 存库值 */
export const HAZARD_TYPE_MAP = {
  安全: 'safety',
  质量: 'quality',
  其他: 'other',
}

/** 存库值 → 表格文案 */
export const HAZARD_TYPE_LABELS = {
  safety: '安全',
  quality: '质量',
  other: '其他',
  // 历史数据兼容：2026-11-11 前登记的「环境」类别仅用于展示，不再出现在下拉枚举
  environment: '环境',
}

/** 存库值 → 展示文案（兼容历史数据） */
export function hazardTypeLabelOf(value) {
  if (!value) return ''
  return HAZARD_TYPE_LABELS[value] || (value === 'quality' ? '质量' : value === 'safety' ? '安全' : String(value))
}

const TEMPLATE_HEADERS = ['*隐患类型', '*隐患描述', '*隐患等级', '*整改状态', '整改说明', '备注']
const TEMPLATE_WIDTHS = [12, 48, 12, 14, 30, 24]
const TEMPLATE_SAMPLE = ['安全', '示例：临边防护缺失，请按现场实际修改后删除本行', '一般', '待整改', '', '']
const TEMPLATE_BLANK_ROWS = 30

const README_ROWS = [
  ['字段', '可选值', '是否必填'],
  ['隐患类型', HAZARD_TYPE_OPTIONS.join(' / '), '必填（下拉）'],
  ['隐患描述', '自由文本（≤200 字）', '必填'],
  ['隐患等级', HAZARD_LEVEL_OPTIONS.join(' / '), '必填（下拉）'],
  ['整改状态', HAZARD_RECTIFY_STATUS_OPTIONS.join(' / '), '必填（下拉）'],
  ['整改说明', '自由文本', '选填（已关闭时填写复核说明）'],
  ['备注', '自由文本', '选填'],
  [],
  ['填写提示'],
  ['1. 第 1 行为表头，带 * 的列为必填；请勿修改表头文字与列顺序。'],
  ['2. 隐患类型 / 隐患等级 / 整改状态 三列均为下拉选择，请勿手工输入其它值。'],
  ['3. 示例行仅作填写参考，导入时会自动跳过；可直接覆盖或删除。'],
  ['4. 单次最多导入 500 行；同一文件内重复隐患按导入条数计入。'],
]
const README_WIDTHS = [16, 34, 26]

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

/** 生成本周隐患清单模板 blob（供下载与自检复用） */
export async function buildWeeklyHazardListTemplateBlob() {
  return buildWeeklyHazardTemplateBlob({
    headers: TEMPLATE_HEADERS,
    rows: [TEMPLATE_SAMPLE, ...Array.from({ length: TEMPLATE_BLANK_ROWS }, () => ['', '', '', '', '', ''])],
    widths: TEMPLATE_WIDTHS,
    validations: [
      {
        range: 'A2:A500',
        options: HAZARD_TYPE_OPTIONS,
        title: '隐患类型',
        error: `请从下拉列表选择：${HAZARD_TYPE_OPTIONS.join(' / ')}`,
      },
      {
        range: 'C2:C500',
        options: HAZARD_LEVEL_OPTIONS,
        title: '隐患等级',
        error: `请从下拉列表选择：${HAZARD_LEVEL_OPTIONS.join(' / ')}`,
      },
      {
        range: 'D2:D500',
        options: HAZARD_RECTIFY_STATUS_OPTIONS,
        title: '整改状态',
        error: `请从下拉列表选择：${HAZARD_RECTIFY_STATUS_OPTIONS.join(' / ')}`,
      },
    ],
    readmeRows: README_ROWS,
    readmeWidths: README_WIDTHS,
  })
}

/**
 * 下载本周隐患清单填报模板（仅 .xlsx）
 * 列：*隐患类型 / *隐患描述 / *隐患等级 / *整改状态 / 整改说明 / 备注
 * 下拉：隐患类型=安全/质量/其他；隐患等级=一般/较大/重大；整改状态=待整改/已关闭
 */
export async function downloadWeeklyHazardListTemplate() {
  const blob = await buildWeeklyHazardListTemplateBlob()
  downloadBlob(blob, '本周隐患清单模板.xlsx')
}

const REQUIRED_HEADER_NAMES = ['隐患类型', '隐患描述', '隐患等级']

function normalizeCell(value) {
  return String(value ?? '').trim()
}

/** 去掉表头前缀 *（兼容带 * 与历史不带 * 的模板） */
function normalizeHeader(value) {
  return normalizeCell(value).replace(/^[*＊\s]+/, '')
}

function mapHazardType(label) {
  return HAZARD_TYPE_MAP[label] || ''
}

function isBlankRow(cells) {
  return cells.every((cell) => !normalizeCell(cell))
}

function isSampleRow(description) {
  return /^示例[：:]/.test(description)
}

/**
 * 校验并导入本周隐患清单（.xlsx）
 * - 表头须包含：隐患类型 / 隐患描述 / 隐患等级（可选：整改状态 / 整改说明 / 备注）
 * - 隐患类型：安全/质量/其他；隐患等级：一般/较大/重大；整改状态：待整改/已关闭（缺列时默认待整改）
 * - 空行跳过；模板示例行（描述以「示例：」开头）跳过
 * @param {File|Blob} file
 * @returns {Promise<{ ok: boolean, error?: string, errors?: string[], hazards: Array, summary?: string }>}
 */
export async function importWeeklyHazardListFromFile(file) {
  if (!file) {
    return { ok: false, error: '请选择本周隐患清单文件', errors: ['请选择本周隐患清单文件'], hazards: [] }
  }
  const fileName = file.name || ''
  if (!/\.xlsx$/i.test(fileName)) {
    return { ok: false, error: '本周隐患清单仅支持 .xlsx 格式', errors: ['本周隐患清单仅支持 .xlsx 格式'], hazards: [] }
  }

  let workbook
  try {
    const buffer = await file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array' })
  } catch {
    return {
      ok: false,
      error: '文件读取失败，请确认上传的是有效 .xlsx 文件',
      errors: ['文件读取失败，请确认上传的是有效 .xlsx 文件'],
      hazards: [],
    }
  }

  const sheetName = workbook.SheetNames.includes('本周隐患清单')
    ? '本周隐患清单'
    : workbook.SheetNames[0]
  if (!sheetName) {
    return { ok: false, error: 'Excel 中未找到可用工作表', errors: ['Excel 中未找到可用工作表'], hazards: [] }
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
  if (!rows.length) {
    return {
      ok: false,
      error: '清单为空，请按模板填写后再上传',
      errors: ['清单为空，请按模板填写后再上传'],
      hazards: [],
    }
  }

  const header = (rows[0] || []).map(normalizeHeader)
  const headerIndex = {}
  header.forEach((name, index) => {
    if (name && headerIndex[name] == null) headerIndex[name] = index
  })
  const missing = REQUIRED_HEADER_NAMES.filter((name) => headerIndex[name] == null)
  if (missing.length) {
    return {
      ok: false,
      error: `表头格式不正确，缺少「${missing.join(' / ')}」列`,
      errors: [
        `表头格式不正确，当前为「${header.filter(Boolean).join(' / ') || '空'}」`,
        '须包含：隐患类型 / 隐患描述 / 隐患等级（可选：整改状态 / 整改说明 / 备注）',
        '请下载清单模板后重新填报上传',
      ],
      hazards: [],
    }
  }

  const hasStatusColumn = headerIndex['整改状态'] != null
  const col = (name) => (headerIndex[name] == null ? -1 : headerIndex[name])
  const hazards = []
  const errors = []

  for (let i = 1; i < rows.length; i += 1) {
    const rowIndex = i + 1
    const cells = rows[i] || []
    if (isBlankRow(cells)) continue

    const typeLabel = normalizeCell(cells[col('隐患类型')])
    const description = normalizeCell(cells[col('隐患描述')])
    const level = normalizeCell(cells[col('隐患等级')])
    const statusLabel = hasStatusColumn ? normalizeCell(cells[col('整改状态')]) : HAZARD_RECTIFY_STATUS_OPTIONS[0]
    const rectifyRemark = col('整改说明') >= 0 ? normalizeCell(cells[col('整改说明')]) : ''
    const remark = col('备注') >= 0 ? normalizeCell(cells[col('备注')]) : ''

    if (isSampleRow(description)) continue

    const hazardType = mapHazardType(typeLabel)
    if (!hazardType) {
      errors.push(`第 ${rowIndex} 行：隐患类型须为「${HAZARD_TYPE_OPTIONS.join('」「')}」之一`)
    }
    if (!description) {
      errors.push(`第 ${rowIndex} 行：隐患描述不能为空`)
    }
    if (!HAZARD_LEVEL_OPTIONS.includes(level)) {
      errors.push(`第 ${rowIndex} 行：隐患等级须为「${HAZARD_LEVEL_OPTIONS.join('」「')}」之一`)
    }
    if (hasStatusColumn && !HAZARD_RECTIFY_STATUS_OPTIONS.includes(statusLabel)) {
      errors.push(`第 ${rowIndex} 行：整改状态须为「${HAZARD_RECTIFY_STATUS_OPTIONS.join('」「')}」之一`)
    }

    if (hazardType && description && HAZARD_LEVEL_OPTIONS.includes(level)) {
      hazards.push({
        hazardType,
        description,
        hazardLevel: level,
        rectifyStatus: statusLabel,
        rectifyRemark,
        remark,
        rectifier: '',
        hazardDeadline: '',
        acceptor: '',
        source: '清单导入',
      })
    }
  }

  if (errors.length) {
    return {
      ok: false,
      error: `格式校验未通过，共 ${errors.length} 处问题`,
      errors,
      hazards: [],
    }
  }

  if (!hazards.length) {
    return {
      ok: false,
      error: '未识别到有效隐患行，请按模板填写隐患类型、描述、等级后再上传',
      errors: ['未识别到有效隐患行，请按模板填写隐患类型、描述、等级后再上传'],
      hazards: [],
    }
  }

  const closedCount = hazards.filter((item) => item.rectifyStatus === '已关闭').length
  return {
    ok: true,
    hazards,
    summary: `已从「${fileName}」导入 ${hazards.length} 条隐患（待整改 ${hazards.length - closedCount} 条 / 已关闭 ${closedCount} 条）`,
  }
}

const MINUTES_TEMPLATE_PATH = 'templates/监理例会纪要模板.docx'
const MINUTES_TEMPLATE_FILENAME = '监理例会纪要模板.docx'

/** @deprecated 纪要模版下载保留兼容；登记页已改为清单模板 */
export function downloadSupervisionMeetingMinutesTemplate() {
  const base = import.meta.env.BASE_URL || '/'
  const url = `${base}${MINUTES_TEMPLATE_PATH}`.replace(/\/+/g, '/').replace(':/', '://')

  const link = document.createElement('a')
  link.href = url
  link.download = MINUTES_TEMPLATE_FILENAME
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
