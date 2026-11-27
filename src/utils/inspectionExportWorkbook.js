import JSZip from 'jszip'
import { utils, write } from 'xlsx'
import { readRectificationPhoto } from './inspectionRectificationPhotos.js'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PHOTO_EXTENSIONS = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'image/bmp': 'bmp', 'image/svg+xml': 'svg', 'image/x-icon': 'ico',
}

function safeFileName(name) {
  return String(name ?? '').replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').slice(0, 100).replace(/[. ]+$/, '') || '照片'
}

async function availablePhoto(photo) {
  const source = typeof photo === 'string' ? photo : photo?.url
  try {
    if (photo?.storageKey) return await readRectificationPhoto(photo)
    if (!/^(blob:|data:image\/)/.test(source || '')) return null
    const response = await fetch(source)
    if (!response.ok) return null
    const contents = await response.blob()
    return contents.size && contents.type.startsWith('image/') ? contents : null
  } catch {
    return null
  }
}

async function photoCell(groups, prefix, folder, attachments) {
  const lines = []
  let photoNumber = 0
  for (const group of groups || []) {
    const entries = []
    const count = Math.max(group.photos.length, group.names.length)
    for (let index = 0; index < count; index++) {
      const photo = group.photos[index]
      const originalName = typeof photo === 'string' && !/^(blob:|data:)/.test(photo) ? photo : photo?.name
      const name = group.names[index] || originalName || prefix + (index + 1)
      const contents = await availablePhoto(photo)
      if (!contents) {
        entries.push(name)
        continue
      }
      const extension = PHOTO_EXTENSIONS[contents.type] || name.match(/\.([a-z\d]{2,5})$/i)?.[1] || 'img'
      const fileName = safeFileName((originalName || name).replace(/\.[a-z\d]{2,5}$/i, '')) + '.' + extension
      const path = `照片/${folder}/${prefix}-${++photoNumber}-${fileName}`
      attachments.push({ path, bytes: await contents.arrayBuffer() })
      entries.push(path)
    }
    if (entries.length) lines.push(...(group.label ? [group.label, ...entries] : entries))
  }
  return lines.join('\n')
}

function splitCell(value) {
  if (typeof value !== 'string' || value.length <= 32767) return [value]
  const parts = []
  let offset = 0
  while (offset < value.length) {
    let end = Math.min(offset + 32767, value.length)
    if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1])) end--
    parts.push(value.slice(offset, end))
    offset = end
  }
  return parts
}

function buildSheet(columns, values, rowGroups, commonColumnCount) {
  const head = []
  const widths = []
  const merges = []
  const data = values.map(() => [])
  const indexes = columns.map((_, index) => index)
  const columnOrder = [...indexes.filter(index => !columns[index][3]), ...indexes.filter(index => columns[index][3])]
  columnOrder.forEach(column => {
    const [, label, width = 18] = columns[column]
    const parts = values.map(row => splitCell(row[column]))
    const count = parts.reduce((max, row) => Math.max(max, row.length), 1)
    for (let index = 0; index < count; index++) {
      if (column < commonColumnCount) {
        const c = head.length
        for (const { start, end } of rowGroups) {
          merges.push({ s: { r: start, c }, e: { r: end, c } })
        }
      }
      head.push(index === 0 ? label : label + '（续 ' + index + '）')
      widths.push(width)
      data.forEach((row, rowIndex) => row.push(parts[rowIndex][index]))
    }
  })
  const sheet = utils.aoa_to_sheet([head, ...data])
  sheet['!cols'] = widths.map(wch => ({ wch }))
  if (merges.length) sheet['!merges'] = merges
  else sheet['!autofilter'] = { ref: sheet['!ref'] }
  sheet['!rows'] = [{ hpt: 30 }, ...data.map(row => {
    const lines = row.map((value, index) => String(value ?? '').split(/\r\n|\r|\n/).reduce((total, line) => {
      const width = [...line].reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 2 : 1), 0)
      return total + Math.max(1, Math.ceil(width / (widths[index] * .87)))
    }, 0))
    return { hpt: Math.min(409, Math.max(21, Math.max(...lines) * 15 + 6)) }
  })]
  return sheet
}

async function exportCells(row, columns, folder, attachments) {
  const cells = []
  for (const [key, , , photoPrefix] of columns) {
    cells.push(photoPrefix ? await photoCell(row[key], photoPrefix, folder, attachments) : row[key] ?? '')
  }
  return cells
}

export async function buildInspectionExportFile({ name, fileStem, columns, detailColumns = [], fontFamily, rows, identifier }) {
  const attachments = []
  const values = []
  const rowGroups = []
  for (const [index, row] of rows.entries()) {
    const orderFolder = (index + 1) + '-' + safeFileName(row[identifier])
    const common = await exportCells(row, columns, orderFolder, attachments)
    const details = detailColumns.length ? row.detailRows : []
    if (!details?.length) {
      values.push(common)
      continue
    }
    if (details.length > 1) {
      rowGroups.push({ start: values.length + 1, end: values.length + details.length })
    }
    for (const [detailIndex, detail] of details.entries()) {
      const folder = `${orderFolder}/隐患-${detailIndex + 1}`
      const cells = await exportCells(detail, detailColumns, folder, attachments)
      const lead = detailIndex === 0 ? common : common.map(() => undefined)
      values.push([...lead, ...cells])
    }
  }
  const fileName = fileStem + '.xlsx'
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, buildSheet([...columns, ...detailColumns], values, rowGroups, columns.length), name)
  const file = await JSZip.loadAsync(write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true }))
  let styles = await file.file('xl/styles.xml').async('string')
  if (fontFamily) {
    const escapedFont = fontFamily.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
    styles = styles.replace(/<font>[\s\S]*?<\/font>/, font => font
      .replace(/<name val="[^"]*"\/>/, () => `<name val="${escapedFont}"/>`)
      .replace(/<scheme val="[^"]*"\/>/, ''))
  }
  file.file('xl/styles.xml', styles.replace(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/, block =>
    block.replace(/<xf\b([^>]*?)\/>/g, '<xf$1 applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'),
  ))
  const book = await file.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  if (!attachments.length) return { filename: fileName, blob: new Blob([book], { type: XLSX_MIME }) }

  const archive = new JSZip()
  archive.file(fileName, book)
  for (const photo of attachments) archive.file(photo.path, photo.bytes)
  return { filename: fileStem + '.zip', blob: await archive.generateAsync({ type: 'blob' }) }
}
