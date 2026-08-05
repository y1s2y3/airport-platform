/**
 * 质量验评菜单 — 仅项目层级；挂在「施工质量管控」下
 * 按实体工程验收 / 专项验收 / 竣工验收划分；不做验收计划
 */
export const qualityMenuGroup = {
  key: 'quality-inspect',
  label: '质量验评',
  icon: 'Medal',
  children: [
    {
      key: 'qm-dashboard',
      label: '质量验评看板',
      path: '/qm/inspect/dashboard',
      description: '验评指标看板；项目级看本项目。',
      name: 'QmDashboard',
      component: 'QmDashboardView',
    },
    {
      key: 'qm-wbs-tree',
      label: '验评目录树',
      path: '/qm/inspect/tree',
      description:
        '树结构：项目竣工验收 → 实体工程验收 / 专项验收；实体下维护单位工程至检验批；专项下自建消防、人防等节点。',
      name: 'QmWbsTree',
      component: 'QmWbsTreeView',
    },
    {
      key: 'qm-form-fill-deep',
      label: '实体工程验收',
      path: '/qm/inspect/form-fill-deep',
      description:
        '检验批至单位工程逐级验收；下级全部通过后方可发起当前节点验收任务。',
      name: 'QmFormFillDeep',
      component: 'QmFormFillDeepView',
    },
    {
      key: 'qm-special-deep',
      label: '专项验收',
      path: '/qm/inspect/special-deep',
      description: '针对目录树专项节点（消防、人防等）发起验收；与实体工程可并行。',
      name: 'QmSpecialDeep',
      component: 'QmSpecialDeepView',
    },
    {
      key: 'qm-complete-deep',
      label: '竣工验收',
      path: '/qm/inspect/complete-deep',
      description: '实体工程与专项验收全部完成后，方可发起项目竣工验收。',
      name: 'QmCompleteDeep',
      component: 'QmCompleteDeepView',
    },
    {
      key: 'qm-seal-user',
      label: '项目用章人配置',
      path: '/qm/inspect/seal-user',
      description: '项目用章人维护；保存即下传档案系统，供档案侧签章调用。',
      name: 'QmSealUserConfig',
      component: 'QmSealUserConfigView',
    },
    {
      key: 'qm-app-approve',
      label: 'App审批待办',
      path: '/qm/inspect/app/approve',
      description: '移动端审批待办；与验评任务同源。',
      name: 'QmAppApprove',
      component: 'QmAppApproveListView',
    },
  ],
}

/** 已隐藏的侧栏菜单：保留路由兼容旧链接，不在侧栏展示 */
export const qualityHiddenMenus = [
  // V2.3.1：表单填报（第三方表格系统嵌入）随省统表填报下线；审批人配置随「审批链档案同步」下线
  {
    key: 'qm-form-fill',
    label: '表单填报',
    path: '/qm/inspect/form-fill',
    name: 'QmFormFill',
    component: 'QmFormFillView',
    hidden: true,
  },
  {
    key: 'qm-approver-config',
    label: '审批人配置',
    path: '/qm/inspect/approver-config',
    name: 'QmApproverConfig',
    component: 'QmApproverConfigView',
    hidden: true,
  },
  {
    key: 'qm-plan-list',
    label: '验收计划',
    path: '/qm/inspect/plans',
    name: 'QmPlanList',
    component: 'QmPlanListView',
    hidden: true,
  },
  {
    key: 'qm-ledger',
    label: '实体验收台账',
    path: '/qm/inspect/ledger',
    name: 'QmLedger',
    component: 'QmLedgerView',
    hidden: true,
  },
  {
    key: 'qm-forms',
    label: '验收单模板库',
    path: '/qm/inspect/forms',
    name: 'QmFormLibrary',
    component: 'QmFormLibraryView',
    hidden: true,
  },
  {
    key: 'qm-batch-types',
    label: '检验批类型',
    path: '/qm/inspect/batch-types',
    name: 'QmBatchTypes',
    component: 'QmBatchTypeView',
    hidden: true,
  },
  {
    key: 'qm-unit-scheme',
    label: '默认资料配置',
    path: '/qm/inspect/unit-scheme',
    name: 'QmUnitScheme',
    component: 'QmUnitSchemeView',
    hidden: true,
  },
  {
    key: 'qm-batch-list',
    label: '检验批验收',
    path: '/qm/inspect/batch/list',
    name: 'QmBatchList',
    component: 'QmBatchListView',
    hidden: true,
  },
  {
    key: 'qm-part-list',
    label: '分部分项验收',
    path: '/qm/inspect/part/list',
    name: 'QmPartList',
    component: 'QmPartListView',
    hidden: true,
  },
  {
    key: 'qm-unit-list',
    label: '单位工程验收',
    path: '/qm/inspect/unit/list',
    name: 'QmUnitList',
    component: 'QmUnitListView',
    hidden: true,
  },
  {
    key: 'qm-special-list',
    label: '专项验收',
    path: '/qm/inspect/special/list',
    name: 'QmSpecialList',
    component: 'QmSpecialListView',
    hidden: true,
  },
  {
    key: 'qm-complete-list',
    label: '竣工验收',
    path: '/qm/inspect/complete/list',
    name: 'QmCompleteList',
    component: 'QmCompleteListView',
    hidden: true,
  },
  {
    key: 'qm-rectify-list',
    label: '整改复验',
    path: '/qm/inspect/rectify/list',
    name: 'QmRectifyList',
    component: 'QmRectifyListView',
    hidden: true,
  },
]

