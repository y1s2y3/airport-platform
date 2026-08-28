import { ref } from 'vue'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions'

export const ORG_LEVEL_OPTIONS = ['公司', '项目', '部门']
export const ORG_TYPE_OPTIONS = ['公司', '项目', '部门']

export const orgRoleOptions = [
  { key: 'role-company', label: '公司角色' },
  { key: 'role-default', label: '公司默认角色' },
  { key: 'role-video', label: '视频角色' },
  { key: 'role-pm', label: '项目经理' },
  { key: 'role-coc', label: 'COC调度员' },
  { key: 'role-labor', label: '劳务管理员' },
  { key: 'role-vehicle', label: '车辆管理员' },
]

const PROJECT_DEPT_NAMES = ['项目部', '工程部', '安全质量部', '综合部']

const PROJECT_STAFF_TEMPLATES = [
  { suffix: '项目经理', position: '项目经理岗', roleIds: ['role-pm'] },
  { suffix: '工程师', position: '工程管理岗', roleIds: ['role-pm'] },
  { suffix: '安全员', position: '安全质量管理员', roleIds: ['role-labor'] },
  { suffix: '综合员', position: '综合文秘岗', roleIds: ['role-default'] },
]

export function getProjectOrgNodeId(projectId) {
  return `org-proj-${projectId}`
}

function buildProjectOrgNode(project, sortOrder) {
  const nodeId = getProjectOrgNodeId(project.id)
  const children = PROJECT_DEPT_NAMES.map((name, index) =>
    orgNode(`${nodeId}-dept-${index}`, name, 0, '部门', index + 1),
  )
  return orgNode(nodeId, project.fullName || project.label, 0, '项目', sortOrder, children)
}

function buildConstructionProjects() {
  return COC_PROJECT_OPTIONS.map((project, index) => buildProjectOrgNode(project, index + 1))
}

export const dataPermissionLevelOptions = [
  { value: 'hq', label: '指挥部层级' },
  { value: 'project', label: '项目层级' },
]

export const dataPermissionProjectScopeOptions = [
  { value: 'all', label: '全部项目' },
  { value: 'specific', label: '指定项目' },
]

/** @deprecated 兼容旧引用 */
export const dataPermissionHqScopeOptions = ['本组织', '指定组织']

/** @deprecated 兼容旧引用 */
export const dataPermissionTypeOptions = dataPermissionHqScopeOptions

function cloneNodes(nodes) {
  return nodes.map((n) => ({
    ...n,
    children: n.children ? cloneNodes(n.children) : [],
  }))
}

function orgNode(id, label, headcount, level, sortOrder, children = []) {
  const shortName = label.includes('(') ? label.slice(0, label.indexOf('(')) : label
  return {
    id,
    label,
    headcount,
    orgLevel: level,
    orgType: level,
    shortName: shortName.slice(0, 12),
    orgCode: id.replace(/^org-/, 'SZAIR-').toUpperCase(),
    sortOrder,
    enabled: true,
    remark: '',
    children,
  }
}

const HQ_ORG_CHILDREN = [
  orgNode('org-hkc', '航空城公司', 1, '公司', 1),
  orgNode('org-leaders', '公司领导', 5, '部门', 2),
  orgNode('org-func', '职能部门', 0, '部门', 3, [
    orgNode('org-office', '办公室', 2, '部门', 1),
    orgNode('org-party', '党群工作部(新闻中心、工会办公室)', 0, '部门', 2),
    orgNode('org-hr', '人力资源部', 1, '部门', 3),
    orgNode('org-discipline', '纪检监察室(监事会办公室)', 1, '部门', 4),
    orgNode('org-quality', '安全与质量管理部(安委会办公室)', 1, '部门', 5),
    orgNode('org-safety-supervise', '安全监管(集团、股份安委办)', 0, '部门', 6),
    orgNode('org-board', '董事会办公室(战略发展部)', 1, '部门', 7),
    orgNode('org-plan', '规划建设部(重大项目推进办公室)', 24, '部门', 8),
    orgNode('org-operation', '经营管理部', 1, '部门', 9),
    orgNode('org-finance', '财务部', 11, '部门', 10),
    orgNode('org-audit', '审计法务部', 4, '部门', 11),
  ]),
  orgNode('org-biz', '业务单位', 0, '部门', 4, [
    orgNode('org-public', '公共区管理部(三防应急协调办)', 2, '部门', 1),
    orgNode('org-logistics', '后勤服务中心', 0, '部门', 2),
  ]),
]

