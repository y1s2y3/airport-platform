import { basicDataMenuGroup } from './basicDataMenu.js'
import { cocAdminMenuGroup } from './cocAdminMenu.js'
import { settingsMenuGroups } from './settingsMenu.js'
import { videoMonitorMenuGroup } from './videoMonitorMenu.js'
import { vehicleMenuGroup } from './vehicleMenu.js'

export const sidebarMenu = [
  { key: 'workbench', label: '工作台', icon: 'Monitor', path: '/workbench' },
  {
    key: 'labor',
    label: '人员实名制管理',
    icon: 'User',
    children: [
      { key: 'labor-dashboard', label: '劳务看板', path: '/labor/dashboard' },
      { key: 'labor-realname', label: '人员实名制', path: '/labor/realname' },
      { key: 'labor-personnel-track', label: '人员轨迹', path: '/labor/personnel-track' },
      { key: 'labor-attendance-detail', label: '考勤明细', path: '/labor/attendance-detail' },
      { key: 'labor-attendance', label: '考勤统计', path: '/labor/attendance' },
      { key: 'labor-salary-compare', label: '工资考勤比对', path: '/labor/salary-compare' },
      { key: 'labor-blacklist', label: '劳务黑名单', path: '/labor/blacklist' },
      { key: 'labor-warning-list', label: '预警清单', path: '/labor/warning-list' },
      { key: 'labor-warning-config', label: '实名制配置', path: '/labor/warning-config' },
      { key: 'labor-device-manage', label: '设备管理', path: '/labor/device-manage' },
    ],
  },
  vehicleMenuGroup,
  videoMonitorMenuGroup,
  cocAdminMenuGroup,
  basicDataMenuGroup,
  ...settingsMenuGroups,
]
