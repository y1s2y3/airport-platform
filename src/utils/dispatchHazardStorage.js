import { getScreenshotRecords } from '../coc/utils/videoStorage.js'
import { PROJECT_SHORT_NAMES } from '../coc/mock/data.js'

const DISPATCH_HAZARD_KEY = 'coc-admin-dispatch-hazards-v5'

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

/** 整改照片展示地址：支持 url / dataURL / 文件名（文件名用占位缩略图） */
export function resolveDispatchHazardPhotoSrc(photo, index = 0) {
  if (photo == null || photo === '') return ''
  if (typeof photo === 'object') {
    if (photo.url) return String(photo.url)
    return resolveDispatchHazardPhotoSrc(photo.name || '', index)
  }
  const str = String(photo)
  if (/^(data:|https?:|blob:)/i.test(str)) return str
  const label = str.replace(/\.[a-z0-9]+$/i, '').slice(-18) || `照片${index + 1}`
  return buildPlaceholderSnapshot({
    title: '整改照片',
    subtitle: label,
    hue: 150 + ((index * 37) % 140),
  })
}

export function resolveDispatchHazardPhotoName(photo, index = 0) {
  if (photo == null || photo === '') return `整改照片-${index + 1}`
  if (typeof photo === 'object') return photo.name || `整改照片-${index + 1}`
  const str = String(photo)
  if (/^(data:|blob:)/i.test(str)) return `整改照片-${index + 1}`
  return str
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

function buildSeedStatusLogs({ status, uploadTime, submitTime, closeTime, remark = '', photos = [] }) {
  const register = createDispatchHazardRegisterLog(uploadTime)
  if (status === '待整改') return [register]

  const submitLog = {
    action: '提交整改',
    fromStatus: '待整改',
    toStatus: '待验收',
    operator: '项目用户',
    operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.CONTRACTOR,
    remark: remark || '现场已按要求整改完毕，请验收',
    photos,
    time: submitTime || uploadTime,
  }
  if (status === '待验收') return [submitLog, register]

  const acceptLog = {
    action: '验收通过',
    fromStatus: '待验收',
    toStatus: '已关闭',
    operator: '项目用户',
    operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.SAFETY,
    remark: '现场复核通过，资料齐全',
    photos: [],
    time: closeTime || submitTime || uploadTime,
  }
  return [acceptLog, submitLog, register]
}

function buildSeedFromScreenHazards() {
  const safetyTemplates = [
    '塔吊作业区警戒标识不足，临边防护缺失',
    '深基坑周边防护栏破损，警示灯未开启',
    '材料堆放占用消防通道，文明施工不到位',
    '高处作业人员未系安全带，安全网搭设不规范',
    '配电箱未上锁，临电线路私拉乱接',
    '脚手架连墙件缺失，作业层脚手板未满铺',
    '动火作业未办理许可，灭火器配备不足',
    '基坑上下通道未设置防滑踏步',
  ]
  const qualityTemplates = [
    '钢筋绑扎间距偏差，保护层厚度不足',
    '混凝土浇筑振捣不充分，存在蜂窝麻面风险',
    '防水卷材搭接宽度不足，阴阳角未做附加层',
    '模板拼缝不严，局部漏浆',
    '预埋件定位偏移，影响后续安装',
    '砌体灰缝不饱满，墙体垂直度超差',
    '屋面找坡不到位，局部积水',
    '钢结构焊缝外观质量不合格',
  ]
  const rectifiers = ['李工', '周质量', '王安全', '赵班长', '陈技术', '刘施工']
  const levels = ['一般', '较大', '重大']
  const sourceTypes = ['live', 'playback', 'meeting']
  const locations = ['施工现场东侧', '作业面 B 区', '临边通道', '塔吊回转半径内', '地下室负一层', '屋面施工区']
  const statusDefs = [
    { status: '待整改', prefix: 'P' },
    { status: '待验收', prefix: 'R' },
    { status: '已关闭', prefix: 'C' },
  ]

  const rows = []

  // 项目级：每个项目每种状态各 1 条
  PROJECT_SHORT_NAMES.forEach((projectName, projectIndex) => {
    statusDefs.forEach((def, statusIndex) => {
      const type = (projectIndex + statusIndex) % 2 === 0 ? 'safety' : 'quality'
      const templates = type === 'safety' ? safetyTemplates : qualityTemplates
      const description = templates[(projectIndex + statusIndex) % templates.length]
      const day = 5 + ((projectIndex + statusIndex * 3) % 24)
      const meetingDate = `2026-06-${String(day).padStart(2, '0')}`
      const uploadTime = `${meetingDate} ${String(9 + statusIndex).padStart(2, '0')}:${String(10 + (projectIndex % 50)).padStart(2, '0')}:00`
      const submitTime = `${meetingDate} ${String(14 + statusIndex).padStart(2, '0')}:${String(20 + (projectIndex % 40)).padStart(2, '0')}:00`
      const closeTime = `${addSeedDays(meetingDate, 1)} ${String(10 + statusIndex).padStart(2, '0')}:30:00`
      const photos =
        def.status === '待整改'
          ? []
          : [`${projectName}-整改照片-${def.prefix}-1.jpg`, `${projectName}-整改照片-${def.prefix}-2.jpg`]
      const remark =
        def.status === '待整改'
          ? ''
          : type === 'safety'
            ? '已补齐防护并组织复查，现场照片已上传'
            : '已按规范整改并完成复测，请安质部验收'

      rows.push(
        emptyDispatchHazard({
          id: `DHZ-SEED-${String(projectIndex).padStart(3, '0')}-${def.prefix}`,
          projectId: `p-${String(projectIndex).padStart(3, '0')}`,
          projectName,
          source: '问题截图',
          hazardType: type,
          description,
          hazardLevel: levels[(projectIndex + statusIndex) % levels.length],
          rectifier: rectifiers[(projectIndex + statusIndex) % rectifiers.length],
          hazardDeadline: addSeedDays(meetingDate, 3 + statusIndex),
          cameraName: type === 'safety' ? `枪机-${(projectIndex % 8) + 1}` : `球机-${(projectIndex % 6) + 1}`,
          cameraLocation: locations[(projectIndex + statusIndex) % locations.length],
          sourceType: sourceTypes[(projectIndex + statusIndex) % sourceTypes.length],
          snapshot: buildPlaceholderSnapshot({
            title: type === 'quality' ? '质量隐患截图' : '安全隐患截图',
            subtitle: `${projectName} · ${description.slice(0, 12)}`,
            hue: type === 'quality' ? 140 + projectIndex * 3 : 12 + projectIndex * 4,
          }),
          uploadTime,
          rectifyStatus: def.status,
          rectifyRemark: remark,
          rectifyPhotos: photos,
          statusLogs: buildSeedStatusLogs({
            status: def.status,
            uploadTime,
            submitTime,
            closeTime,
            remark,
            photos,
          }),
        }),
      )
    })
  })

  return rows
}

function addSeedDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
    const photoLabels = photos.map((item, index) => resolveDispatchHazardPhotoName(item, index))
    const remark = String(payload.remark || '').trim()
    const log = {
      action: '提交整改',
      fromStatus: '待整改',
      toStatus: '待验收',
      operator: payload.operator || '施工方用户',
      operatorRole: payload.operatorRole || DISPATCH_HAZARD_ACTOR_ROLES.CONTRACTOR,
      remark,
      photos: photoLabels,
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
