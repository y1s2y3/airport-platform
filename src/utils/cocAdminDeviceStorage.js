import {
  defaultSupervisionMeetings,
  defaultSupervisionHazards,
} from '../mock/supervisionMeetingSeed.js'

const PATROL_KEY = 'coc-admin-patrol-devices'
const HELMET_KEY = 'coc-admin-smart-helmets'
const SUPERVISION_KEY = 'coc-admin-supervision-meetings-v2'
const SUPERVISION_HAZARD_KEY = 'coc-admin-supervision-hazards-v4'

const defaultPatrolDevices = [
  {
    id: 'PD-001',
    deviceCode: 'XJY-20260301',
    name: '三跑道东区巡检仪',
    project: '三跑道',
    bindPerson: '张工',
    online: true,
    intercomLinked: true,
    lastOnline: '2026-06-26 09:12',
  },
  {
    id: 'PD-002',
    deviceCode: 'XJY-20260302',
    name: 'T2航站楼巡检仪',
    project: 'T2',
    bindPerson: '李监理',
    online: false,
    intercomLinked: true,
    lastOnline: '2026-06-25 18:40',
  },
  {
    id: 'PD-003',
    deviceCode: 'XJY-20260303',
    name: '综合配套巡检仪',
    project: '综合配套',
    bindPerson: '',
    online: true,
    intercomLinked: false,
    lastOnline: '2026-06-26 08:55',
  },
]

const defaultHelmets = [
  {
    id: 'SH-001',
    serialNo: 'HLM-20260301',
    bindPerson: '王安全',
    project: '三跑道',
    online: true,
    location: '三跑道北货区',
    lastHeartbeat: '2026-06-26 09:15',
  },
  {
    id: 'SH-002',
    serialNo: 'HLM-20260302',
    bindPerson: '赵班长',
    project: 'T2',
    online: true,
    location: 'T2 施工段 A 区',
    lastHeartbeat: '2026-06-26 09:14',
  },
  {
    id: 'SH-003',
    serialNo: 'HLM-20260303',
    bindPerson: '',
    project: '综合配套',
    online: false,
    location: '—',
    lastHeartbeat: '2026-06-25 17:20',
  },
]

function readList(key, defaults) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return [...defaults]
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [...defaults]
  } catch {
    return [...defaults]
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list))
}

export function getPatrolDevices() {
  return readList(PATROL_KEY, defaultPatrolDevices)
}

export function savePatrolDevice(record) {
  const list = getPatrolDevices()
  const idx = list.findIndex((item) => item.id === record.id)
  if (idx >= 0) {
    const existing = list[idx]
    list[idx] = {
      ...existing,
      deviceCode: record.deviceCode ?? '',
      name: record.name,
      project: record.project,
      bindPerson: record.bindPerson ?? '',
    }
  } else {
    list.unshift({
      id: record.id || `PD-${Date.now()}`,
      deviceCode: record.deviceCode ?? '',
      name: record.name,
      project: record.project,
      bindPerson: record.bindPerson ?? '',
      online: false,
      intercomLinked: false,
      lastOnline: '',
    })
  }
  writeList(PATROL_KEY, list)
  return list
}

export function emptyPatrolDevice(row = {}) {
  return {
    id: row.id || '',
    deviceCode: row.deviceCode || '',
    name: row.name || '',
    project: row.project || '',
    bindPerson: row.bindPerson || '',
    online: row.online ?? true,
    intercomLinked: row.intercomLinked ?? false,
    lastOnline: row.lastOnline || '',
  }
}

export function getSmartHelmets() {
  return readList(HELMET_KEY, defaultHelmets)
}

export function saveSmartHelmet(record) {
  const list = getSmartHelmets()
  const idx = list.findIndex((item) => item.id === record.id)
  if (idx >= 0) list[idx] = { ...list[idx], ...record }
  else list.unshift({ ...record, id: record.id || `SH-${Date.now()}` })
  writeList(HELMET_KEY, list)
  return list
}

export function emptySmartHelmet(row = {}) {
  return {
    id: row.id || '',
    serialNo: row.serialNo || '',
    bindPerson: row.bindPerson || '',
    project: row.project || '',
    online: row.online ?? true,
    location: row.location || '',
    lastHeartbeat: row.lastHeartbeat || '',
  }
}

