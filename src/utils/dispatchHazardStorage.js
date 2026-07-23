import { getScreenshotRecords } from '../coc/utils/videoStorage.js'
import { SAFETY_HAZARDS, QUALITY_HAZARDS, PROJECT_NAMES, PROJECT_SHORT_NAMES } from '../coc/mock/data.js'

const DISPATCH_HAZARD_KEY = 'coc-admin-dispatch-hazards-v2'

export const DISPATCH_HAZARD_RECTIFY_STATUSES = ['待整改', '待验收', '已关闭']
export const DISPATCH_HAZARD_RECTIFY_STATUS_DEFAULT = '待整改'

export const DISPATCH_HAZARD_ACTOR_ROLES = {
  CONTRACTOR: '施工方',
  SAFETY: '安质部',
  SYSTEM: '系统',
}

function readList(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return [...fallback]
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [...fallback]
  } catch {
    return [...fallback]
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list))
}

function hazardNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

function projectNameByIndex(index) {
  return PROJECT_SHORT_NAMES[index % PROJECT_SHORT_NAMES.length] || PROJECT_NAMES[index % PROJECT_NAMES.length] || '施工项目'
}

/** Demo 占位截图（SVG data URI），便于详情页展示 */
function buildPlaceholderSnapshot({ title = '问题截图', subtitle = '', hue = 210 } = {}) {
  const safeTitle = String(title).slice(0, 18).replace(/[<>&]/g, '')
  const safeSub = String(subtitle).slice(0, 24).replace(/[<>&]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},28%,28%)"/>
      <stop offset="100%" stop-color="hsl(${hue + 20},32%,16%)"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <rect x="24" y="24" width="592" height="312" rx="8" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
  <text x="320" y="160" text-anchor="middle" fill="#e8eef7" font-size="28" font-family="Microsoft YaHei, sans-serif">${safeTitle}</text>
  <text x="320" y="205" text-anchor="middle" fill="#aeb6c2" font-size="16" font-family="Microsoft YaHei, sans-serif">${safeSub}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function createDispatchHazardRegisterLog(time = hazardNow(), remark = '问题截图登记生成隐患') {
  return {
    action: '登记',
    fromStatus: '',
    toStatus: DISPATCH_HAZARD_RECTIFY_STATUS_DEFAULT,
    operator: '系统',
    operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.SYSTEM,
    remark,
    photos: [],
    time,
  }
}

function appendStatusLog(logs, entry) {
  return [entry, ...(Array.isArray(logs) ? logs : [])]
}

export function emptyDispatchHazard(row = {}) {
  const rectifyStatus = DISPATCH_HAZARD_RECTIFY_STATUSES.includes(row.rectifyStatus)
    ? row.rectifyStatus
    : DISPATCH_HAZARD_RECTIFY_STATUS_DEFAULT
  const uploadTime = row.uploadTime || ''
  const statusLogs = Array.isArray(row.statusLogs)
    ? row.statusLogs
    : uploadTime
      ? [createDispatchHazardRegisterLog(uploadTime)]
      : []
  return {
    id: row.id || '',
    screenshotId: row.screenshotId || '',
    projectId: row.projectId || '',
    projectName: row.projectName || '',
    source: row.source || '问题截图',
    hazardType: row.hazardType === 'quality' ? 'quality' : 'safety',
    description: row.description || '',
    hazardLevel: row.hazardLevel || '一般',
    rectifier: row.rectifier || '',
    hazardDeadline: row.hazardDeadline || '',
    cameraName: row.cameraName || '',
    cameraLocation: row.cameraLocation || '',
    sourceType: row.sourceType || '',
    snapshot: row.snapshot || '',
    rectifyStatus,
    rectifyRemark: row.rectifyRemark || '',
    rectifyPhotos: Array.isArray(row.rectifyPhotos) ? row.rectifyPhotos : [],
    statusLogs,
    uploadTime,
  }
}

function mapScreenshotToHazard(ss) {
  if (ss.docType !== 'safety' && ss.docType !== 'quality') return null
  const hazardType = ss.docType === 'quality' ? 'quality' : 'safety'
  const snapshot =
    ss.snapshot ||
    buildPlaceholderSnapshot({
      title: hazardType === 'quality' ? '质量隐患截图' : '安全隐患截图',
      subtitle: ss.cameraName || ss.projectName || '',
      hue: hazardType === 'quality' ? 145 : 18,
    })
  return emptyDispatchHazard({
    id: `DHZ-${ss.id}`,
    screenshotId: ss.id,
    projectName: ss.projectName || '',
    source: '问题截图',
    hazardType,
    description: ss.description || '',
    hazardLevel: ss.hazardLevel || '一般',
    rectifier: ss.rectifier || '',
    hazardDeadline: ss.hazardDeadline || '',
    cameraName: ss.cameraName || '',
    cameraLocation: ss.cameraLocation || '',
    sourceType: ss.sourceType || '',
    snapshot,
    uploadTime: ss.createdAt || hazardNow(),
    statusLogs: [createDispatchHazardRegisterLog(ss.createdAt || hazardNow())],
  })
}

