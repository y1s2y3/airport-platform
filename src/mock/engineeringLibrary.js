import { projectList } from './projectBasicInfo.js'

export const engineeringLibraryData = {
  unit: [
    {
      id: 'unit-001',
      code: 'DW-001',
      name: 'T2航站楼工程',
      projectId: 'p-000',
      projectName: '宝安国际机场T2航站区及配套工程',
      version: 'V2.0',
      status: '已启用',
      bimCode: 'BIM-DW-001',
      bimModelId: 'mdl-t2-terminal-001',
      parentCode: '',
      parentName: '',
      referenced: true,
      effectiveDate: '2026-03-01',
      updatedBy: '陈静',
      updatedAt: '2026-05-20 14:30',
      remark: 'T2航站区主体单位工程',
      history: [
        { version: 'V2.0', action: '发布新版本', operator: '陈静', time: '2026-05-20 14:30', note: '调整工程范围描述' },
        { version: 'V1.0', action: '首次发布', operator: '姚远东', time: '2025-08-10 09:00', note: '初始版本' },
      ],
    },
    {
      id: 'unit-002',
      code: 'DW-002',
      name: '站坪及机位工程',
      projectId: 'p-000',
      projectName: '宝安国际机场T2航站区及配套工程',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-DW-002',
      bimModelId: 'mdl-apron-002',
      parentCode: '',
      parentName: '',
      referenced: true,
      effectiveDate: '2025-10-15',
      updatedBy: '赵工',
      updatedAt: '2025-10-15 11:20',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '赵工', time: '2025-10-15 11:20', note: '初始版本' }],
    },
    {
      id: 'unit-003',
      code: 'DW-003',
      name: '综合管廊工程',
      projectId: 'p-000',
      projectName: '宝安国际机场T2航站区及配套工程',
      version: 'V1.0',
      status: '草稿',
      bimCode: 'BIM-DW-003',
      bimModelId: '',
      parentCode: '',
      parentName: '',
      referenced: false,
      effectiveDate: '',
      updatedBy: '李工',
      updatedAt: '2026-06-18 16:00',
      remark: '待评审',
      history: [{ version: 'V1.0', action: '创建草稿', operator: '李工', time: '2026-06-18 16:00', note: '' }],
    },
    {
      id: 'unit-004',
      code: 'DW-004',
      name: '旧货运区改造',
      projectId: 'p-001',
      projectName: '深圳宝安国际机场T1航站区及配套设施工程项目',
      version: 'V1.0',
      status: '已停用',
      bimCode: 'BIM-DW-004',
      bimModelId: 'mdl-cargo-old-004',
      parentCode: '',
      parentName: '',
      referenced: true,
      effectiveDate: '2024-06-01',
      updatedBy: '王工',
      updatedAt: '2026-01-10 10:00',
      remark: '方案变更，已发布新版本替代',
      history: [
        { version: 'V1.0', action: '停用', operator: '王工', time: '2026-01-10 10:00', note: '被 V2.0 替代' },
        { version: 'V1.0', action: '首次发布', operator: '王工', time: '2024-06-01 09:00', note: '' },
      ],
    },
    {
      id: 'unit-005',
      code: 'DW-005',
      name: '三跑道道面工程',
      projectId: 'p-003',
      projectName: '深圳机场三跑道扩建工程',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-DW-005',
      bimModelId: 'mdl-runway-005',
      parentCode: '',
      parentName: '',
      referenced: true,
      effectiveDate: '2025-08-01',
      updatedBy: '赵工',
      updatedAt: '2025-08-01 09:30',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '赵工', time: '2025-08-01 09:30', note: '' }],
    },
  ],
  subUnit: [
    {
      id: 'su-001',
      code: 'ZDW-001',
      name: '航站楼主楼',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-ZDW-001',
      bimModelId: 'mdl-t2-main',
      parentCode: 'DW-001',
      parentName: 'T2航站楼工程',
      referenced: true,
      effectiveDate: '2025-09-01',
      updatedBy: '陈静',
      updatedAt: '2025-09-01 10:00',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '陈静', time: '2025-09-01 10:00', note: '' }],
    },
    {
      id: 'su-002',
      code: 'ZDW-002',
      name: '配套综合管廊',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-ZDW-002',
      bimModelId: 'mdl-t2-gallery',
      parentCode: 'DW-001',
      parentName: 'T2航站楼工程',
      referenced: true,
      effectiveDate: '2025-11-20',
      updatedBy: '李工',
      updatedAt: '2025-11-20 15:30',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '李工', time: '2025-11-20 15:30', note: '' }],
    },
    {
      id: 'su-003',
      code: 'ZDW-003',
      name: '站坪道面',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-ZDW-003',
      bimModelId: 'mdl-apron-pave',
      parentCode: 'DW-002',
      parentName: '站坪及机位工程',
      referenced: false,
      effectiveDate: '2025-12-01',
      updatedBy: '赵工',
      updatedAt: '2025-12-01 09:00',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '赵工', time: '2025-12-01 09:00', note: '' }],
    },
  ],
  division: [
    {
      id: 'div-001',
      code: 'FB-001',
      name: '主体结构',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-FB-001',
      bimModelId: 'mdl-structure-001',
      parentCode: 'ZDW-001',
      parentName: '航站楼主楼',
      referenced: true,
      effectiveDate: '2025-09-15',
      updatedBy: '陈静',
      updatedAt: '2025-09-15 11:00',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '陈静', time: '2025-09-15 11:00', note: '' }],
    },
    {
      id: 'div-002',
      code: 'FB-002',
      name: '建筑装饰装修',
      version: 'V2.0',
      status: '已启用',
      bimCode: 'BIM-FB-002',
      bimModelId: 'mdl-decoration-002',
      parentCode: 'ZDW-001',
      parentName: '航站楼主楼',
      referenced: true,
      effectiveDate: '2026-04-01',
      updatedBy: '张工',
      updatedAt: '2026-04-01 14:00',
      remark: '',
      history: [
        { version: 'V2.0', action: '发布新版本', operator: '张工', time: '2026-04-01 14:00', note: '补充幕墙分部' },
        { version: 'V1.0', action: '停用', operator: '张工', time: '2026-03-28 10:00', note: '版本升级' },
      ],
    },
    {
      id: 'div-003',
      code: 'FB-003',
      name: '道面工程',
      version: 'V1.0',
      status: '草稿',
      bimCode: 'BIM-FB-003',
      bimModelId: '',
      parentCode: 'ZDW-003',
      parentName: '站坪道面',
      referenced: false,
      effectiveDate: '',
      updatedBy: '赵工',
      updatedAt: '2026-06-20 09:00',
      remark: '',
      history: [{ version: 'V1.0', action: '创建草稿', operator: '赵工', time: '2026-06-20 09:00', note: '' }],
    },
  ],
  subDivision: [
    {
      id: 'sdiv-001',
      code: 'ZFB-001',
      name: '混凝土结构',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-ZFB-001',
      bimModelId: 'mdl-concrete-001',
      parentCode: 'FB-001',
      parentName: '主体结构',
      referenced: true,
      effectiveDate: '2025-10-01',
      updatedBy: '陈静',
      updatedAt: '2025-10-01 10:30',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '陈静', time: '2025-10-01 10:30', note: '' }],
    },
    {
      id: 'sdiv-002',
      code: 'ZFB-002',
      name: '钢结构',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-ZFB-002',
      bimModelId: 'mdl-steel-002',
      parentCode: 'FB-001',
      parentName: '主体结构',
      referenced: true,
      effectiveDate: '2025-10-20',
      updatedBy: '刘工',
      updatedAt: '2025-10-20 16:00',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '刘工', time: '2025-10-20 16:00', note: '' }],
    },
    {
      id: 'sdiv-003',
      code: 'ZFB-003',
      name: '幕墙工程',
      version: 'V1.0',
      status: '已停用',
      bimCode: 'BIM-ZFB-003',
      bimModelId: 'mdl-curtain-003',
      parentCode: 'FB-002',
      parentName: '建筑装饰装修',
      referenced: false,
      effectiveDate: '2025-12-10',
      updatedBy: '张工',
      updatedAt: '2026-03-28 10:00',
      remark: '已合并至新版本',
      history: [{ version: 'V1.0', action: '停用', operator: '张工', time: '2026-03-28 10:00', note: '' }],
    },
  ],
  subItem: [
    {
      id: 'item-001',
      code: 'FX-001',
      name: '基础工程',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-FX-001',
      bimModelId: 'mdl-foundation-001',
      parentCode: 'ZFB-001',
      parentName: '混凝土结构',
      referenced: true,
      effectiveDate: '2025-10-15',
      updatedBy: '陈静',
      updatedAt: '2025-10-15 09:00',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '陈静', time: '2025-10-15 09:00', note: '' }],
    },
    {
      id: 'item-002',
      code: 'FX-002',
      name: '主体施工',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-FX-002',
      bimModelId: 'mdl-mainbody-002',
      parentCode: 'ZFB-001',
      parentName: '混凝土结构',
      referenced: true,
      effectiveDate: '2025-11-01',
      updatedBy: '陈静',
      updatedAt: '2025-11-01 11:00',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '陈静', time: '2025-11-01 11:00', note: '' }],
    },
    {
      id: 'item-003',
      code: 'FX-003',
      name: '钢构安装',
      version: 'V1.0',
      status: '已启用',
      bimCode: 'BIM-FX-003',
      bimModelId: 'mdl-steel-install-003',
      parentCode: 'ZFB-002',
      parentName: '钢结构',
      referenced: false,
      effectiveDate: '2025-11-20',
      updatedBy: '刘工',
      updatedAt: '2025-11-20 14:30',
      remark: '',
      history: [{ version: 'V1.0', action: '首次发布', operator: '刘工', time: '2025-11-20 14:30', note: '' }],
    },
    {
      id: 'item-004',
      code: 'FX-004',
      name: '玻璃幕墙',
      version: 'V1.0',
      status: '草稿',
      bimCode: 'BIM-FX-004',
      bimModelId: '',
      parentCode: 'ZFB-003',
      parentName: '幕墙工程',
      referenced: false,
      effectiveDate: '',
      updatedBy: '张工',
      updatedAt: '2026-06-22 10:00',
      remark: '待关联BIM模型',
      history: [{ version: 'V1.0', action: '创建草稿', operator: '张工', time: '2026-06-22 10:00', note: '' }],
    },
  ],
}