export function emptySupervisionMeeting(row = {}) {
  return {
    id: row.id || '',
    projectId: row.projectId || '',
    projectDept: row.projectDept || '',
    projectName: row.projectName || '',
    meetingDate: row.meetingDate || '',
    pmAttendees: row.pmAttendees || '',
    directorAttendees: row.directorAttendees || '',
    minutesWord: row.minutesWord || '',
    minutesPdf: row.minutesPdf || '',
    signInPhoto: row.signInPhoto || '',
    meetingPhoto: row.meetingPhoto || '',
    remark: row.remark || '',
    parseStatus: row.parseStatus || 'pending',
    parsedAt: row.parsedAt || '',
    hazardCount: Number.isFinite(row.hazardCount) ? row.hazardCount : 0,
    uploadTime: row.uploadTime || '',
  }
}

export function getSupervisionMeetings() {
  return readList(SUPERVISION_KEY, defaultSupervisionMeetings)
}

export function saveSupervisionMeeting(record) {
  const list = getSupervisionMeetings()
  const entry = {
    ...emptySupervisionMeeting(record),
    id: record.id || `SM-${Date.now()}`,
    uploadTime:
      record.uploadTime || new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
  }
  const idx = list.findIndex((item) => item.id === entry.id)
  if (idx >= 0) list[idx] = { ...list[idx], ...entry }
  else list.unshift(entry)
  writeList(SUPERVISION_KEY, list)
  return entry
}

/** @deprecated 使用 saveSupervisionMeeting */
export function addSupervisionMeeting(record) {
  return saveSupervisionMeeting(record)
}

export function saveSupervisionMeetingWithHazards(record, hazards = []) {
  // 解析失败时即使已手动补录隐患，仍保留 failed，便于列表识别「自动解析未成功」
  const nextStatus =
    record.parseStatus === 'failed'
      ? 'failed'
      : record.parseStatus === 'skipped'
        ? 'skipped'
        : hazards.length
          ? 'success'
          : record.parseStatus || 'pending'
  const meeting = saveSupervisionMeeting({
    ...record,
    hazardCount: hazards.length,
    parseStatus: nextStatus,
  })
  replaceSupervisionHazardsForMeeting(meeting.id, hazards, meeting)
  return meeting
}

export const SUPERVISION_HAZARD_RECTIFY_STATUSES = ['待整改', '待验收', '已关闭']

export const SUPERVISION_HAZARD_RECTIFY_STATUS_DEFAULT = '待整改'

export const SUPERVISION_HAZARD_ACTOR_ROLES = {
  CONTRACTOR: '施工方',
  SUPERVISOR: '监理',
  SYSTEM: '系统',
}

function hazardNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

export function createSupervisionHazardRegisterLog(time = hazardNow()) {
  return {
    action: '登记',
    fromStatus: '',
    toStatus: SUPERVISION_HAZARD_RECTIFY_STATUS_DEFAULT,
    operator: '系统',
    operatorRole: SUPERVISION_HAZARD_ACTOR_ROLES.SYSTEM,
    remark: '监理解析/人工登记生成隐患',
    photos: [],
    time,
  }
}

function appendStatusLog(logs, entry) {
  return [entry, ...(Array.isArray(logs) ? logs : [])]
}

export function emptySupervisionHazard(row = {}) {
  const rectifyStatus = SUPERVISION_HAZARD_RECTIFY_STATUSES.includes(row.rectifyStatus)
    ? row.rectifyStatus
    : SUPERVISION_HAZARD_RECTIFY_STATUS_DEFAULT
  const uploadTime = row.uploadTime || ''
  const statusLogs = Array.isArray(row.statusLogs)
    ? row.statusLogs
    : uploadTime
      ? [createSupervisionHazardRegisterLog(uploadTime)]
      : []
  return {
    id: row.id || '',
    meetingId: row.meetingId || '',
    projectId: row.projectId || '',
    projectName: row.projectName || '',
    source: row.source || '监理解析',
    hazardType: row.hazardType || 'safety',
    description: row.description || '',
    hazardLevel: row.hazardLevel || '一般',
    rectifier: row.rectifier || '',
    hazardDeadline: row.hazardDeadline || '',
    rectifyStatus,
    rectifyRemark: row.rectifyRemark || '',
    rectifyPhotos: Array.isArray(row.rectifyPhotos) ? row.rectifyPhotos : [],
    statusLogs,
    uploadTime,
  }
}

