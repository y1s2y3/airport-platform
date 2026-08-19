/**
 * 项目级侧栏重组：
 * - 智慧工地监管：人员实名制 / 车辆 / 机械设备监管 / 危大工程监测 / 告警配置 / 视频监控
 * - 施工现场管理：施工作业申报 + 巡检管理 + 机械设备台账
 * - 施工质量管控：质量验评 / 品牌报审 / 样板管理 / 材料设备进场管理 / 实模一致验收
 * 指挥部：「施工现场管理」见 hqSiteConstructionMenuGroup；「智慧工地监管」见 hqSmartSiteMenuGroup
 */
import { vehicleMenuGroup } from './vehicleMenu.js'
import { videoMonitorMenuGroup } from './videoMonitorMenu.js'
import { constructionSafetyMenuGroup } from './constructionSafetyMenu.js'
import { machineSuperviseMenuGroup, majorHazardMenuGroup, machineLedgerMenuGroup, alertConfigMenuItem } from './machineHazardMenu.js'
import { qualityMenuGroup, qualityArchiveMenuGroup } from './qualityMenu.js'
import { brandMenuGroup } from './brandMenu.js'
import { sampleMenuGroup } from './sampleMenu.js'
import { matMenuGroup } from './matMenu.js'

import { asbuiltMenuItem } from './asbuiltMenu.js'

/** 人员实名制子项（项目侧完整能力；指挥部另在 hq 菜单前置统计/轨迹系统） */
export const laborMenuChildren = [
  { key: 'labor-warning-config', label: '实名制配置', path: '/labor/warning-config' },
  { key: 'labor-blacklist', label: '劳务黑名单', path: '/labor/blacklist' },
  { key: 'labor-dashboard', label: '人员实名制看板', path: '/labor/dashboard' },
  { key: 'labor-realname', label: '人员实名制', path: '/labor/realname' },
  { key: 'labor-personnel-track', label: '人员轨迹', path: '/labor/personnel-track' },
  { key: 'labor-attendance-detail', label: '考勤明细', path: '/labor/attendance-detail' },
  { key: 'labor-warning-list', label: '预警清单', path: '/labor/warning-list' },
  {
    key: 'labor-mobile-personal-center',
    label: '个人中心（移动端）',
    path: '/labor/mobile/personal-center',
  },
]

/** 指挥部 · 人员实名制管理：实名制统计第一，其次人员轨迹系统，再配置/黑名单等 */
const hqLaborMenuChildren = [
  {
    key: 'labor-realname-stats',
    label: '实名制统计',
    path: '/labor/realname-stats',
    description: '指挥部按项目汇总实名制相关指标。',
  },
  {
    key: 'labor-track-system',
    label: '人员轨迹系统',
    path: '/labor/track-system',
    description: '指挥部查看已配置人员轨迹外链的项目，并支持跳转。',
  },
  ...laborMenuChildren.map((c) => ({ ...c })),
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

const HQ_WORK_MANAGE_KEYS = new Set(['major-hazard-daily-work', 'major-hazard-list'])

/** 指挥部 · 车辆管理（看板 / 轨迹系统 / 轨迹配置） */
const hqVehicleMenuChildren = [
  {
    key: 'vehicle-dashboard',
    label: '车辆管理看板',
    path: '/vehicle/dashboard',
    description: '指挥部按项目汇总车辆进出场、在场情况。',
  },
  {
    key: 'vehicle-track-system',
    label: '车辆轨迹系统',
    path: '/vehicle/track-system',
    description: '指挥部查看已配置车辆轨迹外链的项目，并支持跳转。',
  },
  {
    key: 'vehicle-track-config',
    label: '车辆轨迹配置',
    path: '/vehicle/track-config',
    description: '指挥部按项目维护车辆定位系统外链；项目侧「车辆轨迹监管」点击后直接外跳。',
  },
]

/**
 * 指挥部 · 施工现场管理（一级）
 * 顺序：安全看板 → 质量看板 → 本菜单 → 智慧工地监管
 * 二级：巡检管理 / 施工作业管理
 */
export const hqSiteConstructionMenuGroup = {
  key: 'hq-site-construction',
  label: '施工现场管理',
  icon: 'MapLocation',
  children: [
    nestGroup(constructionSafetyMenuGroup, 'safety-inspection'),
    {
      key: 'hq-work-manage',
      label: '施工作业管理',
      icon: 'Document',
      children: majorHazardMenuGroup.children
        .filter((c) => HQ_WORK_MANAGE_KEYS.has(c.key))
        .map((c) => ({ ...c })),
    },
  ],
}

/**
 * 指挥部 · 智慧工地监管（一级）
 * 排在「施工现场管理」之后
 * 二级：人员实名制管理 / 车辆管理 / 机械设备监管 / 危大工程监测
 */
export const hqSmartSiteMenuGroup = {
  key: 'hq-smart-site',
  label: '智慧工地监管',
  icon: 'Cpu',
  children: [
    {
      key: 'labor',
      label: '人员实名制管理',
      children: hqLaborMenuChildren.map((c) => ({ ...c })),
    },
    {
      key: 'hq-vehicle',
      label: '车辆管理',
      children: hqVehicleMenuChildren.map((c) => ({ ...c })),
    },
    nestGroup(machineSuperviseMenuGroup, 'machine-supervise'),
    {
      key: 'major-hazard',
      label: majorHazardMenuGroup.label,
      icon: majorHazardMenuGroup.icon,
      children: majorHazardMenuGroup.children
        .filter((c) => !HQ_WORK_MANAGE_KEYS.has(c.key))
        .map((c) => ({ ...c })),
    },
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
    {
      key: alertConfigMenuItem.key,
      label: alertConfigMenuItem.label,
      path: alertConfigMenuItem.path,
    },
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
    nestGroup(machineLedgerMenuGroup, 'machine-ledger'),
  ],
}

/**
 * 施工质量管控（仅项目层级）
 * 顺序：施工现场管理下方；二级为原质量相关一级菜单
 */
export const constructionQualityMenuGroup = {
  key: 'construction-quality',
  label: '施工质量管控',
  icon: 'Medal',
  children: [
    nestGroup(qualityMenuGroup, 'quality-inspect'),
    nestGroup(qualityArchiveMenuGroup, 'qm-archive-mgmt'),
    nestGroup(brandMenuGroup, 'brand-approval'),
    nestGroup(sampleMenuGroup, 'sample-mgmt'),
    nestGroup(matMenuGroup, 'mat-entry-mgmt'),
    asbuiltMenuItem,
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
 * AI 应用（一级菜单，位于施工质量管控下方）
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
