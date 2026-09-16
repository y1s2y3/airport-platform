/**
 * 系统附件上传标准（对齐《系统附件上传清单》）
 * 原型与 PRD 新增附件位时优先套用档位，禁止自造格式/大小/个数。
 */

export const ATTACH_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
export const ATTACH_FILE_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
export const ATTACH_VIDEO_EXTS = ['.mp4', '.mov', '.m4v', '.avi']

export const ATTACH_PRESETS = {
  image: {
    key: 'image',
    kind: 'image',
    label: '图片',
    accept: ATTACH_IMAGE_EXTS.join(','),
    exts: ATTACH_IMAGE_EXTS,
    maxSizeMb: 5,
    hint: '支持 jpg / jpeg / png / gif / webp / bmp / svg，单个不超过 5MB',
  },
  file: {
    key: 'file',
    kind: 'file',
    label: '文件',
    accept: ATTACH_FILE_EXTS.join(','),
    exts: ATTACH_FILE_EXTS,
    maxSizeMb: 50,
    hint: '支持 pdf / jpg / png / Word / Excel / PPT，单个不超过 50MB',
  },
  media: {
    key: 'media',
    kind: 'media',
    label: '影像',
    accept: [...ATTACH_IMAGE_EXTS, ...ATTACH_VIDEO_EXTS].join(','),
    exts: [...ATTACH_IMAGE_EXTS, ...ATTACH_VIDEO_EXTS],
    maxSizeMb: 200,
    hint: '支持图片与视频（mp4 / mov / m4v / avi），单个不超过 200MB',
  },
  xlsx: {
    key: 'xlsx',
    kind: 'file',
    label: 'Excel',
    accept: '.xlsx',
    exts: ['.xlsx'],
    maxSizeMb: 50,
    hint: '仅支持 .xlsx，单个不超过 50MB',
  },
}

export const ATTACH_COUNT = {
  requiredMulti: { min: 1, max: 9 },
  optionalMulti: { min: 0, max: 9 },
  requiredSingle: { min: 1, max: 1 },
  optionalSingle: { min: 0, max: 1 },
}

function extOf(name = '') {
  const m = String(name || '').toLowerCase().match(/(\.[a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : ''
}

export function getAttachPreset(preset = 'file') {
  return ATTACH_PRESETS[preset] || ATTACH_PRESETS.file
}

export function isAllowedAttachExt(file, preset = 'file') {
  const conf = getAttachPreset(preset)
  const name = file?.name || file?.file_name || ''
  const type = String(file?.type || file?.mime_type || '').toLowerCase()
  const ext = extOf(name)
  if (ext && conf.exts.includes(ext)) return true
  if (preset === 'image' && type.startsWith('image/')) {
    return ATTACH_IMAGE_EXTS.some((e) => type.includes(e.slice(1)))
  }
  if (preset === 'media') {
    if (type.startsWith('image/') || type.startsWith('video/')) return true
  }
  if (preset === 'xlsx') {
    return ext === '.xlsx' || type.includes('spreadsheetml')
  }
  return false
}

export function detectAttachKind(file, preset = 'file') {
  const name = file?.name || file?.file_name || file?.url || ''
  const type = String(file?.type || file?.mime_type || '').toLowerCase()
  const url = String(file?.url || file?.file_url || '')
  if (type.startsWith('video/') || ATTACH_VIDEO_EXTS.includes(extOf(name)) || ATTACH_VIDEO_EXTS.some((e) => url.toLowerCase().includes(e))) {
    return 'video'
  }
  if (
    type.startsWith('image/') ||
    url.startsWith('data:image/') ||
    ATTACH_IMAGE_EXTS.includes(extOf(name)) ||
    ATTACH_IMAGE_EXTS.some((e) => url.toLowerCase().includes(e))
  ) {
    return 'image'
  }
  if (preset === 'image') return 'image'
  if (preset === 'media') return ''
  return 'file'
}

export function attachOversize(file, preset = 'file') {
  const maxMb = getAttachPreset(preset).maxSizeMb
  const size = Number(file?.size ?? file?.file_size ?? 0)
  return size > maxMb * 1024 * 1024
}

export function attachHint(preset = 'file', { min = 0, max = 9 } = {}) {
  const conf = getAttachPreset(preset)
  const countText =
    min === max
      ? min === 1
        ? '限 1 个'
        : `限 ${max} 个`
      : min > 0
        ? `${min}～${max} 个`
        : `最多 ${max} 个`
  return `${conf.hint}，${countText}`
}

export function asAttachList(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item, index) => normalizeAttachItem(item, index))
      .filter((item) => item.name || item.url)
  }
  if (typeof value === 'string' && value.trim()) {
    return [normalizeAttachItem({ name: value.trim() }, 0)]
  }
  if (typeof value === 'object') {
    const item = normalizeAttachItem(value, 0)
    return item.name || item.url ? [item] : []
  }
  return []
}

export function normalizeAttachItem(item, index = 0) {
  if (!item) return { name: '', url: '', size: 0, kind: 'file' }
  if (typeof item === 'string') {
    return { name: item, url: '', size: 0, kind: detectAttachKind({ name: item }) }
  }
  const name = item.name || item.file_name || item.fileName || `附件-${index + 1}`
  const url = item.url || item.file_url || item.fileUrl || ''
  const size = Number(item.size ?? item.file_size ?? item.fileSize ?? 0)
  return {
    ...item,
    name,
    url,
    size,
    kind: item.kind || detectAttachKind({ name, url, type: item.type || item.mime_type }),
  }
}

export function attachCount(value) {
  return asAttachList(value).length
}

export function attachRequiredOk(value, min = 1) {
  return attachCount(value) >= min
}

export function firstAttachName(value) {
  return asAttachList(value)[0]?.name || ''
}

export function attachDisplayText(value) {
  const list = asAttachList(value)
  if (!list.length) return ''
  if (list.length === 1) return list[0].name
  return `${list[0].name} 等${list.length}个`
}

export function validateAttachFile(file, preset = 'file', { currentCount = 0, max = 9 } = {}) {
  if (!file) return '请选择文件'
  if (!isAllowedAttachExt(file, preset)) {
    const conf = getAttachPreset(preset)
    return `仅支持 ${conf.exts.join(' / ')}`
  }
  if (attachOversize(file, preset)) {
    return `单个文件不超过 ${getAttachPreset(preset).maxSizeMb}MB`
  }
  if (currentCount >= max) {
    return `最多上传 ${max} 个`
  }
  return ''
}
