/**
 * 机械设备监管 / 机械设备台账 / 危大工程监管 / 告警配置
 * 一级菜单 + 路由元数据（页面由 router 懒加载）
 */

/** ① 机械设备监管 */
export const machineSuperviseMenuGroup = {
  key: 'machine-supervise',
  label: '机械设备监管',
  icon: 'SetUp',
  children: [
    { key: 'device-manage', label: '监测设备管理', path: '/machine-supervise/device' },
    { key: 'crane-monitor', label: '塔吊运行监管', path: '/machine-supervise/crane' },
    { key: 'lift-monitor', label: '升降机监管', path: '/machine-supervise/lift' },
    { key: 'pile-monitor', label: '桩基机械施工监管', path: '/machine-supervise/pile' },
    { key: 'composite-monitor', label: '复合地基机械施工监管', path: '/machine-supervise/composite' },
    { key: 'alert-record', label: '告警记录', path: '/machine-supervise/alert-record' },
  ],
}

/** ② 机械设备台账（项目级：登记进场设备 + 机械类型维护） */
export const machineLedgerMenuGroup = {
  key: 'machine-ledger',
  label: '机械设备台账',
  icon: 'Document',
  children: [
    { key: 'machine-entry-manage', label: '登记进场设备', path: '/machine-supervise/ledger' },
    { key: 'machine-type-maintain', label: '机械类型维护', path: '/machine-supervise/machine-types' },
  ],
}

/** ③ 危大工程监管 */
export const majorHazardMenuGroup = {
  key: 'major-hazard',
  label: '危大工程监管',
  icon: 'WarnTriangleFilled',
  children: [
    { key: 'deep-foundation-pit', label: '深基坑安全监管', path: '/major-hazard/deep-foundation-pit' },
    { key: 'subway-protection', label: '地铁铁路安全监管', path: '/major-hazard/subway-protection' },
    { key: 'high-formwork', label: '高支模变形监管', path: '/major-hazard/high-formwork' },
    { key: 'hazard-manage', label: '危大工程管理', path: '/major-hazard/hazard-manage' },
    { key: 'device-binding', label: '监测设备管理', path: '/major-hazard/device-binding' },
    { key: 'alert-record-major', label: '告警记录', path: '/major-hazard/alert-record' },
  ],
}

/** ④ 告警配置（机械设备，一级叶子菜单；指挥部隐藏） */
export const alertConfigMenuItem = {
  key: 'alert-config',
  label: '告警配置',
  icon: 'Bell',
  path: '/machine-supervise/alert-config',
}

/** 四个一级菜单（按侧栏展示顺序） */
export const machineHazardMenuGroups = [
  machineSuperviseMenuGroup,
  machineLedgerMenuGroup,
  majorHazardMenuGroup,
  alertConfigMenuItem,
]

/** 扁平路由元数据 */
export const machineHazardRoutes = [
  {
    key: 'device-manage',
    name: 'DeviceManage',
    label: '监测设备管理',
    path: '/machine-supervise/device',
  },
  {
    key: 'crane-monitor',
    name: 'CraneMonitor',
    label: '塔吊运行监管',
    path: '/machine-supervise/crane',
  },
  {
    key: 'lift-monitor',
    name: 'LiftMonitor',
    label: '升降机监管',
    path: '/machine-supervise/lift',
  },
  {
    key: 'pile-monitor',
    name: 'PileMonitor',
    label: '桩基机械施工监管',
    path: '/machine-supervise/pile',
  },
  {
    key: 'composite-monitor',
    name: 'CompositeMonitor',
    label: '复合地基机械施工监管',
    path: '/machine-supervise/composite',
  },
  {
    key: 'alert-record',
    name: 'AlertRecord',
    label: '告警记录',
    path: '/machine-supervise/alert-record',
  },
  {
    key: 'alert-config',
    name: 'AlertConfig',
    label: '告警配置',
    path: '/machine-supervise/alert-config',
  },
  {
    key: 'alert-config-add',
    name: 'AlertConfigAdd',
    label: '新增告警配置',
    path: '/machine-supervise/alert-config/add',
    sidebarKey: 'alert-config',
  },
  {
    key: 'machine-entry-manage',
    name: 'MachineEntryManage',
    label: '登记进场设备',
    path: '/machine-supervise/ledger',
  },
  {
    key: 'machine-type-maintain',
    name: 'MachineTypeMaintain',
    label: '机械类型维护',
    path: '/machine-supervise/machine-types',
  },
  {
    key: 'machine-entry',
    name: 'MachineEntry',
    label: '设备进场登记',
    path: '/machine-supervise/ledger/entry',
    sidebarKey: 'machine-entry-manage',
  },
  {
    key: 'machine-exit',
    name: 'MachineExit',
    label: '设备退场登记',
    path: '/machine-supervise/ledger/exit',
    sidebarKey: 'machine-entry-manage',
  },
  {
    key: 'machine-ledger-detail',
    name: 'MachineryLedgerDetail',
    label: '机械设备详情',
    path: '/machine-supervise/ledger/:id',
    sidebarKey: 'machine-entry-manage',
  },
  {
    key: 'deep-foundation-pit',
    name: 'DeepFoundationPit',
    label: '深基坑安全监管',
    path: '/major-hazard/deep-foundation-pit',
  },
  {
    key: 'subway-protection',
    name: 'SubwayProtection',
    label: '地铁铁路安全监管',
    path: '/major-hazard/subway-protection',
  },
  {
    key: 'high-formwork',
    name: 'HighFormwork',
    label: '高支模变形监管',
    path: '/major-hazard/high-formwork',
  },
  {
    key: 'hazard-manage',
    name: 'HazardManage',
    label: '危大工程管理',
    path: '/major-hazard/hazard-manage',
  },
  {
    key: 'device-binding',
    name: 'DeviceBinding',
    label: '监测设备管理',
    path: '/major-hazard/device-binding',
  },
  {
    key: 'alert-record-major',
    name: 'AlertRecordMajor',
    label: '危大工程告警记录',
    path: '/major-hazard/alert-record',
  },
]
