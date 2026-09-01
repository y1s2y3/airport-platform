import { resolveQmInspectHandleRedirect } from '../mock/personalCenter.js'

/**
 * 菜单配置 —— 唯一数据源（单文件）
 *
 * 侧栏菜单 / 路由 / 角色授权树 全部从这里派生，不再散落多个文件。
 *
 * 约定：
 * - 每个菜单项自带 `levels`：'both' | 'hq'(仅指挥部) | 'project'(仅项目部)，两级各自过滤、互不干扰。
 * - 同一项可在两级分别配置 `labelByLevel`（名称）与 `sortByLevel`（排序）。
 * - `key` 在同一层级内唯一；指挥部与项目部**不同 path**（L11 已拆：指挥部 `/hq/...` 前缀，项目部保留原 path）。
 * - L11 已拆 path 对：`/hq/machine-supervise/ledger`↔`/machine-supervise/ledger`、`/hq/machine-supervise/alert-record`↔`/machine-supervise/alert-record`、
 *   `/hq/major-hazard/alert-record`↔`/major-hazard/alert-record`、`/hq/qm/sample/ledger`↔`/qm/sample/ledger`。
 * - 等价 path 双向 redirect 见 `src/router/hqLevelPathRedirect.js`（含 `?from=hq` 台账下钻例外）。
 * - 侧栏高亮以 `meta.sidebarKey` 为准。
 * - `component` 为内容组件名（字符串）；`routeComponent` 仅在需要包装组件时使用（调度后台 / 视频监控）。
 * - 页面 import 全部集中在 `viewLoaders`。
 */

/** 层级标记 */
export const MENU_SCOPE_HQ = 'hq'
export const MENU_SCOPE_PROJECT = 'project'

/* ============================================================================
 * 1. 侧栏菜单树（唯一展示数据源）
 * ==========================================================================*/
