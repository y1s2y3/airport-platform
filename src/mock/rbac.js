/** 用户管理 */
export const sysUserList = [
  { id: 'u-001', name: '刘文强', gender: '男', dept: '集团总部', phone: '13800131201', email: 'liuwenqiang@szairport.com', roles: ['系统管理员'], status: '启用' },
  { id: 'u-002', name: '姚远东', gender: '男', dept: '工程管理部', phone: '13900133302', email: 'yaoyuandong@szairport.com', roles: ['项目经理'], status: '启用' },
  { id: 'u-003', name: '陈静', gender: '女', dept: '综合办公室', phone: '13600138890', email: 'chenjing@szairport.com', roles: ['普通用户'], status: '启用' },
  { id: 'u-004', name: '王建国', gender: '男', dept: '中建三局', phone: '13700132210', email: 'wangjianguo@cscec.com', roles: ['施工单位'], status: '启用' },
  { id: 'u-005', name: '张设计', gender: '女', dept: '华东建筑设计院', phone: '13300134455', email: 'zhangsj@ecadi.com', roles: ['设计单位'], status: '停用' },
  { id: 'u-006', name: '林开发', gender: '男', dept: '云汉数科', phone: '18600137788', email: 'lindev@yunhan.com', roles: ['外部协作'], status: '启用' },
  { id: 'u-007', name: '档案管理员', gender: '女', dept: '档案系统', phone: '18200135566', email: 'archive_admin@szairport.com', roles: ['档案管理员'], status: '启用' },
]

/** 数据权限范围选项 */
export const dataScopeOptions = [
  { value: 'all', label: '全部数据' },
  { value: 'dept', label: '本部门及下级' },
  { value: 'dept_only', label: '仅本部门' },
  { value: 'project', label: '指定项目' },
  { value: 'self', label: '仅本人' },
]

/** 角色管理（RBAC） */
export const roleList = [
  {
    id: 'r-admin',
    code: 'ADMIN',
    name: '系统管理员',
    description: '平台全量管理权限',
    dataScope: 'all',
    dataScopeLabel: '全部数据',
    projectIds: [],
    menuIds: ['m-sys-all', 'm-phase1-all', 'm-archive-all'],
    userCount: 2,
    status: '启用',
  },
  {
    id: 'r-pm',
    code: 'PROJECT_MANAGER',
    name: '项目经理',
    description: '负责所辖项目的进度、质量、安全等业务管理',
    dataScope: 'project',
    dataScopeLabel: '指定项目',
    projectIds: ['p-001', 'p-002', 'p-003'],
    menuIds: ['m-workbench', 'm-quality', 'm-safety', 'm-coc-screen'],
    userCount: 8,
    status: '启用',
  },
  {
    id: 'r-coc',
    code: 'COC_DISPATCH',
    name: 'COC调度员',
    description: 'COC调度指挥与远程调度相关功能',
    dataScope: 'all',
    dataScopeLabel: '全部数据',
    projectIds: [],
    menuIds: ['m-workbench', 'm-coc-screen', 'm-coc-admin'],
    userCount: 5,
    status: '启用',
  },
  {
    id: 'r-archive',
    code: 'ARCHIVE_ADMIN',
    name: '档案管理员',
    description: '数字档案系统菜单与档案数据权限',
    dataScope: 'dept',
    dataScopeLabel: '本部门及下级',
    projectIds: [],
    menuIds: ['m-archive-home', 'm-archive-search', 'm-archive-borrow'],
    userCount: 3,
    status: '启用',
  },
  {
    id: 'r-external',
    code: 'EXTERNAL_USER',
    name: '外部协作',
    description: '外部单位用户，受限业务菜单',
    dataScope: 'self',
    dataScopeLabel: '仅本人',
    projectIds: [],
    menuIds: ['m-workbench', 'm-quality-inspect'],
    userCount: 12,
    status: '启用',
  },
]

/** 业务菜单树（用于角色授权） */
export const businessMenuTree = [
  {
    id: 'm-sys',
    label: '系统菜单',
    children: [
      { id: 'm-workbench', label: '首页' },
      { id: 'm-document', label: '资料管理' },
      { id: 'm-basic-data', label: '基础数据' },
      { id: 'm-settings', label: '系统设置' },
    ],
  },
  {
    id: 'm-phase1',
    label: '一期菜单',
    children: [
      { id: 'm-quality', label: '质量管理' },
      { id: 'm-quality-inspect', label: '质量检查' },
      { id: 'm-safety', label: '安全管理' },
      { id: 'm-safety-labor', label: '劳务管理' },
    ],
  },
  {
    id: 'm-coc',
    label: 'COC调度',
    children: [
      { id: 'm-coc-screen', label: 'COC调度大屏' },
      { id: 'm-coc-admin', label: 'COC后台管理' },
    ],
  },
  {
    id: 'm-archive',
    label: '档案系统菜单',
    children: [
      { id: 'm-archive-home', label: '档案首页' },
      { id: 'm-archive-search', label: '档案检索' },
      { id: 'm-archive-borrow', label: '借阅管理' },
    ],
  },
]

