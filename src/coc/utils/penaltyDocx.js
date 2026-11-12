import JSZip from 'jszip'
import { penaltyTemplateKey } from './penaltyLedger.js'

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const IMAGE_REL = `${REL_NS}/image`
const ATTACHMENT_SLOT = '#{处罚单补充附件}'
const DATE_INSTRUCTION = '（注意只取到日期，时分秒不显示）'
const text = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\r\n?/g, '\n')
const display = value => text(value).trim() || '--'
const escapeXml = value => text(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const decodeXml = value => value.replace(/&#x([0-9a-f]+);|&#(\d+);|&(lt|gt|quot|apos|amp);/gi, (all, hex, decimal, named) => {
  if (hex || decimal) return String.fromCodePoint(Number.parseInt(hex || decimal, hex ? 16 : 10))
  return { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' }[named.toLowerCase()]
})

export function penaltyIssueDate(value) {
  const match = text(value).match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : '--'
}

export function penaltyDocumentFields(record) {
  return {
    下发日期: penaltyIssueDate(record.issueTime), 编号: display(record.id), 项目名称: display(record.project),
    处罚内容: display(record.penaltyContent), 条款: display(record.penaltyClause),
    金额: display(record.amount).replace(/\s*元(?:整)?\s*$/, '') || '--',
    上报结果: display(record.reportResult), 验收说明: display(record.acceptRemark),
    处罚单补充附件: '--',
  }
}

export function penaltySupplementAttachments(record) {
  const result = [], seen = new Set()
  const source = [...(Array.isArray(record.attachments) ? record.attachments : [])]
  if (record.snapshot && !source.some(item => item?.url === record.snapshot)) source.unshift({ name: '处罚单补充附件-现场图片', url: record.snapshot })
  for (const item of source) {
    if (!item || (!item.url && !item.name)) continue
    const key = item.url || item.name
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ name: item.name || `处罚单补充附件-${result.length + 1}`, url: item.url || '' })
  }
  return result
}

function paragraphText(xml) {
  return [...xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(match => decodeXml(match[1])).join('')
}

/** 在原run之间替换跨run占位符；保留未修改文本与所有段落、run属性。 */
function patchParagraph(xml, fields) {
  let offset = 0
  const nodes = [...xml.matchAll(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g)].map(match => {
    const value = decodeXml(match[2]), start = offset
    offset += value.length
    return { value, start, end: offset }
  })
  const original = nodes.map(node => node.value).join('')
  const edits = [...original.matchAll(/#\{([^}]+)\}|（注意只取到日期，时分秒不显示）/g)].map(match => {
    if (match[0] === DATE_INSTRUCTION) return { start: match.index, end: match.index + match[0].length, value: '' }
    if (!Object.hasOwn(fields, match[1])) throw new Error('导出模板包含未配置的字段，请联系管理员')
    return { start: match.index, end: match.index + match[0].length, value: fields[match[1]] }
  })
  const values = nodes.map(node => node.value)
  for (const edit of edits.reverse()) {
    const first = nodes.findIndex(node => edit.start >= node.start && edit.start < node.end)
    const last = nodes.findIndex(node => edit.end > node.start && edit.end <= node.end)
    if (first < 0 || last < 0) throw new Error('导出模板字段位置无效，请联系管理员')
    const before = values[first].slice(0, edit.start - nodes[first].start)
    const after = values[last].slice(edit.end - nodes[last].start)
    values[first] = before + edit.value + (first === last ? after : '')
    for (let i = first + 1; i < last; i += 1) values[i] = ''
    if (last !== first) values[last] = after
  }
  let index = 0
  return xml.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, (all, open, value, close) => {
    const i = index++
    if (values[i] === nodes[i].value) return all
    const preservedOpen = /\bxml:space=/.test(open) ? open : open.replace(/>$/, ' xml:space="preserve">')
    return preservedOpen + escapeXml(values[i]).replace(/\n/g, '</w:t><w:br/><w:t xml:space="preserve">') + close
  })
}

function inlineParagraphProperties(source, caption = false) {
  let properties = source.match(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/)?.[0] || '<w:pPr></w:pPr>'
  const spacing = '<w:spacing w:line="240" w:lineRule="auto"/>'
  properties = /<w:spacing\b/.test(properties)
    ? properties.replace(/<w:spacing\b[^>]*\/>/, spacing)
    : properties.replace('</w:pPr>', spacing + '</w:pPr>')
  if (caption && !/<w:keepNext\b/.test(properties)) properties = properties.replace('</w:pPr>', '<w:keepNext/></w:pPr>')
  return properties
}

