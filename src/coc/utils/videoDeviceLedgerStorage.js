import { buildProjects } from '../mock/data.js'

const STORAGE_KEY = 'coc-video-device-ledger'
const SEED_FLAG = 'coc-video-device-ledger-v1'
export const VIDEO_DEVICE_CHANGE_EVENT = 'coc-video-device-ledger-change'

export const ACCESS_TYPE_OPTIONS = [{ label: 'GB28181', value: 'GB28181' }]

export const DEVICE_TYPE_OPTIONS = [
  { label: '球机', value: '球机' },
  { label: '枪机', value: '枪机' },
  { label: '鹰眼', value: '鹰眼' },
]

export const DEVICE_STATUS_OPTIONS = [
  { label: '在线', value: '在线' },
  { label: '离线', value: '离线' },
  { label: '未激活', value: '未激活' },
]

export const BUSINESS_STATUS_OPTIONS = [
  { label: '启用', value: '启用' },
  { label: '停用', value: '停用' },
  { label: '检修', value: '检修' },
]

export const USAGE_OPTIONS = [
  { label: '施工监控', value: '施工监控' },
  { label: '出入口', value: '出入口' },
  { label: '塔吊监控', value: '塔吊监控' },
  { label: '周界防护', value: '周界防护' },
]

export const AREA_OPTIONS = [
  { label: '入口A', value: '入口A' },
  { label: '入口B', value: '入口B' },
  { label: '施工区', value: '施工区' },
  { label: '材料堆场', value: '材料堆场' },
  { label: '办公区', value: '办公区' },
]

const VENDORS = ['海康威视', '大华', '萤石', '华为']

function nowText() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writeAll(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  window.dispatchEvent(new CustomEvent(VIDEO_DEVICE_CHANGE_EVENT))
}

function buildSeedDevices(project) {
  const short = project.shortName || project.name
  const cameras = project.cameras || []
  const count = Math.max(6, Math.min(12, cameras.length || 8))
  return Array.from({ length: count }, (_, i) => {
    const type = DEVICE_TYPE_OPTIONS[i % DEVICE_TYPE_OPTIONS.length].value
    const area = AREA_OPTIONS[i % AREA_OPTIONS.length].value
    const onlineRoll = i % 7
    const deviceStatus = onlineRoll === 6 ? '未激活' : onlineRoll === 5 ? '离线' : '在线'
    const cam = cameras[i]
    return {
      id: `${project.id}-vd-${String(i + 1).padStart(3, '0')}`,
      accessType: 'GB28181',
      deviceId: cam?.id || `${project.id.replace('p-', 'DEV')}${String(i + 1).padStart(4, '0')}`,
      channelId: String(i + 1).padStart(2, '0'),
      deviceType: type,
      parentDevice: i === 0 ? '' : `${short}-NVR-01`,
      deviceName: cam?.name || `${short}-${area}-${type}-${i + 1}`,
      supportPtz: type === '球机' || type === '鹰眼',
      businessStatus: deviceStatus === '未激活' ? '停用' : i % 9 === 0 ? '检修' : '启用',
      vendor: VENDORS[i % VENDORS.length],
      area,
      usage: USAGE_OPTIONS[i % USAGE_OPTIONS.length].value,
      application: USAGE_OPTIONS[i % USAGE_OPTIONS.length].value,
      remark: '',
      deviceStatus,
      createdAt: `2026-0${(i % 6) + 1}-${String((i % 27) + 1).padStart(2, '0')} 09:${String(10 + i).padStart(2, '0')}:00`,
      projectId: project.id,
    }
  })
}

export function ensureVideoDeviceLedgerSeed() {
  if (localStorage.getItem(SEED_FLAG)) return
  const map = {}
  buildProjects().forEach((project) => {
    map[project.id] = buildSeedDevices(project)
  })
  writeAll(map)
  localStorage.setItem(SEED_FLAG, '1')
}

export function getProjectVideoDevices(projectId) {
  ensureVideoDeviceLedgerSeed()
  if (!projectId) return []
  const map = readAll() || {}
  return Array.isArray(map[projectId]) ? map[projectId] : []
}

export function saveProjectVideoDevice(projectId, record) {
  ensureVideoDeviceLedgerSeed()
  const map = readAll() || {}
  const list = Array.isArray(map[projectId]) ? [...map[projectId]] : []
  const entry = {
    ...emptyVideoDevice(record),
    id: record.id || `${projectId}-vd-${Date.now()}`,
    projectId,
    createdAt: record.createdAt || nowText(),
    application: record.application || record.usage || '',
  }
  const idx = list.findIndex((item) => item.id === entry.id)
  if (idx >= 0) list[idx] = { ...list[idx], ...entry }
  else list.unshift(entry)
  map[projectId] = list
  writeAll(map)
  return entry
}

export function removeProjectVideoDevices(projectId, ids = []) {
  ensureVideoDeviceLedgerSeed()
  const idSet = new Set(ids)
  const map = readAll() || {}
  map[projectId] = (map[projectId] || []).filter((item) => !idSet.has(item.id))
  writeAll(map)
}

export function emptyVideoDevice(row = {}) {
  return {
    id: row.id || '',
    accessType: row.accessType || 'GB28181',
    deviceId: row.deviceId || '',
    channelId: row.channelId || '',
    deviceType: row.deviceType || '',
    parentDevice: row.parentDevice || '',
    deviceName: row.deviceName || '',
    supportPtz: row.supportPtz ?? true,
    businessStatus: row.businessStatus || '启用',
    vendor: row.vendor || '',
    area: row.area || '',
    usage: row.usage || '',
    application: row.application || row.usage || '',
    remark: row.remark || '',
    deviceStatus: row.deviceStatus || '未激活',
    createdAt: row.createdAt || '',
    projectId: row.projectId || '',
  }
}

export function getDeviceLedgerStats(devices = []) {
  const total = devices.length
  const online = devices.filter((d) => d.deviceStatus === '在线').length
  const offline = devices.filter((d) => d.deviceStatus === '离线').length
  const inactive = devices.filter((d) => d.deviceStatus === '未激活').length
  const typeSet = new Set(devices.map((d) => d.deviceType).filter(Boolean))
  const onlineRate = total ? Math.round((online / total) * 100) : 0
  return { total, online, offline, inactive, typeCount: typeSet.size, onlineRate }
}

export function getPreviewAreaGroups(devices = []) {
  const map = new Map()
  for (const device of devices) {
    const area = device.area || '未分区'
    if (!map.has(area)) map.set(area, [])
    map.get(area).push(device)
  }
  return [...map.entries()].map(([name, list]) => {
    const online = list.filter((d) => d.deviceStatus === '在线').length
    return { name, total: list.length, online, devices: list }
  })
}
