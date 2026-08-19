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
      label: '品牌报审',
      path: '/qm/quality-board/brand-stats',
      description: '指挥部按项目汇总品牌报审与台账指标；操作仅查看项目详情。',
      name: 'BrandApprovalStats',
      component: 'BrandApprovalStatsView',
    },
    {
      key: 'sample-ledger',
      label: '样板台账',
      path: '/qm/sample/ledger',
      description: '指挥部按项目汇总材料定样与工序样板指标；操作仅查看项目详情。',
      name: 'SampleLedger',
      component: 'SampleLedgerView',
    },
    {
      key: 'mat-dashboard',
      label: '材料设备进场',
      path: '/qm/mat/dashboard',
      description: '指挥部按项目汇总材料/设备进场指标；操作仅查看项目详情。',
      name: 'MatDashboard',
      component: 'MatDashboardView',
    },
  ],
}

/** 仅新增路由：品牌报审（其余子菜单复用既有 sample/mat 路由） */
export const qualityDashboardRoutes = [
  {
    key: 'brand-approval-stats',
    path: '/qm/quality-board/brand-stats',
    name: 'BrandApprovalStats',
    label: '品牌报审',
    component: 'BrandApprovalStatsView',
  },
]

export const qualityDashboardViewLoaders = {
  BrandApprovalStatsView: () => import('../views/quality/brand/BrandApprovalStatsView.vue'),
}
