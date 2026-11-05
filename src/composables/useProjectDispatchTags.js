import { shallowRef } from 'vue'
import { projectList } from '../mock/projectBasicInfo.js'

export const PROJECT_DISPATCH_TAG_KEY = 'airport-project-dispatch-tags-v1'
function readTags() {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(PROJECT_DISPATCH_TAG_KEY)
  if (!raw) return {}
  const value = JSON.parse(raw)
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.values(value).some((item) => typeof item !== 'boolean')) throw new Error('调度标签配置格式异常，请先核对本地数据')
  return value
}
function initialTags() { try { return readTags() } catch { return {} } }
const tags = shallowRef(initialTags())
export function projectDispatchTag(projectId) { return tags.value[projectId] === true }
/** Read a fresh source snapshot; callers may fall back when storage/configuration is unavailable. */
export function readProjectDispatchTags() { return readTags() }
export function updateProjectDispatchTag(projectId, enabled) {
  if (!projectList.some((project) => project.id === projectId)) throw new Error('项目不存在，调度标签未保存')
  if (typeof enabled !== 'boolean') throw new Error('调度标签值无效')
  const next = { ...readTags(), [projectId]: enabled }
  // Persist before updating the visible value; failed writes must not look successful.
  window.localStorage.setItem(PROJECT_DISPATCH_TAG_KEY, JSON.stringify(next))
  tags.value = next
}
function refresh(event) {
  if (event.key !== null && event.key !== PROJECT_DISPATCH_TAG_KEY) return
  try { tags.value = readTags() } catch { /* Preserve the last valid visible configuration. */ }
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', refresh)
  if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener('storage', refresh))
}
