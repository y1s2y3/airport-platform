import { buildProjects, FOCUS_PROJECT_ID } from '../mock/data.js'

const NVR_KEY = 'coc-admin-nvr-devices'
const SEED_FLAG = 'coc-admin-nvr-devices-v1'

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
  const projects = buildProjects().filter((p) => p.status === '在建' || p.id === FOCUS_PROJECT_ID)
  return projects.slice(0, 6).map((project, index) => ({
    id: `NVR-${String(index + 1).padStart(3, '0')}`,
    name: `${project.shortName || project.name} NVR`,
    projectId: project.id,
    project: project.shortName || project.name,
    ip: `192.168.${10 + (index % 5)}.${100 + index}`,
    port: 8000,
    channelCount: project.cameraCount || 16,
    usedChannels: project.cameraCount || 0,
    username: 'admin',
    online: index % 5 !== 4,
    lastSync: index % 5 !== 4
      ? new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      : '',
    remark: '',
  }))
}

export function ensureNvrDeviceSeed() {
  if (localStorage.getItem(SEED_FLAG)) return
  if (!readList()) {
    writeList(buildDefaultNvrs())
  }
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
