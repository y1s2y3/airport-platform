/**
 * 安全看板 — 指挥部一级菜单（位于个人中心下方）
 * 汇聚：实名制统计 / 车辆管理看板 / 巡检看板 / 视频监控统计 /
 * 机械设备台账 / 机械设备告警 / 危大监测告警
 * 项目层级不展示本菜单；项目侧仍在原模块下保留对应入口（告警记录等）。
 */
export const safetyBoardMenuGroup = {
  key: 'safety-board',
  label: '安全看板',
  icon: 'DataBoard',
  children: [
    {
      key: 'labor-realname-stats',
      label: '实名制统计',
      path: '/labor/realname-stats',
      description: '指挥部按项目汇总实名制相关指标。',
    },
    {
      key: 'vehicle-dashboard',
      label: '车辆管理看板',
      path: '/vehicle/dashboard',
      description: '指挥部按项目汇总车辆进出场、在场及预警。',
    },
    {
      key: 'safety-dashboard',
      label: '巡检看板',
      path: '/safety-inspection/dashboard',
      description: '指挥部全项目巡检与隐患统计（含安全/质量分类）。',
    },
    {
      key: 'video-monitor-stats',
      label: '视频监控统计',
      path: '/video-monitor/stats',
      description:
        '指挥部级视频监控统计：按项目汇总摄像头总数、在线/离线数量、超15日离线数量及离线预警未处置数量。',
    },
    {
      // 与项目侧「登记进场设备」共用路由；指挥部展示汇总台账（对齐 0804）
      key: 'machine-entry-manage',
      label: '机械设备台账',
      path: '/machine-supervise/ledger',
      description: '指挥部按项目汇总机械设备在场/退场及启用情况。',
    },
    {
      key: 'alert-record',
      label: '机械设备告警',
      path: '/machine-supervise/alert-record',
      description: '指挥部查看机械设备监测告警记录。',
    },
    {
      key: 'alert-record-major',
      label: '危大监测告警',
      path: '/major-hazard/alert-record',
      description: '指挥部查看危大工程监测告警记录。',
    },
  ],
}

/** 兼容旧链接 /safety-board → 巡检看板 */
export const safetyBoardRoutes = [
  {
    key: 'safety-dashboard',
    path: '/safety-board',
    name: 'SafetyBoard',
    label: '巡检看板',
    redirect: '/safety-inspection/dashboard',
  },
]

export const safetyBoardViewLoaders = {}
