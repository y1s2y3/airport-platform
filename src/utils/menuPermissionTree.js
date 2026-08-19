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
 * 含：任务单、提示函、处罚单、黑红榜单、日志管理、菜单管理
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
  /** 视频监控 · 指挥部统计 */
  'video-monitor-stats',
  /** 巡检管理：看板 / 任务下发 / 检查项仅指挥部维护 */
  'safety-dashboard',
  'safety-plan',
  'safety-check-items',
  /** 人员实名制 · 指挥部仅保留：实名制统计 / 实名制配置 / 劳务黑名单 */
  'labor-realname-stats',
  'labor-warning-config',
  'labor-blacklist',
  /** 质量看板（指挥部专属一级菜单） */
  'quality-board',
  'brand-approval-stats',
  'qm-dashboard',
  'mat-dashboard',
  /** 指挥部轨迹系统列表（挂在智慧工地监管下） */
  'labor-track-system',
  'vehicle-track-system',
  /** 安全看板（指挥部专属一级菜单） */
  'safety-board',
  /** 指挥部 · 施工现场管理（一级；二级为巡检 / 施工作业） */
  'hq-site-construction',
  'hq-work-manage',
  /** 指挥部 · 智慧工地监管（一级；二级为人员 / 车辆 / 机械 / 危大） */
  'hq-smart-site',
  'hq-vehicle',
  'vehicle-track-config',
  /**
   * 原指挥部「视频监控」「车辆管理」一级已删除；
   * 实名制统计 / 人员轨迹系统挂在「智慧工地监管 / 人员实名制管理」；
   * 车辆管理看板 / 车辆轨迹系统挂在「智慧工地监管 / 车辆管理」（看板仅指挥部）；其余统计/告警挂在安全看板。
   * 项目侧能力在「智慧工地监管」下。
   */
  'video-monitor',
  'vehicle',
  /**
   * 以下原一级在指挥部已降为二级包装：
   * - labor / machine-supervise / major-hazard →「智慧工地监管」
   * - safety-inspection →「施工现场管理」
   * 项目侧用 smart-* / site-* 包装，仍用 HQ_ONLY 隐藏这些根 key，避免与项目包装重复。
   */
  'labor',
  'safety-inspection',
  'machine-supervise',
  'major-hazard',
])

/**
 * 仅项目层级展示的菜单（企业/指挥部侧栏与指挥部角色授权树均不展示）
 * 含：视频预览/台账/分组/离线通知配置等项目级视频能力
 */
export const PROJECT_ONLY_MENU_KEYS = new Set([
  'video-monitor-preview',
  'video-monitor-ledger',
  'video-monitor-group',
  'video-monitor-offline-notify',
  'app-video',
  'app-video-list',
  'app-video-device',
  'app-video-group',
  /** 质量验评 · 项目执行（指挥部取消「质量验评」一级；「质量验评看板」仅指挥部「质量看板」可见） */
  'quality-inspect',
  'qm-wbs-tree',
  'qm-plan-list',
  'qm-form-fill',
  'qm-form-fill-deep',
  'qm-special-deep',
  'qm-complete-deep',
  'qm-archive-mgmt',
  'qm-archive-fill',
  'qm-node-archive-list',
  'qm-approver-config',
  'qm-app-approve',
  'qm-seal-user',
  /** 品牌报审（一级菜单）· 项目执行；审批走个人中心待办 */
  'brand-approval',
  'brand-ledger',
  'brand-application',
  'brand-library',
  'brand-material',
  /** 样板管理 · 项目执行（指挥部改由「质量看板」看样板台账） */
  'sample-mgmt',
  'sample-material-app',
  'sample-material-approve',
  'sample-process-app',
  'sample-process-approve',
  /** 材料设备进场 · 项目执行（进场统计仅指挥部「质量看板」） */
  'mat-entry-mgmt',
  'mat-ledger',
  'mat-application',
  'mat-exit',
  'mobile-mat-entry',
  'mobile-mat-exit',
  'app-mat-entry',
  'app-mobile-mat-entry',
  'app-mobile-mat-exit',
  /** 设备进场（已并入材料设备进场；旧入口下线） */
  'eq-entry-mgmt',
  'eq-ledger',
  'eq-application',
  /** 实模一致验收 · 仅项目级（指挥部本期无入口；单层菜单） */
  'asbuilt-list',
  'asbuilt-edit',
  'asbuilt-detail',
  /** 人员实名制 · 项目执行（指挥部仅留：统计 / 配置 / 黑名单） */
  'labor-dashboard',
  'labor-realname',
  'labor-personnel-track',
  'labor-attendance-detail',
  'labor-warning-list',
  'labor-device-manage',
  /** 车辆管理 · 项目执行（指挥部：智慧工地监管 / 车辆管理看看板与轨迹系统；轨迹跳转仅项目侧菜单） */
  'vehicle-access',
  'vehicle-track',
  'vehicle-registry',
  'vehicle-device',
  'app-vehicle-access',
  'app-vehicle-warning',
  /** 巡检管理 · 人员配置 / 整改复查(移动端)仅项目层；巡检管理(移动端)/消息中心(移动端)/人员个人中心(移动端)指挥部/项目均可见 */
  'safety-inspector-config',
  'mobile-rectify',
  'app-mobile-rectify',
  /** 机械设备台账 · 项目维护（登记进场 machine-entry-manage 两端共用：指挥部在安全看板） */
  'machine-ledger',
  'machine-type-maintain',
  /** 机械设备监管 · 项目维护（指挥部隐藏监测设备管理、告警配置） */
  'device-manage',
  'alert-config',
  /** 危大工程监测 · 项目维护（指挥部隐藏监测区域/设备绑定） */
  'hazard-manage',
  'device-binding',
  /** 项目级菜单包装：智慧工地监管（含危大监测/告警配置） / 施工现场管理 / 施工质量管控 */
  'smart-site',
  'smart-labor',
  'smart-vehicle',
  'smart-machine-supervise',
  'smart-video-monitor',
  'site-construction',
  'site-work-declare',
  'site-safety-inspection',
  'site-major-hazard',
  'construction-quality',
  'ai-app',
  /** 基础数据 · 项目级工程分解与施工部位 */
  'bd-entity-breakdown',
  'bd-construction-location',
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
