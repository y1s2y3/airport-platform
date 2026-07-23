/**
 * 质量验评菜单 — 对齐 PRD 原型页面路径
 * 指挥部侧栏：统计看板
 * 项目侧栏：统计看板 + 目录树/计划/表单填报/实体验收(深度集成含专项)/App审批等
 */
export const qualityMenuGroup = {
  key: 'quality-inspect',
  label: '质量验评',
  icon: 'Medal',
  children: [
    {
      key: 'qm-dashboard',
      label: '统计看板',
      path: '/qm/inspect/dashboard',
      description: '验评指标看板；指挥部看全项目，项目级看本项目。',
      name: 'QmDashboard',
      component: 'QmDashboardView',
    },
    {
      key: 'qm-wbs-tree',
      label: '验评目录树',
      path: '/qm/inspect/tree',
      description: '项目维护本工程验评目录树，检验批绑定类型。',
      name: 'QmWbsTree',
      component: 'QmWbsTreeView',
    },
    {
      key: 'qm-plan-list',
      label: '验收计划',
      path: '/qm/inspect/plans',
      description: '计划编制/复核/跟踪；可从计划发起验评。',
      name: 'QmPlanList',
      component: 'QmPlanListView',
    },
    {
      key: 'qm-form-fill',
      label: '表单填报',
      path: '/qm/inspect/form-fill',
      description: '嵌入第三方表格填报系统（WBS + 工序表格填报）。',
      name: 'QmFormFill',
      component: 'QmFormFillView',
    },
    {
      key: 'qm-physical-deep',
      label: '实体验收（深度集成）',
      children: [
        {
          key: 'qm-form-fill-deep',
          label: '实体验收',
          path: '/qm/inspect/form-fill-deep',
          description: '实体验收列表仅展示单位工程；下级通过后方可发起单位工程报验。',
          name: 'QmFormFillDeep',
          component: 'QmFormFillDeepView',
        },
        {
          key: 'qm-special-deep',
          label: '专项验收',
          path: '/qm/inspect/special-deep',
          description: '专项验收：挂接验收计划、选择专项类型；不挂目录树；按类型必传法定资料。',
          name: 'QmSpecialDeep',
          component: 'QmSpecialDeepView',
        },
        {
          key: 'qm-complete-deep',
          label: '竣工验收',
          path: '/qm/inspect/complete-deep',
          description: '实体与专项均完成后发起竣工；表单页顶部展示实体/专项完成情况。',
          name: 'QmCompleteDeep',
          component: 'QmCompleteDeepView',
        },
      ],
    },
    {
      key: 'qm-approver-config',
      label: '审批人配置',
      path: '/qm/inspect/approver-config',
      description: '项目级按建设单位/监理/施工/勘察/设计/验收组等岗位分类配置审批人，均支持多人。',
      name: 'QmApproverConfig',
      component: 'QmApproverConfigView',
    },
    {
      key: 'qm-app-approve',
      label: 'App审批待办',
      path: '/qm/inspect/app/approve',
      description: '移动端审批待办；与实体验收（深度集成）同源任务与字段。',
      name: 'QmAppApprove',
      component: 'QmAppApproveListView',
    },
  ],
}

/** 已隐藏的侧栏菜单：保留路由兼容旧链接，不在侧栏展示 */
export const qualityHiddenMenus = [
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
  { key: 'qm-part-edit', path: '/qm/inspect/part/edit', name: 'QmPartEdit', label: '分部分项填报', component: 'QmPartEditView', sidebarKey: 'qm-form-fill' },
  { key: 'qm-part-approve', path: '/qm/inspect/part/approve', name: 'QmPartApprove', label: '分部分项审批', component: 'QmPartApproveView', sidebarKey: 'qm-form-fill' },
  { key: 'qm-unit-edit', path: '/qm/inspect/unit/edit', name: 'QmUnitEdit', label: '单位工程填报', component: 'QmUnitEditView', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-unit-approve', path: '/qm/inspect/unit/approve', name: 'QmUnitApprove', label: '单位工程审批', component: 'QmUnitApproveView', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-special-edit', path: '/qm/inspect/special/edit', name: 'QmSpecialEdit', label: '专项填报', component: 'QmSpecialEditView', sidebarKey: 'qm-special-deep' },
  { key: 'qm-special-approve', path: '/qm/inspect/special/approve', name: 'QmSpecialApprove', label: '专项审批', component: 'QmSpecialApproveView', sidebarKey: 'qm-special-deep' },
  { key: 'qm-complete-edit', path: '/qm/inspect/complete/edit', name: 'QmCompleteEdit', label: '竣工填报', component: 'QmCompleteEditView', sidebarKey: 'qm-complete-deep' },
  { key: 'qm-complete-approve', path: '/qm/inspect/complete/approve', name: 'QmCompleteApprove', label: '竣工审批', component: 'QmCompleteApproveView', sidebarKey: 'qm-complete-deep' },
  { key: 'qm-rectify-detail', path: '/qm/inspect/rectify/detail', name: 'QmRectifyDetail', label: '整改详情', component: 'QmRectifyDetailView', sidebarKey: 'qm-form-fill' },
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
}
