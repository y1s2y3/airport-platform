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
 * 含：任务单、提示函、处罚单、黑红榜单、日志管理、菜单管理、视频离线通知配置
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
  'sys-menu',
  'video-monitor-offline-notify',
  /** 视频监控 · 指挥部统计 */
  'video-monitor-stats',
  /** 安全巡检：看板 / 计划 / 检查项仅指挥部维护 */
  'safety-dashboard',
  'safety-plan',
  'safety-check-items',
  /** 人员实名制 · 指挥部 */
  'labor-realname-stats',
  /** 品牌报审（一级菜单）· 企业主数据 */
  'brand-library',
  'brand-material',
  /** 材料进场管理 · 指挥部标准库 */
  'mat-library',
])

/**
 * 仅项目层级展示的菜单（企业/指挥部侧栏与指挥部角色授权树均不展示）
 * 含：视频预览/台账/分组等项目级视频能力（「视频监控」父级两端可见）
 */
export const PROJECT_ONLY_MENU_KEYS = new Set([
  'video-monitor-preview',
  'video-monitor-ledger',
  'video-monitor-group',
  'app-video',
  'app-video-list',
  'app-video-device',
  'app-video-group',
  /** 质量验评 · 项目执行 */
  'qm-wbs-tree',
  'qm-plan-list',
  'qm-form-fill',
  'qm-physical-deep',
  'qm-form-fill-deep',
  'qm-special-deep',
  'qm-complete-deep',
  'qm-approver-config',
  'qm-app-approve',
  /** 品牌报审（一级菜单）· 项目执行；审批走个人中心待办，无独立「报审审批」菜单 */
  'brand-ledger',
  'brand-application',
  /** 样板管理 · 项目执行（台账 sample-ledger 两端可见，不在此列） */
  'sample-material-app',
  'sample-material-approve',
  'sample-process-app',
  'sample-process-approve',
  /** 材料进场管理 · 项目执行（看板两端可见；标准库仅指挥部） */
  'mat-ledger',
  'mat-application',
  'mat-exit',
  /** 设备进场管理 · 项目执行（看板两端可见） */
  'eq-ledger',
  'eq-application',
  /** 人员实名制 · 项目执行（指挥部仅留统计/配置/黑名单；劳务看板两端可见） */
  'labor-realname',
  'labor-personnel-track',
  'labor-attendance-detail',
  'labor-salary-compare',
  'labor-warning-list',
  'labor-device-manage',
  /** 车辆管理 · 项目执行（指挥部仅留看板） */
  'vehicle-access',
  'vehicle-track',
  'vehicle-registry',
  'vehicle-device',
  'vehicle-warning-list',
  'app-vehicle-access',
  'app-vehicle-warning',
  /** 安全巡检 · 巡检人配置 / 整改复查(移动端)仅项目层；安全巡检(移动端)指挥部/项目均可见 */
  'safety-inspector-config',
  'mobile-rectify',
  'app-mobile-rectify',
  /** 机械设备台账 · 项目维护 */
  'machine-ledger',
  'machine-entry-manage',
  'machine-type-maintain',
  /** 机械设备监管 · 项目维护（指挥部隐藏监测设备管理、告警配置） */
  'device-manage',
  'alert-config',
  /** 危大工程监管 · 项目维护（指挥部隐藏管理/设备绑定） */
  'hazard-manage',
  'device-binding',
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