export function getEngineeringProjects(projects = projectList) {
  return projects.filter((p) => !p.hidden)
}

export function getLibraryList(typeKey) {
  return engineeringLibraryData[typeKey] || []
}

export function statusTagClass(status) {
  if (status === '已启用') return 'ap-tag-enabled'
  if (status === '已停用') return 'ap-tag-disabled'
  return 'ap-tag-draft'
}

export function getParentOptions(typeKey) {
  const parentMap = {
    subUnit: engineeringLibraryData.unit.filter((r) => r.status === '已启用'),
    division: engineeringLibraryData.subUnit.filter((r) => r.status === '已启用'),
    subDivision: engineeringLibraryData.division.filter((r) => r.status === '已启用'),
    subItem: engineeringLibraryData.subDivision.filter((r) => r.status === '已启用'),
  }
  return (parentMap[typeKey] || []).map((r) => ({ code: r.code, name: r.name }))
}

export function cloneLibraryData() {
  return Object.fromEntries(
    Object.entries(engineeringLibraryData).map(([key, rows]) => [
      key,
      rows.map((row) => ({ ...row, history: [...row.history] })),
    ]),
  )
}

export function buildEngineeringTree(data = engineeringLibraryData, projects = getEngineeringProjects()) {
  const engTypeKeys = ['subUnit', 'division', 'subDivision', 'subItem']
  const nodesByCode = {}

  const projectNodes = projects.map((project) => ({
    id: project.id,
    label: project.projectName,
    type: 'project',
    code: project.id,
    raw: project,
    children: [],
  }))
  const projectById = Object.fromEntries(projectNodes.map((node) => [node.id, node]))

  for (const row of data.unit || []) {
    const unitNode = {
      id: row.id,
      label: `${row.code} ${row.name}`,
      type: 'unit',
      code: row.code,
      raw: row,
      children: [],
    }
    nodesByCode[row.code] = unitNode
    const projectNode = projectById[row.projectId]
    if (projectNode) projectNode.children.push(unitNode)
  }

  for (const type of engTypeKeys) {
    for (const row of data[type] || []) {
      nodesByCode[row.code] = {
        id: row.id,
        label: `${row.code} ${row.name}`,
        type,
        code: row.code,
        raw: row,
        children: [],
      }
    }
  }

  for (const type of engTypeKeys) {
    for (const row of data[type] || []) {
      const node = nodesByCode[row.code]
      if (!node) continue
      const parent = nodesByCode[row.parentCode]
      if (parent) parent.children.push(node)
    }
  }

  return projectNodes
}

export function findEngineeringNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findEngineeringNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

export function getDefaultEngineeringNodeId(projects = getEngineeringProjects()) {
  return projects[0]?.id || ''
}

export function getDirectChildren(data, node) {
  if (!node) return []
  if (node.type === 'project') {
    return (data.unit || []).filter((row) => row.projectId === node.id)
  }
  const childTypeMap = {
    unit: 'subUnit',
    subUnit: 'division',
    division: 'subDivision',
    subDivision: 'subItem',
  }
  const childType = childTypeMap[node.type]
  if (!childType) return []
  return (data[childType] || []).filter((row) => row.parentCode === node.code)
}
