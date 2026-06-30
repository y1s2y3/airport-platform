import { ref } from 'vue'

export const orgCategories = [
  { key: 'oa', label: 'OA系统用户', syncable: true },
  { key: 'external', label: '外部单位用户', syncable: false },
  { key: 'other', label: '其他用户', syncable: false },
]

function cloneNodes(nodes) {
  return nodes.map((n) => ({
    ...n,
    children: n.children ? cloneNodes(n.children) : [],
  }))
}

const initialOaOrgTree = [
  { id: 'oa-root', label: '深圳机场集团', count: 349 },
]

const initialExternalOrgTree = [
  { id: 'oa-construction', label: '施工单位', count: 12 },
  { id: 'oa-design', label: '设计单位', count: 10 },
  { id: 'oa-consult', label: '咨询单位', count: 4 },
  { id: 'oa-supervision', label: '监理单位', count: 1 },
  { id: 'oa-survey', label: '勘察单位', count: 6 },
  { id: 'oa-planning', label: '规划单位', count: 0 },
  { id: 'oa-other', label: '其他单位', count: 7 },
  { id: 'ext-yunhan', label: '云汉数科', count: 28 },
  { id: 'ext-huadong', label: '华东院', count: 45 },
  { id: 'ext-archive', label: '档案系统', count: 6 },
]

const initialOtherOrgTree = [
  { id: 'other-temp', label: '临时账号', count: 3 },
  { id: 'other-guest', label: '访客账号', count: 2 },
]

export const orgUserMap = {
  'oa-root': [
    { id: 1, name: '刘文强', gender: '男', dept: '集团总部', phone: '13800131201', email: 'liuwenqiang@szairport.com' },
    { id: 2, name: '姚远东', gender: '男', dept: '工程管理部', phone: '13900133302', email: 'yaoyuandong@szairport.com' },
    { id: 3, name: '陈静', gender: '女', dept: '综合办公室', phone: '13600138890', email: 'chenjing@szairport.com' },
  ],
  'oa-construction': [
    { id: 11, name: '王建国', gender: '男', dept: '中建三局', phone: '13700132210', email: 'wangjianguo@cscec.com' },
    { id: 12, name: '李明', gender: '男', dept: '中铁建工', phone: '13500136678', email: 'liming@crcc.com' },
  ],
  'oa-design': [
    { id: 21, name: '张设计', gender: '女', dept: '华东建筑设计院', phone: '13300134455', email: 'zhangsj@ecadi.com' },
    { id: 22, name: '赵工', gender: '男', dept: '深圳市政设计院', phone: '13200137788', email: 'zhaogong@szdesign.com' },
  ],
  'oa-consult': [
    { id: 31, name: '周咨询', gender: '男', dept: '造价咨询中心', phone: '13100139900', email: 'zhouzx@consult.com' },
  ],
  'oa-supervision': [
    { id: 41, name: '孙监理', gender: '男', dept: '深圳监理公司', phone: '13000131122', email: 'sunjl@jl.com' },
  ],
  'oa-survey': [
    { id: 51, name: '吴勘察', gender: '男', dept: '地质勘察院', phone: '18800133344', email: 'wukc@survey.com' },
  ],
  'oa-planning': [],
  'oa-other': [
    { id: 61, name: '郑其他', gender: '女', dept: '协作单位', phone: '18900135566', email: 'zhengqt@partner.com' },
  ],
  'ext-yunhan': [
    { id: 101, name: '林开发', gender: '男', dept: '云汉数科', phone: '18600137788', email: 'lindev@yunhan.com' },
    { id: 102, name: '黄产品', gender: '女', dept: '云汉数科', phone: '18500139900', email: 'huangcp@yunhan.com' },
  ],
  'ext-huadong': [
    { id: 111, name: '钱华东', gender: '男', dept: '华东院', phone: '18400131122', email: 'qianhd@hd.com' },
    { id: 112, name: '冯结构', gender: '男', dept: '华东院结构所', phone: '18300133344', email: 'fengjg@hd.com' },
  ],
  'ext-archive': [
    { id: 121, name: '档案管理员', gender: '女', dept: '档案系统', phone: '18200135566', email: 'archive_admin@szairport.com' },
  ],
  'other-temp': [
    { id: 201, name: '临时用户A', gender: '男', dept: '临时账号', phone: '-', email: 'temp_a@temp.local' },
  ],
  'other-guest': [
    { id: 211, name: '访客01', gender: '女', dept: '访客账号', phone: '-', email: 'guest_01@temp.local' },
  ],
}

const orgState = {
  oaOrgTree: cloneNodes(initialOaOrgTree),
  externalOrgTree: cloneNodes(initialExternalOrgTree),
  otherOrgTree: cloneNodes(initialOtherOrgTree),
}

let nodeIdSeq = 9000

function getTreeByCategoryKey(categoryKey) {
  if (categoryKey === 'oa') return orgState.oaOrgTree
  if (categoryKey === 'external') return orgState.externalOrgTree
  return orgState.otherOrgTree
}

function getCategoryNodeIds(categoryKey) {
  return getTreeByCategoryKey(categoryKey).map((n) => n.id)
}

function sumNodeUsers(node) {
  const direct = orgUserMap[node.id]?.length ?? node.count ?? 0
  const childSum = (node.children || []).reduce((s, c) => s + sumNodeUsers(c), 0)
  return Math.max(direct, childSum, node.count ?? 0)
}

