import { buildProjects, FOCUS_PROJECT_ID } from '../mock/data.js'
import { sortCamerasByOrder, mergeCameraOrder } from './cameraOrder.js'

const GROUPS_KEY = 'coc-admin-monitor-groups'
const CAMERAS_KEY = 'coc-admin-monitor-cameras'
const SEED_FLAG = 'coc-admin-monitor-groups-v1'
const CAMERAS_CHANGE_EVENT = 'coc-monitor-cameras-change'

let projectsCache = null

function readCameraStore() {
  try {
    const raw = localStorage.getItem(CAMERAS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeCameraStore(store) {
  localStorage.setItem(CAMERAS_KEY, JSON.stringify(store))
  projectsCache = null
  window.dispatchEvent(new CustomEvent(CAMERAS_CHANGE_EVENT))
}

function getProjectCameraConfig(projectId) {
  return readCameraStore()[projectId] || { order: [], overrides: {} }
}

function readAllGroups() {
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAllGroups(map) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(map))
  window.dispatchEvent(new CustomEvent('coc-monitor-groups-change'))
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function getMonitorProjects() {
  if (!projectsCache) {
    projectsCache = buildProjects().filter((p) => p.status === '在建' || p.id === FOCUS_PROJECT_ID)
  }
  return projectsCache
}

export function getMonitorProject(projectId) {
  return getMonitorProjects().find((p) => p.id === projectId) || null
}

export function getProjectCameras(projectId) {
  const project = getMonitorProject(projectId)
  if (!project) return []
  const config = getProjectCameraConfig(projectId)
  const merged = project.cameras.map((cam) => ({
    ...cam,
    ...(config.overrides?.[cam.id] || {}),
  }))
  const order = config.order?.length ? config.order : mergeCameraOrder(merged, [])
  return sortCamerasByOrder(merged, order)
}

export function saveProjectCamera(projectId, cameraId, patch) {
  const store = readCameraStore()
  const project = getMonitorProject(projectId)
  const config = store[projectId] || { order: [], overrides: {} }
  config.overrides = config.overrides || {}
  config.overrides[cameraId] = {
    ...(config.overrides[cameraId] || {}),
    ...patch,
  }
  if (!config.order?.length && project) {
    config.order = mergeCameraOrder(project.cameras, [])
  }
  store[projectId] = config
  writeCameraStore(store)
}

export function moveProjectCamera(projectId, cameraId, direction) {
  const store = readCameraStore()
  const project = getMonitorProject(projectId)
  if (!project) return
  const config = store[projectId] || { order: [], overrides: {} }
  let ids = config.order?.length
    ? [...config.order]
    : mergeCameraOrder(project.cameras, [])
  if (!ids.includes(cameraId)) {
    ids = mergeCameraOrder(project.cameras, ids)
  }
  const idx = ids.indexOf(cameraId)
  if (idx === -1) return
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= ids.length) return
  ;[ids[idx], ids[target]] = [ids[target], ids[idx]]
  config.order = ids
  store[projectId] = config
  writeCameraStore(store)
}

export function emptyCameraForm(camera) {
  return {
    id: camera?.id || '',
    name: camera?.name || '',
    location: camera?.location || '',
    type: camera?.type || 'bullet',
    online: camera?.online !== false,
    key: !!camera?.key,
  }
}

export function getCameraById(projectId, cameraId) {
  return getProjectCameras(projectId).find((c) => c.id === cameraId) || null
}

function buildDefaultGroup(project) {
  const ids = sortCamerasByOrder(project.cameras).map((c) => c.id)
  return {
    id: createId('grp'),
    name: '默认分组',
    cameraIds: ids.slice(0, Math.min(6, ids.length)),
    createdAt: new Date().toISOString(),
  }
}

export function ensureMonitorGroupSeed() {
  if (localStorage.getItem(SEED_FLAG)) return
  const focus = getMonitorProject(FOCUS_PROJECT_ID)
  const map = readAllGroups()
  if (focus && !map[FOCUS_PROJECT_ID]?.length) {
    map[FOCUS_PROJECT_ID] = [
      buildDefaultGroup(focus),
      {
        id: createId('grp'),
        name: '塔吊重点区',
        cameraIds: ['c05', 'c09', 'c14', 'c02'].filter((id) =>
          focus.cameras.some((c) => c.id === id),
        ),
        createdAt: new Date().toISOString(),
      },
    ]
    writeAllGroups(map)
  }
  localStorage.setItem(SEED_FLAG, '1')
}

export function getProjectGroups(projectId) {
  ensureMonitorGroupSeed()
  return readAllGroups()[projectId] || []
}

export function saveProjectGroups(projectId, groups) {
  const map = readAllGroups()
  map[projectId] = groups
  writeAllGroups(map)
}

export function addProjectGroup(projectId, name) {
  const groups = getProjectGroups(projectId)
  const group = {
    id: createId('grp'),
    name: name.trim() || `分组${groups.length + 1}`,
    cameraIds: [],
    createdAt: new Date().toISOString(),
  }
  saveProjectGroups(projectId, [...groups, group])
  return group
}

export function updateProjectGroup(projectId, groupId, patch) {
  const groups = getProjectGroups(projectId).map((g) =>
    g.id === groupId ? { ...g, ...patch, id: g.id } : g,
  )
  saveProjectGroups(projectId, groups)
  return groups.find((g) => g.id === groupId) || null
}

export function removeProjectGroup(projectId, groupId) {
  const groups = getProjectGroups(projectId).filter((g) => g.id !== groupId)
  saveProjectGroups(projectId, groups)
}

export function getGroupCameras(projectId, group) {
  const all = getProjectCameras(projectId)
  const map = new Map(all.map((c) => [c.id, c]))
  return (group?.cameraIds || [])
    .map((id) => map.get(id))
    .filter(Boolean)
}

export function setGroupCameraIds(projectId, groupId, cameraIds) {
  return updateProjectGroup(projectId, groupId, { cameraIds: [...cameraIds] })
}

export function moveGroupCamera(projectId, groupId, cameraId, direction) {
  const group = getProjectGroups(projectId).find((g) => g.id === groupId)
  if (!group) return
  const ids = [...group.cameraIds]
  const idx = ids.indexOf(cameraId)
  if (idx === -1) return
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= ids.length) return
  ;[ids[idx], ids[target]] = [ids[target], ids[idx]]
  setGroupCameraIds(projectId, groupId, ids)
}

export function cameraTypeLabel(type) {
  return type === 'ptz' ? '球机' : '枪机'
}

export { CAMERAS_CHANGE_EVENT as MONITOR_CAMERAS_CHANGE_EVENT }
