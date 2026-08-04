import { basicDataMenuGroup } from './basicDataMenu.js'
import { cocAdminMenuGroup } from './cocAdminMenu.js'
import { qualityMenuGroup } from './qualityMenu.js'
import { qualityDashboardMenuGroup } from './qualityDashboardMenu.js'
import { safetyBoardMenuGroup } from './safetyBoardMenu.js'
import { brandMenuGroup } from './brandMenu.js'
import { sampleMenuGroup } from './sampleMenu.js'
import { matMenuGroup } from './matMenu.js'
import { eqMenuGroup } from './eqMenu.js'
import { settingsMenuGroups } from './settingsMenu.js'
import {
  smartSiteMenuGroup,
  siteConstructionMenuGroup,
  hqSiteConstructionMenuGroup,
  aiAppMenuGroup,
} from './projectOpsMenu.js'

/**
 * 侧栏菜单：
 * - 指挥部：个人中心下 → 安全看板 → 质量看板 → 施工现场管理（二级：人员/巡检/机械/危大）
 * - 项目：个人中心下 → 智慧工地监管 / 施工现场管理（含机械台账、告警配置）
 */
export const sidebarMenu = [
  { key: 'workbench', label: '工作台', icon: 'Monitor', path: '/workbench' },
  { key: 'personal-center', label: '个人中心', icon: 'Notebook', path: '/personal-center' },
  /** 指挥部：安全看板 → 质量看板 → 施工现场管理 */
  safetyBoardMenuGroup,
  qualityDashboardMenuGroup,
  hqSiteConstructionMenuGroup,
  /** 项目级包装菜单 */
  smartSiteMenuGroup,
  siteConstructionMenuGroup,
  aiAppMenuGroup,
  cocAdminMenuGroup,
  qualityMenuGroup,
  brandMenuGroup,
  sampleMenuGroup,
  matMenuGroup,
  eqMenuGroup,
  basicDataMenuGroup,
  ...settingsMenuGroups,
]