function toTreeNodes(items, meta = {}) {
  return items.map((item) => {
    const count = sumNodeUsers(item)
    return {
      id: item.id,
      label: `${item.label}(${count})`,
      rawLabel: item.label,
      count,
      categoryKey: meta.categoryKey,
      syncable: meta.syncable,
      isCategory: false,
      children:
        item.children?.length > 0
          ? toTreeNodes(item.children, meta)
          : undefined,
    }
  })
}

function buildCategoryNode(category) {
  const trees = getTreeByCategoryKey(category.key)
  const childCount = trees.reduce((sum, n) => sum + sumNodeUsers(n), 0)
  return {
    id: `cat-${category.key}`,
    rawLabel: category.label,
    label: `${category.label}(${childCount})`,
    isCategory: true,
    categoryKey: category.key,
    syncable: category.syncable,
    children: toTreeNodes(trees, { categoryKey: category.key, syncable: category.syncable }),
  }
}

function rebuildUnifiedTree() {
  return orgCategories.map(buildCategoryNode)
}

export const unifiedOrgTree = ref(rebuildUnifiedTree())

export function refreshOrgTree() {
  unifiedOrgTree.value = rebuildUnifiedTree()
}

export function getOrgTreeByCategory(categoryKey) {
  const trees = getTreeByCategoryKey(categoryKey)
  const category = orgCategories.find((c) => c.key === categoryKey)
  return toTreeNodes(trees, { categoryKey, syncable: category?.syncable })
}

export function getDefaultNodeId() {
  return 'cat-oa'
}

export function getUsersByNodeId(nodeId, treeNode) {
  if (treeNode?.isCategory && treeNode.categoryKey) {
    const ids = getCategoryNodeIds(treeNode.categoryKey)
    return collectUsersUnderNodes(ids)
  }
  return collectUsersUnderNode(nodeId)
}

function collectUsersUnderNode(nodeId) {
  const raw = findRawNode(nodeId)
  if (!raw) return orgUserMap[nodeId] || []
  const ids = collectNodeIds(raw.node)
  return collectUsersUnderNodes(ids)
}

function collectNodeIds(node) {
  const ids = [node.id]
  ;(node.children || []).forEach((c) => ids.push(...collectNodeIds(c)))
  return ids
}

function collectUsersUnderNodes(ids) {
  const seen = new Set()
  const list = []
  ids.forEach((id) => {
    ;(orgUserMap[id] || []).forEach((u) => {
      if (seen.has(u.id)) return
      seen.add(u.id)
      list.push(u)
    })
  })
  return list
}

export function findTreeNode(nodes, nodeId) {
  for (const node of nodes) {
    if (node.id === nodeId) return node
    if (node.children?.length) {
      const found = findTreeNode(node.children, nodeId)
      if (found) return found
    }
  }
  return null
}

function findRawNode(nodeId, nodes = null, categoryKey = null) {
  const searchIn = (list, cat) => {
    for (const node of list) {
      if (node.id === nodeId) return { node, parentList: list, categoryKey: cat }
      if (node.children?.length) {
        const found = findRawNode(nodeId, node.children, cat)
        if (found) return found
      }
    }
    return null
  }
  if (nodes) return searchIn(nodes, categoryKey)
  for (const cat of orgCategories) {
    const found = searchIn(getTreeByCategoryKey(cat.key), cat.key)
    if (found) return found
  }
  return null
}

function findParentContext(nodeId) {
  if (nodeId.startsWith('cat-')) {
    const categoryKey = nodeId.replace('cat-', '')
    return { type: 'category', categoryKey, children: getTreeByCategoryKey(categoryKey) }
  }
  const raw = findRawNode(nodeId)
  if (!raw) return null
  if (!raw.node.children) raw.node.children = []
  return { type: 'node', node: raw.node, children: raw.node.children }
}

/** 当前节点的直接子节点（用于组织结构管理右侧列表） */
export function getDirectChildNodes(nodeId, treeNode) {
  const current = treeNode || findTreeNode(unifiedOrgTree.value, nodeId)
  if (!current) return []

  if (current.isCategory && current.categoryKey) {
    return getTreeByCategoryKey(current.categoryKey).map((item) => toChildRow(item, current))
  }

  const raw = findRawNode(nodeId)
  if (!raw) return []
  return (raw.node.children || []).map((item) => toChildRow(item, current))
}

function toChildRow(item, parentNode) {
  const userCount = sumNodeUsers(item)
  return {
    id: item.id,
    label: item.label,
    userCount,
    childCount: (item.children || []).length,
    parentId: parentNode.id,
    syncable: parentNode.syncable ?? false,
    remark: item.remark || '',
  }
}

export function addOrgNode(parentId, payload) {
  const ctx = findParentContext(parentId)
  if (!ctx) return null

  const id = `org-${++nodeIdSeq}`
  const newNode = {
    id,
    label: payload.label.trim(),
    count: 0,
    remark: payload.remark?.trim() || '',
    children: [],
  }

  ctx.children.push(newNode)
  orgUserMap[id] = []
  refreshOrgTree()
  return newNode
}

export function updateOrgNode(nodeId, payload) {
  const raw = findRawNode(nodeId)
  if (!raw) return false
  if (payload.label != null) raw.node.label = payload.label.trim()
  if (payload.remark != null) raw.node.remark = payload.remark.trim()
  refreshOrgTree()
  return true
}

export function deleteOrgNode(nodeId) {
  if (nodeId.startsWith('cat-')) return false
  const raw = findRawNode(nodeId)
  if (!raw) return false
  const idx = raw.parentList.findIndex((n) => n.id === nodeId)
  if (idx < 0) return false
  raw.parentList.splice(idx, 1)
  delete orgUserMap[nodeId]
  refreshOrgTree()
  return true
}
