import { buildProjects } from '../mock/data.js'
import { AREA_OPTIONS, getProjectVideoDevices, ensureVideoDeviceLedgerSeed } from './videoDeviceLedgerStorage.js'

const STORAGE_KEY = 'coc-video-device-groups'
const SEED_FLAG = 'coc-video-device-groups-v1'
export const VIDEO_GROUP_CHANGE_EVENT = 'coc-video-device-groups-change'

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
  window.dispatchEvent(new CustomEvent(VIDEO_GROUP_CHANGE_EVENT))
}

function createId(prefix = 'grp') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function buildSeedGroups(projectId) {
  const devices = getProjectVideoDevices(projectId)
  return AREA_OPTIONS.slice(0, 2).map((area, index) => {
    const matched = devices.filter((d) => d.area === area.value).map((d) => d.id)
    return {
      id: `${projectId}-grp-${index + 1}`,
      name: area.value,
      deviceIds: matched,
      parentId: null,
      children: [],
    }
  })
}

export function ensureVideoDeviceGroupSeed() {
  if (localStorage.getItem(SEED_FLAG)) return
  ensureVideoDeviceLedgerSeed()
  const map = {}
  buildProjects().forEach((project) => {
    map[project.id] = buildSeedGroups(project.id)
  })
  writeAll(map)
  localStorage.setItem(SEED_FLAG, '1')
}

export function getProjectDeviceGroups(projectId) {
  ensureVideoDeviceGroupSeed()
  if (!projectId) return []
  const map = readAll() || {}
  if (!Array.isArray(map[projectId])) {
    map[projectId] = buildSeedGroups(projectId)
    writeAll(map)
  }
  return map[projectId]
}

function saveProjectGroups(projectId, groups) {
  const map = readAll() || {}
  map[projectId] = groups
  writeAll(map)
}

export function addDeviceGroup(projectId, name, parentId = null) {
  const groups = getProjectDeviceGroups(projectId)
  const group = {
    id: createId('grp'),
    name: String(name || '').trim() || '未命名分组',
    deviceIds: [],
    parentId,
    children: [],
  }
  if (parentId) {
    const parent = findGroup(groups, parentId)
    if (parent) {
      parent.children = parent.children || []
      parent.children.push(group)
      saveProjectGroups(projectId, groups)
      return group
    }
  }
  groups.push(group)
  saveProjectGroups(projectId, groups)
  return group
}

function findGroup(groups, groupId) {
  for (const group of groups) {
    if (group.id === groupId) return group
    if (group.children?.length) {
      const found = findGroup(group.children, groupId)
      if (found) return found
    }
  }
  return null
}

export function renameDeviceGroup(projectId, groupId, name) {
  const groups = getProjectDeviceGroups(projectId)
  const group = findGroup(groups, groupId)
  if (!group) return null
  group.name = String(name || '').trim() || group.name
  saveProjectGroups(projectId, groups)
  return group
}

export function removeDeviceGroup(projectId, groupId) {
  const groups = getProjectDeviceGroups(projectId)
  function removeFrom(list) {
    const idx = list.findIndex((g) => g.id === groupId)
    if (idx >= 0) {
      list.splice(idx, 1)
      return true
    }
    for (const item of list) {
      if (item.children?.length && removeFrom(item.children)) return true
    }
    return false
  }
  if (removeFrom(groups)) saveProjectGroups(projectId, groups)
}

export function setGroupDeviceIds(projectId, groupId, deviceIds = []) {
  const groups = getProjectDeviceGroups(projectId)
  const group = findGroup(groups, groupId)
  if (!group) return null
  group.deviceIds = [...deviceIds]
  saveProjectGroups(projectId, groups)
  return group
}

export function removeDevicesFromGroup(projectId, groupId, deviceIds = []) {
  const idSet = new Set(deviceIds)
  const groups = getProjectDeviceGroups(projectId)
  const group = findGroup(groups, groupId)
  if (!group) return null
  group.deviceIds = (group.deviceIds || []).filter((id) => !idSet.has(id))
  saveProjectGroups(projectId, groups)
  return group
}

export function flattenGroups(groups = [], depth = 0) {
  const rows = []
  for (const group of groups) {
    rows.push({ ...group, depth })
    if (group.children?.length) {
      rows.push(...flattenGroups(group.children, depth + 1))
    }
  }
  return rows
}

export function countGroupDevices(group) {
  const self = group.deviceIds?.length || 0
  const child = (group.children || []).reduce((sum, c) => sum + countGroupDevices(c), 0)
  return self + child
}
