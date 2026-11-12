import JSZip from 'jszip'
import { DANGER_WORK_FIELDS, MAJOR_WORK_REGISTER_FIELDS } from '../config/dailyWorkSchema.js'
import { buildDailyWorkExportPlan } from './dailyWorkExport.js'

const TEMPLATE_URL = new URL('../../assets/daily-work-templates/export-plans.xlsx', import.meta.url).href
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const TEMPLATE_SHEET_NUMBERS = { night: 1, danger: 2, major: 3 }
const COLUMNS = DANGER_WORK_FIELDS.map(field => field.key)
const MAJOR_COLUMNS = MAJOR_WORK_REGISTER_FIELDS.map(field => field.key)
const COLUMN_WIDTHS = [9, 20, 30, 25, 20, 30, 20, 22, 22, 28, 28, 28, 28, 28, 28, 40]
const MAJOR_COLUMN_WIDTHS = [9, 20, 30, 25, 20, 30, 20, 22, 28, 28, 28, 28]
const column = index => String.fromCharCode(65 + index)
const escapeXml = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/_x([0-9a-f]{4})_/gi, '_x005F_x$1_')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/\r/g, '&#13;')

function sharedStrings(xml) {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(match => match[1])
}

/** 移除未使用示例数据，同时保留所选模板单元格中的富文本和格式。 */
function inlineTemplateStrings(xml, strings) {
  return xml.replace(/<c\b([^>]*\bt="s"[^>]*)>([\s\S]*?)<\/c>/g, (all, attributes, content) => {
    const index = Number(content.match(/<v>(\d+)<\/v>/)?.[1])
    if (!Number.isInteger(index) || strings[index] == null) throw new Error('导出模板文字无效，请联系管理员')
    return `<c${attributes.replace(/\bt="s"/, 't="inlineStr"')}><is>${strings[index]}</is></c>`
  })
}

function templateRow(xml, index) {
  const row = xml.match(new RegExp(`<row\\b[^>]*\\br="${index}"[^>]*>[\\s\\S]*?<\\/row>`))?.[0]
  if (!row) throw new Error('导出模板表格结构无效，请联系管理员')
  return row
}

function rowStyles(row, count = 16) {
  const cells = [...row.matchAll(/<c\b([^>]*)(?:\/>|>[\s\S]*?<\/c>)/g)]
  return Array.from({ length: count }, (_, index) => {
    const attributes = cells.find(cell => cell[1].match(/\br="([A-Z]+)\d+"/)?.[1] === column(index))?.[1]
    return Number(attributes?.match(/\bs="(\d+)"/)?.[1] || 0)
  })
}

function cell(value, ref, style, numeric = false) {
  if (value == null || value === '') return `<c r="${ref}" s="${style}"/>`
  return numeric ? `<c r="${ref}" s="${style}"><v>${value}</v></c>`
    : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

function rowXml(values, index, styles, height = 100) {
  return `<row r="${index}" ht="${height}" customHeight="1" spans="1:${styles.length}">${styles.map((style, col) => cell(values[col], column(col) + index, style, col === 0 && typeof values[col] === 'number')).join('')}</row>`
}

function rowHeight(values, widths) {
  const lines = values.map((value, index) => String(value ?? '').split(/\r\n|\r|\n/).reduce((total, line) => {
    const width = [...line].reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 2 : 1), 0)
    return total + Math.max(1, Math.ceil(width / (widths[index] * 0.85)))
  }, 0))
  return Math.min(409.5, Math.max(100, Math.max(...lines) * 17 + 12))
}

function renderWorkSheet(source, sheet, strings) {
  const columns = sheet.key === 'major' ? MAJOR_COLUMNS : COLUMNS
  const widths = sheet.key === 'major' ? MAJOR_COLUMN_WIDTHS : COLUMN_WIDTHS
  const count = columns.length + 1, lastColumn = column(count - 1)
  const titleStyles = rowStyles(templateRow(source, 1), count)
  const bodyStyles = rowStyles(templateRow(source, 3), count)
  const rows = [rowXml([sheet.title], 1, titleStyles), inlineTemplateStrings(templateRow(source, 2), strings)]
  const merges = [`A1:${lastColumn}1`]
  let rowIndex = 3
  sheet.groups.forEach((group, groupIndex) => {
    const start = rowIndex, end = start + group.rows.length - 1
    const sameLeadUnit = group.rows.every(record => record.leadUnit === group.rows[0].leadUnit)
    if (end > start) {
      merges.push(`A${start}:A${end}`, `C${start}:C${end}`)
      if (sameLeadUnit) merges.push(`B${start}:B${end}`)
    }
    group.rows.forEach((record, index) => {
      const values = [index === 0 ? groupIndex + 1 : '', ...columns.map(key => record[key] ?? '')]
      if (index > 0) {
        values[2] = '' // 项目名称由合并单元格的首格表示，其余业务字段逐行保留。
        if (sameLeadUnit) values[1] = ''
      }
      rows.push(rowXml(values, rowIndex++, bodyStyles, rowHeight(values, widths)))
    })
  })
  const lastDataRow = Math.max(2, rowIndex - 1)
  if (sheet.summary != null) {
    const footerStyles = rowStyles(templateRow(source, 11), count)
    rows.push(rowXml([sheet.summary], rowIndex++, footerStyles))
    merges.push(`A${rowIndex - 1}:${lastColumn}${rowIndex - 1}`)
  }
  const lastRow = rowIndex - 1
  return source
    .replace(/<dimension\b[^>]*\/>/, `<dimension ref="A1:${lastColumn}${lastRow}"/>`)
    .replace(/<sheetData\b[^>]*>[\s\S]*?<\/sheetData>/, `<sheetData>${rows.join('')}</sheetData>`)
    .replace(/<autoFilter\b[^>]*(?:\/>|>[\s\S]*?<\/autoFilter>)/, `<autoFilter ref="A2:${lastColumn}${lastDataRow}"/>`)
    .replace(/<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>/, `<mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`)
    .replace(/topLeftCell="A4"/, 'topLeftCell="A3"')
}

