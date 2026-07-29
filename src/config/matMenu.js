/**
 * 材料进场管理 — 一级菜单（位于样板管理之后）
 * 对齐 prd-mat-v1 / feature-list-mat-v1
 * 审批走个人中心待办，无独立审批菜单
 */
export const matMenuGroup = {
  key: 'mat-entry-mgmt',
  label: '材料进场管理',
  icon: 'Box',
  children: [
    {
      key: 'mat-dashboard',
      label: '材料进场看板',
      path: '/qm/mat/dashboard',
      description: '进场批次、品牌一致率、不一致/已退场提醒。',
      name: 'MatDashboard',
      component: 'MatDashboardView',
    },
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
      description: '施工登记即生效；照片非必填。',
      name: 'MatExit',
      component: 'MatExitView',
    },
    {
      key: 'mat-library',
      label: '材料标准库',
      path: '/qm/mat/library',
      description: '复用品牌报审企业级材料/品牌库只读入口。',
      name: 'MatLibrary',
      component: 'MatLibraryView',
    },
  ],
}

export const matExtraRoutes = [
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
  MatLibraryView: () => import('../views/quality/mat/MatLibraryView.vue'),
}
