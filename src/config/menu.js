import { basicDataMenuGroup } from './basicDataMenu.js'
import { cocAdminMenuGroup } from './cocAdminMenu.js'
import { qualityMenuGroup } from './qualityMenu.js'
import { brandMenuGroup } from './brandMenu.js'
import { settingsMenuGroups } from './settingsMenu.js'
import { videoMonitorMenuGroup } from './videoMonitorMenu.js'
import { vehicleMenuGroup } from './vehicleMenu.js'
import { constructionSafetyMenuGroup } from './constructionSafetyMenu.js'
import { machineHazardMenuGroups } from './machineHazardMenu.js'

export const sidebarMenu = [
  { key: 'workbench', label: '工作台', icon: 'Monitor', path: '/workbench' },
  { key: 'personal-center', label: '个人中心', icon: 'Notebook', path: '/personal-center' },
  {
    key: 'labor',
    label: '人员实名制管理',
    icon: 'User',
    children: [
      { key: 'labor-realname-stats', label: '实名制统计', path: '/labor/realname-stats' },
      { key: 'labor-dashboard', label: '劳务看板', path: '/labor/dashboard' },
      { key: 'labor-realname', label: '人员实名制', path: '/labor/realname' },
      { key: 'labor-personnel-track', label: '人员轨迹', path: '/labor/personnel-track' },
      { key: 'labor-attendance-detail', label: '考勤明细', path: '/labor/attendance-detail' },
      { key: 'labor-attendance', label: '考勤统计', path: '/labor/attendance' },
      { key: 'labor-salary-compare', label: '工资考勤比对', path: '/labor/salary-compare' },
      { key: 'labor-warning-config', label: '实名制配置', path: '/labor/warning-config' },
      { key: 'labor-blacklist', label: '劳务黑名单', path: '/labor/blacklist' },
      { key: 'labor-warning-list', label: '预警清单', path: '/labor/warning-list' },
      { key: 'labor-device-manage', label: '设备管理', path: '/labor/device-manage' },
    ],
  },
  vehicleMenuGroup,
  constructionSafetyMenuGroup,
  ...machineHazardMenuGroups,
  videoMonitorMenuGroup,
  cocAdminMenuGroup,
  qualityMenuGroup,
  brandMenuGroup,
  basicDataMenuGroup,
  ...settingsMenuGroups,
]
