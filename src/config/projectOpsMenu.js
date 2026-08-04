/**
 * 项目级侧栏重组：
 * - 智慧工地监管：人员实名制 / 车辆 / 机械设备监管 / 视频监控（降级为二级）
 * - 施工现场管理：施工作业申报 + 安全巡检 + 危大工程 + 机械设备台账 + 告警配置 + AI 应用
 * 指挥部「施工现场管理」见 hqSiteConstructionMenuGroup
 */
import { vehicleMenuGroup } from './vehicleMenu.js'
import { videoMonitorMenuGroup } from './videoMonitorMenu.js'
import { constructionSafetyMenuGroup } from './constructionSafetyMenu.js'
import { machineSuperviseMenuGroup, majorHazardMenuGroup, machineLedgerMenuGroup, alertConfigMenuItem } from './machineHazardMenu.js'

/** 人员实名制子项（指挥部仅保留配置/黑名单；统计已在安全看板） */
export const laborMenuChildren = [
  { key: 'labor-warning-config', label: '实名制配置', path: '/labor/warning-config' },
  { key: 'labor-blacklist', label: '劳务黑名单', path: '/labor/blacklist' },
  { key: 'labor-dashboard', label: '劳务看板', path: '/labor/dashboard' },
  { key: 'labor-realname', label: '人员实名制', path: '/labor/realname' },
  { key: 'labor-personnel-track', label: '人员轨迹', path: '/labor/personnel-track' },
  { key: 'labor-attendance-detail', label: '考勤明细', path: '/labor/attendance-detail' },
  { key: 'labor-warning-list', label: '预警清单', path: '/labor/warning-list' },
  { key: 'labor-device-manage', label: '设备管理', path: '/labor/device-manage' },
]

function nestGroup(source, nestedKey, extraChildren = []) {
  return {
    key: nestedKey,
    label: source.label,
    children: [
      ...(source.children || []).map((child) => ({ ...child })),
      ...extraChildren.map((child) => ({ ...child })),
    ],
  }
}

/**
 * 指挥部 · 施工现场管理（一级）
 * 顺序挂在：安全看板 → 质量看板 → 本菜单
 * 二级：人员实名制管理 / 安全巡检 / 机械设备监管 / 危大工程监测
 */
export const hqSiteConstructionMenuGroup = {
  key: 'hq-site-construction',
  label: '施工现场管理',
  icon: 'MapLocation',
  children: [
    {
      key: 'labor',
      label: '人员实名制管理',
      children: laborMenuChildren.map((c) => ({ ...c })),
    },
    nestGroup(constructionSafetyMenuGroup, 'safety-inspection'),
    nestGroup(machineSuperviseMenuGroup, 'machine-supervise'),
    nestGroup(majorHazardMenuGroup, 'major-hazard'),
  ],
}

/** 智慧工地监管（仅项目层级） */
export const smartSiteMenuGroup = {
  key: 'smart-site',
  label: '智慧工地监管',
  icon: 'Cpu',
  children: [
    {
      key: 'smart-labor',
      label: '人员实名制管理',
      children: laborMenuChildren.map((c) => ({ ...c })),
    },
    nestGroup(vehicleMenuGroup, 'smart-vehicle'),
    nestGroup(machineSuperviseMenuGroup, 'smart-machine-supervise', [
      { key: 'alert-record', label: '告警记录', path: '/machine-supervise/alert-record' },
    ]),
    nestGroup(videoMonitorMenuGroup, 'smart-video-monitor'),
  ],
}

