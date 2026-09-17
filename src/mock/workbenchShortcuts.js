/**
 * 工作台 · 常用功能入口（手动配置）
 * 指挥部 / 项目分层存储；选项来自当前层级侧栏最末级菜单
 */

import {
  MENU_SCOPE_HQ,
  MENU_SCOPE_PROJECT,
  filterMenuByLevel,
  menuTree,
  resolveMenuTree,
} from '../config/menu.js'
import { SAMPLE_APPROVE_MENU_KEYS } from '../utils/sampleHiddenMenuKeys.js'

const STORAGE_KEY = 'workbench-shortcuts-v1'
const EXCLUDED_KEYS = new Set(['workbench'])

/** 工作台常用功能入口上限（指挥部 / 项目各自独立计数） */
export const MAX_SHORTCUT_COUNT = 10

/** 首次进入时的默认入口（之后以本地配置为准；条数不得超过 MAX_SHORTCUT_COUNT） */
export const DEFAULT_SHORTCUT_KEYS = {
  hq: [
    'personal-center',
    'safety-task-manage',
    'safety-hazard',
    'qm-dashboard',
    'brand-approval-stats',
    'mat-dashboard',
    'labor-realname-stats',
    'video-monitor-stats',
    'coc-admin-notice',
    'alert-record',
  ],
  project: [
    'personal-center',
    'safety-task-manage',
    'safety-hazard',
    'qm-form-fill-deep',
    'brand-application',
    'mat-application',
    'labor-realname',
    'labor-warning-list',
    'video-monitor-preview',
    'alert-record',
  ],
}

const ICON_THEME = {
  Notebook: { iconBg: '#f3e5f5', iconColor: '#8e24aa' },
  DocumentChecked: { iconBg: '#e6f4ff', iconColor: '#1677ff' },
  Warning: { iconBg: '#fff1f0', iconColor: '#e53935' },
  DataAnalysis: { iconBg: '#fff7e6', iconColor: '#fa8c16' },
  Medal: { iconBg: '#f6ffed', iconColor: '#52c41a' },
  Box: { iconBg: '#e6f4ff', iconColor: '#1677ff' },
  User: { iconBg: '#e8f5e9', iconColor: '#43a047' },
  Bell: { iconBg: '#fff7e6', iconColor: '#fa8c16' },
  VideoCamera: { iconBg: '#e0f7fa', iconColor: '#00acc1' },
  Connection: { iconBg: '#fce4ec', iconColor: '#c2185b' },
  WarnTriangleFilled: { iconBg: '#fff1f0', iconColor: '#e53935' },
  DataBoard: { iconBg: '#e6f4ff', iconColor: '#1677ff' },
  Cpu: { iconBg: '#f3e5f5', iconColor: '#7b1fa2' },
  MapLocation: { iconBg: '#e8f5e9', iconColor: '#2e7d32' },
  Collection: { iconBg: '#fff7e6', iconColor: '#d48806' },
  OfficeBuilding: { iconBg: '#e8eaf6', iconColor: '#3f51b5' },
  Iphone: { iconBg: '#e3f2fd', iconColor: '#1565c0' },
  Document: { iconBg: '#f5f5f5', iconColor: '#616161' },
}

const FALLBACK_PALETTE = [
  { iconBg: '#e6f4ff', iconColor: '#1677ff' },
  { iconBg: '#fff7e6', iconColor: '#fa8c16' },
  { iconBg: '#f6ffed', iconColor: '#52c41a' },
  { iconBg: '#fff1f0', iconColor: '#e53935' },
  { iconBg: '#f3e5f5', iconColor: '#8e24aa' },
  { iconBg: '#e0f7fa', iconColor: '#00acc1' },
]

function levelKey(isHq) {
  return isHq ? MENU_SCOPE_HQ : MENU_SCOPE_PROJECT
}

function stripHidden(items = []) {
  return items
    .filter((item) => !EXCLUDED_KEYS.has(item.key) && !SAMPLE_APPROVE_MENU_KEYS.has(item.key))
    .map((item) =>
      item.children?.length ? { ...item, children: stripHidden(item.children) } : item,
    )
    .filter((item) => !item.children || item.children.length > 0)
}