function buildSeedFromScreenHazards() {
  const fromSafety = SAFETY_HAZARDS.slice(0, 8).map((item, index) =>
    emptyDispatchHazard({
      id: `DHZ-SEED-S-${index + 1}`,
      projectName: projectNameByIndex(index),
      source: '问题截图',
      hazardType: 'safety',
      description: item.desc || item.description || '',
      hazardLevel: item.level || '一般',
      rectifier: item.reporter || '李工',
      hazardDeadline: item.detail?.deadline || '2026-06-28',
      cameraName: `枪机-${index + 1}`,
      cameraLocation: '施工现场',
      sourceType: index % 2 === 0 ? 'live' : 'playback',
      snapshot: buildPlaceholderSnapshot({
        title: '安全隐患截图',
        subtitle: item.desc || `枪机-${index + 1}`,
        hue: 12 + index * 8,
      }),
      uploadTime: `${item.date || '2026-06-15'} 10:${String(10 + index).padStart(2, '0')}:00`,
      rectifyStatus: item.status === '已闭合' ? '已关闭' : item.status === '整改中' ? '待验收' : '待整改',
    }),
  )
  const fromQuality = QUALITY_HAZARDS.slice(0, 6).map((item, index) =>
    emptyDispatchHazard({
      id: `DHZ-SEED-Q-${index + 1}`,
      projectName: projectNameByIndex(index + 3),
      source: '问题截图',
      hazardType: 'quality',
      description: item.desc || item.description || '',
      hazardLevel: item.level || '一般',
      rectifier: item.reporter || '周质量',
      hazardDeadline: item.detail?.deadline || '2026-07-05',
      cameraName: `球机-${index + 1}`,
      cameraLocation: '作业面',
      sourceType: index % 2 === 0 ? 'playback' : 'live',
      snapshot: buildPlaceholderSnapshot({
        title: '质量隐患截图',
        subtitle: item.desc || `球机-${index + 1}`,
        hue: 140 + index * 6,
      }),
      uploadTime: `${item.date || '2026-06-16'} 14:${String(20 + index).padStart(2, '0')}:00`,
      rectifyStatus: item.status === '已闭合' ? '已关闭' : '待整改',
    }),
  )
  return [...fromSafety, ...fromQuality]
}

function syncFromScreenshots(list) {
  const screenshots = getScreenshotRecords().filter(
    (item) => item.docType === 'safety' || item.docType === 'quality',
  )
  let changed = false
  const next = [...list]
  screenshots.forEach((ss) => {
    const mapped = mapScreenshotToHazard(ss)
    if (!mapped) return
    const idx = next.findIndex((item) => item.screenshotId === ss.id || item.id === mapped.id)
    if (idx < 0) {
      next.unshift(mapped)
      changed = true
      return
    }
    // 保留整改状态，仅回写截图侧可变更字段
    const prev = next[idx]
    next[idx] = emptyDispatchHazard({
      ...prev,
      projectName: ss.projectName || prev.projectName,
      description: ss.description || prev.description,
      hazardLevel: ss.hazardLevel || prev.hazardLevel,
      rectifier: ss.rectifier || prev.rectifier,
      hazardDeadline: ss.hazardDeadline || prev.hazardDeadline,
      cameraName: ss.cameraName || prev.cameraName,
      cameraLocation: ss.cameraLocation || prev.cameraLocation,
      sourceType: ss.sourceType || prev.sourceType,
      snapshot: ss.snapshot || prev.snapshot,
      hazardType: ss.docType === 'quality' ? 'quality' : 'safety',
      source: '问题截图',
      screenshotId: ss.id,
    })
  })
  return { list: next, changed }
}

function ensureSeed() {
  const raw = localStorage.getItem(DISPATCH_HAZARD_KEY)
  if (raw == null) {
    const seeded = buildSeedFromScreenHazards()
    const { list } = syncFromScreenshots(seeded)
    writeList(DISPATCH_HAZARD_KEY, list)
    return list
  }
  try {
    const parsed = JSON.parse(raw)
    return (Array.isArray(parsed) ? parsed : []).map((row) => emptyDispatchHazard(row))
  } catch {
    return []
  }
}