const initialOrgTree = () => [
  orgNode('org-root', '工程建设一体化平台', 386, '公司', 0, [
    orgNode('org-hq', '深圳机场指挥部', 386, '公司', 1, HQ_ORG_CHILDREN),
    orgNode('org-construction', '施工项目', 0, '项目', 2, buildConstructionProjects()),
    orgNode('org-external', '外部单位', 0, '公司', 3),
    orgNode('org-other-users', '其他组织', 0, '部门', 4),
  ]),
]

const orgState = {
  orgTree: [],
}

function ensureOrgTreeReady() {
  if (!orgState.orgTree.length) {
    orgState.orgTree = cloneNodes(initialOrgTree())
  }
}

let nodeIdSeq = 9000
let memberIdSeq = 100
let positionIdSeq = 200
let dataPermIdSeq = 300

/** @type {Record<string, Array>} */
export const orgMembersMap = {
  'org-office': [
    {
      id: 'mem-1',
      name: '陈静',
      loginAccount: 'chenjing',
      phone: '13600138890',
      position: '办公室主任',
      orgPath: '工程建设一体化平台/深圳机场指挥部/职能部门/办公室',
      status: true,
      roleIds: ['role-default'],
    },
    {
      id: 'mem-2',
      name: '周秘书',
      loginAccount: 'zhousm',
      phone: '13600138891',
      position: '综合文秘',
      orgPath: '工程建设一体化平台/深圳机场指挥部/职能部门/办公室',
      status: true,
      roleIds: ['role-default'],
    },
  ],
  'org-plan': [
    {
      id: 'mem-3',
      name: '姚远东',
      loginAccount: 'yaoyuandong',
      phone: '13900133302',
      position: '规划建设部经理',
      orgPath: '工程建设一体化平台/深圳机场指挥部/职能部门/规划建设部(重大项目推进办公室)',
      status: true,
      roleIds: ['role-company'],
    },
    {
      id: 'mem-4',
      name: '视频中心用户',
      loginAccount: 'videoAdmin',
      phone: '13888888888',
      position: '项目推进岗',
      orgPath: '工程建设一体化平台/深圳机场指挥部/职能部门/规划建设部(重大项目推进办公室)',
      status: true,
      roleIds: ['role-video'],
    },
  ],
  'org-finance': [
    {
      id: 'mem-5',
      name: '刘文强',
      loginAccount: 'liuwenqiang',
      phone: '13800131201',
      position: '财务主管',
      orgPath: '工程建设一体化平台/深圳机场指挥部/职能部门/财务部',
      status: true,
      roleIds: ['role-company', 'role-default'],
    },
  ],
  'org-public': [
    {
      id: 'mem-6',
      name: '王强',
      loginAccount: 'wangqiang',
      phone: '13700132210',
      position: '公共区管理岗',
      orgPath: '工程建设一体化平台/深圳机场指挥部/业务单位/公共区管理部(三防应急协调办)',
      status: true,
      roleIds: ['role-default'],
    },
  ],
}

/** @type {Record<string, Array>} */
export const orgPositionsMap = {
  'org-office': [
    { id: 'pos-1', name: '办公室主任', headcount: 1, duty: '统筹办公室日常事务', roleIds: ['role-default'] },
    { id: 'pos-2', name: '综合文秘', headcount: 1, duty: '文稿起草与会议组织', roleIds: ['role-default'] },
  ],
  'org-plan': [
    { id: 'pos-3', name: '规划建设部经理', headcount: 1, duty: '重大项目推进统筹', roleIds: ['role-company'] },
    { id: 'pos-4', name: '项目推进岗', headcount: 1, duty: '重大项目日常推进', roleIds: ['role-video'] },
  ],
  'org-quality': [
    { id: 'pos-5', name: '安全质量管理员', headcount: 1, duty: '安全与质量监督管理', roleIds: ['role-company'] },
  ],
}