export const projectOptions = [
  { id: 'p-001', name: 'T2空侧捷运线' },
  { id: 'p-002', name: '三跑道扩建' },
  { id: 'p-003', name: '东北站坪' },
  { id: 'p-004', name: '综合配套工程' },
]

/** 权限管理 */
export const permissionList = [
  { id: 'perm-001', code: 'workbench:view', name: '首页查看', type: '菜单', module: '首页', description: '访问工作台首页' },
  { id: 'perm-002', code: 'quality:inspect:list', name: '质量检查列表', type: '菜单', module: '质量管理', description: '查看质量检查列表' },
  { id: 'perm-003', code: 'quality:inspect:add', name: '质量检查新增', type: '按钮', module: '质量管理', description: '新增质量检查记录' },
  { id: 'perm-004', code: 'quality:inspect:export', name: '质量检查导出', type: '按钮', module: '质量管理', description: '导出质量检查数据' },
  { id: 'perm-005', code: 'safety:labor:view', name: '劳务管理查看', type: '菜单', module: '安全管理', description: '访问劳务管理模块' },
  { id: 'perm-006', code: 'coc:screen:view', name: 'COC大屏访问', type: '菜单', module: 'COC调度', description: '打开COC调度指挥大屏' },
  { id: 'perm-007', code: 'coc:admin:manage', name: 'COC后台管理', type: '菜单', module: 'COC调度', description: 'COC后台配置与管理' },
  { id: 'perm-008', code: 'archive:search', name: '档案检索', type: '菜单', module: '档案系统', description: '档案全文检索' },
  { id: 'perm-009', code: 'archive:borrow:approve', name: '借阅审批', type: '按钮', module: '档案系统', description: '审批档案借阅申请' },
  { id: 'perm-010', code: 'sys:user:manage', name: '用户管理', type: 'API', module: '系统设置', description: '用户增删改查接口' },
  { id: 'perm-011', code: 'sys:role:assign', name: '角色授权', type: 'API', module: '系统设置', description: '为角色分配权限' },
  { id: 'perm-012', code: 'sys:menu:manage', name: '菜单管理', type: 'API', module: '系统设置', description: '维护系统菜单树' },
]

export const permissionTypeOptions = ['全部', '菜单', '按钮', 'API']

/** 菜单管理 */
export const menuTypeOptions = [
  { value: 'system', label: '系统菜单' },
  { value: 'phase1', label: '一期菜单' },
  { value: 'archive', label: '档案系统菜单' },
  { value: 'coc', label: 'COC菜单' },
]

export const menuList = [
  { id: 'menu-001', name: '首页', path: '/workbench', menuType: 'system', parentName: '-', sort: 1, permission: 'workbench:view', visible: true },
  { id: 'menu-002', name: '资料管理', path: '/document', menuType: 'system', parentName: '-', sort: 2, permission: 'document:view', visible: true },
  { id: 'menu-003', name: '基础数据', path: '/basic-data', menuType: 'system', parentName: '-', sort: 3, permission: 'basic:view', visible: true },
  { id: 'menu-004', name: '系统设置', path: '/settings', menuType: 'system', parentName: '-', sort: 4, permission: 'sys:settings', visible: true },
  { id: 'menu-101', name: '质量管理', path: '/quality', menuType: 'phase1', parentName: '-', sort: 10, permission: 'quality:view', visible: true },
  { id: 'menu-102', name: '质量检查', path: '/quality/inspect', menuType: 'phase1', parentName: '质量管理', sort: 11, permission: 'quality:inspect:list', visible: true },
  { id: 'menu-103', name: '安全管理', path: '/safety', menuType: 'phase1', parentName: '-', sort: 20, permission: 'safety:view', visible: true },
  { id: 'menu-104', name: '劳务管理', path: '/safety/labor', menuType: 'phase1', parentName: '安全管理', sort: 21, permission: 'safety:labor:view', visible: true },
  { id: 'menu-201', name: '档案首页', path: '/archive/home', menuType: 'archive', parentName: '-', sort: 30, permission: 'archive:home', visible: true },
  { id: 'menu-202', name: '档案检索', path: '/archive/search', menuType: 'archive', parentName: '-', sort: 31, permission: 'archive:search', visible: true },
  { id: 'menu-203', name: '借阅管理', path: '/archive/borrow', menuType: 'archive', parentName: '-', sort: 32, permission: 'archive:borrow', visible: true },
  { id: 'menu-301', name: 'COC调度大屏', path: '/coc', menuType: 'coc', parentName: '-', sort: 40, permission: 'coc:screen:view', visible: true },
  { id: 'menu-302', name: 'COC后台管理', path: '/coc-admin', menuType: 'coc', parentName: '-', sort: 41, permission: 'coc:admin:manage', visible: true },
]