export function getDispatchHazards() {
  let list = ensureSeed().map((row) => emptyDispatchHazard(row))
  const synced = syncFromScreenshots(list)
  if (synced.changed) {
    writeList(DISPATCH_HAZARD_KEY, synced.list)
    list = synced.list
  }
  return list
    .map((row) => emptyDispatchHazard(row))
    .sort((a, b) => String(b.uploadTime).localeCompare(String(a.uploadTime)))
}

export function getDispatchHazardsByProject(projectName) {
  if (!projectName) return getDispatchHazards()
  return getDispatchHazards().filter((item) => item.projectName === projectName)
}

/** 大屏问题截图登记安全/质量隐患时写入调度隐患清单 */
export function upsertDispatchHazardFromScreenshot(screenshot) {
  if (!screenshot || (screenshot.docType !== 'safety' && screenshot.docType !== 'quality')) {
    return null
  }
  const list = getDispatchHazards()
  const mapped = mapScreenshotToHazard(screenshot)
  const idx = list.findIndex(
    (item) => item.screenshotId === screenshot.id || item.id === mapped.id,
  )
  if (idx >= 0) {
    const prev = list[idx]
    list[idx] = emptyDispatchHazard({
      ...prev,
      ...mapped,
      rectifyStatus: prev.rectifyStatus,
      rectifyRemark: prev.rectifyRemark,
      rectifyPhotos: prev.rectifyPhotos,
      statusLogs: prev.statusLogs?.length ? prev.statusLogs : mapped.statusLogs,
    })
  } else {
    list.unshift(mapped)
  }
  writeList(DISPATCH_HAZARD_KEY, list)
  return list[idx >= 0 ? idx : 0]
}

function updateDispatchHazardRecord(id, updater) {
  const list = getDispatchHazards()
  const idx = list.findIndex((item) => item.id === id)
  if (idx < 0) return null
  const next = emptyDispatchHazard(updater(list[idx]))
  list[idx] = next
  writeList(DISPATCH_HAZARD_KEY, list)
  return next
}

export function submitDispatchHazardRectify(id, payload = {}) {
  return updateDispatchHazardRecord(id, (row) => {
    if (row.rectifyStatus !== '待整改') return row
    const time = hazardNow()
    const photos = Array.isArray(payload.photos) ? payload.photos.filter(Boolean) : []
    const remark = String(payload.remark || '').trim()
    const log = {
      action: '提交整改',
      fromStatus: '待整改',
      toStatus: '待验收',
      operator: payload.operator || '施工方用户',
      operatorRole: payload.operatorRole || DISPATCH_HAZARD_ACTOR_ROLES.CONTRACTOR,
      remark,
      photos,
      time,
    }
    return {
      ...row,
      rectifyStatus: '待验收',
      rectifyRemark: remark,
      rectifyPhotos: photos,
      statusLogs: appendStatusLog(row.statusLogs, log),
    }
  })
}

export function acceptDispatchHazard(id, payload = {}) {
  return updateDispatchHazardRecord(id, (row) => {
    if (row.rectifyStatus !== '待验收') return row
    const time = hazardNow()
    const remark = String(payload.remark || '').trim() || '现场核查整改到位，予以关闭'
    const log = {
      action: '验收通过',
      fromStatus: '待验收',
      toStatus: '已关闭',
      operator: payload.operator || '安质部用户',
      operatorRole: payload.operatorRole || DISPATCH_HAZARD_ACTOR_ROLES.SAFETY,
      remark,
      photos: [],
      time,
    }
    return {
      ...row,
      rectifyStatus: '已关闭',
      statusLogs: appendStatusLog(row.statusLogs, log),
    }
  })
}

export function rejectDispatchHazard(id, payload = {}) {
  return updateDispatchHazardRecord(id, (row) => {
    if (row.rectifyStatus !== '待验收') return row
    const time = hazardNow()
    const remark = String(payload.remark || '').trim()
    const log = {
      action: '验收驳回',
      fromStatus: '待验收',
      toStatus: '待整改',
      operator: payload.operator || '安质部用户',
      operatorRole: payload.operatorRole || DISPATCH_HAZARD_ACTOR_ROLES.SAFETY,
      remark,
      photos: [],
      time,
    }
    return {
      ...row,
      rectifyStatus: '待整改',
      statusLogs: appendStatusLog(row.statusLogs, log),
    }
  })
}