/** @type {Record<string, string[]>} */
export const orgRoleIdsMap = {
  'org-hq': ['role-company', 'role-default'],
  'org-plan': ['role-video', 'role-default'],
  'org-root': ['role-company', 'role-default'],
  'org-finance': ['role-company'],
}

/** @type {Record<string, Array>} */
export const orgDataPermissionsMap = {
  'org-hq': [
    {
      id: 'dp-hq-root',
      levelScope: 'hq',
      content: '指挥部层级',
    },
    {
      id: 'dp-hq-project',
      levelScope: 'project',
      projectScope: 'all',
      projectIds: [],
      content: '全部项目',
    },
  ],
  'org-plan': [
    {
      id: 'dp-1',
      levelScope: 'hq',
      content: '指挥部层级',
    },
    {
      id: 'dp-1b',
      levelScope: 'project',
      projectScope: 'specific',
      projectIds: ['p-001', 'p-002'],
      content: 'T2空侧捷运线、三跑道扩建',
    },
  ],
  'org-root': [
    {
      id: 'dp-2',
      levelScope: 'hq',
      content: '指挥部层级',
    },
    {
      id: 'dp-2b',
      levelScope: 'project',
      projectScope: 'all',
      projectIds: [],
      content: '全部项目',
    },
  ],
}

function seedProjectOrgData() {
  COC_PROJECT_OPTIONS.forEach((project, index) => {
    const projectNodeId = getProjectOrgNodeId(project.id)
    const deptNodeId = `${projectNodeId}-dept-0`
    const projectPath = `工程建设一体化平台/施工项目/${project.fullName || project.label}`
    const deptPath = `${projectPath}/项目部`

    orgMembersMap[projectNodeId] = []
    orgPositionsMap[projectNodeId] = [
      {
        id: `pos-proj-${project.id}-lead`,
        name: '项目经理岗',
        headcount: 1,
        duty: '统筹项目进度、质量与安全',
        roleIds: ['role-pm'],
      },
    ]
    orgRoleIdsMap[projectNodeId] = ['role-pm', 'role-default']
    orgDataPermissionsMap[projectNodeId] = [
      {
        id: `dp-proj-${project.id}`,
        levelScope: 'project',
        projectScope: 'specific',
        projectIds: [project.id],
        content: project.label,
      },
    ]

    PROJECT_DEPT_NAMES.forEach((_deptName, deptIndex) => {
      const deptId = `${projectNodeId}-dept-${deptIndex}`
      orgMembersMap[deptId] = []
      orgPositionsMap[deptId] = []
      orgRoleIdsMap[deptId] = []
      orgDataPermissionsMap[deptId] = []
    })

    if (index >= 12) return

    orgMembersMap[deptNodeId] = PROJECT_STAFF_TEMPLATES.map((staff, staffIndex) => ({
      id: `mem-proj-${project.id}-${staffIndex}`,
      name: `${project.label}${staff.suffix}`,
      loginAccount: `pm_${project.id}_${staffIndex}`,
      phone: `138${String(index).padStart(2, '0')}${String(staffIndex).padStart(2, '0')}0001`,
      position: staff.position,
      orgPath: deptPath,
      status: true,
      roleIds: [...staff.roleIds],
      projectId: project.id,
    }))

    orgPositionsMap[deptNodeId] = PROJECT_STAFF_TEMPLATES.map((staff, staffIndex) => ({
      id: `pos-proj-${project.id}-dept-${staffIndex}`,
      name: staff.position,
      headcount: 1,
      duty: `${project.label}${staff.suffix}岗位职责`,
      roleIds: [...staff.roleIds],
    }))

    orgRoleIdsMap[deptNodeId] = ['role-pm', 'role-labor', 'role-default']
  })
}

seedProjectOrgData()

