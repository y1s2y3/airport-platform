/**
 * 设备进场管理 — V2.0 已合并至材料设备进场管理（matMenuGroup）
 * 路由保留供 redirect / 个人中心兼容；侧栏不再挂载
 */
export const eqMenuGroup = {
  key: 'eq-entry-mgmt',
  label: '设备进场管理（已合并）',
  icon: 'SetUp',
  children: [],
}

/** 旧路由 redirect 至 mat 合并模块 */
export const eqExtraRoutes = [
  {
    key: 'eq-dashboard',
    path: '/qm/eq/dashboard',
    name: 'EqDashboard',
    label: '设备进场看板',
    component: 'EqDashboardView',
    sidebarKey: 'eq-dashboard',
    hidden: true,
  },
  {
    key: 'eq-ledger',
    path: '/qm/eq/ledger',
    name: 'EqLedger',
    label: '材料设备台账',
    component: 'EqLedgerView',
    sidebarKey: 'eq-ledger',
    hidden: true,
  },
  {
    key: 'eq-application',
    path: '/qm/eq/applications',
    name: 'EqApplication',
    label: '设备进场申请',
    component: 'EqApplicationListView',
    sidebarKey: 'eq-application',
    hidden: true,
  },
  {
    key: 'eq-application-edit',
    path: '/qm/eq/applications/edit',
    name: 'EqApplicationEdit',
    label: '新建设备进场',
    component: 'EqApplicationEditView',
    sidebarKey: 'eq-application',
    hidden: true,
  },
  {
    key: 'eq-application-detail',
    path: '/qm/eq/applications/detail',
    name: 'EqApplicationDetail',
    label: '设备进场详情',
    component: 'EqApplicationDetailView',
    sidebarKey: 'eq-application',
    hidden: true,
  },
]

export const eqRoutes = [...eqExtraRoutes]

export const eqViewLoaders = {
  EqDashboardView: () => import('../views/quality/eq/EqDashboardView.vue'),
  EqLedgerView: () => import('../views/quality/eq/EqLedgerView.vue'),
  EqApplicationListView: () => import('../views/quality/eq/EqApplicationListView.vue'),
  EqApplicationEditView: () => import('../views/quality/eq/EqApplicationEditView.vue'),
  EqApplicationDetailView: () => import('../views/quality/eq/EqApplicationDetailView.vue'),
}
