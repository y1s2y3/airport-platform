/**
 * 品牌报审 — 项目级挂在「施工质量管控」下
 */
export const brandMenuGroup = {
  key: 'brand-approval',
  label: '品牌报审',
  icon: 'Goods',
  children: [
    {
      key: 'brand-ledger',
      label: '品牌报审台账',
      path: '/qm/brand/ledger',
      description: '本项目审批通过写入的品牌台账；按品牌/厂家/材料名称查询。',
      name: 'BrandLedger',
      component: 'BrandLedgerView',
    },
    {
      key: 'brand-application',
      label: '报审申请',
      path: '/qm/brand/applications',
      description: '施工单位新建并直接提交品牌报审；已撤回 / 已驳回可重新申报；审批在个人中心待办处理。',
      name: 'BrandApplication',
      component: 'BrandApplicationListView',
    },
  ],
}

export const brandExtraRoutes = [
  {
    key: 'brand-application-edit',
    path: '/qm/brand/applications/edit',
    name: 'BrandApplicationEdit',
    label: '新建报审',
    component: 'BrandApplicationEditView',
    sidebarKey: 'brand-application',
  },
  {
    key: 'brand-application-detail',
    path: '/qm/brand/applications/detail',
    name: 'BrandApplicationDetail',
    label: '报审详情',
    component: 'BrandApplicationDetailView',
    sidebarKey: 'brand-application',
  },
  {
    key: 'brand-ledger-detail',
    path: '/qm/brand/ledger/detail',
    name: 'BrandLedgerDetail',
    label: '报审详情',
    component: 'BrandApplicationDetailView',
    sidebarKey: 'brand-ledger',
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

export const brandRoutes = [...flattenMenuLeaves(brandMenuGroup.children), ...brandExtraRoutes]

export const brandViewLoaders = {
  BrandLedgerView: () => import('../views/quality/brand/BrandLedgerView.vue'),
  BrandApplicationListView: () => import('../views/quality/brand/BrandApplicationListView.vue'),
  BrandApplicationEditView: () => import('../views/quality/brand/BrandApplicationEditView.vue'),
  BrandApplicationDetailView: () => import('../views/quality/brand/BrandApplicationDetailView.vue'),
}
