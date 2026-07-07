export const vehicleMenuItems = [
  {
    key: 'vehicle-dashboard',
    name: 'VehicleDashboard',
    label: '车辆管理看板',
    path: '/vehicle/dashboard',
    description: '车辆监管总看板：展示各项目车辆进出场量、在途/在场数量及异常预警统计。',
  },
  {
    key: 'vehicle-access',
    name: 'VehicleAccess',
    label: '进出场记录',
    path: '/vehicle/access',
    description: '记录车辆进出场信息，对接工地自建车辆系统同步进出场数据，不做准入限制。',
  },
  {
    key: 'vehicle-track',
    name: 'VehicleTrack',
    label: '车辆轨迹监管',
    path: '/vehicle/track',
    description:
      '接入工地自建定位系统的车辆轨迹数据，在 GIS 地图中展示轨迹，结合行驶路线及禁行区域数据，对偏离路线等行为触发报警并协同处置。',
  },
  {
    key: 'vehicle-registry',
    name: 'VehicleRegistry',
    label: '车牌管理',
    path: '/vehicle/registry',
    description: '维护项目施工车辆台账（车牌、类型、所属单位、司机信息），支持增删改查与导入导出。',
  },
  {
    key: 'vehicle-device',
    name: 'VehicleDevice',
    label: '设备管理',
    path: '/vehicle/device',
    description: '管理轨迹监测设备、道闸车牌识别设备，维护设备绑定项目、在线状态及接入配置。',
  },
]

export const vehicleWarningMenuItem = {
  key: 'vehicle-warning-list',
  name: 'VehicleWarningList',
  label: '预警清单',
  path: '/vehicle/warning-list',
  description: '汇总车辆轨迹监管报警及其他车辆监管预警，支持查询与处置跟踪。',
}

export const vehicleMenuGroup = {
  key: 'vehicle',
  label: '车辆管理',
  icon: 'Van',
  children: [
    ...vehicleMenuItems.slice(0, 3).map(({ key, label, path, description }) => ({
      key,
      label,
      path,
      description,
    })),
    {
      key: vehicleWarningMenuItem.key,
      label: vehicleWarningMenuItem.label,
      path: vehicleWarningMenuItem.path,
      description: vehicleWarningMenuItem.description,
    },
    ...vehicleMenuItems.slice(3).map(({ key, label, path, description }) => ({
      key,
      label,
      path,
      description,
    })),
  ],
}

export const vehicleRoutes = [...vehicleMenuItems, vehicleWarningMenuItem]

export function getVehicleMenuItem(key) {
  if (key === vehicleWarningMenuItem.key) return vehicleWarningMenuItem
  return vehicleMenuItems.find((item) => item.key === key) || null
}
