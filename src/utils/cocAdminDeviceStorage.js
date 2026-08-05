import {
  defaultSupervisionMeetings,
  defaultSupervisionHazards,
} from '../mock/supervisionMeetingSeed.js'

const PATROL_KEY = 'coc-admin-patrol-devices'
const HELMET_KEY = 'coc-admin-smart-helmets'
const SUPERVISION_KEY = 'coc-admin-supervision-meetings-v3'
const SUPERVISION_HAZARD_KEY = 'coc-admin-supervision-hazards-v6'

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
      deviceAccount: record.deviceAccount ?? '',
      devicePassword: record.devicePassword ?? '',
    }
  } else {
    list.unshift({
      id: record.id || `PD-${Date.now()}`,
      deviceCode: record.deviceCode ?? '',
      name: record.name,
      project: record.project,
      bindPerson: record.bindPerson ?? '',
      deviceAccount: record.deviceAccount ?? '',
      devicePassword: record.devicePassword ?? '',
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
    deviceAccount: row.deviceAccount || '',
    devicePassword: row.devicePassword || '',
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
    /** 监理例会纪要（Word / PDF 合一字段；兼容旧数据 minutesWord / minutesPdf） */
    minutesFile: row.minutesFile || row.minutesWord || row.minutesPdf || '',
    minutesWord: row.minutesWord || '',
    minutesPdf: row.minutesPdf || '',
    /** 本周隐患清单附件 */
    weeklyHazardList: row.weeklyHazardList || '',
    weeklyHazardListUrl: row.weeklyHazardListUrl || '',
    signInPhoto: row.signInPhoto || '',
    signInPhotoUrl: row.signInPhotoUrl || '',
    meetingPhoto: row.meetingPhoto || '',
    meetingPhotoUrl: row.meetingPhotoUrl || '',
    /** 监理例会纪要预览地址（dataURL / blob） */
    minutesFileUrl: row.minutesFileUrl || '',
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
  // 未召开跳过导入；有隐患则记为已导入，否则保留原状态
  const nextStatus =
    record.parseStatus === 'skipped'
      ? 'skipped'
      : hazards.length
        ? 'success'
        : record.parseStatus === 'failed'
          ? 'failed'
          : record.parseStatus || 'pending'
  const meeting = saveSupervisionMeeting({
    ...record,
    hazardCount: hazards.length,
    parseStatus: nextStatus,
  })
  replaceSupervisionHazardsForMeeting(meeting.id, hazards, meeting)
  return meeting
}

export const SUPERVISION_HAZARD_RECTIFY_STATUSES = ['待整改', '已关闭']

/** 导入/登记默认：待整改 */
export const SUPERVISION_HAZARD_RECTIFY_STATUS_DEFAULT = '待整改'

export const SUPERVISION_HAZARD_ACTOR_ROLES = {
  CONTRACTOR: '施工方',
  SUPERVISOR: '监理',
  SYSTEM: '系统',
}

const LEGACY_STATUS_MAP = {
  待下发: '待整改',
  待验收: '待整改',
}

function normalizeRectifyStatus(status) {
  const raw = String(status || '').trim()
  const mapped = LEGACY_STATUS_MAP[raw] || raw
  return SUPERVISION_HAZARD_RECTIFY_STATUSES.includes(mapped)
    ? mapped
    : SUPERVISION_HAZARD_RECTIFY_STATUS_DEFAULT
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
    remark: '隐患清单导入/登记，默认待整改',
    photos: [],
    time,
  }
}

function appendStatusLog(logs, entry) {
  return [entry, ...(Array.isArray(logs) ? logs : [])]
}

export function emptySupervisionHazard(row = {}) {
  const rectifyStatus = normalizeRectifyStatus(row.rectifyStatus)
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
    source: row.source || '清单导入',
    hazardType: row.hazardType || 'safety',
    description: row.description || '',
    hazardLevel: row.hazardLevel || '一般',
    remark: row.remark || '',
    rectifier: row.rectifier || '',
    hazardDeadline: row.hazardDeadline || '',
    acceptor: row.acceptor || '',
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
        source: item.source || '清单导入',
        remark: item.remark || '',
        rectifyStatus: item.rectifyStatus || SUPERVISION_HAZARD_RECTIFY_STATUS_DEFAULT,
        uploadTime: item.uploadTime || now,
        statusLogs: [createSupervisionHazardRegisterLog(item.uploadTime || now)],
      }),
    )
  })
  writeList(SUPERVISION_HAZARD_KEY, list)
}

/**
 * @deprecated 已取消下发流程；保留函数避免旧引用报错
 */
export function issueSupervisionHazards() {
  return { ok: false, updated: [], msg: '已取消下发流程' }
}

export function issueSupervisionHazard() {
  return issueSupervisionHazards()
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

/** 待整改 → 确认关闭 → 已关闭 */
export function closeSupervisionHazard(id, payload = {}) {
  return updateSupervisionHazardRecord(id, (row) => {
    if (row.rectifyStatus !== '待整改') return row
    const time = hazardNow()
    const remark = String(payload.remark || '').trim() || '确认隐患已关闭'
    const log = {
      action: '确认关闭',
      fromStatus: '待整改',
      toStatus: '已关闭',
      operator: payload.operator || '指挥部用户',
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

/** 是否为监理会议隐患（COC 单号类型 / 后台清单关闭权限共用） */
export function isSupervisionMeetingHazardTicket(row = {}) {
  const ticket = row.ticketType || row.detail?.ticketType || ''
  return ticket === '监理会议隐患'
}

/** @deprecated 已取消施工方提交整改流程 */
export function submitSupervisionHazardRectify() {
  return null
}

/** @deprecated 请使用 closeSupervisionHazard */
export function acceptSupervisionHazard(id, payload = {}) {
  return closeSupervisionHazard(id, payload)
}

/** @deprecated 已取消验收驳回流程 */
export function rejectSupervisionHazard() {
  return null
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
