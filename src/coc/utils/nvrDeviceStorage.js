import { buildProjects } from '../mock/data.js'

const NVR_KEY = 'coc-admin-nvr-devices'
/** v2：为全部项目生成 NVR 假数据 */
const SEED_FLAG = 'coc-admin-nvr-devices-v2-all-projects'

function readList() {
  try {
    const raw = localStorage.getItem(NVR_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeList(list) {
  localStorage.setItem(NVR_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent('coc-nvr-devices-change'))
}

function buildDefaultNvrs() {
  return buildProjects().map((project, index) => {
    const cameras = project.cameras || []
    const online = index % 7 !== 6
    return {
      id: `NVR-${String(index + 1).padStart(3, '0')}`,
      name: `${project.shortName || project.name} NVR-01`,
      projectId: project.id,
      project: project.shortName || project.name,
      ip: `192.168.${10 + (index % 40)}.${100 + (index % 140)}`,
      port: 8000,
      channelCount: Math.max(16, cameras.length || 8),
      usedChannels: cameras.length || 0,
      username: 'admin',
      online,
      lastSync: online
        ? new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
        : '',
      remark: `${project.status || '在建'}项目监控接入`,
    }
  })
}

export function ensureNvrDeviceSeed() {
  if (localStorage.getItem(SEED_FLAG)) return
  writeList(buildDefaultNvrs())
  localStorage.setItem(SEED_FLAG, '1')
}

export function getNvrDevices() {
  ensureNvrDeviceSeed()
  return readList() || buildDefaultNvrs()
}

export function saveNvrDevice(record) {
  const list = getNvrDevices()
  const entry = {
    ...emptyNvrDevice(record),
    id: record.id || `NVR-${Date.now()}`,
  }
  const idx = list.findIndex((item) => item.id === entry.id)
  if (idx >= 0) list[idx] = { ...list[idx], ...entry }
  else list.unshift(entry)
  writeList(list)
  return entry
}

export function removeNvrDevice(id) {
  const list = getNvrDevices().filter((item) => item.id !== id)
  writeList(list)
}

export function emptyNvrDevice(row = {}) {
  return {
    id: row.id || '',
    name: row.name || '',
    projectId: row.projectId || '',
    project: row.project || '',
    ip: row.ip || '',
    port: row.port ?? 8000,
    channelCount: row.channelCount ?? 16,
    usedChannels: row.usedChannels ?? 0,
    username: row.username || 'admin',
    online: row.online ?? true,
    lastSync: row.lastSync || '',
    remark: row.remark || '',
  }
}

export const NVR_DEVICES_CHANGE_EVENT = 'coc-nvr-devices-change'
