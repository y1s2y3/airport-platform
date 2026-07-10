export const sidebarMenu = [
  { key: 'workbench', label: '工作台', icon: 'Monitor', path: '/workbench' },
  { key: 'overview', label: '项目总览', icon: 'DataBoard', path: '/overview' },
  { key: 'safety', label: '安全管理', icon: 'Warning', path: '/safety' },
  {
    key: 'quality',
    label: '质量管理',
    icon: 'Medal',
    children: [
      { key: 'quality-risk', label: '风险预警', path: '/quality/risk' },
      { key: 'quality-inspect', label: '质量检查', path: '/quality/inspect', badge: true },
      { key: 'quality-accept', label: '质量验收', path: '/quality/accept' },
      { key: 'qc-template', label: '质量控制点模板库', path: '/quality/qc-template' },
    ],
  },
  { key: 'material', label: '物资管理', icon: 'Box', path: '/material' },
  { key: 'labor', label: '劳务实名制', icon: 'User', path: '/labor' },
  { key: 'document', label: '资料管理', icon: 'FolderOpened', path: '/document' },
  { key: 'settings', label: '组织管理', icon: 'OfficeBuilding', path: '/settings' },
]

export const kpiCards = [
  { label: '在建项目', value: '42', trend: '+3', trendType: 'up', icon: 'Crane', color: 'blue' },
  { label: '现场人员', value: '1,286', trend: '+24', trendType: 'up', icon: 'User', color: 'cyan' },
  { label: '塔吊机械', value: '76', trend: '0', trendType: 'flat', icon: 'Tools', color: 'purple' },
  { label: '视频在线', value: '98.7%', trend: '+0.2', trendType: 'up', icon: 'VideoCamera', color: 'green' },
  { label: '风险预警', value: '9', trend: '-2', trendType: 'down', icon: 'Warning', color: 'orange' },
  { label: '闭环率', value: '96.4%', trend: '+1.2', trendType: 'up', icon: 'CircleCheck', color: 'magenta' },
]

export const commandChain = [
  { level: 'L1', name: '业主层', count: 12, active: true },
  { level: 'L2', name: '项目管理层', count: 64, active: false },
  { level: 'L3', name: '标段执行层', count: 326, active: false },
  { level: 'L4', name: '班组作业层', count: 884, active: false },
]

export const riskAlerts = [
  { level: '高', text: '临边防护缺失', color: 'high' },
  { level: '中', text: '人员聚集预警', color: 'medium' },
  { level: '低', text: '扬尘指标偏高', color: 'low' },
]

export const resourceLoad = [
  { name: '土建施工', percent: 86 },
  { name: '机电安装', percent: 72 },
  { name: '材料供应', percent: 64 },
]

export const constructionStatus = [
  { name: 'T3 航站楼 A 区', status: 'danger', tag: '高风险作业点' },
  { name: '三跑道西段', status: 'normal' },
  { name: '综合交通枢纽', status: 'normal' },
  { name: '卫星厅扩建区', status: 'normal' },
]

export const dispatchLogs = [
  { time: '10:12', text: '安全部发起临边防护整改，已指派责任单位到场复核。' },
  { time: '11:05', text: 'COC 调度中心完成三跑道西段视频巡检，未发现新增隐患。' },
  { time: '18:40', text: '物资管理部反馈钢筋到货延迟，已同步进度与采购计划。' },
]

export const videoPanels = [
  { name: 'T3 指廊 A', online: true },
  { name: '三跑道桩基区', online: true },
  { name: '综合交通基坑', online: true },
  { name: '卫星厅钢构区', online: true },
]

export const highRiskWorks = [
  { name: '大型构件吊装', status: '进行中', statusType: 'danger' },
  { name: '深基坑支护施工', status: '需关注', statusType: 'warning' },
  { name: '高支模浇筑作业', status: '正常', statusType: 'success' },
]
