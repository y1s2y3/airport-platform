const PATROL_KEY = 'coc-admin-patrol-devices'
const HELMET_KEY = 'coc-admin-smart-helmets'
const SUPERVISION_KEY = 'coc-admin-supervision-meetings'

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
    title: '三跑道项目监理例会（6月第3周）',
    project: '三跑道',
    uploadTime: '2026-06-24 16:30',
    hazardCount: 5,
    status: '已归档',
    fileName: '三跑道监理例会_20260624.pdf',
  },
  {
    id: 'SM-002',
    title: 'T2 质量安全问题专题会议纪要',
    project: 'T2',
    uploadTime: '2026-06-23 11:05',
    hazardCount: 3,
    status: '识别中',
    fileName: 'T2质量专题_20260623.docx',
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

export function getSupervisionMeetings() {
  return readList(SUPERVISION_KEY, defaultSupervisionMeetings)
}

export function addSupervisionMeeting(record) {
  const list = getSupervisionMeetings()
  const entry = {
    id: `SM-${Date.now()}`,
    title: record.title || record.fileName?.replace(/\.[^.]+$/, '') || '监理会议纪要',
    project: record.project || '待识别',
    uploadTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    hazardCount: 0,
    status: '识别中',
    fileName: record.fileName || '',
  }
  list.unshift(entry)
  writeList(SUPERVISION_KEY, list)
  return entry
}