/** 兼容用户管理页 */
export const orgUserMap = Object.fromEntries(
  Object.entries(orgMembersMap).map(([orgId, members]) => [
    orgId,
    members.map((m) => ({
      id: m.id,
      name: m.name,
      gender: '—',
      dept: m.orgPath.split('/').pop() || m.orgPath,
      phone: m.phone,
      email: `${m.loginAccount}@szairport.com`,
    })),
  ]),
)

function sumNodeUsers(node) {
  if (node.headcount != null) return node.headcount
  const direct = orgMembersMap[node.id]?.length ?? 0
  const childSum = (node.children || []).reduce((s, c) => s + sumNodeUsers(c), 0)
  return direct + childSum
}

function toTreeNode(item, parentPath = '') {
  const path = parentPath ? `${parentPath}/${item.label}` : item.label
  const count = sumNodeUsers(item)
  return {
    id: item.id,
    label: item.headcount != null || count > 0 ? `${item.label}(${count})` : item.label,
    rawLabel: item.label,
    orgPath: path,
    count,
    orgLevel: item.orgLevel,
    orgType: item.orgType,
    shortName: item.shortName,
    orgCode: item.orgCode,
    sortOrder: item.sortOrder,
    enabled: item.enabled,
    children: item.children?.length
      ? item.children.map((c) => toTreeNode(c, path))
      : undefined,
  }
}

function rebuildUnifiedTree() {
  ensureOrgTreeReady()
  return orgState.orgTree.map((n) => toTreeNode(n))
}

function ensureUnifiedOrgTree() {
  if (!unifiedOrgTree.value.length) {
    unifiedOrgTree.value = rebuildUnifiedTree()
  }
}

export const unifiedOrgTree = ref([])

export function refreshOrgTree() {
  unifiedOrgTree.value = rebuildUnifiedTree()
}

export function getDefaultNodeId() {
  return 'org-plan'
}

export function getDefaultNodeIdForScope(isHq, projectId = '') {
  if (isHq) return getDefaultNodeId()
  return getProjectOrgNodeId(projectId)
}

export function collectOrgIdsUnderNode(nodeId) {
  const raw = findRawNode(nodeId)
  if (!raw) return []
  return collectNodeIds(raw.node)
}

export function isOrgUnderProject(orgId, projectId) {
  if (!orgId || !projectId) return false
  const projectRootId = getProjectOrgNodeId(projectId)
  return collectOrgIdsUnderNode(projectRootId).includes(orgId)
}

export function getScopedOrgTree({ projectId = '', keyword = '' } = {}) {
  ensureUnifiedOrgTree()
  const baseTree = keyword ? filterOrgTree(keyword) : unifiedOrgTree.value
  if (!projectId) return baseTree

  const projectNodeId = getProjectOrgNodeId(projectId)
  function findSubtree(nodes) {
    for (const node of nodes) {
      if (node.id === projectNodeId) return [node]
      if (node.children?.length) {
        const found = findSubtree(node.children)
        if (found) return found
      }
    }
    return null
  }
  return findSubtree(baseTree) || []
}

export function getOrgNodeOptionsForScope(isHq, projectId = '') {
  ensureUnifiedOrgTree()
  const tree = isHq ? unifiedOrgTree.value : getScopedOrgTree({ projectId })
  const options = []
  function walk(nodes, prefix = '') {
    nodes.forEach((node) => {
      const label = prefix ? `${prefix}/${node.rawLabel}` : node.rawLabel
      options.push({ value: node.id, label })
      if (node.children?.length) walk(node.children, label)
    })
  }
  walk(tree)
  return options
}

