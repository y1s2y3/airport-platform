/**
 * 质量看板 — 指挥部一级菜单
 * 含原「质量验评 / 统计看板」迁入项（改名「质量验评看板」）。
 * 项目层级不展示本菜单；质量验评执行菜单仅项目侧保留。
 */
export const qualityDashboardMenuGroup = {
  key: 'quality-board',
  label: '质量看板',
  icon: 'DataAnalysis',
  children: [
    {
      key: 'qm-dashboard',
      label: '质量验评看板',
      path: '/qm/inspect/dashboard',
      description: '验评指标看板；指挥部看全项目汇总。',
      name: 'QmDashboard',
      component: 'QmDashboardView',
    },
    {
      key: 'brand-approval-stats',
      label: '品牌报审统计',
      path: '/qm/quality-board/brand-stats',
      description: '指挥部按项目汇总品牌报审数据，支持下钻至项目报审台账。',
      name: 'BrandApprovalStats',
      component: 'BrandApprovalStatsView',
    },
    {
      key: 'sample-ledger',
      label: '样板台账',
      path: '/qm/sample/ledger',
      description: '指挥部查看样板台账（与项目侧共用页面）。',
      name: 'SampleLedger',
      component: 'SampleLedgerView',
    },
    {
      key: 'mat-dashboard',
      label: '材料进场看板',
      path: '/qm/mat/dashboard',
      description: '指挥部查看材料进场看板（与项目侧共用页面）。',
      name: 'MatDashboard',
      component: 'MatDashboardView',
    },
    {
      key: 'eq-dashboard',
      label: '设备进场看板',
      path: '/qm/eq/dashboard',
      description: '指挥部查看设备进场看板（与项目侧共用页面）。',
      name: 'EqDashboard',
      component: 'EqDashboardView',
    },
  ],
}

/** 仅新增路由：品牌报审统计（其余子菜单复用既有 sample/mat/eq 路由） */
export const qualityDashboardRoutes = [
  {
    key: 'brand-approval-stats',
    path: '/qm/quality-board/brand-stats',
    name: 'BrandApprovalStats',
    label: '品牌报审统计',
    component: 'BrandApprovalStatsView',
  },
]

export const qualityDashboardViewLoaders = {
  BrandApprovalStatsView: () => import('../views/quality/brand/BrandApprovalStatsView.vue'),
}
