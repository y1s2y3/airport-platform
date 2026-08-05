import * as XLSX from 'xlsx'

const HAZARD_TYPE_OPTIONS = ['安全', '质量']
const HAZARD_LEVEL_OPTIONS = ['一般', '较大', '重大']

/**
 * 下载本周隐患清单填报模板（仅 .xlsx）
 * 列：隐患类型 / 隐患描述 / 隐患等级 / 备注
 * 必填：隐患类型、隐患描述、隐患等级
 * 下拉：隐患类型=安全/质量；隐患等级=一般/较大/重大
 */
export function downloadWeeklyHazardListTemplate() {
  const headers = ['隐患类型', '隐患描述', '隐患等级', '备注']
  const sample = ['安全', '示例：临边防护缺失，请按现场实际修改后删除本行', '一般', '']
  const blankRows = Array.from({ length: 30 }, () => ['', '', '', ''])

  const mainSheet = XLSX.utils.aoa_to_sheet([headers, sample, ...blankRows])
  mainSheet['!cols'] = [{ wch: 12 }, { wch: 48 }, { wch: 12 }, { wch: 24 }]
  mainSheet['!dataValidation'] = [
    {
      sqref: 'A2:A500',
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: '隐患类型',
      error: '请选择：安全 或 质量',
      formula1: `"${HAZARD_TYPE_OPTIONS.join(',')}"`,
      formulas: [`"${HAZARD_TYPE_OPTIONS.join(',')}"`],
    },
    {
      sqref: 'C2:C500',
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: '隐患等级',
      error: '请选择：一般、较大 或 重大',
      formula1: `"${HAZARD_LEVEL_OPTIONS.join(',')}"`,
      formulas: [`"${HAZARD_LEVEL_OPTIONS.join(',')}"`],
    },
  ]

  const enumSheet = XLSX.utils.aoa_to_sheet([
    ['字段', '可选值', '是否必填'],
    ['隐患类型', HAZARD_TYPE_OPTIONS.join(' / '), '必填（下拉）'],
    ['隐患描述', '自由文本', '必填'],
    ['隐患等级', HAZARD_LEVEL_OPTIONS.join(' / '), '必填（下拉）'],
    ['备注', '自由文本', '选填'],
    [],
    ['隐患类型枚举'],
    ...HAZARD_TYPE_OPTIONS.map((v) => [v]),
    [],
    ['隐患等级枚举'],
    ...HAZARD_LEVEL_OPTIONS.map((v) => [v]),
  ])
  enumSheet['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 14 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, mainSheet, '本周隐患清单')
  XLSX.utils.book_append_sheet(workbook, enumSheet, '填写说明')
  XLSX.writeFile(workbook, '本周隐患清单模板.xlsx')
}

export { HAZARD_TYPE_OPTIONS, HAZARD_LEVEL_OPTIONS }

const REQUIRED_HEADERS = ['隐患类型', '隐患描述', '隐患等级', '备注']

function normalizeCell(value) {
  return String(value ?? '').trim()
}

function mapHazardType(label) {
  if (label === '安全') return 'safety'
  if (label === '质量') return 'quality'
  return ''
}

function isBlankRow(cells) {
  return cells.every((cell) => !normalizeCell(cell))
}

function isSampleRow(description) {
  return /^示例[：:]/.test(description)
}

/**
 * 校验并导入本周隐患清单（.xlsx）
 * - 表头须为：隐患类型 / 隐患描述 / 隐患等级 / 备注
 * - 隐患类型：安全/质量；隐患等级：一般/较大/重大；描述必填；备注选填
 * - 空行跳过；模板示例行（描述以「示例：」开头）跳过
 * @param {File|Blob} file
 * @returns {Promise<{ ok: boolean, error?: string, hazards: Array, summary?: string }>}
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

  const header = (rows[0] || []).slice(0, 4).map(normalizeCell)
  const headerOk = REQUIRED_HEADERS.every((name, index) => header[index] === name)
  if (!headerOk) {
    const headerError = `表头格式不正确，当前为「${header.filter(Boolean).join(' / ') || '空'}」，须为：${REQUIRED_HEADERS.join(' / ')}`
    return {
      ok: false,
      error: headerError,
      errors: [headerError, '请下载清单模板后重新填报上传'],
      hazards: [],
    }
  }

  const hazards = []
  const errors = []

  for (let i = 1; i < rows.length; i += 1) {
    const rowIndex = i + 1
    const cells = (rows[i] || []).slice(0, 4)
    if (isBlankRow(cells)) continue

    const typeLabel = normalizeCell(cells[0])
    const description = normalizeCell(cells[1])
    const level = normalizeCell(cells[2])
    const remark = normalizeCell(cells[3])

    if (isSampleRow(description)) continue

    const hazardType = mapHazardType(typeLabel)
    if (!hazardType) {
      errors.push(`第 ${rowIndex} 行：隐患类型须为「安全」或「质量」`)
    }
    if (!description) {
      errors.push(`第 ${rowIndex} 行：隐患描述不能为空`)
    }
    if (!HAZARD_LEVEL_OPTIONS.includes(level)) {
      errors.push(`第 ${rowIndex} 行：隐患等级须为「一般」「较大」或「重大」`)
    }

    if (hazardType && description && HAZARD_LEVEL_OPTIONS.includes(level)) {
      hazards.push({
        hazardType,
        description,
        hazardLevel: level,
        remark,
        rectifier: '',
        hazardDeadline: '',
        acceptor: '',
        source: '清单导入',
        rectifyStatus: '待整改',
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

  return {
    ok: true,
    hazards,
    summary: `已从「${fileName}」导入 ${hazards.length} 条隐患（默认待整改）`,
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
