/**
 * 实模一致验收 — 项目级挂在「施工质量管控」下（单层菜单项）
 * 对齐 research-qm-asbuilt-产品架构说明-v1（QM-ASBUILT）
 * 审批仅个人中心待办；指挥部无入口
 */
export const asbuiltMenuItem = {
  key: 'asbuilt-list',
  label: '实模一致验收',
  path: '/qm/asbuilt/list',
  description: '实模一致性报告与对比地址报审；审批在个人中心待办。',
  name: 'AsbuiltList',
  component: 'AsbuiltListView',
}

export const asbuiltExtraRoutes = [
  {
    key: 'asbuilt-edit',
    path: '/qm/asbuilt/edit',
    name: 'AsbuiltEdit',
    label: '新建实模一致验收',
    component: 'AsbuiltEditView',
    sidebarKey: 'asbuilt-list',
  },
  {
    key: 'asbuilt-detail',
    path: '/qm/asbuilt/detail',
    name: 'AsbuiltDetail',
    label: '实模一致验收详情',
    component: 'AsbuiltDetailView',
    sidebarKey: 'asbuilt-list',
  },
]

export const asbuiltRoutes = [asbuiltMenuItem, ...asbuiltExtraRoutes]

export const asbuiltViewLoaders = {
  AsbuiltListView: () => import('../views/quality/asbuilt/AsbuiltListView.vue'),
  AsbuiltEditView: () => import('../views/quality/asbuilt/AsbuiltEditView.vue'),
  AsbuiltDetailView: () => import('../views/quality/asbuilt/AsbuiltDetailView.vue'),
}