export function getParentOrgOptionsForScope(isHq, projectId = '', excludeId = '') {
  ensureUnifiedOrgTree()
  const tree = isHq ? unifiedOrgTree.value : getScopedOrgTree({ projectId })
  const options = [{ value: '', label: '根节点' }]
  function walk(nodes) {
    nodes.forEach((node) => {
      if (node.id !== excludeId) {
        options.push({ value: node.id, label: node.rawLabel })
        if (node.children?.length) walk(node.children)
      }
    })
  }
  walk(tree)
  return options
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

function findRawNode(nodeId, nodes, parent = null) {
  ensureOrgTreeReady()
  const searchNodes = nodes ?? orgState.orgTree
  for (let i = 0; i < searchNodes.length; i += 1) {
    const node = searchNodes[i]
    if (node.id === nodeId) return { node, parentList: searchNodes, index: i, parent }
    if (node.children?.length) {
      const found = findRawNode(nodeId, node.children, node)
      if (found) return found
    }
  }
  return null
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
    ;(orgMembersMap[id] || []).forEach((u) => {
      if (seen.has(u.id)) return
      seen.add(u.id)
      list.push(u)
    })
  })
  return list
}

export function getUsersByNodeId(nodeId, treeNode) {
  const raw = findRawNode(nodeId)
  if (!raw) return orgMembersMap[nodeId] || []
  const ids = collectNodeIds(raw.node)
  return collectUsersUnderNodes(ids).map((m) => ({
    id: m.id,
    name: m.name,
    gender: '—',
    dept: m.orgPath.split('/').pop() || m.orgPath,
    phone: m.phone,
    email: `${m.loginAccount}@szairport.com`,
  }))
}

export function getOrgMembers(nodeId, includeSubordinates = false) {
  if (!includeSubordinates) return [...(orgMembersMap[nodeId] || [])]
  const raw = findRawNode(nodeId)
  if (!raw) return []
  return collectUsersUnderNodes(collectNodeIds(raw.node))
}

export function getOrgPositions(nodeId) {
  return [...(orgPositionsMap[nodeId] || [])]
}

export function getOrgInfo(nodeId) {
  ensureUnifiedOrgTree()
  const raw = findRawNode(nodeId)
  if (!raw) return null
  const parentLabel = raw.parent?.label || '—'
  return {
    parentOrg: parentLabel,
    orgName: raw.node.label,
    orgType: raw.node.orgType || '—',
    shortName: raw.node.shortName || '—',
    sortOrder: raw.node.sortOrder ?? 0,
    orgCode: raw.node.orgCode || '—',
    enabled: raw.node.enabled !== false,
    orgPath: findTreeNode(unifiedOrgTree.value, nodeId)?.orgPath || raw.node.label,
  }
}

export function getOrgRoles(nodeId) {
  return [...(orgRoleIdsMap[nodeId] || [])]
}

export function setOrgRoles(nodeId, roleIds) {
  orgRoleIdsMap[nodeId] = [...roleIds]
  return true
}

export function getOrgDataPermissions(nodeId) {
  return [...(orgDataPermissionsMap[nodeId] || [])].map(normalizeDataPermRow)
}

export function getOrgDataPermissionConfig(nodeId) {
  const rows = getOrgDataPermissions(nodeId)
  const projectRow = rows.find((row) => row.levelScope === 'project')
  return {
    hqEnabled: rows.some((row) => row.levelScope === 'hq'),
    projectEnabled: Boolean(projectRow),
    projectScope: projectRow?.projectScope || 'all',
    projectIds: projectRow?.projectIds ? [...projectRow.projectIds] : [],
  }
}

function normalizeDataPermRow(row) {
  if (row.levelScope === 'project') {
    return {
      ...row,
      projectScope: row.projectScope || 'all',
      projectIds: row.projectIds ? [...row.projectIds] : [],
    }
  }
  return {
    ...row,
    levelScope: 'hq',
  }
}

export function getDataPermLevelLabel(row) {
  return row.levelScope === 'project' ? '项目层级' : '指挥部层级'
}

export function getDataPermScopeLabel(row) {
  if (row.levelScope === 'project') {
    return row.projectScope === 'specific' ? '指定项目' : '全部项目'
  }
  return '指挥部层级'
}

export function getOrgNodeOptions() {
  ensureUnifiedOrgTree()
  const options = []
  function walk(nodes, prefix = '') {
    nodes.forEach((node) => {
      const label = prefix ? `${prefix}/${node.rawLabel}` : node.rawLabel
      options.push({ value: node.id, label })
      if (node.children?.length) walk(node.children, label)
    })
  }
  walk(unifiedOrgTree.value)
  return options
}

