import { menuTree, filterMenuByLevel } from '../config/menu'
import { appMenu } from '../config/appMenu'

export { MENU_SCOPE_HQ, MENU_SCOPE_PROJECT, filterMenuByLevel } from '../config/menu'

export const MENU_SCOPE_ROOTS = [
  { id: 'hq', label: '指挥部层级' },
  { id: 'project', label: '项目层级' },
]

/** 菜单项 → 权限树节点（scope 前缀 id） */
export function mapMenuItemsToTree(items = [], scope = '') {
  return items.map((item) => {
    const node = {
      id: scope ? buildScopedMenuId(scope, item.key) : item.key,
      label: item.label,
      rawId: item.key,
      scope: scope || '',
    }
    if (item.children?.length) {
      node.children = mapMenuItemsToTree(item.children, scope)
    }
    return node
  })
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

/** 同一套菜单分别挂在「指挥部层级」「项目层级」根节点下（按 levels 各自过滤） */
export function wrapMenuTreeByScope(items = []) {
  return MENU_SCOPE_ROOTS.map((root) => ({
    id: `scope-${root.id}`,
    label: root.label,
    scope: root.id,
    children: mapMenuItemsToTree(filterMenuByLevel(items, root.id), root.id),
  }))
}

export const webMenuPermissionTree = wrapMenuTreeByScope(menuTree)
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
  const scope = level === '指挥部' ? 'hq' : level === '项目' ? 'project' : ''
  if (!scope) return [...ids]
  return ids.map((id) => {
    if (!id || String(id).includes(':') || String(id).startsWith('scope-')) return id
    return buildScopedMenuId(scope, id)
  })
}