/** 非侧栏叶子：编辑/审批/复核等子页 */
export const qualityExtraRoutes = [
  { key: 'qm-plan-edit', path: '/qm/inspect/plans/edit', name: 'QmPlanEdit', label: '编制计划', component: 'QmPlanEditView', sidebarKey: 'qm-plan-list' },
  { key: 'qm-plan-review', path: '/qm/inspect/plans/review', name: 'QmPlanReview', label: '计划复核', component: 'QmPlanReviewView', sidebarKey: 'qm-plan-list' },
  { key: 'qm-form-fill-edit', path: '/qm/inspect/form-fill/edit', name: 'QmFormFillEdit', label: '表格填写', component: 'QmFormFillEditView', sidebarKey: 'qm-form-fill' },
  { key: 'qm-batch-edit', path: '/qm/inspect/batch/edit', name: 'QmBatchEdit', label: '检验批填报', component: 'QmBatchEditView', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-batch-approve', path: '/qm/inspect/batch/approve', name: 'QmBatchApprove', label: '检验批审批', component: 'QmBatchApproveView', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-part-edit', path: '/qm/inspect/part/edit', name: 'QmPartEdit', label: '分部分项填报', component: 'QmPartEditView', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-part-approve', path: '/qm/inspect/part/approve', name: 'QmPartApprove', label: '分部分项审批', component: 'QmPartApproveView', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-unit-edit', path: '/qm/inspect/unit/edit', name: 'QmUnitEdit', label: '单位工程填报', component: 'QmUnitEditView', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-unit-approve', path: '/qm/inspect/unit/approve', name: 'QmUnitApprove', label: '单位工程审批', component: 'QmUnitApproveView', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-special-edit', path: '/qm/inspect/special/edit', name: 'QmSpecialEdit', label: '专项填报', component: 'QmSpecialEditView', sidebarKey: 'qm-special-deep' },
  { key: 'qm-special-approve', path: '/qm/inspect/special/approve', name: 'QmSpecialApprove', label: '专项审批', component: 'QmSpecialApproveView', sidebarKey: 'qm-special-deep' },
  { key: 'qm-complete-edit', path: '/qm/inspect/complete/edit', name: 'QmCompleteEdit', label: '竣工填报', component: 'QmCompleteEditView', sidebarKey: 'qm-complete-deep' },
  { key: 'qm-complete-approve', path: '/qm/inspect/complete/approve', name: 'QmCompleteApprove', label: '竣工审批', component: 'QmCompleteApproveView', sidebarKey: 'qm-complete-deep' },
  { key: 'qm-rectify-detail', path: '/qm/inspect/rectify/detail', name: 'QmRectifyDetail', label: '整改详情', component: 'QmRectifyDetailView', sidebarKey: 'qm-form-fill-deep' },
  {
    key: 'qm-app-approve-detail',
    path: '/qm/inspect/app/approve/detail',
    name: 'QmAppApproveDetail',
    label: 'App审批详情',
    component: 'QmAppApproveDetailView',
    sidebarKey: 'qm-app-approve',
  },
]

