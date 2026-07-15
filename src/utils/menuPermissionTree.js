import { sidebarMenu } from '../config/menu'
import { appMenu } from '../config/appMenu'

export const MENU_SCOPE_HQ = 'hq'
export const MENU_SCOPE_PROJECT = 'project'

export const MENU_SCOPE_ROOTS = [
  { id: MENU_SCOPE_HQ, label: '指挥部层级' },
  { id: MENU_SCOPE_PROJECT, label: '项目层级' },
]

/**
 * 仅指挥部/企业层级展示的菜单（项目级侧栏与项目角色授权树均不展示）
 * 含：任务单、提示函、处罚单、黑红榜单、日志管理及其子项
 */
export const HQ_ONLY_MENU_KEYS = new Set([
  'coc-admin-notice',
  'coc-admin-reminder',
  'coc-admin-penalty',
  'coc-admin-redblack',
  'sys-log',
  'log-system',
  'log-login',
  'log-operation',
])

/**
 * 仅项目层级展示的菜单（企业/指挥部侧栏与指挥部角色授权树均不展示）
 * 含：视频监控及其子项
 */
export const PROJECT_ONLY_MENU_KEYS = new Set([
  'video-monitor',
  'video-monitor-preview',
  'video-monitor-ledger',
  'video-monitor-group',
  'video-monitor-list',
  'video-monitor-device',
  'app-video',
  'app-video-list',
  'app-video-device',
  'app-video-group',
])

export function isHqOnlyMenuKey(key) {
  return HQ_ONLY_MENU_KEYS.has(key)
}

export function isProjectOnlyMenuKey(key) {
  return PROJECT_ONLY_MENU_KEYS.has(key)
}

/** 按层级过滤菜单树 */
export function filterMenuByScope(items = [], scope = '') {
  if (scope !== MENU_SCOPE_PROJECT && scope !== MENU_SCOPE_HQ) return items
  return items
    .filter((item) => {
      if (scope === MENU_SCOPE_PROJECT && isHqOnlyMenuKey(item.key)) return false
      if (scope === MENU_SCOPE_HQ && isProjectOnlyMenuKey(item.key)) return false
      return true
    })
    .map((item) => {
      if (!item.children?.length) return item
      const children = filterMenuByScope(item.children, scope)
      return { ...item, children }
    })
    .filter((item) => !item.children || item.children.length > 0)
}

export function buildScopedMenuId(scope, key) {
  return `${scope}:${key}`
}

export function parseScopedMenuId(scopedId) {
  const text = String(scopedId || '')
  const idx = text.indexOf(':')
  if (idx <= 0) return { scope: '', key: text }
  return { scope: text.slice(0, idx), key: text.slice(idx + 1) }
}

export function mapMenuItemsToTree(items = [], scope = '') {
  return items.map((item) => {
    const rawId = item.key
    const node = {
      id: scope ? buildScopedMenuId(scope, rawId) : rawId,
      label: item.label,
      rawId,
      scope: scope || '',
    }
    if (item.children?.length) {
      node.children = mapMenuItemsToTree(item.children, scope)
    }
    return node
  })
}

/** 同一套菜单分别挂在「指挥部层级」「项目层级」根节点下（各自剔除对方专属菜单） */
export function wrapMenuTreeByScope(items = []) {
  return MENU_SCOPE_ROOTS.map((root) => ({
    id: `scope-${root.id}`,
    label: root.label,
    scope: root.id,
    children: mapMenuItemsToTree(filterMenuByScope(items, root.id), root.id),
  }))
}

export const webMenuPermissionTree = wrapMenuTreeByScope(sidebarMenu)
export const appMenuPermissionTree = wrapMenuTreeByScope(appMenu)

export function collectMenuTreeKeys(tree = []) {
  const keys = []
  function walk(nodes) {
    nodes.forEach((node) => {
      keys.push(node.id)
      if (node.children?.length) walk(node.children)
    })
  }
  walk(tree)
  return keys
}

export function collectMenuTreeLeafKeys(tree = []) {
  const keys = []
  function walk(nodes) {
    nodes.forEach((node) => {
      if (node.children?.length) walk(node.children)
      else keys.push(node.id)
    })
  }
  walk(tree)
  return keys
}

/** 按角色级别把旧菜单 id 迁移到带 scope 前缀的 id */
export function migrateMenuIdsByLevel(ids = [], level = '') {
  const scope = level === '指挥部' ? MENU_SCOPE_HQ : level === '项目' ? MENU_SCOPE_PROJECT : ''
  if (!scope) return [...ids]
  return ids.map((id) => {
    if (!id || String(id).includes(':') || String(id).startsWith('scope-')) return id
    return buildScopedMenuId(scope, id)
  })
}
