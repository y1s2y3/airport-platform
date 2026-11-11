import JSZip from 'jszip'

/**
 * 本周隐患清单模板（.xlsx）手写 OOXML 生成器
 * 说明：SheetJS 社区版不写数据验证（dataValidations），故手写 OOXML 以保证「隐患类型 / 隐患等级 / 整改状态」三列下拉生效。
 */

export const WEEKLY_HAZARD_SHEET_NAME = '本周隐患清单'
export const WEEKLY_HAZARD_README_SHEET_NAME = '填写说明'

const HEADER_FILL = 'FFD9E2F3'
const HEADER_FONT_COLOR = 'FF1F2329'

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

function buildStylesXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="3">' +
    '<font><sz val="11"/><color theme="1"/><name val="等线"/><family val="2"/></font>' +
    `<font><b/><sz val="11"/><color rgb="${HEADER_FONT_COLOR}"/><name val="等线"/><family val="2"/></font>` +
    '<font><sz val="11"/><color rgb="FF9A9A9A"/><name val="等线"/><family val="2"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    `<fill><patternFill patternType="solid"><fgColor rgb="${HEADER_FILL}"/><bgColor indexed="64"/></patternFill></fill>` +
    '</fills>' +
    '<borders count="2">' +
    '<border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="常规" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  )
}

function buildRowXml(rowIndex, values, styleId, listStyleId) {
  const cells = values
    .map((value, colIndex) => {
      const ref = `${columnLetter(colIndex)}${rowIndex}`
      const style = styleId != null ? styleId : listStyleId
      if (value == null || value === '') return `<c r="${ref}" s="${style}"/>`
      return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
    })
    .join('')
  return `<row r="${rowIndex}">${cells}</row>`
}

function buildSheetXml({ headers, rows, widths, validations = [] }) {
  const colCount = headers.length
  const cols = widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('')
  const sheetRows = [
    buildRowXml(1, headers, 1),
    ...rows.map((values, index) => buildRowXml(index + 2, values, null, 2)),
  ].join('')
  const lastRow = Math.max(2, rows.length + 1)
  const validationXml = validations.length
    ? `<dataValidations count="${validations.length}">${validations
        .map(
          (item) =>
            `<dataValidation type="list" allowBlank="${item.allowBlank ? 1 : 0}" showInputMessage="1" showErrorMessage="1" ` +
            `promptTitle="${xmlEscape(item.title)}" prompt="请从下拉列表中选择" ` +
            `errorTitle="${xmlEscape(item.title)}" error="${xmlEscape(item.error)}" ` +
            `sqref="${item.range}"><formula1>"${xmlEscape(item.options.join(','))}"</formula1></dataValidation>`,
        )
        .join('')}</dataValidations>`
    : ''
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<dimension ref="A1:${columnLetter(colCount - 1)}${lastRow}"/>` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    '<sheetFormatPr defaultRowHeight="20"/>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${sheetRows}</sheetData>` +
    validationXml +
    '</worksheet>'
  )
}

/**
 * 生成本周隐患清单模板 xlsx（blob，浏览器/Node 通用）
 * @param {object} options
 * @param {string[]} options.headers 表头
 * @param {Array<Array<string>>} options.rows 数据行（含示例行）
 * @param {number[]} options.widths 列宽
 * @param {Array<{range:string, options:string[], title:string, error:string, allowBlank?:boolean}>} options.validations 下拉
 * @param {string[][]} options.readmeRows 填写说明行
 * @param {number[]} options.readmeWidths 填写说明列宽
 */
export async function buildWeeklyHazardTemplateBlob({
  headers,
  rows,
  widths,
  validations,
  readmeRows,
  readmeWidths,
}) {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
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
      `<sheets><sheet name="${xmlEscape(WEEKLY_HAZARD_SHEET_NAME)}" sheetId="1" r:id="rId1"/><sheet name="${xmlEscape(WEEKLY_HAZARD_README_SHEET_NAME)}" sheetId="2" r:id="rId2"/></sheets>` +
      '</workbook>',
  )
  zip.file(
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>',
  )
  zip.file(
    'xl/worksheets/sheet1.xml',
    buildSheetXml({ headers, rows, widths, validations }),
  )
  zip.file('xl/worksheets/sheet2.xml', buildSheetXml({ headers: readmeRows[0], rows: readmeRows.slice(1), widths: readmeWidths }))
  zip.file('xl/styles.xml', buildStylesXml())
  const inBrowser = typeof document !== 'undefined'
  return zip.generateAsync({
    type: inBrowser ? 'blob' : 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