/** 在模板副本中更新所选Sheet，不覆盖源模板；字体、边框、列宽沿用原文件。 */
export async function buildDailyWorkExportWorkbook(file, templateData) {
  const zip = await JSZip.loadAsync(templateData)
  const strings = sharedStrings(await zip.file('xl/sharedStrings.xml').async('string'))
  const selected = new Set(file.sheets.map(sheet => TEMPLATE_SHEET_NUMBERS[sheet.key]))
  for (const number of [1, 2, 3]) if (!selected.has(number)) zip.remove(`xl/worksheets/sheet${number}.xml`)
  for (const sheet of file.sheets) {
    const path = `xl/worksheets/sheet${TEMPLATE_SHEET_NUMBERS[sheet.key]}.xml`
    const source = await zip.file(path).async('string')
    zip.file(path, renderWorkSheet(source, sheet, strings))
  }
  let workbook = await zip.file('xl/workbook.xml').async('string')
  const originalSheets = [...workbook.matchAll(/<sheet\b[^>]*\br:id="rId(\d+)"[^>]*\/>/g)]
  const selectedSheets = originalSheets.filter(match => selected.has(Number(match[1]))).map(match => match[0]).join('')
  const names = file.sheets.map((sheet, index) => {
    const last = Math.max(2, sheet.rows.length + 2)
    return `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">${sheet.name}!$A$2:$${sheet.key === 'major' ? 'L' : 'P'}$${last}</definedName>`
  }).join('')
  workbook = workbook.replace(/<sheets>[\s\S]*?<\/sheets>/, `<sheets>${selectedSheets}</sheets>`)
    .replace(/<definedNames>[\s\S]*?<\/definedNames>/, `<definedNames>${names}</definedNames>`)
    .replace(/activeTab="\d+"/, 'activeTab="0"')
    .replace(/<mc:AlternateContent\b[^>]*>[\s\S]*?<\/mc:AlternateContent>/, '')
  zip.file('xl/workbook.xml', workbook)
  const relationships = await zip.file('xl/_rels/workbook.xml.rels').async('string')
  zip.file('xl/_rels/workbook.xml.rels', relationships.replace(/<Relationship\b[^>]*\/>/g, relation => {
    if (relation.includes('/sharedStrings"')) return ''
    const number = relation.match(/Target="worksheets\/sheet(\d+)\.xml"/)?.[1]
    return number && !selected.has(Number(number)) ? '' : relation
  }))
  const contentTypes = await zip.file('[Content_Types].xml').async('string')
  zip.file('[Content_Types].xml', contentTypes.replace(/<Override\b[^>]*\/>/g, override => {
    if (override.includes('/xl/sharedStrings.xml"')) return ''
    const number = override.match(/PartName="\/xl\/worksheets\/sheet(\d+)\.xml"/)?.[1]
    return number && !selected.has(Number(number)) ? '' : override
  }))
  const appProperties = await zip.file('docProps/app.xml').async('string')
  zip.file('docProps/app.xml', appProperties.replace(/<vt:i4>3<\/vt:i4>/, `<vt:i4>${file.sheets.length}</vt:i4>`)
    .replace(/<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/, `<TitlesOfParts><vt:vector size="${file.sheets.length}" baseType="lpstr">${file.sheets.map(sheet => `<vt:lpstr>${sheet.name}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts>`))
  zip.remove('xl/sharedStrings.xml')
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

export async function buildDailyWorkExportPackage(records, options = {}) {
  const plan = buildDailyWorkExportPlan(records, options)
  if (!plan.ok) return plan
  let template = options.templateData
  if (!template) {
    const response = await fetch(TEMPLATE_URL)
    if (!response.ok) throw new Error('导出模板读取失败，请重试')
    template = await response.arrayBuffer()
  }
  const archive = plan.fileCount > 1 ? new JSZip() : null
  let data
  for (const file of plan.files) {
    data = await buildDailyWorkExportWorkbook(file, template)
    if (archive) archive.file(file.fileName, data)
  }
  if (archive) data = await archive.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  return { ...plan, data, mimeType: archive ? 'application/zip' : XLSX_MIME }
}

export async function exportDailyWorkRecords(records, options = {}) {
  const result = await buildDailyWorkExportPackage(records, options)
  if (!result.ok) return result
  const url = URL.createObjectURL(new Blob([result.data], { type: result.mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = result.fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
  return result
}