export function filterOrgTree(keyword) {
  ensureUnifiedOrgTree()
  const kw = keyword.trim().toLowerCase()
  if (!kw) return unifiedOrgTree.value
  function filterNodes(nodes) {
    return nodes
      .map((node) => {
        const children = node.children ? filterNodes(node.children) : []
        const match = node.rawLabel.toLowerCase().includes(kw)
        if (match || children.length) {
          return { ...node, children: children.length ? children : node.children }
        }
        return null
      })
      .filter(Boolean)
  }
  return filterNodes(unifiedOrgTree.value)
}

export function getParentOrgOptions(excludeId = '') {
  ensureUnifiedOrgTree()
  const options = [{ value: '', label: '根节点' }]
  function walk(nodes) {
    nodes.forEach((node) => {
      if (node.id !== excludeId) {
        options.push({ value: node.id, label: node.rawLabel })
        if (node.children?.length) walk(node.children)
      }
    })
  }
  walk(unifiedOrgTree.value)
  return options
}

export function addOrgNode(parentId, payload) {
  ensureOrgTreeReady()
  const newNode = {
    id: `org-${++nodeIdSeq}`,
    label: payload.label.trim(),
    headcount: 0,
    orgLevel: payload.orgLevel,
    orgType: payload.orgType || payload.orgLevel,
    shortName: payload.shortName?.trim() || payload.label.trim(),
    orgCode: payload.orgCode?.trim() || '',
    sortOrder: payload.sortOrder ?? 0,
    enabled: payload.enabled !== false,
    remark: payload.remark?.trim() || '',
    children: [],
  }

  if (!parentId) {
    orgState.orgTree.push(newNode)
  } else {
    const ctx = findRawNode(parentId)
    if (!ctx) return null
    if (!ctx.node.children) ctx.node.children = []
    ctx.node.children.push(newNode)
  }

  orgMembersMap[newNode.id] = []
  orgPositionsMap[newNode.id] = []
  orgDataPermissionsMap[newNode.id] = []
  orgRoleIdsMap[newNode.id] = []
  orgUserMap[newNode.id] = []
  refreshOrgTree()
  return newNode
}

export function updateOrgNode(nodeId, payload) {
  const raw = findRawNode(nodeId)
  if (!raw) return false
  if (payload.label != null) raw.node.label = payload.label.trim()
  if (payload.orgLevel != null) raw.node.orgLevel = payload.orgLevel
  if (payload.orgType != null) raw.node.orgType = payload.orgType
  if (payload.shortName != null) raw.node.shortName = payload.shortName.trim()
  if (payload.orgCode != null) raw.node.orgCode = payload.orgCode.trim()
  if (payload.sortOrder != null) raw.node.sortOrder = payload.sortOrder
  if (payload.enabled != null) raw.node.enabled = payload.enabled
  if (payload.remark != null) raw.node.remark = payload.remark.trim()
  refreshOrgTree()
  return true
}

export function deleteOrgNode(nodeId) {
  if (nodeId === 'org-root') return false
  const raw = findRawNode(nodeId)
  if (!raw) return false
  raw.parentList.splice(raw.index, 1)
  delete orgMembersMap[nodeId]
  delete orgPositionsMap[nodeId]
  delete orgDataPermissionsMap[nodeId]
  delete orgRoleIdsMap[nodeId]
  delete orgUserMap[nodeId]
  refreshOrgTree()
  return true
}

export function removeOrgMembers(orgId, memberIds) {
  const list = orgMembersMap[orgId]
  if (!list) return false
  orgMembersMap[orgId] = list.filter((m) => !memberIds.includes(m.id))
  orgUserMap[orgId] = (orgUserMap[orgId] || []).filter((u) => !memberIds.includes(u.id))
  refreshOrgTree()
  return true
}

export function toggleMemberStatus(orgId, memberId, status) {
  const member = orgMembersMap[orgId]?.find((m) => m.id === memberId)
  if (!member) return false
  member.status = status
  return true
}

