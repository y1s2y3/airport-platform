const PATROL_KEY = 'coc-admin-patrol-devices'
const HELMET_KEY = 'coc-admin-smart-helmets'
const SUPERVISION_KEY = 'coc-admin-supervision-meetings'
const SUPERVISION_HAZARD_KEY = 'coc-admin-supervision-hazards'

const defaultPatrolDevices = [
  {
    id: 'PD-001',
    name: '三跑道东区巡检仪',
    project: '三跑道',
    bindPerson: '张工',
    online: true,
    intercomLinked: true,
    lastOnline: '2026-06-26 09:12',
  },
  {
    id: 'PD-002',
    name: 'T2航站楼巡检仪',
    project: 'T2',
    bindPerson: '李监理',
    online: false,
    intercomLinked: true,
    lastOnline: '2026-06-25 18:40',
  },
  {
    id: 'PD-003',
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

const defaultSupervisionMeetings = [
  {
    id: 'SM-001',
    projectDept: '三跑道项目部',
    projectName: '三跑道扩建工程',
    meetingDate: '2026-06-24',
    pmAttendees: '张某（项目经理）、李某（项目负责人）',
    directorAttendees: '王某（项目部长）',
    minutesWord: '三跑道监理例会纪要_20260624.docx',
    minutesPdf: '三跑道监理例会纪要_20260624.pdf',
    signInPhoto: '三跑道监理例会签到表_20260624.jpg',
    meetingPhoto: '三跑道监理例会现场_20260624.jpg',
    remark: '',
    uploadTime: '2026-06-24 16:30',
  },
  {
    id: 'SM-002',
    projectDept: 'T2 项目部',
    projectName: 'T2 航站区工程',
    meetingDate: '2026-06-17',
    pmAttendees: '赵某',
    directorAttendees: '—',
    minutesWord: '',
    minutesPdf: '',
    signInPhoto: '',
    meetingPhoto: '',
    remark: '因暴雨未召开，改期至 6 月 24 日',
    uploadTime: '2026-06-17 09:00',
  },
]

const defaultSupervisionHazards = [
  {
    id: 'SHZ-001',
    hazardType: 'safety',
    description: '塔吊作业区警戒标识不足，临边防护缺失',
    hazardLevel: '较大',
    rectifier: '张安全',
    hazardDeadline: '2026-07-01',
    uploadTime: '2026-06-24 17:10',
  },
  {
    id: 'SHZ-002',
    hazardType: 'quality',
    description: '钢筋绑扎间距偏差，保护层厚度不足',
    hazardLevel: '一般',
    rectifier: '周质量',
    hazardDeadline: '2026-07-05',
    uploadTime: '2026-06-24 17:15',
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
  if (idx >= 0) list[idx] = { ...list[idx], ...record }
  else list.unshift({ ...record, id: record.id || `PD-${Date.now()}` })
  writeList(PATROL_KEY, list)
  return list
}

export function emptyPatrolDevice(row = {}) {
  return {
    id: row.id || '',
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

export function emptySupervisionHazard(row = {}) {
  return {
    id: row.id || '',
    hazardType: row.hazardType || 'safety',
    description: row.description || '',
    hazardLevel: row.hazardLevel || '一般',
    rectifier: row.rectifier || '',
    hazardDeadline: row.hazardDeadline || '',
    uploadTime: row.uploadTime || '',
  }
}

export function getSupervisionHazards() {
  return readList(SUPERVISION_HAZARD_KEY, defaultSupervisionHazards)
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
