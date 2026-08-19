/**
 * 材料设备进场管理 — 项目级挂在「施工质量管控」下
 * 对齐 research-mat-eq V2.0
 */
export const matMenuGroup = {
  key: 'mat-entry-mgmt',
  label: '材料设备进场管理',
  icon: 'Box',
  children: [
    {
      key: 'mat-ledger',
      label: '材料设备台账',
      path: '/qm/mat/ledger',
      description: '本项目全量材料/设备台账，支持类型筛选与抽查。',
      name: 'MatLedger',
      component: 'MatLedgerView',
    },
    {
      key: 'mat-application',
      label: '进场申请',
      path: '/qm/mat/applications',
      description: '施工单位新建并提交进场申请；已撤回 / 已驳回可重新申报。',
      name: 'MatApplication',
      component: 'MatApplicationListView',
    },
    {
      key: 'mat-exit',
      label: '退场登记',
      path: '/qm/mat/exit',
      description: 'Web 查询退场记录；登记退场请在 APP「退场登记（移动端）」完成。',
      name: 'MatExit',
      component: 'MatExitView',
    },
    {
      key: 'mobile-mat-entry',
      label: '进场申请（移动端）',
      path: '/mobile/mat/entry',
      description: 'APP：进场申报 / 已撤回与已驳回重新申报；附件一律拍照。',
      name: 'MobileMatEntryList',
      component: 'MobileMatEntryListView',
    },
    {
      key: 'mobile-mat-exit',
      label: '退场登记（移动端）',
      path: '/mobile/mat/exit',
      description: 'APP：登记退场；现场照片一律拍照。',
      name: 'MobileMatExit',
      component: 'MobileMatExitView',
    },
  ],
}

/** 看板仅指挥部「质量看板」入口；路由保留供 HQ 复用 */
export const matExtraRoutes = [
  {
    key: 'mat-dashboard',
    path: '/qm/mat/dashboard',
    name: 'MatDashboard',
    label: '材料设备进场',
    component: 'MatDashboardView',
    sidebarKey: 'mat-dashboard',
    hidden: true,
  },
  {
    key: 'mat-application-edit',
    path: '/qm/mat/applications/edit',
    name: 'MatApplicationEdit',
    label: '进场申报',
    component: 'MatApplicationEditView',
    sidebarKey: 'mat-application',
  },
  {
    key: 'mat-application-detail',
    path: '/qm/mat/applications/detail',
    name: 'MatApplicationDetail',
    label: '进场详情',
    component: 'MatApplicationDetailView',
    sidebarKey: 'mat-application',
  },
  {
    key: 'mobile-mat-entry-create',
    path: '/mobile/mat/entry/create',
    name: 'MobileMatEntryEdit',
    label: '进场申报（移动端）',
    component: 'MobileMatEntryEditView',
    sidebarKey: 'mobile-mat-entry',
  },
]

function flattenMenuLeaves(items = []) {
  const leaves = []
  for (const item of items) {
    if (item.path) leaves.push(item)
    else if (item.children?.length) leaves.push(...flattenMenuLeaves(item.children))
  }
  return leaves
}

export const matRoutes = [...flattenMenuLeaves(matMenuGroup.children), ...matExtraRoutes]

export const matViewLoaders = {
  MatDashboardView: () => import('../views/quality/mat/MatDashboardView.vue'),
  MatLedgerView: () => import('../views/quality/mat/MatLedgerView.vue'),
  MatApplicationListView: () => import('../views/quality/mat/MatApplicationListView.vue'),
  MatApplicationEditView: () => import('../views/quality/mat/MatApplicationEditView.vue'),
  MatApplicationDetailView: () => import('../views/quality/mat/MatApplicationDetailView.vue'),
  MatExitView: () => import('../views/quality/mat/MatExitView.vue'),
  MobileMatEntryListView: () => import('../views/mobile/MobileMatEntryListView.vue'),
  MobileMatEntryEditView: () => import('../views/mobile/MobileMatEntryEditView.vue'),
  MobileMatExitView: () => import('../views/mobile/MobileMatExitView.vue'),
}