export function setMemberRoles(orgId, memberId, roleIds) {
  const member = orgMembersMap[orgId]?.find((m) => m.id === memberId)
  if (!member) return false
  member.roleIds = [...roleIds]
  return true
}

export function setPositionRoles(orgId, positionId, roleIds) {
  const pos = orgPositionsMap[orgId]?.find((p) => p.id === positionId)
  if (!pos) return false
  pos.roleIds = [...roleIds]
  return true
}

export function saveOrgDataPermissionConfig(orgId, config = {}) {
  const list = []
  if (config.hqEnabled) {
    list.push({
      id: `dp-hq-${orgId}`,
      levelScope: 'hq',
      content: '指挥部层级',
    })
  }
  if (config.projectEnabled) {
    const projectScope = config.projectScope === 'specific' ? 'specific' : 'all'
    const projectIds = projectScope === 'specific' ? [...(config.projectIds || [])] : []
    list.push({
      id: `dp-project-${orgId}`,
      levelScope: 'project',
      projectScope,
      projectIds,
      content:
        projectScope === 'all'
          ? '全部项目'
          : projectIds.length
            ? `指定项目（${projectIds.length}个）`
            : '指定项目',
    })
  }
  orgDataPermissionsMap[orgId] = list
  return true
}

/** @deprecated 兼容旧表格编辑保存，改用 saveOrgDataPermissionConfig */
export function saveDataPermission(orgId, payload) {
  if (!orgDataPermissionsMap[orgId]) orgDataPermissionsMap[orgId] = []

  const record = {
    levelScope: payload.levelScope || 'hq',
    content: payload.content || '',
  }

  if (record.levelScope === 'project') {
    record.projectScope = payload.projectScope || 'all'
    record.projectIds =
      record.projectScope === 'specific' ? [...(payload.projectIds || [])] : []
  }

  if (payload.id) {
    const idx = orgDataPermissionsMap[orgId].findIndex((d) => d.id === payload.id)
    if (idx >= 0) {
      orgDataPermissionsMap[orgId][idx] = { ...orgDataPermissionsMap[orgId][idx], ...record }
      return true
    }
  }

  orgDataPermissionsMap[orgId].push({
    id: `dp-${++dataPermIdSeq}`,
    ...record,
  })
  return true
}

export function addOrgMember(orgId, payload) {
  if (!orgMembersMap[orgId]) orgMembersMap[orgId] = []
  const member = {
    id: `mem-${++memberIdSeq}`,
    name: payload.name,
    loginAccount: payload.loginAccount,
    phone: payload.phone,
    position: payload.position,
    orgPath: payload.orgPath,
    status: true,
    roleIds: payload.roleIds || [],
  }
  orgMembersMap[orgId].push(member)
  if (!orgUserMap[orgId]) orgUserMap[orgId] = []
  orgUserMap[orgId].push({
    id: member.id,
    name: member.name,
    gender: '—',
    dept: member.orgPath.split('/').pop(),
    phone: member.phone,
    email: `${member.loginAccount}@szairport.com`,
  })
  refreshOrgTree()
  return member
}

export function addOrgPosition(orgId, payload) {
  if (!orgPositionsMap[orgId]) orgPositionsMap[orgId] = []
  const pos = {
    id: `pos-${++positionIdSeq}`,
    name: payload.name,
    headcount: payload.headcount ?? 0,
    duty: payload.duty || payload.name,
    roleIds: payload.roleIds || [],
  }
  orgPositionsMap[orgId].push(pos)
  return pos
}

export function getParentOrgId(nodeId) {
  const raw = findRawNode(nodeId)
  return raw?.parent?.id || ''
}

/** @deprecated 保留兼容 */
export function getDirectChildNodes(nodeId) {
  const raw = findRawNode(nodeId)
  if (!raw) return []
  return (raw.node.children || []).map((item) => ({
    id: item.id,
    label: item.label,
    orgType: item.orgType || '',
    userCount: sumNodeUsers(item),
    childCount: (item.children || []).length,
    parentId: nodeId,
    syncable: false,
    remark: item.remark || '',
  }))
}

/** @deprecated */
export const orgCategories = []
