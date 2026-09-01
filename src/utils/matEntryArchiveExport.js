import JSZip from 'jszip'
import { formatBatchNo } from '../mock/mat.js'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/材料设备归档模板.docx`

/** 归档 Word 可勾选导出的表格分组（与 templates/材料设备归档模板.docx 一致） */
export const ARCHIVE_EXPORT_SECTIONS = [
  {
    key: 'report_form',
    label: '工程材料、构配件、设备报审表',
    tableIndexes: [0, 4, 5],
    titlePatterns: ['工程材料', 'GD-C1-347', '附表1', '材料进场数量清单', '项目名称：'],
  },
  {
    key: 'cert_collect',
    label: '施工物资产品合格证收集整理表',
    tableIndexes: [1],
    titlePatterns: ['施工物资产品合格证收集整理表', 'GD-C1-341'],
  },
  {
    key: 'quality_summary',
    label: '施工物资产品质量证明文件汇总核查表',
    tableIndexes: [2],
    titlePatterns: ['施工物资产品质量证明文件汇总核查表', 'GD-C1-342'],
  },
  {
    key: 'unpack_check',
    label: '重要施工物资进场（开箱）检查验收记录',
    tableIndexes: [3],
    titlePatterns: ['重要施工物资进场', 'GD-C1-344', '重要设备工程'],
  },
]

/** 默认勾选：报审表 + 合格证整理表 + 证明文件汇总核查表 */
export const DEFAULT_ARCHIVE_EXPORT_KEYS = ['report_form', 'cert_collect', 'quality_summary']

function parseDateParts(value) {
  const raw = String(value || '').trim()
  const m = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!m) return { y: '', m: '', d: '' }
  return { y: m[1], m: String(Number(m[2])), d: String(Number(m[3])) }
}

function formatYmd(value) {
  const { y, m, d } = parseDateParts(value)
  if (!y) return ''
  return `${y}年${m}月${d}日`
}

function getParagraphText(paragraph) {
  const texts = paragraph.getElementsByTagNameNS(W_NS, 't')
  return Array.from(texts)
    .map((t) => t.textContent || '')
    .join('')
}

function setParagraphText(paragraph, text) {
  const runs = paragraph.getElementsByTagNameNS(W_NS, 'r')
  while (runs.length > 0) {
    paragraph.removeChild(runs[0])
  }
  const r = paragraph.ownerDocument.createElementNS(W_NS, 'w:r')
  const t = paragraph.ownerDocument.createElementNS(W_NS, 'w:t')
  t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve')
  t.textContent = String(text ?? '')
  r.appendChild(t)
  paragraph.appendChild(r)
}

function setCellText(cell, text) {
  if (!cell) return
  const paragraphs = cell.getElementsByTagNameNS(W_NS, 'p')
  while (paragraphs.length > 0) {
    cell.removeChild(paragraphs[0])
  }
  const p = cell.ownerDocument.createElementNS(W_NS, 'w:p')
  const r = cell.ownerDocument.createElementNS(W_NS, 'w:r')
  const t = cell.ownerDocument.createElementNS(W_NS, 'w:t')
  t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve')
  t.textContent = String(text ?? '')
  r.appendChild(t)
  p.appendChild(r)
  cell.appendChild(p)
}

function getTables(doc) {
  return Array.from(doc.getElementsByTagNameNS(W_NS, 'tbl'))
}

function setTableCell(tables, tableIndex, rowIndex, colIndex, text) {
  const table = tables[tableIndex]
  if (!table) return
  const rows = table.getElementsByTagNameNS(W_NS, 'tr')
  const row = rows[rowIndex]
  if (!row) return
  const cells = row.getElementsByTagNameNS(W_NS, 'tc')
  setCellText(cells[colIndex], text)
}

/** 与详情页一致：展开材料/设备多组明细 */
export function buildArchiveLineItems(detail) {
  if (!detail) return []
  const header = detail
  if (header.entry_type === 'equipment') {
    const rows = header.line_items?.length
      ? header.line_items
      : [
          {
            equipment_name: header.equipment_name,
            material_spec: header.model || '',
            model: header.model || '',
            quantity: header.quantity,
            unit: header.unit,
            serial_no: header.serial_no || '',
            waybill_no: header.waybill_no || '',
            batch_no: header.batch_no || '',
            unpack_items: header.unpack_items || [],
          },
        ]
    return rows.map((row, idx) => ({
      seq: idx + 1,
      name: row.equipment_name || row.material_name || header.equipment_name || '',
      spec: row.model || row.material_spec || header.model || '',
      brand: header.brand_name || '',
      manufacturer: header.manufacturer || '',
      unit: row.unit || header.unit || '台',
      quantity: row.quantity ?? header.quantity ?? '',
      purpose: row.purpose || '',
      use_part: row.use_part || (idx === 0 ? header.use_part : '') || '',
      waybill_no: row.waybill_no || '',
      batch_no: formatBatchNo(row.batch_no),
      serial_no: row.serial_no || '',
      appearance_quality: row.appearance_quality || '',
      acceptance_result: row.acceptance_result || '',
      entry_date: row.entry_date || header.submit_time || '',
      cert_file: row.cert_file || (idx === 0 ? header.cert_file : '') || '',
      inspect_file: row.inspect_file || (idx === 0 ? header.inspect_file : '') || '',
      photo_file: row.photo_file || (idx === 0 ? header.photo_file : '') || '',
      other_file: row.other_file || (idx === 0 ? header.other_file : '') || '',
      unpack_items:
        row.unpack_items?.length
          ? row.unpack_items
          : idx === 0 && header.unpack_items?.length
            ? header.unpack_items
            : [],
    }))
  }

  const rows = header.line_items?.length
    ? header.line_items
    : [
        {
          material_name: header.material_name,
          material_spec: header.material_spec || '',
          quantity: header.quantity,
          unit: header.unit,
          waybill_no: header.waybill_no || '',
          batch_no: header.batch_no || '',
        },
      ]
  return rows.map((row, idx) => ({
    seq: idx + 1,
    name: row.material_name || header.material_name || '',
    spec: row.material_spec || header.material_spec || '',
    brand: header.brand_name || '',
    manufacturer: header.manufacturer || '',
    unit: row.unit || header.unit || '件',
    quantity: row.quantity ?? header.quantity ?? '',
    purpose: row.purpose || '',
    use_part: row.use_part || (idx === 0 ? header.use_part : '') || '',
    waybill_no: row.waybill_no || '',
    batch_no: formatBatchNo(row.batch_no),
    serial_no: '',
    appearance_quality: row.appearance_quality || '',
    acceptance_result: row.acceptance_result || '',
    entry_date: row.entry_date || header.submit_time || '',
    cert_file: row.cert_file || (idx === 0 ? header.cert_file : '') || '',
    inspect_file: row.inspect_file || (idx === 0 ? header.inspect_file : '') || '',
    photo_file: row.photo_file || (idx === 0 ? header.photo_file : '') || '',
    other_file: row.other_file || (idx === 0 ? header.other_file : '') || '',
    unpack_items: [],
  }))
}

function buildReportBody(detail, lines) {
  const dateSrc = detail.submit_time || lines[0]?.entry_date
  const { y, m, d } = parseDateParts(dateSrc)
  const nameSummary = lines.map((l) => l.name).filter(Boolean).join('、') || '—'
  const usePart =
    detail.use_part || lines.map((l) => l.use_part).filter(Boolean)[0] || '—'
  const applicant = detail.applicant_name || ''
  return (
    `致 (项目监理机构)：\n` +
    `我方于 ${y || '    '} 年 ${m || '  '} 月 ${d || '  '} 日进场的 ${nameSummary} 数量如下(见附件)。现\n\n` +
    `将质量证明文件及结果报上，拟用于下述部位：${usePart}\n\n\n` +
    `请予以审核。\n` +
    `附件:1.数量清单(包括名称、 来源和产地、 用途、 规格)。\n` +
    `2. 出厂质量证明文件\n\n` +
    `项目经理部(项目章)\n` +
    `项目负责人签名：${applicant}\n` +
    `日          期：${formatYmd(dateSrc) || '             年      月       日'}`
  )
}

function buildSupervisorBlock(detail) {
  const agree = (detail.approvals || []).find((a) => a.action === 'agree')
  const opinion = agree?.opinion || '同意进场'
  const operator = agree?.operator_name || ''
  const dateText = formatYmd(agree?.time || detail.finish_time) || '             年      月       日'
  return (
    `进场前审查意见：${opinion}\n\n\n` +
    `项目监理机构(项目章)\n\n` +
    `专业监理工程师签名：${operator}\n` +
    `日        期：${dateText}`
  )
}

function summarizeUnpackItems(items) {
  if (!items?.length) return '—'
  return items
    .map((i) => `${i.label}：${i.ok ? '合格' : '不合格'}${i.remark ? `（${i.remark}）` : ''}`)
    .join('；')
}

function collectUnpackDefects(items) {
  if (!items?.length) return '无'
  const bad = items.filter((i) => !i.ok)
  if (!bad.length) return '无缺损'
  return bad.map((i) => `${i.label}：${i.remark || '不合格'}`).join('；')
}

function removeUnselectedArchiveSections(doc, selectedKeys) {
  const selected = new Set(selectedKeys?.length ? selectedKeys : DEFAULT_ARCHIVE_EXPORT_KEYS)
  const keepTableIndexes = new Set()
  ARCHIVE_EXPORT_SECTIONS.forEach((sec) => {
    if (selected.has(sec.key)) {
      sec.tableIndexes.forEach((i) => keepTableIndexes.add(i))
    }
  })

  const tables = Array.from(doc.getElementsByTagNameNS(W_NS, 'tbl'))
  tables.forEach((tbl, idx) => {
    if (!keepTableIndexes.has(idx)) {
      tbl.parentNode?.removeChild(tbl)
    }
  })

  const removedPatterns = ARCHIVE_EXPORT_SECTIONS.filter((sec) => !selected.has(sec.key)).flatMap(
    (sec) => sec.titlePatterns,
  )
  if (!removedPatterns.length) return

  const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'))
  paragraphs.forEach((p) => {
    const text = getParagraphText(p).trim()
    if (!text) return
    if (removedPatterns.some((pat) => text.includes(pat))) {
      p.parentNode?.removeChild(p)
    }
  })
}

function fillArchiveDocument(doc, detail) {
  const lines = buildArchiveLineItems(detail)
  const projectLabel = detail.project_label || detail.project_id || ''
  const usePart = detail.use_part || lines[0]?.use_part || ''
  const isEquipment = detail.entry_type === 'equipment'
  const first = lines[0] || {}
  const agree = (detail.approvals || []).find((a) => a.action === 'agree')
  const tables = getTables(doc)

  const paragraphs = doc.getElementsByTagNameNS(W_NS, 'p')
  for (const p of paragraphs) {
    const text = getParagraphText(p).trim()
    if (text === '项目名称：') {
      setParagraphText(p, `项目名称：${projectLabel}`)
    }
  }

  // GD-C1-347 工程材料、构配件、设备报审表
  setTableCell(tables, 0, 0, 1, projectLabel)
  setTableCell(tables, 0, 1, 0, buildReportBody(detail, lines))
  setTableCell(tables, 0, 1, 1, buildReportBody(detail, lines))
  setTableCell(tables, 0, 3, 0, buildSupervisorBlock(detail))
  setTableCell(tables, 0, 3, 1, buildSupervisorBlock(detail))

  const productDesc = [
    first.name,
    first.spec,
    first.batch_no || first.serial_no,
  ]
    .filter(Boolean)
    .join(' / ')
  const qtySummary = lines
    .map((l) => `${l.name || ''}${l.quantity ?? ''}${l.unit || ''}`)
    .filter(Boolean)
    .join('；')
  const entryDateText = formatYmd(first.entry_date || detail.submit_time)

  // GD-C1-341 施工物资产品合格证收集整理表
  setTableCell(tables, 1, 0, 2, projectLabel)
  setTableCell(tables, 1, 1, 2, usePart)
  setTableCell(tables, 1, 2, 2, productDesc)
  setTableCell(tables, 1, 3, 2, entryDateText)
  setTableCell(tables, 1, 4, 1, qtySummary)
  setTableCell(tables, 1, 4, 4, first.cert_file || '项目部资料室')
  setTableCell(tables, 1, 4, 6, detail.remark || detail.entry_no || '')

  // GD-C1-342 施工物资产品质量证明文件汇总核查表
  setTableCell(tables, 2, 0, 4, projectLabel)
  setTableCell(tables, 2, 1, 4, usePart)
  lines.slice(0, 8).forEach((line, i) => {
    const row = 4 + i
    const productCell = [line.name, line.spec, line.manufacturer || detail.manufacturer]
      .filter(Boolean)
      .join(' / ')
    setTableCell(tables, 2, row, 0, String(line.seq))
    setTableCell(tables, 2, row, 1, productCell)
    setTableCell(tables, 2, row, 3, line.use_part || usePart)
    setTableCell(
      tables,
      2,
      row,
      5,
      line.quantity != null && line.quantity !== '' ? `${line.quantity}${line.unit || ''}` : '',
    )
    setTableCell(tables, 2, row, 6, line.batch_no || line.serial_no || line.waybill_no || '')
    setTableCell(tables, 2, row, 8, formatYmd(line.entry_date))
    setTableCell(tables, 2, row, 11, line.inspect_file || line.cert_file || '')
    setTableCell(tables, 2, row, 12, formatYmd(detail.finish_time || line.entry_date))
  })

  // GD-C1-344 重要施工物资进场（开箱）检查验收记录（设备）
  if (isEquipment) {
    setTableCell(tables, 3, 0, 2, projectLabel)
    setTableCell(tables, 3, 1, 2, usePart)
    setTableCell(tables, 3, 2, 2, first.use_part || usePart)
    setTableCell(tables, 3, 5, 2, [first.name, first.spec].filter(Boolean).join(' / '))
    setTableCell(
      tables,
      3,
      5,
      4,
      first.quantity != null && first.quantity !== '' ? `${first.quantity}${first.unit || ''}` : '',
    )
    setTableCell(
      tables,
      3,
      6,
      2,
      [detail.manufacturer, detail.supplier].filter(Boolean).join(' / '),
    )
    setTableCell(tables, 3, 7, 2, entryDateText)
    setTableCell(
      tables,
      3,
      8,
      2,
      first.acceptance_result
        ? `${first.acceptance_result}；名称、型号、规格和数量符合订货要求`
        : '名称、型号、规格和数量符合订货要求',
    )
    setTableCell(
      tables,
      3,
      9,
      2,
      [first.cert_file, first.inspect_file].filter(Boolean).join('、') || '—',
    )
    setTableCell(tables, 3, 10, 2, first.appearance_quality || '—')
    setTableCell(tables, 3, 11, 2, summarizeUnpackItems(first.unpack_items))
    setTableCell(tables, 3, 12, 2, collectUnpackDefects(first.unpack_items))
    const eqSupervisor =
      `${agree?.opinion || '同意验收'}\n${agree?.operator_name || ''}\n${formatYmd(agree?.time || detail.finish_time)}`
    setTableCell(tables, 3, 16, 1, eqSupervisor)
  }

  // 附表1：材料进场数量清单
  lines.slice(0, 14).forEach((line, i) => {
    const row = 1 + i
    setTableCell(tables, 4, row, 0, String(line.seq))
    setTableCell(tables, 4, row, 1, line.name)
    setTableCell(
      tables,
      4,
      row,
      2,
      [line.brand, line.manufacturer].filter(Boolean).join(' / '),
    )
    setTableCell(tables, 4, row, 3, line.spec)
    setTableCell(tables, 4, row, 4, line.unit)
    setTableCell(tables, 4, row, 5, line.quantity != null ? String(line.quantity) : '')
    setTableCell(tables, 4, row, 6, line.purpose)
    setTableCell(tables, 4, row, 7, formatYmd(line.entry_date))
  })

  // 附表设备清单（Table 5）
  setTableCell(tables, 5, 0, 1, projectLabel)
  setTableCell(tables, 5, 1, 1, detail.applicant_name || '施工单位')
  if (isEquipment) {
    lines.slice(0, 7).forEach((line, i) => {
      const row = 3 + i
      setTableCell(tables, 5, row, 0, line.name)
      setTableCell(tables, 5, row, 1, line.brand || detail.brand_name || '')
      setTableCell(tables, 5, row, 2, line.unit)
      setTableCell(
        tables,
        5,
        row,
        3,
        line.quantity != null && line.quantity !== '' ? String(line.quantity) : '',
      )
    })
  } else {
    lines.slice(0, 7).forEach((line, i) => {
      const row = 3 + i
      setTableCell(tables, 5, row, 0, line.name)
      setTableCell(tables, 5, row, 1, line.brand || detail.brand_name || '')
      setTableCell(tables, 5, row, 2, line.unit)
      setTableCell(
        tables,
        5,
        row,
        3,
        line.quantity != null && line.quantity !== '' ? String(line.quantity) : '',
      )
    })
  }
}

async function loadTemplateArrayBuffer() {
  const res = await fetch(TEMPLATE_URL)
  if (!res.ok) {
    throw new Error('归档模板加载失败，请确认 templates/材料设备归档模板.docx 已部署')
  }
  return res.arrayBuffer()
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 按《材料设备归档模板》导出 Word 归档文件（仅审批通过）
 * @param {object} detail getEntryDetail 返回的完整进场单
 * @param {{ sections?: string[] }} [options] sections 为勾选的导出分组 key，默认 DEFAULT_ARCHIVE_EXPORT_KEYS
 */
export async function exportMatEntryArchive(detail, options = {}) {
  if (!detail) return { ok: false, msg: '进场单不存在' }
  if (detail.status !== 'approved') {
    return { ok: false, msg: '仅审批通过的进场单可导出归档文件' }
  }

  const sections = options.sections?.length ? options.sections : [...DEFAULT_ARCHIVE_EXPORT_KEYS]
  const validKeys = new Set(ARCHIVE_EXPORT_SECTIONS.map((s) => s.key))
  const selectedKeys = sections.filter((k) => validKeys.has(k))
  if (!selectedKeys.length) {
    return { ok: false, msg: '请至少选择一项导出内容' }
  }

  try {
    const buffer = await loadTemplateArrayBuffer()
    const zip = await JSZip.loadAsync(buffer)
    const xml = await zip.file('word/document.xml')?.async('string')
    if (!xml) return { ok: false, msg: '模板格式异常：缺少 document.xml' }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    fillArchiveDocument(doc, detail)
    removeUnselectedArchiveSections(doc, selectedKeys)

    const serializer = new XMLSerializer()
    zip.file('word/document.xml', serializer.serializeToString(doc))

    const out = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    const typeLabel = detail.entry_type === 'equipment' ? '设备' : '材料'
    const name =
      detail.entry_type === 'equipment' ? detail.equipment_name : detail.material_name
    const safeName = String(name || typeLabel).replace(/[\\/:*?"<>|]/g, '_')
    downloadBlob(out, `材料设备归档_${detail.entry_no}_${safeName}.docx`)
    return { ok: true }
  } catch (err) {
    return { ok: false, msg: err?.message || '导出归档文件失败' }
  }
}
