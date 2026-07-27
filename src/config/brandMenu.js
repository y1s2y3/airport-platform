/**
 * 品牌报审 — 一级菜单（位于质量验评之后）
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
      description: '本项目已通过报审台账；按品牌/厂家/材料名称查询。',
      name: 'BrandLedger',
      component: 'BrandLedgerView',
    },
    {
      key: 'brand-application',
      label: '报审申请',
      path: '/qm/brand/applications',
      description: '施工单位新建并直接提交品牌报审；支持撤回与重提。',
      name: 'BrandApplication',
      component: 'BrandApplicationListView',
    },
    // 报审审批已下线独立菜单：监理/项目经理统一在个人中心待办处理
    {
      key: 'brand-library',
      label: '品牌库管理',
      path: '/qm/brand/library',
      description: '企业级品牌库维护；项目侧只读引用。',
      name: 'BrandLibrary',
      component: 'BrandLibraryView',
    },
    {
      key: 'brand-material',
      label: '材料规格库',
      path: '/qm/brand/materials',
      description: '企业级材料与规格主数据；报审导入仅启用材料。',
      name: 'BrandMaterial',
      component: 'BrandMaterialView',
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
  BrandLibraryView: () => import('../views/quality/brand/BrandLibraryView.vue'),
  BrandMaterialView: () => import('../views/quality/brand/BrandMaterialView.vue'),
}
