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
      '非硬性能力：仅对已对接定位/轨迹子系统的项目开放；点击菜单直接跳转至项目自有车辆定位系统（外链由指挥部「车辆轨迹配置」维护）。平台不做电子围栏。',
  },
  {
    key: 'vehicle-track-config',
    name: 'VehicleTrackConfig',
    label: '车辆轨迹配置',
    path: '/vehicle/track-config',
    description: '指挥部按项目维护车辆定位系统外链（启用、系统名称、URL）。',
  },
  {
    key: 'vehicle-device',
    name: 'VehicleDevice',
    label: '设备管理',
    path: '/vehicle/device',
    description: '展示道闸车牌识别等对接设备状态与接入配置，不强制替换现场既有硬件。',
  },
]

/** 车牌管理：非产品能力（菜单已下线；路由保留兼容） */
export const vehicleRegistryMenuItem = {
  key: 'vehicle-registry',
  name: 'VehicleRegistry',
  label: '车牌管理',
  path: '/vehicle/registry',
  description: '非产品能力：哪些车辆可进出由施工方决定，二期不做车牌台账与道闸授权。',
}

export const vehicleWarningMenuItem = {
  key: 'vehicle-warning-list',
  name: 'VehicleWarningList',
  label: '预警清单',
  path: '/vehicle/warning-list',
  description: '汇总车辆进出等对接类监管预警；电子围栏/禁行偏离类告警由施工方子系统处理，本平台不维护围栏。',
}

/** 项目侧栏车辆子菜单：无看板、无指挥部「车辆轨迹配置」、无「设备管理」（看板/配置仅指挥部） */
export const vehicleProjectMenuItems = vehicleMenuItems.filter(
  (item) =>
    item.key !== 'vehicle-track-config' &&
    item.key !== 'vehicle-dashboard' &&
    item.key !== 'vehicle-device',
)

export const vehicleMenuGroup = {
  key: 'vehicle',
  label: '车辆管理',
  icon: 'Van',
  children: vehicleProjectMenuItems.map(({ key, label, path, description }) => ({
    key,
    label,
    path,
    description,
  })),
}

export const vehicleRoutes = [...vehicleMenuItems, vehicleRegistryMenuItem, vehicleWarningMenuItem]

export function getVehicleMenuItem(key) {
  if (key === vehicleWarningMenuItem.key) return vehicleWarningMenuItem
  if (key === vehicleRegistryMenuItem.key) return vehicleRegistryMenuItem
  return vehicleMenuItems.find((item) => item.key === key) || null
}
