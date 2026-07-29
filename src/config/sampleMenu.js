/**
 * 样板管理 — 一级菜单（位于品牌报审之后）
 * 对齐 prd-sample-v1 / 架构 V1.2
 */
export const sampleMenuGroup = {
  key: 'sample-mgmt',
  label: '样板管理',
  icon: 'PictureFilled',
  children: [
    {
      key: 'sample-ledger',
      label: '样板台账',
      path: '/qm/sample/ledger',
      description: '已通过材料定样与工序样板视图；按类型、部位筛选。',
      name: 'SampleLedger',
      component: 'SampleLedgerView',
    },
    {
      key: 'sample-material-app',
      label: '材料定样报审',
      path: '/qm/sample/material/applications',
      description: '施工单位提交材料定版定样方案。',
      name: 'SampleMaterialApp',
      component: 'SampleMaterialAppListView',
    },
    {
      key: 'sample-material-approve',
      label: '材料定样审批',
      path: '/qm/sample/material/approve',
      description: '监理/项目经理审批；与个人中心待办并行。',
      name: 'SampleMaterialApprove',
      component: 'SampleMaterialApproveListView',
    },
    {
      key: 'sample-process-app',
      label: '关键工序样板报审',
      path: '/qm/sample/process/applications',
      description: '施工单位提交关键工序样板与交底。',
      name: 'SampleProcessApp',
      component: 'SampleProcessAppListView',
    },
    {
      key: 'sample-process-approve',
      label: '关键工序样板审批',
      path: '/qm/sample/process/approve',
      description: '监理→项目经理；通过后生成二维码。',
      name: 'SampleProcessApprove',
      component: 'SampleProcessApproveListView',
    },
  ],
}

export const sampleExtraRoutes = [
  {
    key: 'sample-material-edit',
    path: '/qm/sample/material/applications/edit',
    name: 'SampleMaterialEdit',
    label: '新建材料定样',
    component: 'SampleMaterialEditView',
    sidebarKey: 'sample-material-app',
  },
  {
    key: 'sample-material-detail',
    path: '/qm/sample/material/applications/detail',
    name: 'SampleMaterialDetail',
    label: '材料定样详情',
    component: 'SampleMaterialDetailView',
    sidebarKey: 'sample-material-app',
  },
  {
    key: 'sample-material-approve-detail',
    path: '/qm/sample/material/approve/detail',
    name: 'SampleMaterialApproveDetail',
    label: '材料定样审批',
    component: 'SampleMaterialDetailView',
    sidebarKey: 'sample-material-approve',
  },
  {
    key: 'sample-process-edit',
    path: '/qm/sample/process/applications/edit',
    name: 'SampleProcessEdit',
    label: '新建工序样板',
    component: 'SampleProcessEditView',
    sidebarKey: 'sample-process-app',
  },
  {
    key: 'sample-process-detail',
    path: '/qm/sample/process/applications/detail',
    name: 'SampleProcessDetail',
    label: '工序样板详情',
    component: 'SampleProcessDetailView',
    sidebarKey: 'sample-process-app',
  },
  {
    key: 'sample-process-approve-detail',
    path: '/qm/sample/process/approve/detail',
    name: 'SampleProcessApproveDetail',
    label: '工序样板审批',
    component: 'SampleProcessDetailView',
    sidebarKey: 'sample-process-approve',
  },
  {
    key: 'sample-process-qr',
    path: '/qm/sample/process/qr',
    name: 'SampleProcessQr',
    label: '工序样板二维码内容',
    component: 'SampleProcessQrView',
    sidebarKey: 'sample-ledger',
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

export const sampleRoutes = [...flattenMenuLeaves(sampleMenuGroup.children), ...sampleExtraRoutes]

export const sampleViewLoaders = {
  SampleLedgerView: () => import('../views/quality/sample/SampleLedgerView.vue'),
  SampleMaterialAppListView: () => import('../views/quality/sample/SampleMaterialAppListView.vue'),
  SampleMaterialEditView: () => import('../views/quality/sample/SampleMaterialEditView.vue'),
  SampleMaterialDetailView: () => import('../views/quality/sample/SampleMaterialDetailView.vue'),
  SampleMaterialApproveListView: () =>
    import('../views/quality/sample/SampleMaterialApproveListView.vue'),
  SampleProcessAppListView: () => import('../views/quality/sample/SampleProcessAppListView.vue'),
  SampleProcessEditView: () => import('../views/quality/sample/SampleProcessEditView.vue'),
  SampleProcessDetailView: () => import('../views/quality/sample/SampleProcessDetailView.vue'),
  SampleProcessApproveListView: () =>
    import('../views/quality/sample/SampleProcessApproveListView.vue'),
  SampleProcessQrView: () => import('../views/quality/sample/SampleProcessQrView.vue'),
}