function attachmentParagraphs(source, pictures) {
  return pictures.map((picture, index) => {
    const scale = Math.min(5.4 * 914400 / picture.width, 4 * 914400 / picture.height)
    const cx = Math.round(picture.width * scale), cy = Math.round(picture.height * scale)
    const name = escapeXml(picture.name), id = picture.drawingId
    const runProperties = source.match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/)?.[0] || ''
    const caption = `<w:p>${inlineParagraphProperties(source, true)}<w:r>${runProperties}<w:t xml:space="preserve">附件${index + 1}：${name}</w:t></w:r></w:p>`
    const drawing = `<w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:r="${REL_NS}" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="${name}" descr="${name}"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${picture.relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
    return caption + `<w:p>${inlineParagraphProperties(source)}<w:r>${drawing}</w:r></w:p>`
  }).join('')
}

/** 原模板包增量填充，仅改变正文及图片所需关系；不重建样式或页面系统。 */
export async function buildPenaltyDocx(record, templateBytes, options = {}) {
  const templateKey = penaltyTemplateKey(record)
  if (!templateKey) throw new Error('当前状态没有对应的导出模板')
  const images = options.images || []
  if (images.length !== penaltySupplementAttachments(record).length) throw new Error('补充附件处理不完整，无法完成导出')
  const zip = await JSZip.loadAsync(templateBytes)
  const source = await zip.file('word/document.xml')?.async('string')
  if (!source || !source.includes(WORD_NS)) throw new Error('导出模板无效，请联系管理员')
  const fields = penaltyDocumentFields(record)
  let relationships = await zip.file('word/_rels/document.xml.rels')?.async('string')
  let contentTypes = await zip.file('[Content_Types].xml')?.async('string')
  let nextId = Math.max(0, ...[...source.matchAll(/<wp:docPr\b[^>]*\bid="(\d+)"/g)].map(match => Number(match[1]))) + 1
  const pictures = []
  for (const image of images) {
    if (!image.data?.length || !(image.width > 0) || !(image.height > 0)) throw new Error('补充附件图片无效，无法完成导出')
    let imageIndex = pictures.length + 1
    while (zip.file(`word/media/penalty-attachment-${imageIndex}.png`)) imageIndex += 1
    let relationIndex = imageIndex
    while (relationships?.includes(`Id="rIdPenaltyImage${relationIndex}"`)) relationIndex += 1
    const path = `media/penalty-attachment-${imageIndex}.png`, relationshipId = `rIdPenaltyImage${relationIndex}`
    zip.file('word/' + path, image.data)
    const relation = `<Relationship Id="${relationshipId}" Type="${IMAGE_REL}" Target="${path}"/>`
    if (!relationships?.includes('</Relationships>')) throw new Error('导出模板附件关系无效，请联系管理员')
    relationships = relationships.replace('</Relationships>', relation + '</Relationships>')
    pictures.push({ ...image, relationshipId, drawingId: nextId++ })
  }
  if (pictures.length) {
    if (!contentTypes || !contentTypes.includes('</Types>')) throw new Error('导出模板格式无效，请联系管理员')
    if (!/Extension="png"/i.test(contentTypes)) contentTypes = contentTypes.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>')
    zip.file('[Content_Types].xml', contentTypes)
    zip.file('word/_rels/document.xml.rels', relationships)
  }
  let attachmentCount = 0
  const document = source.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, paragraph => {
    if (paragraphText(paragraph).trim() === ATTACHMENT_SLOT && pictures.length) {
      attachmentCount += 1
      return attachmentParagraphs(paragraph, pictures)
    }
    return patchParagraph(paragraph, fields)
  })
  if (pictures.length && attachmentCount !== 1) throw new Error('导出模板缺少附件位置，请联系管理员')
  zip.file('word/document.xml', document)
  const fileId = display(record.id).replace(/[<>:"/\\|?*]/g, '_').slice(0, 100)
  const data = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  return { data, templateKey, fileName: `违约处罚通知单_${fileId}_${record.status}.docx`, imageCount: pictures.length }
}

async function attachmentPng(attachment) {
  if (!attachment.url) throw new Error(`补充附件“${attachment.name}”没有可用图片，导出未完成`)
  const image = new Image()
  if (!/^(data:|blob:)/.test(attachment.url)) image.crossOrigin = 'anonymous'
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`补充附件“${attachment.name}”读取超时`)), 15000)
    image.onload = () => { clearTimeout(timer); resolve() }
    image.onerror = () => { clearTimeout(timer); reject(new Error(`补充附件“${attachment.name}”读取失败`)) }
    image.src = attachment.url
  })
  const isSvg = /^data:image\/svg/i.test(attachment.url) || /\.svg(?:\?|$)/i.test(attachment.url)
  const width = isSvg ? 1620 : Math.min(image.naturalWidth, 1620)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.max(1, Math.round(width * image.naturalHeight / image.naturalWidth))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法处理补充附件图片，请重试')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('补充附件图片处理失败')), 'image/png'))
  return { name: attachment.name, data: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height }
}

export async function downloadPenaltyDocx(record, templateUrl) {
  if (!penaltyTemplateKey(record)) throw new Error('当前状态没有对应的导出模板')
  const response = await fetch(templateUrl)
  if (!response.ok) throw new Error('导出模板读取失败，请重试')
  const images = []
  for (const attachment of penaltySupplementAttachments(record)) images.push(await attachmentPng(attachment))
  const result = await buildPenaltyDocx(record, await response.arrayBuffer(), { images })
  const blob = new Blob([result.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url
  link.download = result.fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return result
}
