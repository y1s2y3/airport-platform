export const vehicleMenuItems = [
  {
    key: 'vehicle-dashboard',
    name: 'VehicleDashboard',
    label: '车辆管理看板',
    path: '/vehicle/dashboard',
    description: '车辆监管总看板：从车牌识别闸机等对接数据汇总进出场量、在场数量及异常预警（对接类取数，非档案填报）。',
  },
  {
    key: 'vehicle-access',
    name: 'VehicleAccess',
    label: '进出场记录',
    path: '/vehicle/access',
    description: '对接现场既有车牌识别闸机，自动同步进出场记录；车辆无需报审，不强制施工单位额外填报。',
  },
  {
    key: 'vehicle-track',
    name: 'VehicleTrack',
    label: '车辆轨迹监管',
    path: '/vehicle/track',
    description:
      '非硬性能力：仅对已对接定位/轨迹子系统的项目开放；无轨迹系统的项目不强制接入。平台不做电子围栏，围栏由施工方子系统实现。',
  },
  {
    key: 'vehicle-registry',
    name: 'VehicleRegistry',
    label: '车牌管理',
    path: '/vehicle/registry',
    description: '展示闸机/子系统同步的施工车辆台账（车牌、类型、所属单位等），以对接同步为主。',
  },
  {
    key: 'vehicle-device',
    name: 'VehicleDevice',
    label: '设备管理',
    path: '/vehicle/device',
    description: '展示道闸车牌识别等对接设备状态与接入配置，不强制替换现场既有硬件。',
  },
]

export const vehicleWarningMenuItem = {
  key: 'vehicle-warning-list',
  name: 'VehicleWarningList',
  label: '预警清单',
  path: '/vehicle/warning-list',
  description: '汇总车辆进出等对接类监管预警；电子围栏/禁行偏离类告警由施工方子系统处理，本平台不维护围栏。',
}

export const vehicleMenuGroup = {
  key: 'vehicle',
  label: '车辆管理',
  icon: 'Van',
  children: vehicleMenuItems.map(({ key, label, path, description }) => ({
    key,
    label,
    path,
    description,
  })),
}

export const vehicleRoutes = [...vehicleMenuItems, vehicleWarningMenuItem]

export function getVehicleMenuItem(key) {
  if (key === vehicleWarningMenuItem.key) return vehicleWarningMenuItem
  return vehicleMenuItems.find((item) => item.key === key) || null
}
