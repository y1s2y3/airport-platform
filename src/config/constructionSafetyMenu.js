/**
 * 巡检管理（Web）菜单与路由元数据
 * 页面组件由 router 懒加载，本文件只描述菜单/路由信息。
 * 指挥部「巡检看板」入口在安全看板；项目侧挂在「施工现场管理」下。
 */

/** 侧栏一级菜单：巡检管理 */
export const constructionSafetyMenuGroup = {
  key: 'safety-inspection',
  label: '巡检管理',
  icon: 'DocumentChecked',
  children: [
    {
      key: 'safety-plan',
      label: '任务下发',
      path: '/safety-inspection/plan',
    },
    {
      key: 'safety-check-items',
      label: '巡检检查项',
      path: '/safety-inspection/check-items',
    },
    {
      key: 'safety-inspector-config',
      label: '人员配置',
      path: '/safety-inspection/inspector-config',
    },
    {
      key: 'safety-task-manage',
      label: '巡检任务',
      path: '/safety-inspection/task',
    },
    {
      key: 'safety-hazard',
      label: '隐患清单',
      path: '/safety-inspection/hazard',
    },
    {
      key: 'mobile-safety-inspection',
      label: '巡检管理(移动端)',
      path: '/mobile/tasks',
    },
    {
      key: 'mobile-message-center',
      label: '消息中心(移动端)',
      path: '/mobile/messages',
    },
    {
      key: 'mobile-rectify',
      label: '整改复查(移动端)',
      path: '/mobile/rectify',
    },
  ],
}

/** Web 端路由（含隐藏子页：新增/编辑/详情） */
export const constructionSafetyRoutes = [
  {
    key: 'safety-dashboard',
    name: 'SafetyDashboard',
    label: '巡检看板',
    path: '/safety-inspection/dashboard',
  },
  {
    key: 'safety-plan',
    name: 'InspectionPlan',
    label: '任务下发',
    path: '/safety-inspection/plan',
  },
  {
    key: 'safety-plan-create',
    name: 'InspectionPlanCreate',
    label: '下发巡检任务',
    path: '/safety-inspection/plan/create',
    sidebarKey: 'safety-plan',
  },
  {
    key: 'safety-plan-edit',
    name: 'InspectionPlanEdit',
    label: '编辑巡检任务',
    path: '/safety-inspection/plan/:id/edit',
    sidebarKey: 'safety-plan',
  },
  {
    key: 'safety-plan-detail',
    name: 'InspectionPlanDetail',
    label: '巡检任务详情',
    path: '/safety-inspection/plan/:id',
    sidebarKey: 'safety-plan',
  },
  {
    key: 'safety-check-items',
    name: 'SafetyCheckItems',
    label: '巡检检查项',
    path: '/safety-inspection/check-items',
  },
  {
    key: 'safety-inspector-config',
    name: 'InspectionPersonConfig',
    label: '人员配置',
    path: '/safety-inspection/inspector-config',
  },
  {
    key: 'safety-task-manage',
    name: 'InspectionTaskManage',
    label: '巡检任务',
    path: '/safety-inspection/task',
  },
  {
    key: 'safety-task-detail',
    name: 'InspectionTaskDetail',
    label: '巡检任务详情',
    path: '/safety-inspection/task/:id',
    sidebarKey: 'safety-task-manage',
  },
  {
    key: 'safety-hazard',
    name: 'SafetyHazardList',
    label: '隐患清单',
    path: '/safety-inspection/hazard',
  },
  {
    key: 'safety-hazard-detail',
    name: 'SafetyHazardDetail',
    label: '隐患详情',
    path: '/safety-inspection/hazard/:id',
    sidebarKey: 'safety-hazard',
  },
]

/** 风险管理（页面已迁入，默认不挂侧栏；路由按需注册；静态段须排在 :month 之前） */
export const riskManageRoutes = [
  {
    key: 'safety-risk',
    name: 'RiskManage',
    label: '风险管理',
    path: '/safety-inspection/risk',
  },
  {
    key: 'safety-risk-create',
    name: 'RiskManageCreate',
    label: '新增风险辨识',
    path: '/safety-inspection/risk/create',
    sidebarKey: 'safety-risk',
  },
  {
    key: 'safety-risk-type-config',
    name: 'RiskTypeConfig',
    label: '风险类型配置',
    path: '/safety-inspection/risk/type-config',
    sidebarKey: 'safety-risk',
  },
  {
    key: 'safety-risk-detail',
    name: 'RiskManageDetail',
    label: '风险详情',
    path: '/safety-inspection/risk/:month',
    sidebarKey: 'safety-risk',
  },
]

export const mobileSafetyRoutes = [
  {
    key: 'mobile-safety-inspection',
    name: 'MobileTaskList',
    label: '巡检管理(移动端)',
    path: '/mobile/tasks',
  },
  {
    key: 'mobile-task-create',
    name: 'MobileTaskCreate',
    label: '新建巡检',
    path: '/mobile/tasks/create',
    sidebarKey: 'mobile-safety-inspection',
  },
  {
    key: 'mobile-task-execute',
    name: 'MobileTaskExecute',
    label: '执行巡检',
    path: '/mobile/tasks/:id/execute',
    sidebarKey: 'mobile-safety-inspection',
  },
  {
    key: 'mobile-task-detail',
    name: 'MobileTaskDetail',
    label: '检查结果',
    path: '/mobile/tasks/:id',
    sidebarKey: 'mobile-safety-inspection',
  },
  {
    key: 'mobile-message-center',
    name: 'MobileMessageCenter',
    label: '消息中心(移动端)',
    path: '/mobile/messages',
  },
  {
    key: 'mobile-rectify',
    name: 'MobileRectifyList',
    label: '整改复查(移动端)',
    path: '/mobile/rectify',
  },
  {
    key: 'mobile-rectify-execute',
    name: 'MobileRectifyExecute',
    label: '整改执行',
    path: '/mobile/rectify/:id/execute',
    sidebarKey: 'mobile-rectify',
  },
  {
    key: 'mobile-rectify-review',
    name: 'MobileRectifyReview',
    label: '整改复查',
    path: '/mobile/rectify/:id/review',
    sidebarKey: 'mobile-rectify',
  },
  {
    key: 'mobile-rectify-approval',
    name: 'MobileRectifyApproval',
    label: '项目经理审批',
    path: '/mobile/rectify/:id/approval',
    sidebarKey: 'mobile-message-center',
  },
  {
    key: 'mobile-rectify-detail',
    name: 'MobileRectifyDetail',
    label: '整改详情',
    path: '/mobile/rectify/:id',
    sidebarKey: 'mobile-rectify',
  },
]