/** 施工现场管理（仅项目层级） */
export const siteConstructionMenuGroup = {
  key: 'site-construction',
  label: '施工现场管理',
  icon: 'MapLocation',
  children: [
    {
      key: 'site-work-declare',
      label: '施工作业申报',
      icon: 'Document',
      children: majorHazardMenuGroup.children
        .filter((c) => ['major-hazard-daily-work', 'major-hazard-list'].includes(c.key))
        .map((c) => ({ ...c })),
    },
    nestGroup(constructionSafetyMenuGroup, 'site-safety-inspection'),
    {
      key: 'site-major-hazard',
      label: majorHazardMenuGroup.label,
      icon: majorHazardMenuGroup.icon,
      children: [
        ...majorHazardMenuGroup.children
          .filter((c) => !['major-hazard-daily-work', 'major-hazard-list'].includes(c.key))
          .map((c) => ({ ...c })),
        { key: 'alert-record-major', label: '告警记录', path: '/major-hazard/alert-record' },
      ],
    },
    nestGroup(machineLedgerMenuGroup, 'machine-ledger'),
    {
      key: alertConfigMenuItem.key,
      label: alertConfigMenuItem.label,
      path: alertConfigMenuItem.path,
    },
  ],
}

export const siteConstructionRoutes = [
  {
    key: 'site-work-declare',
    name: 'SiteWorkDeclare',
    label: '施工作业申报',
    path: '/site-construction/work-declare',
    component: 'SiteWorkDeclareView',
  },
]

export const siteConstructionViewLoaders = {
  SiteWorkDeclareView: () => import('../views/siteConstruction/SiteWorkDeclareView.vue'),
}

/**
 * AI 应用（一级菜单，位于施工现场管理下方）
 * 二级：现场不安全行为检测 / 现场隐患事件检测 / 围栏入侵及破坏检测 / 多机位人员轨迹预测 / 无人机 AI 识别
 */
export const aiAppMenuGroup = {
  key: 'ai-app',
  label: 'AI 应用',
  icon: 'Cpu',
  children: [
    { key: 'ai-unsafe-behavior', label: '现场不安全行为检测', path: '/ai-app/unsafe-behavior' },
    { key: 'ai-hazard-event', label: '现场隐患事件检测', path: '/ai-app/hazard-event' },
    { key: 'ai-fence-intrusion', label: '围栏入侵及破坏检测', path: '/ai-app/fence-intrusion' },
    { key: 'ai-trajectory-predict', label: '多机位人员轨迹预测', path: '/ai-app/trajectory-predict' },
    { key: 'ai-drone-recognition', label: '无人机 AI 识别', path: '/ai-app/drone-recognition' },
  ],
}

export const aiAppRoutes = [
  { key: 'ai-unsafe-behavior', name: 'AiUnsafeBehavior', label: '现场不安全行为检测', path: '/ai-app/unsafe-behavior', component: 'AiUnsafeBehaviorView' },
  { key: 'ai-hazard-event', name: 'AiHazardEvent', label: '现场隐患事件检测', path: '/ai-app/hazard-event', component: 'AiHazardEventView' },
  { key: 'ai-fence-intrusion', name: 'AiFenceIntrusion', label: '围栏入侵及破坏检测', path: '/ai-app/fence-intrusion', component: 'AiFenceIntrusionView' },
  { key: 'ai-trajectory-predict', name: 'AiTrajectoryPredict', label: '多机位人员轨迹预测', path: '/ai-app/trajectory-predict', component: 'AiTrajectoryPredictView' },
  { key: 'ai-drone-recognition', name: 'AiDroneRecognition', label: '无人机 AI 识别', path: '/ai-app/drone-recognition', component: 'AiDroneRecognitionView' },
]

export const aiAppViewLoaders = {
  AiUnsafeBehaviorView: () => import('../views/aiApp/AiUnsafeBehaviorView.vue'),
  AiHazardEventView: () => import('../views/aiApp/AiHazardEventView.vue'),
  AiFenceIntrusionView: () => import('../views/aiApp/AiFenceIntrusionView.vue'),
  AiTrajectoryPredictView: () => import('../views/aiApp/AiTrajectoryPredictView.vue'),
  AiDroneRecognitionView: () => import('../views/aiApp/AiDroneRecognitionView.vue'),
}
