/**
 * 数字周报 · Word 导出
 *
 * 实现方式：用 JSZip 直接生成标准 OOXML（.docx），不依赖第三方 docx 库、不依赖模板文件。
 * 版式遵循项目 Word 硬性要求（AGENTS.md §2.10）：
 *  - 文档标题黑体 18 磅居中；一级标题黑体 16 磅、二级标题黑体 14 磅加粗（段前后各 6 磅）
 *  - 正文宋体 10.5 磅（段后 6 磅）；表格宋体 9 磅（表头加粗、底纹 #D9E2F3）
 *  - 页边距上下左右 2.2 cm；表格总宽 100% 可排版宽度；行高至少 0.6 cm；单元格水平居左、垂直居中
 */
import JSZip from 'jszip'
import { WEEKLY_SECTION_ORDER, SECTION_CHAPTER, CHAPTER_TITLES } from './weeklyReportBuilder.js'
import { renderChartToPng } from './weeklyReportChart.js'

/** A4 纵向：21cm × 29.7cm；页边距 2.2cm 后的可排版宽度（twips，1cm = 567twips） */
const PAGE_WIDTH = 11906
const PAGE_HEIGHT = 16838
const MARGIN = 1247
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2 // 9412

const FONT_SONG = 'SimSun'
const FONT_HEI = 'SimHei'
const FONT_CODE = 'Courier New'

const SIZE_TITLE = 36 // 18pt（半磅）
const SIZE_H1 = 32 // 16pt
const SIZE_H2 = 28 // 14pt
const SIZE_BODY = 21 // 10.5pt
const SIZE_TABLE = 18 // 9pt

/* ------------------------------------------------------------------ *
 * XML 基础工具
 * ------------------------------------------------------------------ */