export const menuTree = [
  { key: 'workbench', label: '工作台', icon: 'Monitor', path: '/workbench', name: 'Workbench', component: 'WorkbenchView', levels: 'both' },
  { key: 'personal-center', label: '个人中心', icon: 'Notebook', path: '/personal-center', name: 'PersonalCenter', component: 'PersonalCenterView', levels: 'both' },
  /** 建管 APP：顶层全屏壳（router/index.js），不进 AdminLayout；buildRoutes 跳过 /app */
  {
    key: 'jg-app',
    label: '建管APP',
    icon: 'Iphone',
    path: '/app/login',
    name: 'JgAppEntry',
    component: 'AppLoginView',
    levels: 'project',
    description: '项目级建管 APP 演示入口（登录后进入底栏三 Tab）。',
  },

  /** 指挥部 · 安全看板 */
  {
    key: 'safety-board', label: '安全看板', icon: 'DataBoard', levels: 'hq',
    children: [
      { key: 'safety-dashboard', label: '巡检看板', path: '/safety-inspection/dashboard', name: 'SafetyDashboard', component: 'SafetyDashboardView', levels: 'hq' },
      { key: 'video-monitor-stats', label: '视频监控统计', path: '/video-monitor/stats', name: 'VideoMonitorStats', component: 'VideoMonitorStatsView', routeComponent: 'VideoMonitorPageView', levels: 'hq', description: '指挥部级视频监控统计。' },
      { key: 'machine-entry-manage', label: '机械设备台账', path: '/hq/machine-supervise/ledger', name: 'MachineEntryManageHq', component: 'MachineryLedgerView', levels: 'hq' },
      { key: 'alert-record', label: '机械设备预警', path: '/hq/machine-supervise/alert-record', name: 'AlertRecordHq', component: 'AlertRecordView', levels: 'hq' },
      { key: 'alert-record-major', label: '危大监测预警', path: '/hq/major-hazard/alert-record', name: 'AlertRecordMajorHq', component: 'AlertRecordMajorView', levels: 'hq' },
    ],
  },

  /** 指挥部 · AI 预警统计看板 */
  { key: 'ai-alert-dashboard', label: 'AI 预警统计看板', icon: 'DataBoard', path: '/ai-alert-dashboard', name: 'AiAlertDashboard', component: 'AiDashboardView', levels: 'hq' },

  /** 指挥部 · 质量看板 */
  {
    key: 'quality-board', label: '质量看板', icon: 'DataAnalysis', levels: 'hq',
    children: [
      { key: 'qm-dashboard', label: '质量验评看板', path: '/qm/inspect/dashboard', name: 'QmDashboard', component: 'QmDashboardView', levels: 'hq' },
      { key: 'brand-approval-stats', label: '品牌报审', path: '/qm/quality-board/brand-stats', name: 'BrandApprovalStats', component: 'BrandApprovalStatsView', levels: 'hq' },
      { key: 'sample-ledger', label: '样板台账', path: '/hq/qm/sample/ledger', name: 'SampleLedgerHq', component: 'SampleLedgerView', levels: 'hq' },
      { key: 'mat-dashboard', label: '材料设备进场', path: '/qm/mat/dashboard', name: 'MatDashboard', component: 'MatDashboardView', levels: 'hq' },
    ],
  },

  /** 智慧工地监管（两级共用，子项按 levels 区分） */
  {
    key: 'smart-site', label: '智慧工地监管', icon: 'Cpu', levels: 'both',
    children: [
      {
        key: 'labor', label: '人员实名制管理', levels: 'both',
        children: [
          { key: 'labor-realname-stats', label: '实名制统计', path: '/labor/realname-stats', name: 'LaborRealNameStats', component: 'LaborRealNameStatsView', levels: 'hq', sortByLevel: { hq: 0 } },
          { key: 'labor-track-system', label: '人员轨迹系统', path: '/labor/track-system', name: 'LaborTrackSystem', component: 'TrackSystemListView', levels: 'hq', trackKind: 'labor', sortByLevel: { hq: 1 } },
          { key: 'labor-warning-config', label: '实名制配置', path: '/labor/warning-config', name: 'LaborWarningConfig', component: 'LaborWarningConfigView', levels: 'hq', sortByLevel: { hq: 2 } },
          { key: 'labor-blacklist', label: '劳务黑名单', path: '/labor/blacklist', name: 'LaborBlacklist', component: 'LaborBlacklistView', levels: 'hq', sortByLevel: { hq: 3 } },
          { key: 'labor-dashboard', label: '人员实名制看板', path: '/labor/dashboard', name: 'LaborDashboard', component: 'LaborDashboardView', levels: 'project', sortByLevel: { project: 2 } },
          { key: 'labor-realname', label: '人员实名制', path: '/labor/realname', name: 'RealNamePersonnel', component: 'RealNamePersonnelView', levels: 'project', sortByLevel: { project: 3 } },
          { key: 'labor-personnel-track', label: '人员轨迹', path: '/labor/personnel-track', name: 'LaborPersonnelTrack', component: 'LaborPersonnelTrackView', levels: 'project', sortByLevel: { project: 4 } },
          { key: 'labor-attendance-detail', label: '考勤明细', path: '/labor/attendance-detail', name: 'LaborAttendanceDetail', component: 'LaborAttendanceDetailView', levels: 'project', sortByLevel: { project: 5 } },
          { key: 'labor-warning-list', label: '预警清单', path: '/labor/warning-list', name: 'LaborWarningList', component: 'LaborWarningListView', levels: 'project', sortByLevel: { project: 6 } },
          { key: 'labor-mobile-personal-center', label: '个人中心（移动端）', path: '/labor/mobile/personal-center', name: 'LaborMobilePersonalCenter', component: 'LaborMobilePersonalCenterView', levels: 'both', sortByLevel: { hq: 4, project: 7 } },
        ],
      },
      {
        key: 'vehicle', label: '车辆管理', levels: 'both',
        children: [
          { key: 'vehicle-dashboard', label: '车辆管理看板', path: '/vehicle/dashboard', name: 'VehicleDashboard', component: 'VehicleDashboardView', levels: 'hq' },
          { key: 'vehicle-track-system', label: '车辆轨迹系统', path: '/vehicle/track-system', name: 'VehicleTrackSystem', component: 'TrackSystemListView', levels: 'hq', trackKind: 'vehicle' },
          { key: 'vehicle-track-config', label: '车辆轨迹配置', path: '/vehicle/track-config', name: 'VehicleTrackConfig', component: 'VehicleTrackConfigView', levels: 'hq' },
          { key: 'vehicle-access', label: '进出场记录', path: '/vehicle/access', name: 'VehicleAccess', component: 'VehicleAccessView', levels: 'project' },
          { key: 'vehicle-track', label: '车辆轨迹监管', path: '/vehicle/track', name: 'VehicleTrack', component: 'VehicleTrackView', levels: 'project' },
        ],
      },
      {
        key: 'machine-supervise', label: '机械设备监管', levels: 'both',
        children: [
          { key: 'device-manage', label: '监测设备管理', path: '/machine-supervise/device', name: 'DeviceManage', component: 'DeviceManageView', levels: 'project' },
          { key: 'crane-monitor', label: '塔吊运行监管', path: '/machine-supervise/crane', name: 'CraneMonitor', component: 'CraneMonitorView', levels: 'both' },
          { key: 'lift-monitor', label: '升降机监管', path: '/machine-supervise/lift', name: 'LiftMonitor', component: 'LiftMonitorView', levels: 'both' },
          { key: 'pile-monitor', label: '桩基机械施工监管', path: '/machine-supervise/pile', name: 'PileMonitor', component: 'PileMonitorView', levels: 'both' },
          { key: 'composite-monitor', label: '复合地基机械施工监管', path: '/machine-supervise/composite', name: 'CompositeMonitor', component: 'CompositeMonitorView', levels: 'both' },
          { key: 'alert-record', label: '预警记录', path: '/machine-supervise/alert-record', name: 'AlertRecord', component: 'AlertRecordView', levels: 'project' },
        ],
      },
      {
        key: 'major-hazard', label: '危大工程监测', levels: 'both',
        children: [
          { key: 'deep-foundation-pit', label: '深基坑安全监管', path: '/major-hazard/deep-foundation-pit', name: 'DeepFoundationPit', component: 'DeepFoundationPitView', levels: 'both' },
          { key: 'subway-protection', label: '地铁铁路安全监管', path: '/major-hazard/subway-protection', name: 'SubwayProtection', component: 'SubwayProtectionView', levels: 'both' },
          { key: 'high-formwork', label: '高支模变形监管', path: '/major-hazard/high-formwork', name: 'HighFormwork', component: 'HighFormworkView', levels: 'both' },
          { key: 'hazard-manage', label: '监测区域管理', path: '/major-hazard/hazard-manage', name: 'HazardManage', component: 'HazardManageView', levels: 'project' },
          { key: 'device-binding', label: '监测设备管理', path: '/major-hazard/device-binding', name: 'DeviceBinding', component: 'DeviceBindingView', levels: 'project' },
          { key: 'monitor-device', label: '监测设备台账', path: '/major-hazard/monitor-device', name: 'MonitoringDevice', component: 'MonitoringDeviceView', levels: 'project' },
          { key: 'alert-record-major', label: '预警记录', path: '/major-hazard/alert-record', name: 'AlertRecordMajor', component: 'AlertRecordMajorView', levels: 'project' },
          { key: 'alert-config-major', label: '危大预警配置', path: '/major-hazard/warning-config', name: 'AlertConfigMajor', component: 'AlertConfigMajorView', levels: 'project' },
        ],
      },
      { key: 'alert-config', label: '预警配置', path: '/machine-supervise/alert-config', name: 'AlertConfig', component: 'AlertConfigView', levels: 'project' },
      {
        key: 'video-monitor', label: '视频监控', icon: 'VideoCamera', levels: 'project',
        children: [
          { key: 'video-monitor-preview', label: '视频预览', path: '/video-monitor/preview', name: 'VideoMonitorPreview', component: 'VideoPreviewView', routeComponent: 'VideoMonitorPageView', levels: 'project', description: '项目级视频预览。' },
          { key: 'video-monitor-ledger', label: '设备台账', path: '/video-monitor/device-ledger', name: 'VideoMonitorLedger', component: 'DeviceLedgerView', routeComponent: 'VideoMonitorPageView', levels: 'project', description: '项目级设备台账。' },
          { key: 'video-monitor-group', label: '分组管理', path: '/video-monitor/group', name: 'VideoMonitorGroup', component: 'DeviceGroupManageView', routeComponent: 'VideoMonitorPageView', levels: 'project', description: '项目级设备分组。' },
          { key: 'video-monitor-offline-notify', label: '离线通知配置', path: '/video-monitor/offline-notify', name: 'VideoMonitorOfflineNotify', component: 'OfflineNotifyConfigView', routeComponent: 'VideoMonitorPageView', levels: 'project', description: '项目级视频离线分级通知。' },
        ],
      },
    ],
  },

  /** 施工现场管理（两级共用） */
  {
    key: 'site-construction', label: '施工现场管理', icon: 'MapLocation', levels: 'both',
    children: [
      {
        key: 'work-manage', label: '施工作业管理', labelByLevel: { hq: '施工作业管理', project: '施工作业申报' }, icon: 'Document', levels: 'both',
        children: [
          { key: 'major-hazard-daily-work', label: '每日施工作业', path: '/major-hazard/daily-work', name: 'MajorHazardDailyWork', component: 'DailyWorkView', levels: 'both' },
          { key: 'major-hazard-list', label: '危大工程清单', path: '/major-hazard/hazard-list', name: 'MajorHazardList', component: 'HazardListView', levels: 'both' },
          { key: 'risk-manage', label: '风险管理', path: '/site-construction/risk-manage', name: 'RiskManagePlaceholder', component: 'RiskManagePlaceholderView', levels: 'project' },
          { key: 'engineering-work', label: '工程作业管理', path: '/site-construction/engineering-work', name: 'EngineeringWorkPlaceholder', component: 'EngineeringWorkPlaceholderView', levels: 'project' },
        ],
      },
      {
        key: 'safety-inspection', label: '巡检管理', levels: 'both',
        children: [
          { key: 'safety-plan', label: '任务下发', path: '/safety-inspection/plan', name: 'InspectionPlan', component: 'InspectionPlanView', levels: 'hq' },
          { key: 'safety-check-items', label: '巡检检查项', path: '/safety-inspection/check-items', name: 'SafetyCheckItems', component: 'SafetyCheckItemsView', levels: 'hq' },
          { key: 'safety-inspector-config', label: '人员配置', path: '/safety-inspection/inspector-config', name: 'InspectionPersonConfig', component: 'InspectionPersonConfigView', levels: 'project' },
          { key: 'safety-task-manage', label: '巡检任务', path: '/safety-inspection/task', name: 'InspectionTaskManage', component: 'InspectionTaskManageView', levels: 'both' },
          { key: 'safety-hazard', label: '隐患清单', path: '/safety-inspection/hazard', name: 'SafetyHazardList', component: 'SafetyHazardListView', levels: 'both' },
          { key: 'mobile-safety-inspection', label: '巡检管理(移动端)', path: '/mobile/tasks', name: 'MobileTaskList', component: 'MobileTaskListView', levels: 'both' },
          { key: 'mobile-message-center', label: '消息中心(移动端)', path: '/mobile/messages', name: 'MobileMessageCenter', component: 'MobileMessageCenterView', levels: 'both' },
          { key: 'mobile-rectify', label: '整改复查(移动端)', path: '/mobile/rectify', name: 'MobileRectifyList', component: 'MobileRectifyListView', levels: 'project' },
        ],
      },
      {
        key: 'machine-ledger', label: '机械设备台账', levels: 'project',
        children: [
          { key: 'machine-entry-manage', label: '登记进场设备', path: '/machine-supervise/ledger', name: 'MachineEntryManage', component: 'MachineryLedgerView', levels: 'project' },
          { key: 'machine-type-maintain', label: '机械类型维护', path: '/machine-supervise/machine-types', name: 'MachineTypeMaintain', component: 'MachineTypeMaintainView', levels: 'project' },
        ],
      },
    ],
  },

  /** 施工质量管控（仅项目层级） */
  {
    key: 'construction-quality', label: '施工质量管控', icon: 'Medal', levels: 'project',
    children: [
      {
        key: 'quality-inspect', label: '质量验评', levels: 'project',
        children: [
          { key: 'qm-wbs-tree', label: '验评目录树', path: '/qm/inspect/tree', name: 'QmWbsTree', component: 'QmWbsTreeView', levels: 'project' },
          { key: 'qm-form-fill-deep', label: '实体工程验收', path: '/qm/inspect/form-fill-deep', name: 'QmFormFillDeep', component: 'QmFormFillDeepView', levels: 'project' },
          { key: 'qm-special-deep', label: '专项验收', path: '/qm/inspect/special-deep', name: 'QmSpecialDeep', component: 'QmSpecialDeepView', levels: 'project' },
          { key: 'qm-complete-deep', label: '竣工验收', path: '/qm/inspect/complete-deep', name: 'QmCompleteDeep', component: 'QmCompleteDeepView', levels: 'project' },
          { key: 'qm-seal-user', label: '项目用章人配置', path: '/qm/inspect/seal-user', name: 'QmSealUserConfig', component: 'QmSealUserConfigView', levels: 'project' },
        ],
      },
      {
        key: 'qm-archive-mgmt', label: '档案管理', levels: 'project',
        children: [
          { key: 'qm-archive-fill', label: '档案填报', path: '/qm/inspect/archive-jump', name: 'QmArchiveJump', component: 'QmArchiveJumpView', levels: 'project', openInNewTab: true },
          { key: 'qm-node-archive-list', label: '节点档案清单', path: '/qm/inspect/node-archive-list', name: 'QmNodeArchiveList', component: 'QmNodeArchiveListView', levels: 'project' },
        ],
      },
      {
        key: 'brand-approval', label: '品牌报审', levels: 'project',
        children: [
          { key: 'brand-ledger', label: '品牌报审台账', path: '/qm/brand/ledger', name: 'BrandLedger', component: 'BrandLedgerView', levels: 'project' },
          { key: 'brand-application', label: '报审申请', path: '/qm/brand/applications', name: 'BrandApplication', component: 'BrandApplicationListView', levels: 'project' },
        ],
      },
      {
        key: 'sample-mgmt', label: '样板管理', levels: 'project',
        children: [
          { key: 'sample-ledger', label: '样板台账', path: '/qm/sample/ledger', name: 'SampleLedger', component: 'SampleLedgerView', levels: 'project' },
          { key: 'sample-material-app', label: '材料定样报审', path: '/qm/sample/material/applications', name: 'SampleMaterialApp', component: 'SampleMaterialAppListView', levels: 'project' },
          { key: 'sample-process-app', label: '关键工序样板报审', path: '/qm/sample/process/applications', name: 'SampleProcessApp', component: 'SampleProcessAppListView', levels: 'project' },
        ],
      },
      {
        key: 'mat-entry-mgmt', label: '材料设备进场', levels: 'project',
        children: [
          { key: 'mat-ledger', label: '材料设备台账', path: '/qm/mat/ledger', name: 'MatLedger', component: 'MatLedgerView', levels: 'project' },
          { key: 'mat-application', label: '进场申请', path: '/qm/mat/applications', name: 'MatApplication', component: 'MatApplicationListView', levels: 'project' },
          { key: 'mat-exit', label: '退场登记', path: '/qm/mat/exit', name: 'MatExit', component: 'MatExitView', levels: 'project' },
          { key: 'mobile-mat-entry', label: '进场申请（移动端）', path: '/mobile/mat/entry', name: 'MobileMatEntryList', component: 'MobileMatEntryListView', levels: 'project' },
          { key: 'mobile-mat-exit', label: '退场登记（移动端）', path: '/mobile/mat/exit', name: 'MobileMatExit', component: 'MobileMatExitView', levels: 'project' },
        ],
      },
      { key: 'asbuilt-list', label: '实模一致验收', path: '/qm/asbuilt/list', name: 'AsbuiltList', component: 'AsbuiltListView', levels: 'project' },
    ],
  },

  /** AI 应用（仅项目层级） */
  {
    key: 'ai-app', label: 'AI 应用', icon: 'Cpu', levels: 'project',
    children: [
      { key: 'ai-alert-config', label: '预警配置', path: '/ai-app/alert-config', name: 'AiAlertConfig', component: 'AiAlertConfigView', levels: 'project' },
      { key: 'ai-unsafe-behavior', label: '现场不安全行为检测', path: '/ai-app/unsafe-behavior', name: 'AiUnsafeBehavior', component: 'AiUnsafeBehaviorView', levels: 'project' },
      { key: 'ai-hazard-event', label: '现场隐患事件检测', path: '/ai-app/hazard-event', name: 'AiHazardEvent', component: 'AiHazardEventView', levels: 'project' },
      { key: 'ai-fence-intrusion', label: '围栏入侵及破坏检测', path: '/ai-app/fence-intrusion', name: 'AiFenceIntrusion', component: 'AiFenceIntrusionView', levels: 'project' },
      { key: 'ai-trajectory-predict', label: '多机位人员轨迹预测', path: '/ai-app/trajectory-predict', name: 'AiTrajectoryPredict', component: 'AiTrajectoryPredictView', levels: 'project' },
      { key: 'ai-drone-recognition', label: '无人机 AI 识别', path: '/ai-app/drone-recognition', name: 'AiDroneRecognition', component: 'AiDroneRecognitionView', levels: 'project' },
    ],
  },

  /** 调度后台管理（两级共用，子项按 levels 区分） */
  {
    key: 'coc-admin', label: '调度后台管理', icon: 'Connection', levels: 'both',
    children: [
      { key: 'coc-admin-notice', label: '任务单', path: '/coc-admin/notice', name: 'CocAdminNotice', component: 'AdminDispatchNoticeList', routeComponent: 'CocAdminPageView', levels: 'hq', roles: ['安质部', '项目经理', '施工'], description: '管理远程调度产生的任务单：创建、下发、签收、整改反馈与闭环台账。' },
      { key: 'coc-admin-reminder', label: '提示函', path: '/coc-admin/reminder', name: 'CocAdminReminder', component: 'AdminDispatchReminderList', routeComponent: 'CocAdminPageView', levels: 'hq', roles: ['安质部', '项目经理', '施工'], description: '管理远程调度产生的提示函：创建、下发、签收与闭环。' },
      { key: 'coc-admin-penalty', label: '处罚单', path: '/coc-admin/penalty', name: 'CocAdminPenalty', component: 'AdminDispatchPenaltyList', routeComponent: 'CocAdminPageView', levels: 'hq', roles: ['安质部', '项目经理', '施工'], description: '管理处罚单：新增、下发、编辑、关闭与纳入黑榜。' },
      { key: 'coc-admin-redblack', label: '黑红榜单', path: '/coc-admin/red-black', name: 'CocAdminRedBlack', component: 'AdminDispatchRedBlackList', routeComponent: 'CocAdminPageView', levels: 'hq', roles: ['安质部', '项目经理', '施工'], description: '维护项目红榜/黑榜展示。' },
      { key: 'coc-admin-patrol-device', label: '巡检仪管理', path: '/coc-admin/patrol-device', name: 'CocAdminPatrolDevice', component: 'PatrolDeviceManageView', routeComponent: 'CocAdminPageView', levels: 'both', roles: ['COC调度室'], description: '管理巡检仪设备注册、绑定项目及人员。' },
      { key: 'coc-admin-supervision-meeting', label: '监理会议管理', path: '/coc-admin/supervision-meeting', name: 'CocAdminSupervisionMeeting', component: 'SupervisionMeetingMinutesView', routeComponent: 'CocAdminPageView', levels: 'both', roles: ['COC调度室', '监理', '施工'], description: '项目层级按模版上传监理例会纪要并解析隐患。' },
      { key: 'coc-admin-dispatch-hazard', label: '调度隐患清单', path: '/coc-admin/dispatch-hazard', name: 'CocAdminDispatchHazard', component: 'DispatchHazardListView', routeComponent: 'CocAdminPageView', levels: 'both', roles: ['COC调度室', '安质部', '项目经理', '施工'], description: '汇集 COC 调度大屏问题截图登记的安全/质量隐患台账。' },
    ],
  },

  /** 基础数据管理（两级共用，子项按 levels 区分） */
  {
    key: 'basic-data', label: '基础数据管理', icon: 'Collection', levels: 'both',
    children: [
      { key: 'bd-project-info', label: '项目信息管理', path: '/basic-data/project/info', name: 'ProjectBasicInfo', component: 'ProjectBasicInfoView', levels: 'both' },
      { key: 'bd-subcontractor', label: '分包单位管理', labelByLevel: { hq: '分包单位管理', project: '分包单位报审' }, path: '/basic-data/project/subcontractor', name: 'SubcontractorList', component: 'SubcontractorListView', levels: 'both' },
      { key: 'bd-entity-breakdown', label: '实体工程分解', path: '/basic-data/entity-breakdown', name: 'EntityBreakdown', component: 'EntityBreakdownView', levels: 'project' },
    ],
  },

  /** 组织管理（两级共用，菜单管理仅指挥部） */
  {
    key: 'sys-settings', label: '组织管理', icon: 'OfficeBuilding', levels: 'both',
    children: [
      { key: 'sys-org', label: '组织架构', path: '/settings/org', name: 'SysOrg', component: 'OrgStructureView', levels: 'both' },
      { key: 'sys-user', label: '用户管理', path: '/settings/user', name: 'SysUser', component: 'UserManageView', levels: 'both' },
      { key: 'sys-role', label: '角色管理', path: '/settings/role', name: 'SysRole', component: 'RoleManageView', levels: 'both' },
      { key: 'sys-position', label: '岗位管理', path: '/settings/position', name: 'SysPosition', component: 'PositionManageView', levels: 'both' },
      { key: 'sys-menu', label: '菜单管理', path: '/settings/menu', name: 'SysMenu', component: 'MenuManageView', levels: 'hq' },
    ],
  },

  /** 日志管理（仅指挥部） */
  {
    key: 'sys-log', label: '日志管理', icon: 'Notebook', levels: 'hq',
    children: [
      { key: 'log-system', label: '系统日志', path: '/logs/system', name: 'LogSystem', component: 'SystemLogView', levels: 'hq' },
      { key: 'log-login', label: '登录日志', path: '/logs/login', name: 'LogLogin', component: 'LoginLogView', levels: 'hq' },
      { key: 'log-operation', label: '操作日志', path: '/logs/operation', name: 'LogOperation', component: 'OperationLogView', levels: 'hq' },
    ],
  },
]

