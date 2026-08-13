import { ref } from 'vue'
import { sidebarMenu } from '../config/menu'
import { appMenu } from '../config/appMenu'
import {
  isHqOnlyMenuKey,
  isProjectOnlyMenuKey,
} from '../utils/menuPermissionTree'

export const menuPlatformOptions = [
  { label: 'Web端', value: 'web' },
  { label: 'App端', value: 'app' },
]

export const menuNodeTypeOptions = [
  { label: '目录', value: 'directory' },
  { label: '菜单', value: 'menu' },
]

/** 菜单层级：指挥部层级 / 项目层级 */
export const menuLevelOptions = [
  { label: '指挥部层级', value: '指挥部层级' },
  { label: '项目层级', value: '项目层级' },
]

function resolveMenuLevel(key) {
  if (isHqOnlyMenuKey(key)) return '指挥部层级'
  if (isProjectOnlyMenuKey(key)) return '项目层级'
  return '指挥部层级'
}

export const moduleNameOptions = [
  '系统管理',
  '组织管理',
  '智慧工地监管',
  '施工现场管理',
  '人员实名制',
  '车辆管理',
  '巡检管理',
  '机械设备监管',
  '机械设备台账',
  '登记进场设备',
  '机械类型维护',
  '危大工程监测',
  '告警配置',
  '视频监控',
  '调度后台',
  '基础数据',
  '个人中心',
]

export const menuIconOptions = [
  'Monitor',
  'User',
  'Van',
  'VideoCamera',
  'Connection',
  'Collection',
  'OfficeBuilding',
  'Setting',
  'SetUp',
  'Document',
  'Bell',
  'Warning',
  'DocumentChecked',
  'Notebook',
  'DataBoard',
  'Box',
  'Medal',
  'FolderOpened',
]

function toComponentName(key) {
  return key
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function buildMenuTree(items, platform, parentId = '') {
  return items.map((item, index) => {
    const hasChildren = Boolean(item.children?.length)
    const id = `${platform}-${item.key}`
    const node = {
      id,
      key: item.key,
      name: item.label,
      icon: item.icon || (platform === 'app' ? 'Monitor' : ''),
      sort: index,
      componentName: toComponentName(item.key),
      routePath: item.path || `/${platform}/${item.key}`,
      componentPath: hasChildren ? 'Layout' : `views/${platform}/${item.key}/index`,
      hidden: false,
      externalLink: false,
      menuType: hasChildren ? 'directory' : 'menu',
      menuLevel: resolveMenuLevel(item.key),
      parentId,
      moduleName: '',
      code: item.key,
      permissions: [],
      remark: '',
    }
    if (hasChildren) {
      node.children = buildMenuTree(item.children, platform, id)
    }
    return node
  })
}

function cloneTree(nodes) {
  return nodes.map((node) => ({
    ...node,
    permissions: [...(node.permissions || [])],
    children: node.children ? cloneTree(node.children) : undefined,
  }))
}

export const webMenuTree = ref(buildMenuTree(sidebarMenu, 'web'))
export const appMenuTree = ref(buildMenuTree(appMenu, 'app'))

let menuIdSeq = 900

export function getMenuTreeByPlatform(platform) {
  return platform === 'app' ? appMenuTree : webMenuTree
}

export function createEmptyMenuNode(parentId = '') {
  return {
    key: '',
    name: '',
    icon: '',
    sort: 0,
    componentName: '',
    routePath: '',
    componentPath: 'Layout',
    hidden: false,
    externalLink: false,
    menuType: 'menu',
    menuLevel: '指挥部层级',
    parentId,
    moduleName: '',
    code: '',
    permissions: [],
    remark: '',
  }
}

export function cloneMenuNode(node) {
  return {
    ...node,
    permissions: (node.permissions || []).map((item) => ({ ...item })),
  }
}

function walkTree(nodes, visitor, parent = null) {
  nodes.forEach((node) => {
    visitor(node, parent)
    if (node.children?.length) walkTree(node.children, visitor, node)
  })
}

function findNode(nodes, id) {
  let found = null
  walkTree(nodes, (node) => {
    if (node.id === id) found = node
  })
  return found
}

function removeNode(nodes, id) {
  const idx = nodes.findIndex((node) => node.id === id)
  if (idx >= 0) {
    nodes.splice(idx, 1)
    return true
  }
  for (const node of nodes) {
    if (node.children?.length && removeNode(node.children, id)) return true
  }
  return false
}

export function listParentMenuOptions(platform) {
  const tree = getMenuTreeByPlatform(platform).value
  const options = [{ value: '', label: '主类目' }]
  walkTree(tree, (node) => {
    if (node.menuType === 'directory') {
      options.push({ value: node.id, label: node.name })
    }
  })
  return options
}

export function saveMenuNode(platform, payload, id) {
  const treeRef = getMenuTreeByPlatform(platform)
  const data = {
    ...payload,
    permissions: [...(payload.permissions || [])],
    componentName: payload.componentName || toComponentName(payload.code || payload.key || 'menu'),
  }

  if (id) {
    const node = findNode(treeRef.value, id)
    if (!node) return null
    Object.assign(node, data, { id })
    return node
  }

  const created = {
    ...data,
    id: `${platform}-custom-${++menuIdSeq}`,
    key: data.code || `custom-${menuIdSeq}`,
    children: data.menuType === 'directory' ? [] : undefined,
  }

  if (!created.parentId) {
    treeRef.value.push(created)
    return created
  }

  const parent = findNode(treeRef.value, created.parentId)
  if (!parent) {
    treeRef.value.push(created)
    return created
  }
  if (!parent.children) parent.children = []
  parent.children.push(created)
  parent.menuType = 'directory'
  parent.componentPath = 'Layout'
  return created
}

export function deleteMenuNode(platform, id) {
  const treeRef = getMenuTreeByPlatform(platform)
  return removeNode(treeRef.value, id)
}

export function resetMenuTrees() {
  webMenuTree.value = cloneTree(buildMenuTree(sidebarMenu, 'web'))
  appMenuTree.value = cloneTree(buildMenuTree(appMenu, 'app'))
}
