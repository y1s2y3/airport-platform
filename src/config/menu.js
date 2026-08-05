import { basicDataMenuGroup } from './basicDataMenu.js'
import { cocAdminMenuGroup } from './cocAdminMenu.js'
import { qualityDashboardMenuGroup } from './qualityDashboardMenu.js'
import { safetyBoardMenuGroup } from './safetyBoardMenu.js'
import { settingsMenuGroups } from './settingsMenu.js'
import {
  smartSiteMenuGroup,
  siteConstructionMenuGroup,
  constructionQualityMenuGroup,
  hqSiteConstructionMenuGroup,
  aiAppMenuGroup,
} from './projectOpsMenu.js'

/**
 * 侧栏菜单：
 * - 指挥部：个人中心下 → 安全看板 → 质量看板 → 施工现场管理（二级：人员/巡检/机械/危大）
 * - 项目：个人中心下 → 智慧工地监管 / 施工现场管理 / 施工质量管控 / AI 应用
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
  constructionQualityMenuGroup,
  aiAppMenuGroup,
  cocAdminMenuGroup,
  basicDataMenuGroup,
  ...settingsMenuGroups,
]