export function getSupervisionHazards() {
  return readList(SUPERVISION_HAZARD_KEY, defaultSupervisionHazards).map((row) =>
    emptySupervisionHazard(row),
  )
}

export function getSupervisionHazardsByMeeting(meetingId) {
  return getSupervisionHazards().filter((item) => item.meetingId === meetingId)
}

export function getSupervisionHazardsByProject(projectName) {
  if (!projectName) return getSupervisionHazards()
  return getSupervisionHazards().filter((item) => item.projectName === projectName)
}

export function replaceSupervisionHazardsForMeeting(meetingId, hazards, meeting = {}) {
  const list = getSupervisionHazards().filter((item) => item.meetingId !== meetingId)
  const now = hazardNow()
  hazards.forEach((item, index) => {
    list.unshift(
      emptySupervisionHazard({
        ...item,
        id: item.id || `SHZ-${Date.now()}-${index}`,
        meetingId,
        projectId: meeting.projectId || item.projectId || '',
        projectName: meeting.projectName || item.projectName || '',
        source: item.source || '监理解析',
        uploadTime: item.uploadTime || now,
        statusLogs: [createSupervisionHazardRegisterLog(item.uploadTime || now)],
      }),
    )
  })
  writeList(SUPERVISION_HAZARD_KEY, list)
}

function updateSupervisionHazardRecord(id, updater) {
  const list = readList(SUPERVISION_HAZARD_KEY, defaultSupervisionHazards).map((row) =>
    emptySupervisionHazard(row),
  )
  const idx = list.findIndex((item) => item.id === id)
  if (idx < 0) return null
  const next = emptySupervisionHazard(updater(list[idx]))
  list[idx] = next
  writeList(SUPERVISION_HAZARD_KEY, list)
  return next
}

/** 施工方：待整改 → 提交整改 → 待验收 */
export function submitSupervisionHazardRectify(id, payload = {}) {
  return updateSupervisionHazardRecord(id, (row) => {
    if (row.rectifyStatus !== '待整改') return row
    const time = hazardNow()
    const photos = Array.isArray(payload.photos) ? payload.photos.filter(Boolean) : []
    const remark = String(payload.remark || '').trim()
    const log = {
      action: '提交整改',
      fromStatus: '待整改',
      toStatus: '待验收',
      operator: payload.operator || '施工方用户',
      operatorRole: payload.operatorRole || SUPERVISION_HAZARD_ACTOR_ROLES.CONTRACTOR,
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

/** 监理：待验收 → 验收通过 → 已关闭 */
export function acceptSupervisionHazard(id, payload = {}) {
  return updateSupervisionHazardRecord(id, (row) => {
    if (row.rectifyStatus !== '待验收') return row
    const time = hazardNow()
    const remark = String(payload.remark || '').trim() || '现场核查整改到位，予以关闭'
    const log = {
      action: '验收通过',
      fromStatus: '待验收',
      toStatus: '已关闭',
      operator: payload.operator || '监理用户',
      operatorRole: payload.operatorRole || SUPERVISION_HAZARD_ACTOR_ROLES.SUPERVISOR,
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

/** 监理：待验收 → 驳回 → 待整改 */
export function rejectSupervisionHazard(id, payload = {}) {
  return updateSupervisionHazardRecord(id, (row) => {
    if (row.rectifyStatus !== '待验收') return row
    const time = hazardNow()
    const remark = String(payload.remark || '').trim()
    const log = {
      action: '验收驳回',
      fromStatus: '待验收',
      toStatus: '待整改',
      operator: payload.operator || '监理用户',
      operatorRole: payload.operatorRole || SUPERVISION_HAZARD_ACTOR_ROLES.SUPERVISOR,
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

export function saveSupervisionHazard(record) {
  const list = getSupervisionHazards()
  const entry = {
    ...emptySupervisionHazard(record),
    id: record.id || `SHZ-${Date.now()}`,
    uploadTime:
      record.uploadTime || new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
  }
  const idx = list.findIndex((item) => item.id === entry.id)
  if (idx >= 0) list[idx] = { ...list[idx], ...entry }
  else list.unshift(entry)
  writeList(SUPERVISION_HAZARD_KEY, list)
  return entry
}