/* ============================================================================
 * 2. 隐藏子页路由（新增/编辑/详情等，不在侧栏显示，但要能跳转）
 *    sidebarKey 指向父菜单 key，用于高亮归属。
 * ==========================================================================*/
export const hiddenRoutes = [
  // 个人中心
  { key: 'personal-center-todo-handle', path: '/personal-center/todo/handle', name: 'PersonalCenterTodoHandle', component: 'PersonalCenterTodoHandleView', label: '流程详情', sidebarKey: 'personal-center' },
  { key: 'personal-center-started-edit', path: '/personal-center/started/:id/edit', name: 'PersonalCenterStartedEdit', component: 'PersonalCenterStartedEditView', label: '编辑发起记录', sidebarKey: 'personal-center' },

  // 人员实名制子页
  { key: 'labor-realname-form', path: '/labor/realname/form', name: 'RealNamePersonnelForm', component: 'RealNamePersonnelDetailView', label: '人员详情', sidebarKey: 'labor-realname', redirect: '/labor/realname' },
  { key: 'labor-realname-detail', path: '/labor/realname/:id', name: 'RealNamePersonnelDetail', component: 'RealNamePersonnelDetailView', label: '人员详情', sidebarKey: 'labor-realname' },
  { key: 'labor-warning-detail', path: '/labor/warning-list/:id', name: 'LaborWarningDetail', component: 'LaborWarningDetailView', label: '预警详情', sidebarKey: 'labor-warning-list' },
  { key: 'labor-device-manage', path: '/labor/device-manage', name: 'LaborDeviceManage', component: 'LaborDeviceManageView', label: '设备管理', sidebarKey: 'labor' },
  { key: 'labor-attendance', path: '/labor/attendance', name: 'LaborAttendanceStats', component: 'LaborAttendanceStatsView', label: '考勤统计', sidebarKey: 'labor' },
  { key: 'labor-mobile-warning-detail', path: '/labor/mobile/personal-center/warning/:id', name: 'LaborMobileWarningDetail', component: 'LaborMobileWarningDetailView', label: '预警详情', sidebarKey: 'labor-mobile-personal-center' },

  // 巡检管理子页
  { key: 'safety-plan-create', path: '/safety-inspection/plan/create', name: 'InspectionPlanCreate', component: 'InspectionPlanFormView', label: '下发巡检任务', sidebarKey: 'safety-plan' },
  { key: 'safety-plan-edit', path: '/safety-inspection/plan/:id/edit', name: 'InspectionPlanEdit', component: 'InspectionPlanFormView', label: '编辑巡检任务', sidebarKey: 'safety-plan' },
  { key: 'safety-plan-detail', path: '/safety-inspection/plan/:id', name: 'InspectionPlanDetail', component: 'InspectionPlanDetailView', label: '巡检任务详情', sidebarKey: 'safety-plan' },
  { key: 'safety-task-detail', path: '/safety-inspection/task/:id', name: 'InspectionTaskDetail', component: 'InspectionTaskDetailView', label: '巡检任务详情', sidebarKey: 'safety-task-manage' },
  { key: 'safety-hazard-detail', path: '/safety-inspection/hazard/:id', name: 'SafetyHazardDetail', component: 'SafetyHazardDetailView', label: '隐患详情', sidebarKey: 'safety-hazard' },

  // 移动巡检子页
  { key: 'mobile-task-create', path: '/mobile/tasks/create', name: 'MobileTaskCreate', component: 'MobileTaskCreateView', label: '新建巡检', sidebarKey: 'mobile-safety-inspection' },
  { key: 'mobile-task-execute', path: '/mobile/tasks/:id/execute', name: 'MobileTaskExecute', component: 'MobileTaskExecuteView', label: '执行巡检', sidebarKey: 'mobile-safety-inspection' },
  { key: 'mobile-task-detail', path: '/mobile/tasks/:id', name: 'MobileTaskDetail', component: 'MobileTaskDetailView', label: '检查结果', sidebarKey: 'mobile-safety-inspection' },
  { key: 'mobile-rectify-execute', path: '/mobile/rectify/:id/execute', name: 'MobileRectifyExecute', component: 'MobileRectifyExecuteView', label: '整改执行', sidebarKey: 'mobile-rectify' },
  { key: 'mobile-rectify-review', path: '/mobile/rectify/:id/review', name: 'MobileRectifyReview', component: 'MobileRectifyReviewView', label: '整改复查', sidebarKey: 'mobile-rectify' },
  { key: 'mobile-rectify-approval', path: '/mobile/rectify/:id/approval', name: 'MobileRectifyApproval', component: 'MobileRectifyApprovalView', label: '项目经理审批', sidebarKey: 'mobile-message-center' },
  { key: 'mobile-rectify-detail', path: '/mobile/rectify/:id', name: 'MobileRectifyDetail', component: 'MobileRectifyDetailView', label: '整改详情', sidebarKey: 'mobile-rectify' },

  // 机械设备子页
  { key: 'alert-config-add', path: '/machine-supervise/alert-config/add', name: 'AlertConfigAdd', component: 'AlertConfigFormView', label: '新增预警配置', sidebarKey: 'alert-config' },
  { key: 'ai-unsafe-behavior-detail', path: '/ai-app/unsafe-behavior/:id', name: 'AiUnsafeBehaviorDetail', component: 'AiAlertDetailView', label: '预警查看', sidebarKey: 'ai-unsafe-behavior' },
  { key: 'ai-hazard-event-detail', path: '/ai-app/hazard-event/:id', name: 'AiHazardEventDetail', component: 'AiAlertDetailView', label: '预警查看', sidebarKey: 'ai-hazard-event' },
  { key: 'ai-fence-intrusion-detail', path: '/ai-app/fence-intrusion/:id', name: 'AiFenceIntrusionDetail', component: 'AiAlertDetailView', label: '预警查看', sidebarKey: 'ai-fence-intrusion' },
  { key: 'ai-project-alert-detail', path: '/ai-alert-dashboard/project/:projectId/:category', name: 'AiProjectAlertDetail', component: 'AiProjectAlertDetailView', label: '项目预警明细', sidebarKey: 'ai-alert-dashboard' },
  { key: 'machine-entry', path: '/machine-supervise/ledger/entry', name: 'MachineEntry', component: 'MachineEntryFormView', label: '设备进场登记', sidebarKey: 'machine-entry-manage' },
  { key: 'machine-exit', path: '/machine-supervise/ledger/exit', name: 'MachineExit', component: 'MachineExitFormView', label: '设备退场登记', sidebarKey: 'machine-entry-manage' },
  { key: 'machine-ledger-detail', path: '/machine-supervise/ledger/:id', name: 'MachineryLedgerDetail', component: 'MachineryLedgerDetailView', label: '机械设备详情', sidebarKey: 'machine-entry-manage' },
  { key: 'hq-machine-entry', path: '/hq/machine-supervise/ledger/entry', name: 'HqMachineEntry', component: 'MachineEntryFormView', label: '设备进场登记', sidebarKey: 'machine-entry-manage' },
  { key: 'hq-machine-exit', path: '/hq/machine-supervise/ledger/exit', name: 'HqMachineExit', component: 'MachineExitFormView', label: '设备退场登记', sidebarKey: 'machine-entry-manage' },
  { key: 'hq-machine-ledger-detail', path: '/hq/machine-supervise/ledger/:id', name: 'HqMachineryLedgerDetail', component: 'MachineryLedgerDetailView', label: '机械设备详情', sidebarKey: 'machine-entry-manage' },

  // 车辆隐藏子页
  { key: 'vehicle-registry', path: '/vehicle/registry', name: 'VehicleRegistry', component: 'VehicleListView', label: '车牌管理', sidebarKey: 'vehicle' },
  { key: 'vehicle-warning-list', path: '/vehicle/warning-list', name: 'VehicleWarningList', component: 'VehicleWarningListView', label: '预警清单', sidebarKey: 'vehicle' },
  { key: 'vehicle-device', path: '/vehicle/device', name: 'VehicleDevice', component: 'VehicleDeviceView', label: '设备管理', sidebarKey: 'vehicle' },

  // 质量验评填报/审批子页（列表统一走 QmTaskList 深度集成页）
  { key: 'qm-batch-edit', path: '/qm/inspect/batch/edit', name: 'QmBatchEdit', component: 'QmBatchEditView', label: '检验批填报', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-part-edit', path: '/qm/inspect/part/edit', name: 'QmPartEdit', component: 'QmPartEditView', label: '分部分项填报', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-unit-edit', path: '/qm/inspect/unit/edit', name: 'QmUnitEdit', component: 'QmUnitEditView', label: '单位工程填报', sidebarKey: 'qm-form-fill-deep' },
  { key: 'qm-special-edit', path: '/qm/inspect/special/edit', name: 'QmSpecialEdit', component: 'QmSpecialEditView', label: '专项填报', sidebarKey: 'qm-special-deep' },
  { key: 'qm-complete-edit', path: '/qm/inspect/complete/edit', name: 'QmCompleteEdit', component: 'QmCompleteEditView', label: '竣工填报', sidebarKey: 'qm-complete-deep' },
  { key: 'qm-rectify-detail', path: '/qm/inspect/rectify/detail', name: 'QmRectifyDetail', component: 'QmRectifyDetailView', label: '整改详情', sidebarKey: 'qm-form-fill-deep' },
  // 品牌报审子页
  { key: 'brand-application-edit', path: '/qm/brand/applications/edit', name: 'BrandApplicationEdit', component: 'BrandApplicationEditView', label: '新建报审', sidebarKey: 'brand-application' },
  { key: 'brand-application-detail', path: '/qm/brand/applications/detail', name: 'BrandApplicationDetail', component: 'BrandApplicationDetailView', label: '报审详情', sidebarKey: 'brand-application' },
  { key: 'brand-ledger-detail', path: '/qm/brand/ledger/detail', name: 'BrandLedgerDetail', component: 'BrandApplicationDetailView', label: '报审详情', sidebarKey: 'brand-ledger' },

  // 样板管理子页（审批仅个人中心待办，无独立审批列表路由）
  { key: 'sample-material-edit', path: '/qm/sample/material/applications/edit', name: 'SampleMaterialEdit', component: 'SampleMaterialEditView', label: '新建材料定样', sidebarKey: 'sample-material-app' },
  { key: 'sample-material-detail', path: '/qm/sample/material/applications/detail', name: 'SampleMaterialDetail', component: 'SampleMaterialDetailView', label: '材料定样详情', sidebarKey: 'sample-material-app' },
  { key: 'sample-process-edit', path: '/qm/sample/process/applications/edit', name: 'SampleProcessEdit', component: 'SampleProcessEditView', label: '新建工序样板', sidebarKey: 'sample-process-app' },
  { key: 'sample-process-detail', path: '/qm/sample/process/applications/detail', name: 'SampleProcessDetail', component: 'SampleProcessDetailView', label: '工序样板详情', sidebarKey: 'sample-process-app' },

  // 材料设备进场子页
  { key: 'mat-application-edit', path: '/qm/mat/applications/edit', name: 'MatApplicationEdit', component: 'MatApplicationEditView', label: '进场申报', sidebarKey: 'mat-application' },
  { key: 'mat-application-detail', path: '/qm/mat/applications/detail', name: 'MatApplicationDetail', component: 'MatApplicationDetailView', label: '进场详情', sidebarKey: 'mat-application' },
  { key: 'mobile-mat-entry-create', path: '/mobile/mat/entry/create', name: 'MobileMatEntryEdit', component: 'MobileMatEntryEditView', label: '进场申报（移动端）', sidebarKey: 'mobile-mat-entry' },
  { key: 'mobile-mat-entry-detail', path: '/mobile/mat/entry/detail', name: 'MobileMatEntryDetail', component: 'MobileMatEntryDetailView', label: '进场详情（移动端）', sidebarKey: 'mobile-mat-entry' },

  // 实模一致验收子页
  { key: 'asbuilt-edit', path: '/qm/asbuilt/edit', name: 'AsbuiltEdit', component: 'AsbuiltEditView', label: '新建实模一致验收', sidebarKey: 'asbuilt-list' },
  { key: 'asbuilt-detail', path: '/qm/asbuilt/detail', name: 'AsbuiltDetail', component: 'AsbuiltDetailView', label: '实模一致验收详情', sidebarKey: 'asbuilt-list' },

  // 基础数据子页
  { key: 'project-create', path: '/basic-data/project/info/create', name: 'ProjectCreate', component: 'ProjectCreateView', label: '新增项目', sidebarKey: 'bd-project-info' },
  { key: 'project-portrait', path: '/basic-data/project/info/:id/portrait', name: 'ProjectPortrait', component: 'ProjectPortraitView', label: '项目画像', sidebarKey: 'bd-project-info' },
  { key: 'subcontractor-detail', path: '/basic-data/project/subcontractor/:id', name: 'SubcontractorDetail', component: 'SubcontractorDetailView', label: '分包单位详情', sidebarKey: 'bd-subcontractor' },

  // 调度后台隐藏子页（路由保留，不在侧栏）
  { key: 'coc-admin-screenshot', path: '/coc-admin/screenshot', name: 'CocAdminScreenshot', component: 'AdminScreenshotList', routeComponent: 'CocAdminPageView', label: '问题截图', roles: ['COC调度室'], description: '保存问题截图及相关字段。' },
  { key: 'coc-admin-meeting', path: '/coc-admin/meeting', name: 'CocAdminMeeting', component: 'AdminDispatchMeetingList', routeComponent: 'CocAdminPageView', label: '会议记录', roles: ['安质部', '项目经理', '施工'], description: '记录调度会议/监理例会纪要。' },
  { key: 'coc-admin-smart-helmet', path: '/coc-admin/smart-helmet', name: 'CocAdminSmartHelmet', component: 'SmartHelmetManageView', routeComponent: 'CocAdminPageView', label: '智能安全帽管理', roles: ['COC调度室'], description: '管理智能安全帽设备台账。' },

  // 组织管理子页
  { key: 'sys-user-create', path: '/settings/user/form', name: 'SysUserCreate', component: 'UserManageFormView', label: '新增用户', sidebarKey: 'sys-user' },
  { key: 'sys-user-edit', path: '/settings/user/form/:id', name: 'SysUserEdit', component: 'UserManageFormView', label: '编辑用户', sidebarKey: 'sys-user' },
  { key: 'sys-user-detail', path: '/settings/user/:id', name: 'SysUserDetail', component: 'UserManageDetailView', label: '用户详情', sidebarKey: 'sys-user' },
  { key: 'sys-role-create', path: '/settings/role/form', name: 'SysRoleCreate', component: 'RoleManageFormView', label: '角色新增', sidebarKey: 'sys-role' },
  { key: 'sys-role-edit', path: '/settings/role/form/:id', name: 'SysRoleEdit', component: 'RoleManageFormView', label: '角色编辑', sidebarKey: 'sys-role' },
]

