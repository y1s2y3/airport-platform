import { basicDataMenuGroup } from './basicDataMenu.js'
import { cocAdminMenuGroup } from './cocAdminMenu.js'
import { settingsMenuGroups } from './settingsMenu.js'

export const sidebarMenu = [
  { key: 'workbench', label: '工作台', icon: 'Monitor', path: '/workbench' },
  {
    key: 'labor',
    label: '劳务管理',
    icon: 'User',
    children: [
      { key: 'labor-dashboard', label: '劳务看板', path: '/labor/dashboard' },
      { key: 'labor-realname', label: '人员实名制', path: '/labor/realname' },
      { key: 'labor-access', label: '准入核验', path: '/labor/access' },
      { key: 'labor-attendance-detail', label: '考勤明细', path: '/labor/attendance-detail' },
      { key: 'labor-attendance', label: '考勤统计', path: '/labor/attendance' },
      { key: 'labor-blacklist', label: '劳务黑名单', path: '/labor/blacklist' },
    ],
  },
  cocAdminMenuGroup,
  basicDataMenuGroup,
  ...settingsMenuGroups,
]
