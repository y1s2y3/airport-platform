/** 用户管理（兼容导出，数据源见 sysUsers.js） */
export { sysUserList, sysUserRecords } from './sysUsers'

/** 数据权限范围选项 */
export const dataScopeOptions = [
  { value: 'all', label: '全部项目' },
  { value: 'project', label: '指定项目' },
]

/** 角色管理（兼容导出，数据源见 roles.js） */
export {
  roleList,
  roleRecords,
  roleLevelOptions,
  roleStatusOptions,
  roleSourceOptions,
  getRole,
  listRoles,
  saveRole,
  deleteRole,
  toggleRoleStatus,
} from './roles'

/** 业务菜单树（用于角色授权，源自侧边栏菜单） */
export {
  webMenuPermissionTree as businessMenuTree,
  webMenuPermissionTree,
  appMenuPermissionTree,
} from '../utils/menuPermissionTree'

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
  { id: 'perm-010', code: 'sys:user:manage', name: '用户管理', type: 'API', module: '组织管理', description: '用户增删改查接口' },
  { id: 'perm-011', code: 'sys:role:assign', name: '角色授权', type: 'API', module: '组织管理', description: '为角色分配权限' },
  { id: 'perm-012', code: 'sys:menu:manage', name: '菜单管理', type: 'API', module: '组织管理', description: '维护系统菜单树' },
]

export const permissionTypeOptions = ['全部', '菜单', '按钮', 'API']

/** 菜单管理（兼容导出，数据源见 menus.js） */
export {
  webMenuTree,
  appMenuTree,
  menuPlatformOptions,
  menuNodeTypeOptions,
  moduleNameOptions,
  menuIconOptions,
  getMenuTreeByPlatform,
  listParentMenuOptions,
  saveMenuNode,
  deleteMenuNode,
  resetMenuTrees,
} from './menus'

/** @deprecated 扁平菜单列表，保留兼容 */
export const menuTypeOptions = [
  { value: 'system', label: '系统菜单' },
  { value: 'phase1', label: '一期菜单' },
  { value: 'archive', label: '档案系统菜单' },
  { value: 'coc', label: 'COC菜单' },
]

export const menuList = []