/** 当前层级可选菜单树（与侧栏同口径，不含工作台自身） */
export function getWorkbenchMenuTree(isHq) {
  const level = levelKey(isHq)
  return stripHidden(resolveMenuTree(filterMenuByLevel(menuTree, level), level))
}

function walkLeaves(items, ancestorIcon, out) {
  for (const item of items) {
    const icon = item.icon || ancestorIcon
    if (item.children?.length) {
      walkLeaves(item.children, icon, out)
    } else if (item.path) {
      out.push({
        key: item.key,
        label: item.label,
        path: item.path,
        query: item.query,
        icon: icon || 'Document',
        openInNewTab: Boolean(item.openInNewTab),
      })
    }
  }
  return out
}

export function listWorkbenchMenuLeaves(isHq) {
  return walkLeaves(getWorkbenchMenuTree(isHq), '', [])
}

export function buildWorkbenchTreeData(isHq) {
  const toNode = (item) => {
    const isLeaf = Boolean(item.path) && !item.children?.length
    return {
      key: item.key,
      label: item.label,
      isLeaf,
      disabled: !isLeaf,
      children: item.children?.length ? item.children.map(toNode) : undefined,
    }
  }
  return getWorkbenchMenuTree(isHq).map(toNode)
}

function themeFor(icon, key) {
  if (ICON_THEME[icon]) return ICON_THEME[icon]
  let hash = 0
  for (const ch of String(key || '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]
}

function normalizeKeys(raw) {
  if (!Array.isArray(raw)) return null
  const seen = new Set()
  const keys = []
  for (const item of raw) {
    const key = String(item || '').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    keys.push(key)
    if (keys.length >= MAX_SHORTCUT_COUNT) break
  }
  return keys
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { hq: null, project: null }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { hq: null, project: null }
    return {
      hq: normalizeKeys(parsed.hq),
      project: normalizeKeys(parsed.project),
    }
  } catch {
    return { hq: null, project: null }
  }
}

function writeStore(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function loadWorkbenchShortcutKeys(isHq) {
  const level = levelKey(isHq)
  const stored = readStore()[level]
  if (stored) return stored
  return [...DEFAULT_SHORTCUT_KEYS[level]]
}

/**
 * 保存当前层级入口。
 * keepExistingOrder：勾选弹窗用，保留原顺序，新勾选的追加在后。
 * 拖动排序 / 移除时不要开，按传入 keys 原样保存。
 * @param {boolean} isHq
 * @param {string[]} keys
 * @param {{ keepExistingOrder?: boolean }} [opts]
 */
export function saveWorkbenchShortcutKeys(isHq, keys, opts = {}) {
  const level = levelKey(isHq)
  const store = readStore()
  const nextKeys = normalizeKeys(keys) || []
  let ordered = nextKeys
  if (opts.keepExistingOrder) {
    const prev = store[level] || loadWorkbenchShortcutKeys(isHq)
    const nextSet = new Set(nextKeys)
    const kept = prev.filter((key) => nextSet.has(key))
    const added = nextKeys.filter((key) => !kept.includes(key))
    ordered = [...kept, ...added].slice(0, MAX_SHORTCUT_COUNT)
  }
  writeStore({
    hq: isHq ? ordered : store.hq,
    project: isHq ? store.project : ordered,
  })
  return ordered
}

/**
 * @param {boolean} isHq
 * @param {string[]} [keys]
 */
export function listWorkbenchShortcuts(isHq, keys) {
  const selected = keys ?? loadWorkbenchShortcutKeys(isHq)
  const byKey = new Map(listWorkbenchMenuLeaves(isHq).map((item) => [item.key, item]))
  return selected
    .map((key) => {
      const item = byKey.get(key)
      if (!item) return null
      const theme = themeFor(item.icon, item.key)
      return {
        key: item.key,
        label: item.label,
        path: item.path,
        query: item.query,
        icon: item.icon,
        openInNewTab: item.openInNewTab,
        iconBg: theme.iconBg,
        iconColor: theme.iconColor,
      }
    })
    .filter(Boolean)
}