export function flattenMenuLeaves(items = []) {
  const leaves = []
  for (const item of items) {
    if (item.path) leaves.push(item)
    else if (item.children?.length) leaves.push(...flattenMenuLeaves(item.children))
  }
  return leaves
}

export const qualityRoutes = [
  ...flattenMenuLeaves(qualityMenuGroup.children),
  ...qualityHiddenMenus,
  ...qualityExtraRoutes,
]

export const qualityViewLoaders = {
  QmWbsTreeView: () => import('../views/quality/QmWbsTreeView.vue'),
  QmFormLibraryView: () => import('../views/quality/QmFormLibraryView.vue'),
  QmBatchTypeView: () => import('../views/quality/QmBatchTypeView.vue'),
  QmUnitSchemeView: () => import('../views/quality/QmUnitSchemeView.vue'),
  QmPlanListView: () => import('../views/quality/QmPlanListView.vue'),
  QmPlanEditView: () => import('../views/quality/QmPlanEditView.vue'),
  QmPlanReviewView: () => import('../views/quality/QmPlanReviewView.vue'),
  QmFormFillView: () => import('../views/quality/QmFormFillView.vue'),
  QmFormFillEditView: () => import('../views/quality/QmFormFillEditView.vue'),
  QmFormFillDeepView: () => import('../views/quality/QmFormFillDeepView.vue'),
  QmSpecialDeepView: () => import('../views/quality/QmSpecialDeepView.vue'),
  QmCompleteDeepView: () => import('../views/quality/QmCompleteDeepView.vue'),
  QmApproverConfigView: () => import('../views/quality/QmApproverConfigView.vue'),
  QmBatchListView: () => import('../views/quality/QmBatchListView.vue'),
  QmBatchEditView: () => import('../views/quality/QmBatchEditView.vue'),
  QmBatchApproveView: () => import('../views/quality/QmBatchApproveView.vue'),
  QmPartListView: () => import('../views/quality/QmPartListView.vue'),
  QmPartEditView: () => import('../views/quality/QmPartEditView.vue'),
  QmPartApproveView: () => import('../views/quality/QmPartApproveView.vue'),
  QmUnitListView: () => import('../views/quality/QmUnitListView.vue'),
  QmUnitEditView: () => import('../views/quality/QmUnitEditView.vue'),
  QmUnitApproveView: () => import('../views/quality/QmUnitApproveView.vue'),
  QmSpecialListView: () => import('../views/quality/QmSpecialListView.vue'),
  QmSpecialEditView: () => import('../views/quality/QmSpecialEditView.vue'),
  QmSpecialApproveView: () => import('../views/quality/QmSpecialApproveView.vue'),
  QmCompleteListView: () => import('../views/quality/QmCompleteListView.vue'),
  QmCompleteEditView: () => import('../views/quality/QmCompleteEditView.vue'),
  QmCompleteApproveView: () => import('../views/quality/QmCompleteApproveView.vue'),
  QmRectifyListView: () => import('../views/quality/QmRectifyListView.vue'),
  QmRectifyDetailView: () => import('../views/quality/QmRectifyDetailView.vue'),
  QmDashboardView: () => import('../views/quality/QmDashboardView.vue'),
  QmLedgerView: () => import('../views/quality/QmLedgerView.vue'),
  QmAppApproveListView: () => import('../views/quality/QmAppApproveListView.vue'),
  QmAppApproveDetailView: () => import('../views/quality/QmAppApproveDetailView.vue'),
  QmSealUserConfigView: () => import('../views/quality/QmSealUserConfigView.vue'),
}