function escapeXml(text) {
  return String(text ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function runProperties({ bold = false, size = SIZE_BODY, font = FONT_SONG, color } = {}) {
  const parts = [
    `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>`,
    bold ? '<w:b/><w:bCs/>' : '',
    `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`,
    color ? `<w:color w:val="${color}"/>` : '',
  ]
  return `<w:rPr>${parts.filter(Boolean).join('')}</w:rPr>`
}

function paragraphXml(text, options = {}) {
  const {
    bold = false,
    size = SIZE_BODY,
    font = FONT_SONG,
    align = 'left',
    before = 0,
    after = 120,
    lineRule = 'auto',
    line = 0,
    color,
    style,
  } = options
  const spacing = `<w:spacing w:before="${before}" w:after="${after}"${
    line ? ` w:line="${line}" w:lineRule="${lineRule}"` : ''
  }/>`
  const jc = `<w:jc w:val="${align}"/>`
  const pStyle = style ? `<w:pStyle w:val="${style}"/>` : ''
  return (
    '<w:p>' +
    `<w:pPr>${pStyle}${spacing}${jc}</w:pPr>` +
    `<w:r>${runProperties({ bold, size, font, color })}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>` +
    '</w:p>'
  )
}

function emptyParagraphXml() {
  return '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>'
}

function cellXml(text, { width, header = false, align = 'left', bold = false } = {}) {
  const shading = header ? '<w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/>' : ''
  const run = `<w:r>${runProperties({ bold: header || bold, size: SIZE_TABLE, font: FONT_SONG })}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
  return (
    '<w:tc>' +
    '<w:tcPr>' +
    `<w:tcW w:w="${width}" w:type="dxa"/>` +
    '<w:tcBorders>' +
    '<w:top w:val="single" w:sz="4" w:color="999999"/>' +
    '<w:left w:val="single" w:sz="4" w:color="999999"/>' +
    '<w:bottom w:val="single" w:sz="4" w:color="999999"/>' +
    '<w:right w:val="single" w:sz="4" w:color="999999"/>' +
    '</w:tcBorders>' +
    shading +
    '<w:vAlign w:val="center"/>' +
    '</w:tcPr>' +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="${align}"/></w:pPr>${run}</w:p>` +
    '</w:tc>'
  )
}

function tableXml(columns, rows, { includeHeader = true } = {}) {
  if (!columns?.length) return ''
  const weights = columns.map((column) => {
    if (column.minWidth) return column.minWidth
    if (column.width) return column.width
    return 100
  })
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1
  const widths = weights.map((weight) => Math.max(560, Math.round((weight / totalWeight) * TEXT_WIDTH)))

  const grid = `<w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>`
  const headerRow = includeHeader
    ? '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="340"/><w:tblHeader/></w:trPr>' +
      columns
        .map((column, index) => cellXml(column.label || '', { width: widths[index], header: true, align: column.align === 'center' ? 'center' : 'left' }))
        .join('') +
      '</w:tr>'
    : ''
  const bodyRows = (rows || [])
    .map(
      (row) =>
        '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="340"/></w:trPr>' +
        columns
          .map((column, index) => {
            const raw = row?.[column.prop]
            let text
            if (raw === null || raw === undefined || raw === '') {
              text = '--'
            } else if (column.format === 'pct') {
              text = `${raw}%`
            } else {
              text = String(raw)
            }
            if (text.length > 60) text = `${text.slice(0, 60)}…`
            return cellXml(text, { width: widths[index], align: column.align === 'center' ? 'center' : 'left' })
          })
          .join('') +
        '</w:tr>',
    )
    .join('')

  return (
    '<w:tbl>' +
    '<w:tblPr>' +
    `<w:tblW w:w="${TEXT_WIDTH}" w:type="dxa"/>` +
    '<w:tblLayout w:type="fixed"/>' +
    '<w:jc w:val="left"/>' +
    '</w:tblPr>' +
    grid +
    headerRow +
    bodyRows +
    '</w:tbl>' +
    emptyParagraphXml()
  )
}

/* ------------------------------------------------------------------ *
 * 图表图片（Word 媒体部件）
 * ------------------------------------------------------------------ */

const EMU_PER_PX = 9525 // 96dpi 下 1px = 9525 EMU
const CHART_DISPLAY_WIDTH_PX = 560 // Word 中的展示宽度（版心约 603px@96dpi）

/**
 * 收集周报中的图表并离屏渲染为 PNG
 * @returns {{ images: Array, bySection: Record<string, number[]> }}
 */
function collectChartImages(report) {
  const images = []
  const bySection = {}
  WEEKLY_SECTION_ORDER.forEach((key) => {
    const charts = report?.sections?.[key]?.charts || []
    if (!charts.length) return
    bySection[key] = []
    charts.forEach((chart) => {
      try {
        const sourceHeight = chart.type === 'line' ? 360 : 340
        const dataUrl = renderChartToPng(chart, { width: 900, height: sourceHeight, pixelRatio: 2 })
        const base64 = String(dataUrl || '').replace(/^data:image\/png;base64,/, '')
        if (!base64) throw new Error('图表渲染结果为空')
        images.push({
          relId: `rIdChart${images.length + 1}`,
          docPrId: 100 + images.length + 1,
          fileName: `chart${images.length + 1}.png`,
          base64,
          widthPx: CHART_DISPLAY_WIDTH_PX,
          heightPx: Math.round((CHART_DISPLAY_WIDTH_PX * sourceHeight) / 900),
        })
        bySection[key].push(images.length - 1)
      } catch (error) {
        // 单张图渲染失败不阻断整份导出
        bySection[key].push(-1)
      }
    })
  })
  return { images, bySection }
}

/** 图片段落（居中、单倍行距；wp:inline 嵌入型，避免遮挡正文） */
function imageParagraphXml(image) {
  const cx = Math.round(image.widthPx * EMU_PER_PX)
  const cy = Math.round(image.heightPx * EMU_PER_PX)
  return (
    '<w:p><w:pPr><w:jc w:val="center"/>' +
    '<w:spacing w:before="80" w:after="120" w:line="240" w:lineRule="auto"/></w:pPr>' +
    '<w:r><w:drawing>' +
    `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
    '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
    `<wp:docPr id="${image.docPrId}" name="图表${image.docPrId}"/>` +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:nvPicPr><pic:cNvPr id="${image.docPrId}" name="${image.fileName}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${image.relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/>' +
    `<a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
  )
}

/* ------------------------------------------------------------------ *
 * 文档内容拼装
 * ------------------------------------------------------------------ */

function buildDocumentBody(report, imageContext = { images: [], bySection: {} }) {
  const parts = []
  const addTitle = (text) => parts.push(paragraphXml(text, { bold: true, size: SIZE_TITLE, font: FONT_HEI, align: 'center', before: 0, after: 240 }))
  const addH1 = (text) => parts.push(paragraphXml(text, { bold: true, size: SIZE_H1, font: FONT_HEI, before: 120, after: 120 }))
  const addH2 = (text) => parts.push(paragraphXml(text, { bold: true, size: SIZE_H2, font: FONT_HEI, before: 120, after: 120 }))
  const addBody = (text) => parts.push(paragraphXml(text, { size: SIZE_BODY, font: FONT_SONG, before: 0, after: 120, line: 300 }))
  const addNote = (text) => parts.push(paragraphXml(text, { size: SIZE_TABLE, font: FONT_SONG, before: 0, after: 120, color: '909399' }))

  addTitle('工程建设智慧管控一体化平台 · 数字周报')
  addH1(`${report.weekLabel}（${report.rangeLabel}）`)

  // 报头
  const headerColumns = [
    { prop: 'k', label: '项目', minWidth: 120 },
    { prop: 'v', label: '内容', minWidth: 400 },
  ]
  const headerRows = [
    { k: '统计周期', v: report.rangeLabel || '--' },
    { k: '生成时间', v: report.generatedAt || '--' },
    { k: '数据截止', v: `${report.weekEnd} 24:00` },
    { k: '统计范围', v: `在建项目 ${report.projectCount} 个` },
    { k: '生成人', v: report.generatedBy || '--' },
    { k: '状态', v: report.status === 'frozen' ? '已冻结' : '草稿' },
    { k: '数据来源', v: report.isDemo ? '演示数据（W41～W44）' : '各业务模块台账' },
  ]
  parts.push(tableXml(headerColumns, headerRows))

  // 一、本周概览（按 COC 调度 / 安质巡检 / 质量 三组展示）
  addH1(report.overview?.title || '一、本周概览')
  addBody(report.overview?.summary || '--')
  const cardColumns = [
    { prop: 'label', label: '指标', minWidth: 160 },
    { prop: 'valueText', label: '本周值', minWidth: 100, align: 'center' },
    { prop: 'prevText', label: '上周值', minWidth: 100, align: 'center' },
    { prop: 'deltaText', label: '环比', minWidth: 100, align: 'center' },
    { prop: 'rule', label: '口径', minWidth: 420 },
  ]
  const formatCardText = (value, unit) => {
    if (value === null || value === undefined) return '--'
    return `${value}${unit === '%' ? '%' : unit ? ` ${unit}` : ''}`
  }
  const toCardRow = (card) => ({
    label: card.label,
    valueText: formatCardText(card.value, card.unit),
    prevText: formatCardText(card.prevValue, card.unit),
    deltaText:
      card.delta === null || card.delta === undefined
        ? '--'
        : card.delta === 0
          ? '持平'
          : `${card.delta > 0 ? '+' : ''}${card.delta}${card.unit === '%' ? ' 个百分点' : card.unit ? ` ${card.unit}` : ''}`,
    rule: card.rule || '--',
  })
  const overviewGroups = report.overview?.groups || []
  if (overviewGroups.length) {
    overviewGroups.forEach((group) => {
      addH2(group.title || '指标')
      parts.push(tableXml(cardColumns, (group.cards || []).map(toCardRow)))
    })
  } else {
    parts.push(tableXml(cardColumns, (report.overview?.cards || []).map(toCardRow)))
  }

  if (report.overview?.warnRows?.length) {
    addH2('项目预警清单')
    const warnColumns = [
      { prop: 'project', label: '项目', minWidth: 140 },
      { prop: 'type', label: '预警类型', minWidth: 130 },
      { prop: 'count', label: '数量', minWidth: 80, align: 'center' },
      { prop: 'detail', label: '要点明细', minWidth: 420 },
    ]
    parts.push(tableXml(warnColumns, report.overview.warnRows))
  }

  // 二～五章
  let currentChapter = ''
  WEEKLY_SECTION_ORDER.forEach((key) => {
    const section = report.sections?.[key]
    if (!section) return
    const chapter = SECTION_CHAPTER[key] || ''
    if (chapter && chapter !== currentChapter) {
      currentChapter = chapter
      addH1(CHAPTER_TITLES[chapter] || chapter)
    }
    addH2(section.title || key)
    addBody(section.summary || '--')
    if (section.columns?.length) {
      parts.push(tableXml(section.columns, section.rows || []))
    }
    if (section.rows?.length === 0) addNote('本周该章节无数据（空值统一显示 --）。')
    ;(section.extraTables || []).forEach((table) => {
      addH2(table.title || '明细清单')
      if (table.summary) addBody(table.summary)
      if (table.columns?.length) parts.push(tableXml(table.columns, table.rows || []))
    })
    ;(imageContext.bySection?.[key] || []).forEach((imageIndex, chartIndex) => {
      const image = imageIndex >= 0 ? imageContext.images?.[imageIndex] : null
      if (!image) return
      parts.push(imageParagraphXml(image))
      const chartTitle = (section.charts || [])[chartIndex]?.title
      if (chartTitle) {
        parts.push(
          paragraphXml(`图：${chartTitle}`, {
            size: SIZE_TABLE,
            font: FONT_SONG,
            align: 'center',
            color: '4a4f57',
            before: 0,
            after: 120,
          }),
        )
      }
    })
  })

  // 附录
  addH1('附：指标口径说明')
  const appendixColumns = [
    { prop: 'name', label: '指标', minWidth: 140 },
    { prop: 'unit', label: '单位', minWidth: 80, align: 'center' },
    { prop: 'rule', label: '口径说明', minWidth: 480 },
    { prop: 'source', label: '数据来源', minWidth: 160 },
  ]
  parts.push(tableXml(appendixColumns, (report.appendix || []).map((item) => ({ ...item, unit: item.unit || '—' }))))

  // 段尾说明
  addNote('说明：本文件由工程建设智慧管控一体化平台根据各业务模块台账自动生成，周报生成后数据冻结；同一周只生成一份周报，不支持重新生成。')

  return parts.join('')
}

/* ------------------------------------------------------------------ *
 * OOXML 包
 * ------------------------------------------------------------------ */

function contentTypesXml(hasImages = false) {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    (hasImages ? '<Default Extension="png" ContentType="image/png"/>' : '') +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '</Types>'
  )
}

function packageRelsXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'
  )
}

function documentRelsXml(images = []) {
  const imageRels = images
    .map(
      (image) =>
        `<Relationship Id="${image.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${image.fileName}"/>`,
    )
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    imageRels +
    '</Relationships>'
  )
}

function stylesXml() {
  const normal = '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="SimSun" w:hAnsi="SimSun" w:eastAsia="SimSun" w:cs="SimSun"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:style>'
  const table = '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr></w:style>'
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    normal +
    table +
    '</w:styles>'
  )
}

function documentXml(report, imageContext = { images: [], bySection: {} }) {
  const sectPr =
    '<w:sectPr>' +
    `<w:pgSz w:w="${PAGE_WIDTH}" w:h="${PAGE_HEIGHT}"/>` +
    `<w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="851" w:footer="992" w:gutter="0"/>` +
    '<w:cols w:space="425"/>' +
    '<w:docGrid w:type="lines" w:linePitch="312"/>' +
    '</w:sectPr>'
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
    `<w:body>${buildDocumentBody(report, imageContext)}${sectPr}</w:body>` +
    '</w:document>'
  )
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

function safeFileName(text) {
  return String(text || '数字周报').replace(/[\\/:*?"<>|]/g, '_')
}

/* ------------------------------------------------------------------ *
 * 对外入口
 * ------------------------------------------------------------------ */

/**
 * 构建周报 Word 的 Blob（不触发下载，便于自测与二次使用）
 * @param {object} report 周报快照
 * @returns {Promise<{ ok: boolean, blob?: Blob, fileName?: string, msg?: string }>}
 */
export async function buildWeeklyReportDocxBlob(report) {
  if (!report) return { ok: false, msg: '周报数据不存在' }
  try {
    const zip = new JSZip()
    const imageContext = collectChartImages(report)
    zip.file('[Content_Types].xml', contentTypesXml(imageContext.images.length > 0))
    zip.file('_rels/.rels', packageRelsXml())
    zip.file('word/document.xml', documentXml(report, imageContext))
    zip.file('word/styles.xml', stylesXml())
    zip.file('word/_rels/document.xml.rels', documentRelsXml(imageContext.images))
    imageContext.images.forEach((image) => {
      zip.file(`word/media/${image.fileName}`, image.base64, { base64: true })
    })
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })
    const fileName = safeFileName(`数字周报_${report.weekLabel || report.weekKey}_${report.weekEnd?.replace(/-/g, '') || ''}.docx`)
    return { ok: true, blob, fileName }
  } catch (error) {
    return { ok: false, msg: error?.message || '生成失败，请重试' }
  }
}

