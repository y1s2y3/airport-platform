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