/* ============================================================================
 * 3. 旧链接重定向（兼容历史地址）
 * ==========================================================================*/
export const redirects = [
  { path: '/safety-board', redirect: '/safety-inspection/dashboard' },
  { path: '/quality-board', redirect: '/safety-inspection/dashboard' },
  { path: '/labor/access', redirect: '/labor/warning-config' },
  { path: '/labor/realname/form', redirect: '/labor/realname' },
  { path: '/labor/realname/form/:id', redirect: (to) => `/labor/realname/${to.params.id}` },
  { path: '/labor/salary-compare', redirect: '/labor/dashboard' },
  { path: '/labor', redirect: '/labor/realname-stats' },
  { path: '/safety/labor/dashboard', redirect: '/labor/dashboard' },
  { path: '/safety/labor/realname', redirect: '/labor/realname' },
  { path: '/safety/labor/access', redirect: '/labor/warning-config' },
  { path: '/safety/labor/attendance-detail', redirect: '/labor/attendance-detail' },
  { path: '/safety/labor/attendance', redirect: '/labor/attendance' },
  { path: '/safety/labor/blacklist', redirect: '/labor/blacklist' },
  { path: '/safety/labor/realname-stats', redirect: '/labor/realname-stats' },
  { path: '/safety', redirect: '/labor/dashboard' },
  { path: '/major-hazard/alert-config', redirect: '/machine-supervise/alert-config' },
  { path: '/coc-admin/daily-work', redirect: '/major-hazard/daily-work' },
  { path: '/vehicle', redirect: '/vehicle/dashboard' },
  { path: '/video-monitor/list', redirect: '/video-monitor/preview' },
  { path: '/video-monitor/device', redirect: '/video-monitor/device-ledger' },
  { path: '/basic-data/engineering-library', redirect: '/basic-data/entity-breakdown' },
  { path: '/basic-data/unit-project', redirect: '/basic-data/entity-breakdown' },
  { path: '/basic-data/sub-unit', redirect: '/basic-data/entity-breakdown' },
  { path: '/basic-data/division', redirect: '/basic-data/entity-breakdown' },
  { path: '/basic-data/sub-division', redirect: '/basic-data/entity-breakdown' },
  { path: '/basic-data/sub-item', redirect: '/basic-data/entity-breakdown' },
  { path: '/basic-data/construction-location', redirect: '/basic-data/entity-breakdown' },
  { path: '/site-construction/work-declare', redirect: '/major-hazard/daily-work' },
  { path: '/safety-inspection/risk', redirect: '/safety-inspection/task' },
  { path: '/safety-inspection/risk/create', redirect: '/safety-inspection/task' },
  { path: '/safety-inspection/risk/type-config', redirect: '/safety-inspection/task' },
  { path: '/safety-inspection/risk/:month', redirect: '/safety-inspection/task' },
  { path: '/qm/inspect/form-fill', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/form-fill/edit', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/batch/list', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/part/list', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/unit/list', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/special/list', redirect: '/qm/inspect/special-deep' },
  { path: '/qm/inspect/complete/list', redirect: '/qm/inspect/complete-deep' },
  { path: '/qm/inspect/plans', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/plans/edit', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/plans/review', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/ledger', redirect: '/qm/inspect/dashboard' },
  { path: '/qm/inspect/forms', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/batch-types', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/unit-scheme', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/approver-config', redirect: '/qm/inspect/seal-user' },
  { path: '/qm/inspect/rectify/list', redirect: '/qm/inspect/form-fill-deep' },
  { path: '/qm/inspect/batch/approve', redirect: resolveQmInspectHandleRedirect },
  { path: '/qm/inspect/part/approve', redirect: resolveQmInspectHandleRedirect },
  { path: '/qm/inspect/unit/approve', redirect: resolveQmInspectHandleRedirect },
  { path: '/qm/inspect/special/approve', redirect: resolveQmInspectHandleRedirect },
  { path: '/qm/inspect/complete/approve', redirect: resolveQmInspectHandleRedirect },
  { path: '/qm/inspect/app/approve', redirect: '/personal-center' },
  { path: '/qm/inspect/app/approve/detail', redirect: '/personal-center' },
  { path: '/qm/sample/material/approve', redirect: '/personal-center' },
  { path: '/qm/sample/material/approve/detail', redirect: '/personal-center' },
  { path: '/qm/sample/process/approve', redirect: '/personal-center' },
  { path: '/qm/sample/process/approve/detail', redirect: '/personal-center' },
  { path: '/qm/brand/stats', redirect: '/qm/quality-board/brand-stats' },
  { path: '/qm/sample/stats', redirect: '/qm/sample/ledger' },
  { path: '/hq/qm/sample/stats', redirect: '/hq/qm/sample/ledger' },
  { path: '/warning-list', redirect: '/labor/warning-list' },
  { path: '/personnel-track', redirect: '/labor/personnel-track' },
  { path: '/track-system', redirect: '/labor/track-system' },
  { path: '/personal-center/todo', redirect: '/personal-center' },
  { path: '/qm/eq/dashboard', redirect: '/qm/mat/dashboard?entry_type=equipment' },
  { path: '/qm/eq/ledger', redirect: '/qm/mat/ledger?entry_type=equipment' },
  { path: '/qm/eq/applications', redirect: '/qm/mat/applications?entry_type=equipment' },
  { path: '/qm/eq/applications/edit', redirect: '/qm/mat/applications/edit?entry_type=equipment' },
  {
    path: '/qm/eq/applications/detail',
    redirect: (to) => ({
      path: '/qm/mat/applications/detail',
      query: { ...to.query, entry_type: to.query.entry_type || 'equipment' },
    }),
  },
]

/* ============================================================================
 * 4. 页面组件加载器（组件名 → import；唯一 import 出处）
 * ==========================================================================*/
export const viewLoaders = {
  WorkbenchView: () => import('../views/WorkbenchView.vue'),
  PersonalCenterView: () => import('../views/PersonalCenterView.vue'),
  PersonalCenterTodoHandleView: () => import('../views/PersonalCenterTodoHandleView.vue'),
  PersonalCenterStartedEditView: () => import('../views/PersonalCenterStartedEditView.vue'),
  CocAdminPageView: () => import('../views/cocAdmin/CocAdminPageView.vue'),
  VideoMonitorPageView: () => import('../views/videoMonitor/VideoMonitorPageView.vue'),
  TrackSystemListView: () => import('../views/track/TrackSystemListView.vue'),

  LaborRealNameStatsView: () => import('../views/safety/LaborRealNameStatsView.vue'),
  LaborDashboardView: () => import('../views/safety/LaborDashboardView.vue'),
  RealNamePersonnelView: () => import('../views/safety/RealNamePersonnelView.vue'),
  RealNamePersonnelDetailView: () => import('../views/safety/RealNamePersonnelDetailView.vue'),
  LaborPersonnelTrackView: () => import('../views/safety/LaborPersonnelTrackView.vue'),
  LaborWarningConfigView: () => import('../views/safety/LaborWarningConfigView.vue'),
  LaborWarningListView: () => import('../views/safety/LaborWarningListView.vue'),
  LaborWarningDetailView: () => import('../views/safety/LaborWarningDetailView.vue'),
  LaborAttendanceDetailView: () => import('../views/safety/LaborAttendanceDetailView.vue'),
  LaborAttendanceStatsView: () => import('../views/safety/LaborAttendanceStatsView.vue'),
  LaborDeviceManageView: () => import('../views/safety/LaborDeviceManageView.vue'),
  LaborBlacklistView: () => import('../views/safety/LaborBlacklistView.vue'),
  LaborMobilePersonalCenterView: () => import('../views/mobile/LaborMobilePersonalCenterView.vue'),
  LaborMobileWarningDetailView: () => import('../views/mobile/LaborMobileWarningDetailView.vue'),

  SafetyDashboardView: () => import('../views/safety/SafetyDashboardView.vue'),
  InspectionPlanView: () => import('../views/safety/InspectionPlanView.vue'),
  InspectionPlanFormView: () => import('../views/safety/InspectionPlanFormView.vue'),
  InspectionPlanDetailView: () => import('../views/safety/InspectionPlanDetailView.vue'),
  SafetyCheckItemsView: () => import('../views/safety/SafetyCheckItemsView.vue'),
  InspectionPersonConfigView: () => import('../views/safety/InspectionPersonConfigView.vue'),
  InspectionTaskManageView: () => import('../views/safety/InspectionTaskManageView.vue'),
  InspectionTaskDetailView: () => import('../views/safety/InspectionTaskDetailView.vue'),
  SafetyHazardListView: () => import('../views/safety/SafetyHazardListView.vue'),
  SafetyHazardDetailView: () => import('../views/safety/SafetyHazardDetailView.vue'),

  MobileTaskListView: () => import('../views/mobile/MobileTaskListView.vue'),
  MobileTaskCreateView: () => import('../views/mobile/MobileTaskCreateView.vue'),
  MobileTaskExecuteView: () => import('../views/mobile/MobileTaskExecuteView.vue'),
  MobileTaskDetailView: () => import('../views/mobile/MobileTaskDetailView.vue'),
  MobileMessageCenterView: () => import('../views/mobile/MobileMessageCenterView.vue'),
  MobileRectifyListView: () => import('../views/mobile/MobileRectifyListView.vue'),
  MobileRectifyExecuteView: () => import('../views/mobile/MobileRectifyExecuteView.vue'),
  MobileRectifyReviewView: () => import('../views/mobile/MobileRectifyReviewView.vue'),
  MobileRectifyApprovalView: () => import('../views/mobile/MobileRectifyApprovalView.vue'),
  MobileRectifyDetailView: () => import('../views/mobile/MobileRectifyDetailView.vue'),

  DeviceManageView: () => import('../views/safety/DeviceManageView.vue'),
  CraneMonitorView: () => import('../views/safety/CraneMonitorView.vue'),
  LiftMonitorView: () => import('../views/safety/LiftMonitorView.vue'),
  PileMonitorView: () => import('../views/safety/PileMonitorView.vue'),
  CompositeMonitorView: () => import('../views/safety/CompositeMonitorView.vue'),
  AlertRecordView: () => import('../views/safety/AlertRecordView.vue'),
  AlertConfigView: () => import('../views/safety/AlertConfigView.vue'),
  AlertConfigFormView: () => import('../views/safety/AlertConfigFormView.vue'),
  AlertConfigMajorView: () => import('../views/majorHazard/AlertConfigMajorView.vue'),
  MonitoringDeviceView: () => import('../views/majorHazard/MonitoringDeviceView.vue'),
  MachineryLedgerView: () => import('../views/safety/MachineryLedgerView.vue'),
  MachineTypeMaintainView: () => import('../views/safety/MachineTypeMaintainView.vue'),
  MachineEntryFormView: () => import('../views/safety/MachineEntryFormView.vue'),
  MachineExitFormView: () => import('../views/safety/MachineExitFormView.vue'),
  MachineryLedgerDetailView: () => import('../views/safety/MachineryLedgerDetailView.vue'),
  DailyWorkView: () => import('../views/majorHazard/DailyWorkView.vue'),
  HazardListView: () => import('../views/majorHazard/HazardListView.vue'),
  RiskManagePlaceholderView: () => import('../views/siteConstruction/RiskManagePlaceholderView.vue'),
  EngineeringWorkPlaceholderView: () => import('../views/siteConstruction/EngineeringWorkPlaceholderView.vue'),
  DeepFoundationPitView: () => import('../views/majorHazard/DeepFoundationPitView.vue'),
  SubwayProtectionView: () => import('../views/majorHazard/SubwayProtectionView.vue'),
  HighFormworkView: () => import('../views/majorHazard/HighFormworkView.vue'),
  HazardManageView: () => import('../views/majorHazard/HazardManageView.vue'),
  DeviceBindingView: () => import('../views/majorHazard/DeviceBindingView.vue'),
  AlertRecordMajorView: () => import('../views/majorHazard/AlertRecordMajorView.vue'),

  VehicleDashboardView: () => import('../views/vehicle/VehicleDashboardView.vue'),
  VehicleAccessView: () => import('../views/vehicle/VehicleAccessView.vue'),
  VehicleTrackView: () => import('../views/vehicle/VehicleTrackView.vue'),
  VehicleTrackConfigView: () => import('../views/vehicle/VehicleTrackConfigView.vue'),
  VehicleListView: () => import('../views/vehicle/VehicleListView.vue'),
  VehicleDeviceView: () => import('../views/vehicle/VehicleDeviceView.vue'),
  VehicleWarningListView: () => import('../views/vehicle/VehicleWarningListView.vue'),

  VideoMonitorStatsView: () => import('../views/videoMonitor/VideoMonitorStatsView.vue'),
  VideoPreviewView: () => import('../views/videoMonitor/VideoPreviewView.vue'),
  DeviceLedgerView: () => import('../views/videoMonitor/DeviceLedgerView.vue'),
  DeviceGroupManageView: () => import('../views/videoMonitor/DeviceGroupManageView.vue'),
  OfflineNotifyConfigView: () => import('../views/videoMonitor/OfflineNotifyConfigView.vue'),

  AdminScreenshotList: () => import('../coc/admin/AdminScreenshotList.vue'),
  AdminDispatchNoticeList: () => import('../coc/admin/AdminDispatchNoticeList.vue'),
  AdminDispatchReminderList: () => import('../coc/admin/AdminDispatchReminderList.vue'),
  AdminDispatchPenaltyList: () => import('../coc/admin/AdminDispatchPenaltyList.vue'),
  AdminDispatchMeetingList: () => import('../coc/admin/AdminDispatchMeetingList.vue'),
  AdminDispatchRedBlackList: () => import('../coc/admin/AdminDispatchRedBlackList.vue'),
  PatrolDeviceManageView: () => import('../views/cocAdmin/PatrolDeviceManageView.vue'),
  SmartHelmetManageView: () => import('../views/cocAdmin/SmartHelmetManageView.vue'),
  SupervisionMeetingMinutesView: () => import('../views/cocAdmin/SupervisionMeetingMinutesView.vue'),
  DispatchHazardListView: () => import('../views/cocAdmin/DispatchHazardListView.vue'),

  QmWbsTreeView: () => import('../views/quality/QmWbsTreeView.vue'),
  QmFormFillDeepView: () => import('../views/quality/QmFormFillDeepView.vue'),
  QmSpecialDeepView: () => import('../views/quality/QmSpecialDeepView.vue'),
  QmCompleteDeepView: () => import('../views/quality/QmCompleteDeepView.vue'),
  QmBatchEditView: () => import('../views/quality/QmBatchEditView.vue'),
  QmPartEditView: () => import('../views/quality/QmPartEditView.vue'),
  QmUnitEditView: () => import('../views/quality/QmUnitEditView.vue'),
  QmSpecialEditView: () => import('../views/quality/QmSpecialEditView.vue'),
  QmCompleteEditView: () => import('../views/quality/QmCompleteEditView.vue'),
  QmRectifyDetailView: () => import('../views/quality/QmRectifyDetailView.vue'),
  QmDashboardView: () => import('../views/quality/QmDashboardView.vue'),
  QmSealUserConfigView: () => import('../views/quality/QmSealUserConfigView.vue'),
  QmArchiveJumpView: () => import('../views/quality/QmArchiveJumpView.vue'),
  QmNodeArchiveListView: () => import('../views/quality/QmNodeArchiveListView.vue'),

  BrandLedgerView: () => import('../views/quality/brand/BrandLedgerView.vue'),
  BrandApplicationListView: () => import('../views/quality/brand/BrandApplicationListView.vue'),
  BrandApplicationEditView: () => import('../views/quality/brand/BrandApplicationEditView.vue'),
  BrandApplicationDetailView: () => import('../views/quality/brand/BrandApplicationDetailView.vue'),
  BrandApprovalStatsView: () => import('../views/quality/brand/BrandApprovalStatsView.vue'),

  SampleLedgerView: () => import('../views/quality/sample/SampleLedgerView.vue'),
  SampleMaterialAppListView: () => import('../views/quality/sample/SampleMaterialAppListView.vue'),
  SampleMaterialEditView: () => import('../views/quality/sample/SampleMaterialEditView.vue'),
  SampleMaterialDetailView: () => import('../views/quality/sample/SampleMaterialDetailView.vue'),
  SampleProcessAppListView: () => import('../views/quality/sample/SampleProcessAppListView.vue'),
  SampleProcessEditView: () => import('../views/quality/sample/SampleProcessEditView.vue'),
  SampleProcessDetailView: () => import('../views/quality/sample/SampleProcessDetailView.vue'),

  MatDashboardView: () => import('../views/quality/mat/MatDashboardView.vue'),
  MatLedgerView: () => import('../views/quality/mat/MatLedgerView.vue'),
  MatApplicationListView: () => import('../views/quality/mat/MatApplicationListView.vue'),
  MatApplicationEditView: () => import('../views/quality/mat/MatApplicationEditView.vue'),
  MatApplicationDetailView: () => import('../views/quality/mat/MatApplicationDetailView.vue'),
  MatExitView: () => import('../views/quality/mat/MatExitView.vue'),
  MobileMatEntryListView: () => import('../views/mobile/MobileMatEntryListView.vue'),
  MobileMatEntryEditView: () => import('../views/mobile/MobileMatEntryEditView.vue'),
  MobileMatEntryDetailView: () => import('../views/mobile/MobileMatEntryDetailView.vue'),
  MobileMatExitView: () => import('../views/mobile/MobileMatExitView.vue'),

  AsbuiltListView: () => import('../views/quality/asbuilt/AsbuiltListView.vue'),
  AsbuiltEditView: () => import('../views/quality/asbuilt/AsbuiltEditView.vue'),
  AsbuiltDetailView: () => import('../views/quality/asbuilt/AsbuiltDetailView.vue'),

  ProjectBasicInfoView: () => import('../views/basicData/ProjectBasicInfoView.vue'),
  ProjectCreateView: () => import('../views/basicData/ProjectCreateView.vue'),
  ProjectPortraitView: () => import('../views/basicData/ProjectPortraitView.vue'),
  SubcontractorListView: () => import('../views/basicData/SubcontractorListView.vue'),
  SubcontractorDetailView: () => import('../views/basicData/SubcontractorDetailView.vue'),
  EntityBreakdownView: () => import('../views/basicData/EntityBreakdownView.vue'),

  AiDashboardView: () => import('../views/aiApp/AiDashboardView.vue'),
  AiAlertConfigView: () => import('../views/aiApp/AiAlertConfigView.vue'),
  AiAlertDetailView: () => import('../views/aiApp/AiAlertDetailView.vue'),
  AiProjectAlertDetailView: () => import('../views/aiApp/AiProjectAlertDetailView.vue'),
  AiUnsafeBehaviorView: () => import('../views/aiApp/AiUnsafeBehaviorView.vue'),
  AiHazardEventView: () => import('../views/aiApp/AiHazardEventView.vue'),
  AiFenceIntrusionView: () => import('../views/aiApp/AiFenceIntrusionView.vue'),
  AiTrajectoryPredictView: () => import('../views/aiApp/AiTrajectoryPredictView.vue'),
  AiDroneRecognitionView: () => import('../views/aiApp/AiDroneRecognitionView.vue'),

  OrgStructureView: () => import('../views/settings/OrgStructureView.vue'),
  UserManageView: () => import('../views/settings/UserManageView.vue'),
  UserManageFormView: () => import('../views/settings/UserManageFormView.vue'),
  UserManageDetailView: () => import('../views/settings/UserManageDetailView.vue'),
  RoleManageView: () => import('../views/settings/RoleManageView.vue'),
  RoleManageFormView: () => import('../views/settings/RoleManageFormView.vue'),
  PositionManageView: () => import('../views/settings/PositionManageView.vue'),
  MenuManageView: () => import('../views/settings/MenuManageView.vue'),
  SystemLogView: () => import('../views/logs/SystemLogView.vue'),
  LoginLogView: () => import('../views/logs/LoginLogView.vue'),
  OperationLogView: () => import('../views/logs/OperationLogView.vue'),

  /** 建管 APP（实际路由在 router/index.js 顶层挂载，此处仅满足 menu schema） */
  AppLoginView: () => import('../views/app/AppLoginView.vue'),
}

/* ============================================================================
 * 5. 助手函数（派生侧栏 / 路由 / 权限树）
 * ==========================================================================*/

/** 拍平菜单树为叶子列表 */
export function flattenMenuLeaves(items = []) {
  const leaves = []
  for (const item of items) {
    if (item.path) leaves.push(item)
    else if (item.children?.length) leaves.push(...flattenMenuLeaves(item.children))
  }
  return leaves
}

/** 层级是否包含于 item.levels */
function levelMatches(item, level) {
  if (!item.levels || item.levels === 'both') return true
  return item.levels === level
}

/** 按层级过滤菜单树，并剪掉空分组（互不干扰的核心） */
export function filterMenuByLevel(items = [], level = 'hq') {
  return items
    .filter((item) => levelMatches(item, level))
    .map((item) => {
      if (!item.children?.length) return item
      const children = filterMenuByLevel(item.children, level)
      return { ...item, children }
    })
    .filter((item) => !item.children || item.children.length > 0)
}

/** 按层级排序子项（sortByLevel[level] 覆盖自然顺序） */
function sortChildren(items = [], level) {
  const hasOverride = items.some((item) => item.sortByLevel?.[level] != null)
  if (!hasOverride) return items
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const av = a.item.sortByLevel?.[level]
      const bv = b.item.sortByLevel?.[level]
      if (av == null && bv == null) return a.index - b.index
      if (av == null) return 1
      if (bv == null) return -1
      return av - bv
    })
    .map(({ item }) => item)
}

/** 应用层级名称覆盖 + 递归排序，返回新的展示树 */
export function resolveMenuTree(items = [], level = 'hq') {
  return items.map((item) => {
    const next = { ...item }
    const override = item.labelByLevel?.[level]
    if (override) next.label = override
    if (item.children?.length) {
      next.children = resolveMenuTree(sortChildren(item.children, level), level)
    }
    return next
  })
}

/** 按层级构建 key → path（L11 同名 key 在 HQ/项目各有一条，须分表索引） */
function buildKeyToPathMap(level) {
  const map = new Map()
  const walk = (items = []) => {
    for (const item of items) {
      if (item.path && !map.has(item.key)) map.set(item.key, item.path)
      if (item.children?.length) walk(item.children)
    }
  }
  walk(filterMenuByLevel(menuTree, level))
  for (const r of hiddenRoutes) {
    const key = r.sidebarKey || r.key
    if (!key || !r.path || map.has(key)) continue
    const isHqPath = r.path.startsWith('/hq/')
    if (level === MENU_SCOPE_HQ && isHqPath) map.set(key, r.path)
    if (level === MENU_SCOPE_PROJECT && !isHqPath) map.set(key, r.path)
  }
  return map
}

const hqKeyToPath = buildKeyToPathMap(MENU_SCOPE_HQ)
const projectKeyToPath = buildKeyToPathMap(MENU_SCOPE_PROJECT)

/** 把 sidebarKey 解析为当前层级的菜单 path（侧栏高亮） */
export function getMenuPathByKey(key, level = MENU_SCOPE_HQ) {
  if (!key) return ''
  const map = level === MENU_SCOPE_PROJECT ? projectKeyToPath : hqKeyToPath
  return map.get(key) || ''
}

/** 某路径在当前层级下的展示名（用于标签页标题，处理同 path 不同层名称） */
export function getMenuLabelByPath(path, level = 'hq') {
  const leaves = flattenMenuLeaves(filterMenuByLevel(menuTree, level))
  const hit = leaves.find((item) => item.path === path)
  if (!hit) return ''
  return hit.labelByLevel?.[level] || hit.label || ''
}

/** 收集某类包装组件的路由项（含实际内容组件） */
function collectWrappedItems(routeComponentName) {
  const fromTree = flattenMenuLeaves(menuTree).filter((item) => item.routeComponent === routeComponentName)
  const fromHidden = hiddenRoutes.filter((item) => item.routeComponent === routeComponentName)
  return [...fromTree, ...fromHidden]
}

/** 调度后台内容组件反查（CocAdminPageView 消费） */
export function getCocAdminItem(key) {
  const item = collectWrappedItems('CocAdminPageView').find((it) => it.key === key)
  if (!item) return null
  return {
    key,
    label: item.label,
    roles: item.roles || [],
    description: item.description || '',
    component: viewLoaders[item.component],
  }
}

/** 视频监控内容组件反查（VideoMonitorPageView 消费） */
export function getVideoMonitorItem(key) {
  const item = collectWrappedItems('VideoMonitorPageView').find((it) => it.key === key)
  if (!item) return null
  return {
    key,
    label: item.label,
    description: item.description || '',
    component: viewLoaders[item.component],
  }
}

/** 生成全部路由记录（供 router/index.js 使用） */
export function buildRoutes() {
  const seenPaths = new Set()
  const routes = []

  const addLeaf = (item) => {
    // 建管 APP 等顶层全屏页：不挂到 AdminLayout
    if (String(item.path || '').startsWith('/app')) return
    if (seenPaths.has(item.path)) return
    seenPaths.add(item.path)
    const isCocAdmin = item.routeComponent === 'CocAdminPageView'
    const isVideoMonitor = item.routeComponent === 'VideoMonitorPageView'
    routes.push({
      path: item.path.replace(/^\//, ''),
      name: item.name,
      component: viewLoaders[item.routeComponent || item.component],
      meta: {
        sidebarKey: item.sidebarKey || item.key,
        tabKey: item.sidebarKey || item.key,
        title: item.label,
        trackKind: item.trackKind,
        cocAdminKey: isCocAdmin ? item.key : undefined,
        videoMonitorKey: isVideoMonitor ? item.key : undefined,
      },
      props: item.trackKind ? { kind: item.trackKind } : undefined,
    })
  }

  for (const leaf of flattenMenuLeaves(menuTree)) addLeaf(leaf)

  for (const r of hiddenRoutes) {
    if (seenPaths.has(r.path)) continue
    seenPaths.add(r.path)
    const isCocAdmin = r.routeComponent === 'CocAdminPageView'
    routes.push({
      path: r.path.replace(/^\//, ''),
      name: r.name,
      component: viewLoaders[r.routeComponent || r.component],
      redirect: r.redirect,
      meta: {
        sidebarKey: r.sidebarKey || r.key,
        tabKey: r.sidebarKey || r.key,
        title: r.label,
        cocAdminKey: isCocAdmin ? r.key : undefined,
      },
    })
  }

  return routes
}