/**
 * 导出单份周报为 Word
 * @param {object} report 周报快照
 * @returns {Promise<{ ok: boolean, msg?: string, fileName?: string }>}
 */
export async function exportWeeklyReportDocx(report) {
  const result = await buildWeeklyReportDocxBlob(report)
  if (!result.ok) return result
  downloadBlob(result.blob, result.fileName)
  return { ok: true, fileName: result.fileName }
}

/**
 * 导出结果自检（供交付验收使用）：重新解析生成的包，校验 ZIP CRC、XML 合法性与内容完整性
 * @param {object} report 周报快照
 */
export async function inspectWeeklyReportDocx(report) {
  const result = await buildWeeklyReportDocxBlob(report)
  if (!result.ok) return result
  const buffer = await result.blob.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer, { checkCRC32: true })
  const xml = await zip.file('word/document.xml').async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const parseError = doc.querySelector('parsererror')
  const tables = doc.getElementsByTagName('w:tbl').length
  const rows = doc.getElementsByTagName('w:tr').length
  const cells = doc.getElementsByTagName('w:tc').length
  const paragraphs = doc.getElementsByTagName('w:p').length
  const keywords = [
    '工程建设智慧管控一体化平台 · 数字周报',
    '一、本周概览',
    '二、COC 调度',
    '三、安质巡检',
    '四、质量',
    '五、下周关注事项',
    '附：指标口径说明',
    '2.1 危险作业上报情况',
    '2.2 值班表登记情况',
    '2.3 监理例会登记情况',
    '2.4 会议记录统计',
    '3.1 巡检任务',
    '3.2 隐患整改',
  ]
  const missing = keywords.filter((keyword) => !xml.includes(keyword))
  const mainStyles = ['SimHei', 'SimSun', 'D9E2F3', 'w:pgMar w:top="1247"']
  const missingStyles = mainStyles.filter((item) => !xml.includes(item))

  // 图表图片自检：媒体部件、关系、drawing 节点三者数量应一致
  const mediaFiles = Object.keys(zip.files).filter((name) => name.startsWith('word/media/') && name.endsWith('.png'))
  const contentTypes = await zip.file('[Content_Types].xml').async('string')
  const relsXml = await zip.file('word/_rels/document.xml.rels').async('string')
  const drawings = doc.getElementsByTagName('w:drawing').length
  const imageRels = (relsXml.match(/relationships\/image/g) || []).length
  const chartIssues = []
  if (mediaFiles.length !== drawings) chartIssues.push(`媒体部件 ${mediaFiles.length} 个 ≠ drawing 节点 ${drawings} 个`)
  if (imageRels !== mediaFiles.length) chartIssues.push(`图片关系 ${imageRels} 条 ≠ 媒体部件 ${mediaFiles.length} 个`)
  if (mediaFiles.length && !contentTypes.includes('ContentType="image/png"')) chartIssues.push('缺少 png 内容类型声明')
  const invalidMedia = []
  for (const name of mediaFiles) {
    const bytes = await zip.file(name).async('uint8array')
    const isPng = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    if (!isPng) invalidMedia.push(name)
  }

  return {
    ok: true,
    fileName: result.fileName,
    size: result.blob.size,
    zipEntries: Object.keys(zip.files).length,
    xmlBytes: xml.length,
    xmlParse: parseError ? `FAIL: ${parseError.textContent.slice(0, 120)}` : 'ok',
    tables,
    rows,
    cells,
    paragraphs,
    missingKeywords: missing,
    missingStyles,
    charts: {
      mediaFiles: mediaFiles.length,
      drawings,
      imageRels,
      contentTypesPng: contentTypes.includes('ContentType="image/png"'),
      invalidMedia,
      issues: chartIssues,
    },
  }
}

export { FONT_CODE }
