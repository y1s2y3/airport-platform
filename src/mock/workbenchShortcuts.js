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
const EXCLUDED_KEYS = new Set(['workbench', 'personal-center'])

/** 工作台常用功能入口上限（指挥部 / 项目各自独立计数） */
export const MAX_SHORTCUT_COUNT = 10

/** 首次进入时的默认入口（之后以本地配置为准；条数不得超过 MAX_SHORTCUT_COUNT） */
export const DEFAULT_SHORTCUT_KEYS = {
  hq: [
    'safety-task-manage',
    'safety-hazard',
    'qm-dashboard',
    'brand-approval-stats',
    'mat-dashboard',
    'labor-realname-stats',
    'video-monitor-stats',
    'coc-admin-notice',
    'alert-record',
    'bd-project-info',
  ],
  project: [
    'safety-task-manage',
    'safety-hazard',
    'qm-form-fill-deep',
    'brand-application',
    'mat-application',
    'labor-realname',
    'labor-warning-list',
    'video-monitor-preview',
    'alert-record',
    'engineering-work',
  ],
}

/** 彩色底 + 白色 icon（iconColor 固定白） */
const ICON_THEME = {
  Aim: { iconBg: '#c62828' },
  AlarmClock: { iconBg: '#ef6c00' },
  Avatar: { iconBg: '#43a047' },
  Bell: { iconBg: '#fa8c16' },
  BellFilled: { iconBg: '#e65100' },
  Bottom: { iconBg: '#5d4037' },
  Box: { iconBg: '#1677ff' },
  Briefcase: { iconBg: '#6d4c41' },
  Calendar: { iconBg: '#00897b' },
  Camera: { iconBg: '#455a64' },
  Cellphone: { iconBg: '#1565c0' },
  ChatDotRound: { iconBg: '#00838f' },
  ChatLineRound: { iconBg: '#00695c' },
  Checked: { iconBg: '#2e7d32' },
  CircleCheck: { iconBg: '#43a047' },
  CircleCloseFilled: { iconBg: '#c62828' },
  Collection: { iconBg: '#d48806' },
  CollectionTag: { iconBg: '#8d6e63' },
  Compass: { iconBg: '#0277bd' },
  Cpu: { iconBg: '#7b1fa2' },
  DataAnalysis: { iconBg: '#fa8c16' },
  DataBoard: { iconBg: '#1677ff' },
  DataLine: { iconBg: '#fb8c00' },
  Document: { iconBg: '#616161' },
  DocumentAdd: { iconBg: '#3949ab' },
  DocumentChecked: { iconBg: '#1677ff' },
  DocumentCopy: { iconBg: '#546e7a' },
  Download: { iconBg: '#1565c0' },
  EditPen: { iconBg: '#5c6bc0' },
  Failed: { iconBg: '#d32f2f' },
  Files: { iconBg: '#6d4c41' },
  FirstAidKit: { iconBg: '#c62828' },
  Flag: { iconBg: '#e53935' },
  Folder: { iconBg: '#8d6e63' },
  FolderChecked: { iconBg: '#5d4037' },
  FolderOpened: { iconBg: '#6d4c41' },
  Goods: { iconBg: '#00897b' },
  GoodsFilled: { iconBg: '#00796b' },
  Grid: { iconBg: '#5e35b1' },
  Guide: { iconBg: '#2e7d32' },
  Headset: { iconBg: '#c2185b' },
  Histogram: { iconBg: '#0288d1' },
  HomeFilled: { iconBg: '#1976d2' },
  House: { iconBg: '#3f51b5' },
  Iphone: { iconBg: '#1565c0' },
  Key: { iconBg: '#f9a825' },
  Lightning: { iconBg: '#f57f17' },
  Link: { iconBg: '#00838f' },
  List: { iconBg: '#546e7a' },
  Location: { iconBg: '#43a047' },
  LocationFilled: { iconBg: '#2e7d32' },
  Lock: { iconBg: '#455a64' },
  MagicStick: { iconBg: '#8e24aa' },
  Management: { iconBg: '#5c6bc0' },
  MapLocation: { iconBg: '#2e7d32' },
  Medal: { iconBg: '#52c41a' },
  Memo: { iconBg: '#6d4c41' },
  Menu: { iconBg: '#455a64' },
  Message: { iconBg: '#00838f' },
  Monitor: { iconBg: '#0277bd' },
  MuteNotification: { iconBg: '#78909c' },
  Notebook: { iconBg: '#8e24aa' },
  Notification: { iconBg: '#ef6c00' },
  Odometer: { iconBg: '#1565c0' },
  OfficeBuilding: { iconBg: '#3f51b5' },
  Operation: { iconBg: '#546e7a' },
  Opportunity: { iconBg: '#e65100' },
  Phone: { iconBg: '#0277bd' },
  Picture: { iconBg: '#8d6e63' },
  PictureFilled: { iconBg: '#8d6e63' },
  PictureRounded: { iconBg: '#a1887f' },
  PieChart: { iconBg: '#039be5' },
  Place: { iconBg: '#6d4c41' },
  Platform: { iconBg: '#3949ab' },
  Pointer: { iconBg: '#546e7a' },
  Position: { iconBg: '#2e7d32' },
  Postcard: { iconBg: '#43a047' },
  PriceTag: { iconBg: '#ec407a' },
  Promotion: { iconBg: '#fb8c00' },
  Rank: { iconBg: '#5c6bc0' },
  RefreshRight: { iconBg: '#00897b' },
  ScaleToOriginal: { iconBg: '#5e35b1' },
  Select: { iconBg: '#43a047' },
  SetUp: { iconBg: '#5c6bc0' },
  Setting: { iconBg: '#546e7a' },
  Share: { iconBg: '#00838f' },
  Ship: { iconBg: '#0277bd' },
  SoldOut: { iconBg: '#c62828' },
  Stamp: { iconBg: '#ad1457' },
  Suitcase: { iconBg: '#6d4c41' },
  SuitcaseLine: { iconBg: '#5d4037' },
  Sunny: { iconBg: '#f9a825' },
  Switch: { iconBg: '#00897b' },
  Tickets: { iconBg: '#1677ff' },
  Tools: { iconBg: '#546e7a' },
  TrendCharts: { iconBg: '#7b1fa2' },
  Trophy: { iconBg: '#f9a825' },
  Unlock: { iconBg: '#455a64' },
  Upload: { iconBg: '#1565c0' },
  User: { iconBg: '#43a047' },
  UserFilled: { iconBg: '#2e7d32' },
  Van: { iconBg: '#ef6c00' },
  VideoCamera: { iconBg: '#00acc1' },
  VideoPlay: { iconBg: '#00838f' },
  View: { iconBg: '#1677ff' },
  WarnTriangleFilled: { iconBg: '#e53935' },
  Warning: { iconBg: '#e53935' },
  WarningFilled: { iconBg: '#d32f2f' },
  WindPower: { iconBg: '#0288d1' },
}

const FALLBACK_PALETTE = [
  { iconBg: '#1677ff' },
  { iconBg: '#fa8c16' },
  { iconBg: '#52c41a' },
  { iconBg: '#e53935' },
  { iconBg: '#8e24aa' },
  { iconBg: '#00acc1' },
]

const WHITE_ICON = '#ffffff'

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
  const base = ICON_THEME[icon]
    || (() => {
      let hash = 0
      for (const ch of String(key || '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
      return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]
    })()
  return { iconBg: base.iconBg, iconColor: WHITE_ICON }
}

function normalizeKeys(raw) {
  if (!Array.isArray(raw)) return null
  const seen = new Set()
  const keys = []
  for (const item of raw) {
    const key = String(item || '').trim()
    if (!key || seen.has(key) || EXCLUDED_KEYS.has(key)) continue
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
  const raw = stored || [...DEFAULT_SHORTCUT_KEYS[level]]
  return raw.filter((key) => !EXCLUDED_KEYS.has(key)).slice(0, MAX_SHORTCUT_COUNT)
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
