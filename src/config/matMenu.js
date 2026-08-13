/**
 * 材料进场管理 — 项目级挂在「施工质量管控」下
 * 对齐 prd-mat-v1 / feature-list-mat-v1
 * 审批走个人中心待办，无独立审批菜单
 */
export const matMenuGroup = {
  key: 'mat-entry-mgmt',
  label: '材料进场管理',
  icon: 'Box',
  children: [
    {
      key: 'mat-ledger',
      label: '材料进场台账',
      path: '/qm/mat/ledger',
      description: '本项目全量进场台账，支持筛选与抽查（项目级）。',
      name: 'MatLedger',
      component: 'MatLedgerView',
    },
    {
      key: 'mat-application',
      label: '材料进场申请',
      path: '/qm/mat/applications',
      description: '施工新建进场报验；审批在个人中心待办。',
      name: 'MatApplication',
      component: 'MatApplicationListView',
    },
    {
      key: 'mat-exit',
      label: '材料退场登记',
      path: '/qm/mat/exit',
      description: '退场记录列表；新增/详情弹窗；登记即生效。',
      name: 'MatExit',
      component: 'MatExitView',
    },
  ],
}

/** 看板仅指挥部「质量看板」入口；路由保留供 HQ 复用 */
export const matExtraRoutes = [
  {
    key: 'mat-dashboard',
    path: '/qm/mat/dashboard',
    name: 'MatDashboard',
    label: '材料进场看板',
    component: 'MatDashboardView',
    sidebarKey: 'mat-dashboard',
    hidden: true,
  },
  {
    key: 'mat-application-edit',
    path: '/qm/mat/applications/edit',
    name: 'MatApplicationEdit',
    label: '新建进场申请',
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
}
