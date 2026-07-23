import { createRouter, createWebHashHistory } from 'vue-router'
import AdminLayout from '../layout/AdminLayout.vue'
import { basicDataRoutes } from '../config/basicDataMenu.js'
import { cocAdminRoutes } from '../config/cocAdminMenu.js'
import { settingsMenuGroups } from '../config/settingsMenu.js'
import { videoMonitorRoutes } from '../config/videoMonitorMenu.js'
import { vehicleRoutes } from '../config/vehicleMenu.js'
import {
  constructionSafetyRoutes,
  mobileSafetyRoutes,
  riskManageRoutes,
} from '../config/constructionSafetyMenu.js'
import { machineHazardRoutes } from '../config/machineHazardMenu.js'
import { qualityRoutes, qualityViewLoaders } from '../config/qualityMenu.js'

const engineeringLibraryPath = '/basic-data/engineering-library'

const laborRoutes = [
  { path: 'labor/realname-stats', name: 'LaborRealNameStats', component: () => import('../views/safety/LaborRealNameStatsView.vue'), meta: { sidebarKey: 'labor-realname-stats', tabKey: 'labor-realname-stats', title: '实名制统计' } },
  { path: 'labor/dashboard', name: 'LaborDashboard', component: () => import('../views/safety/LaborDashboardView.vue'), meta: { sidebarKey: 'labor-dashboard', tabKey: 'labor-dashboard', title: '劳务看板' } },
  { path: 'labor/realname', name: 'RealNamePersonnel', component: () => import('../views/safety/RealNamePersonnelView.vue'), meta: { sidebarKey: 'labor-realname', tabKey: 'labor-realname', title: '人员实名制' } },
  { path: 'labor/realname/form', name: 'RealNamePersonnelCreate', component: () => import('../views/safety/RealNamePersonnelFormView.vue'), meta: { sidebarKey: 'labor-realname', tabKey: 'labor-realname', title: '新增人员' } },
  { path: 'labor/realname/form/:id', name: 'RealNamePersonnelEdit', component: () => import('../views/safety/RealNamePersonnelFormView.vue'), meta: { sidebarKey: 'labor-realname', tabKey: 'labor-realname', title: '编辑人员' } },
  { path: 'labor/realname/:id', name: 'RealNamePersonnelDetail', component: () => import('../views/safety/RealNamePersonnelDetailView.vue'), meta: { sidebarKey: 'labor-realname', tabKey: 'labor-realname', title: '人员详情' } },
  { path: 'labor/personnel-track', name: 'LaborPersonnelTrack', component: () => import('../views/safety/LaborPersonnelTrackView.vue'), meta: { sidebarKey: 'labor-personnel-track', tabKey: 'labor-personnel-track', title: '人员轨迹' } },
  { path: 'labor/warning-config', name: 'LaborWarningConfig', component: () => import('../views/safety/LaborWarningConfigView.vue'), meta: { sidebarKey: 'labor-warning-config', tabKey: 'labor-warning-config', title: '实名制配置' } },
  { path: 'labor/warning-list', name: 'LaborWarningList', component: () => import('../views/safety/LaborWarningListView.vue'), meta: { sidebarKey: 'labor-warning-list', tabKey: 'labor-warning-list', title: '预警清单' } },
  { path: 'labor/warning-list/:id', name: 'LaborWarningDetail', component: () => import('../views/safety/LaborWarningDetailView.vue'), meta: { sidebarKey: 'labor-warning-list', tabKey: 'labor-warning-list', title: '预警详情' } },
  { path: 'labor/attendance-detail', name: 'LaborAttendanceDetail', component: () => import('../views/safety/LaborAttendanceDetailView.vue'), meta: { sidebarKey: 'labor-attendance-detail', tabKey: 'labor-attendance-detail', title: '考勤明细' } },
  { path: 'labor/attendance', name: 'LaborAttendanceStats', component: () => import('../views/safety/LaborAttendanceStatsView.vue'), meta: { sidebarKey: 'labor-attendance', tabKey: 'labor-attendance', title: '考勤统计' } },
  { path: 'labor/salary-compare', name: 'LaborSalaryCompare', component: () => import('../views/safety/LaborSalaryAttendanceCompareView.vue'), meta: { sidebarKey: 'labor-salary-compare', tabKey: 'labor-salary-compare', title: '工资考勤比对' } },
  { path: 'labor/device-manage', name: 'LaborDeviceManage', component: () => import('../views/safety/LaborDeviceManageView.vue'), meta: { sidebarKey: 'labor-device-manage', tabKey: 'labor-device-manage', title: '设备管理' } },
  { path: 'labor/blacklist', name: 'LaborBlacklist', component: () => import('../views/safety/LaborBlacklistView.vue'), meta: { sidebarKey: 'labor-blacklist', tabKey: 'labor-blacklist', title: '劳务黑名单' } },
  { path: 'labor', redirect: '/labor/attendance' },
]

const vehicleRouteComponents = {
  'vehicle-dashboard': () => import('../views/vehicle/VehicleDashboardView.vue'),
  'vehicle-access': () => import('../views/vehicle/VehicleAccessView.vue'),
  'vehicle-track': () => import('../views/vehicle/VehicleTrackView.vue'),
  'vehicle-registry': () => import('../views/vehicle/VehicleListView.vue'),
  'vehicle-device': () => import('../views/vehicle/VehicleDeviceView.vue'),
  'vehicle-warning-list': () => import('../views/vehicle/VehicleWarningListView.vue'),
}

const constructionSafetyRouteComponents = {
  'safety-dashboard': () => import('../views/safety/SafetyDashboardView.vue'),
  'safety-plan': () => import('../views/safety/InspectionPlanView.vue'),
  'safety-plan-create': () => import('../views/safety/InspectionPlanFormView.vue'),
  'safety-plan-edit': () => import('../views/safety/InspectionPlanFormView.vue'),
  'safety-plan-detail': () => import('../views/safety/InspectionPlanDetailView.vue'),
  'safety-check-items': () => import('../views/safety/SafetyCheckItemsView.vue'),
  'safety-task-manage': () => import('../views/safety/InspectionTaskManageView.vue'),
  'safety-task-detail': () => import('../views/safety/InspectionTaskDetailView.vue'),
  'safety-hazard': () => import('../views/safety/SafetyHazardListView.vue'),
  'safety-hazard-detail': () => import('../views/safety/SafetyHazardDetailView.vue'),
  'safety-risk': () => import('../views/safety/RiskManageView.vue'),
  'safety-risk-create': () => import('../views/safety/RiskManageFormView.vue'),
  'safety-risk-detail': () => import('../views/safety/RiskManageDetailView.vue'),
  'safety-risk-type-config': () => import('../views/safety/RiskTypeConfigView.vue'),
  'mobile-safety-inspection': () => import('../views/mobile/MobileTaskListView.vue'),
  'mobile-task-create': () => import('../views/mobile/MobileTaskCreateView.vue'),
  'mobile-task-execute': () => import('../views/mobile/MobileTaskExecuteView.vue'),
  'mobile-task-detail': () => import('../views/mobile/MobileTaskDetailView.vue'),
  'mobile-rectify': () => import('../views/mobile/MobileRectifyListView.vue'),
  'mobile-rectify-execute': () => import('../views/mobile/MobileRectifyExecuteView.vue'),
  'mobile-rectify-review': () => import('../views/mobile/MobileRectifyReviewView.vue'),
  'mobile-rectify-detail': () => import('../views/mobile/MobileRectifyDetailView.vue'),
}

const machineHazardRouteComponents = {
  'device-manage': () => import('../views/safety/DeviceManageView.vue'),
  'crane-monitor': () => import('../views/safety/CraneMonitorView.vue'),
  'lift-monitor': () => import('../views/safety/LiftMonitorView.vue'),
  'pile-monitor': () => import('../views/safety/PileMonitorView.vue'),
  'composite-monitor': () => import('../views/safety/CompositeMonitorView.vue'),
  'alert-record': () => import('../views/safety/AlertRecordView.vue'),
  'alert-config': () => import('../views/safety/AlertConfigView.vue'),
  'alert-config-add': () => import('../views/safety/AlertConfigFormView.vue'),
  'machine-entry-manage': () => import('../views/safety/MachineryLedgerView.vue'),
  'machine-type-maintain': () => import('../views/safety/MachineTypeMaintainView.vue'),
  'machine-entry': () => import('../views/safety/MachineEntryFormView.vue'),
  'machine-exit': () => import('../views/safety/MachineExitFormView.vue'),
  'machine-ledger-detail': () => import('../views/safety/MachineryLedgerDetailView.vue'),
  'deep-foundation-pit': () => import('../views/majorHazard/DeepFoundationPitView.vue'),
  'subway-protection': () => import('../views/majorHazard/SubwayProtectionView.vue'),
  'high-formwork': () => import('../views/majorHazard/HighFormworkView.vue'),
  'hazard-manage': () => import('../views/majorHazard/HazardManageView.vue'),
  'device-binding': () => import('../views/majorHazard/DeviceBindingView.vue'),
  'alert-record-major': () => import('../views/majorHazard/AlertRecordMajorView.vue'),
}

const mapMachineHazardRoute = (item) => ({
  path: item.path.replace(/^\//, ''),
  name: item.name,
  component: machineHazardRouteComponents[item.key],
  meta: {
    sidebarKey: item.sidebarKey || item.key,
    tabKey: item.sidebarKey || item.key,
    title: item.label,
  },
})

const mapConstructionSafetyRoute = (item) => ({
  path: item.path.replace(/^\//, ''),
  name: item.name,
  component: constructionSafetyRouteComponents[item.key],
  meta: {
    sidebarKey: item.sidebarKey || item.key,
    tabKey: item.sidebarKey || item.key,
    title: item.label,
  },
})

const vehicleRouteEntries = vehicleRoutes.map((item) => ({
  path: item.path.replace(/^\//, ''),
  name: item.name,
  component: vehicleRouteComponents[item.key],
  meta: { sidebarKey: item.key, tabKey: item.key, title: item.label, description: item.description },
}))

const legacyLaborRedirects = [
  { path: 'safety/labor/dashboard', redirect: '/labor/dashboard' },
  { path: 'safety/labor/realname', redirect: '/labor/realname' },
  { path: 'safety/labor/access', redirect: '/labor/warning-config' },
  { path: 'labor/access', redirect: '/labor/warning-config' },
  { path: 'safety/labor/attendance-detail', redirect: '/labor/attendance-detail' },
  { path: 'safety/labor/attendance', redirect: '/labor/attendance' },
  { path: 'safety/labor/blacklist', redirect: '/labor/blacklist' },
  { path: 'safety', redirect: '/labor/dashboard' },
]

const legacyEngineeringRedirects = [
  { path: 'basic-data/unit-project', redirect: engineeringLibraryPath },
  { path: 'basic-data/sub-unit', redirect: engineeringLibraryPath },
  { path: 'basic-data/division', redirect: engineeringLibraryPath },
  { path: 'basic-data/sub-division', redirect: engineeringLibraryPath },
  { path: 'basic-data/sub-item', redirect: engineeringLibraryPath },
]

const placeholder = (title, sidebarKey, tabKey = sidebarKey, description = '') => ({
  component: () => import('../views/PlaceholderView.vue'),
  meta: { sidebarKey, tabKey, title, description },
  props: (route) => ({
    title: route.meta.title,
    description: route.meta.description,
  }),
})

const basicDataRouteEntries = basicDataRoutes.flatMap((item) => {
  if (item.path === '/basic-data/project/info') {
    return [{
      path: item.path.replace(/^\//, ''),
      name: 'ProjectBasicInfo',
      component: () => import('../views/basicData/ProjectBasicInfoView.vue'),
      meta: { sidebarKey: item.key, tabKey: item.key, title: item.label },
    }]
  }
  if (item.path === '/basic-data/project/subcontractor') {
    return [
      {
        path: item.path.replace(/^\//, ''),
        name: 'SubcontractorList',
        component: () => import('../views/basicData/SubcontractorListView.vue'),
        meta: { sidebarKey: item.key, tabKey: item.key, title: item.label },
      },
      {
        path: 'basic-data/project/subcontractor/:id',
        name: 'SubcontractorDetail',
        component: () => import('../views/basicData/SubcontractorDetailView.vue'),
        meta: { sidebarKey: item.key, tabKey: item.key, title: '分包单位详情' },
      },
    ]
  }
  if (item.path === engineeringLibraryPath) {
    return [{
      path: item.path.replace(/^\//, ''),
      name: 'EngineeringLibrary',
      component: () => import('../views/basicData/EngineeringLibraryTreeView.vue'),
      meta: { sidebarKey: item.key, tabKey: item.key, title: item.label },
    }]
  }
  return [{
    path: item.path.replace(/^\//, ''),
    ...placeholder(item.label, item.key, item.key, item.description),
  }]
})

const settingsRouteComponents = {
  '/settings/org': () => import('../views/settings/OrgStructureView.vue'),
  '/settings/user': () => import('../views/settings/UserManageView.vue'),
  '/settings/role': () => import('../views/settings/RoleManageView.vue'),
  '/settings/position': () => import('../views/settings/PositionManageView.vue'),
  '/settings/menu': () => import('../views/settings/MenuManageView.vue'),
  '/logs/system': () => import('../views/logs/SystemLogView.vue'),
  '/logs/login': () => import('../views/logs/LoginLogView.vue'),
  '/logs/operation': () => import('../views/logs/OperationLogView.vue'),
}

const settingsRoutes = settingsMenuGroups.flatMap((group) =>
  group.children.map((item) => {
    const loader = settingsRouteComponents[item.path]
    if (loader) {
      return {
        path: item.path.replace(/^\//, ''),
        name: item.key.replace(/-/g, '_').replace(/^sys_/, 'Sys').replace(/^(\w)/, (m) => m.toUpperCase()),
        component: loader,
        meta: { sidebarKey: item.key, tabKey: item.key, title: item.label },
      }
    }
    return {
      path: item.path.replace(/^\//, ''),
      ...placeholder(item.label, item.key, item.key, item.description),
    }
  }),
)

const routes = [
  {
    path: '/coc',
    name: 'CocScreen',
    component: () => import('../views/CocScreenView.vue'),
    meta: { title: 'COC 调度中心' },
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/workbench',
    children: [
      {
        path: 'workbench',
        name: 'Workbench',
        component: () => import('../views/WorkbenchView.vue'),
        meta: { sidebarKey: 'workbench', tabKey: 'workbench', title: '工作台' },
      },
      {
        path: 'personal-center',
        name: 'PersonalCenter',
        component: () => import('../views/PersonalCenterView.vue'),
        meta: { sidebarKey: 'personal-center', tabKey: 'personal-center', title: '个人中心' },
      },
      {
        path: 'personal-center/todo/handle',
        name: 'PersonalCenterTodoHandle',
        component: () => import('../views/PersonalCenterTodoHandleView.vue'),
        meta: {
          sidebarKey: 'personal-center',
          tabKey: 'personal-center',
          title: '流程详情',
        },
      },
      ...laborRoutes,
      ...constructionSafetyRoutes.map(mapConstructionSafetyRoute),
      ...riskManageRoutes.map(mapConstructionSafetyRoute),
      ...mobileSafetyRoutes.map(mapConstructionSafetyRoute),
      ...machineHazardRoutes.map(mapMachineHazardRoute),
      { path: 'major-hazard/alert-config', redirect: '/major-hazard/alert-record' },
      ...vehicleRouteEntries,
      { path: 'vehicle', redirect: '/vehicle/dashboard' },
      ...legacyLaborRedirects,
      ...legacyEngineeringRedirects,
      ...videoMonitorRoutes.map((item) => ({
        path: item.path.replace(/^\//, ''),
        name: item.name,
        component: () => import('../views/videoMonitor/VideoMonitorPageView.vue'),
        meta: {
          sidebarKey: item.key,
          tabKey: item.key,
          title: item.label,
          description: item.description,
          videoMonitorKey: item.key,
        },
      })),
      { path: 'video-monitor/list', redirect: '/video-monitor/preview' },
      { path: 'video-monitor/device', redirect: '/video-monitor/device-ledger' },
      ...cocAdminRoutes.map((item) => ({
        path: item.path.replace(/^\//, ''),
        name: item.name,
        component: () => import('../views/cocAdmin/CocAdminPageView.vue'),
        meta: {
          sidebarKey: item.key,
          tabKey: item.key,
          title: item.label,
          description: item.description,
          roles: item.roles,
          cocAdminKey: item.key,
        },
      })),
      ...qualityRoutes.map((item) => ({
        path: item.path.replace(/^\//, ''),
        name: item.name,
        component: qualityViewLoaders[item.component],
        meta: {
          sidebarKey: item.sidebarKey || item.key,
          tabKey: item.sidebarKey || item.key,
          title: item.label,
          description: item.description,
        },
      })),
      ...basicDataRouteEntries,
      ...settingsRoutes,
      {
        path: 'settings/user/form',
        name: 'SysUserCreate',
        component: () => import('../views/settings/UserManageFormView.vue'),
        meta: { sidebarKey: 'sys-user', tabKey: 'sys-user', title: '新增用户' },
      },
      {
        path: 'settings/user/form/:id',
        name: 'SysUserEdit',
        component: () => import('../views/settings/UserManageFormView.vue'),
        meta: { sidebarKey: 'sys-user', tabKey: 'sys-user', title: '编辑用户' },
      },
      {
        path: 'settings/user/:id',
        name: 'SysUserDetail',
        component: () => import('../views/settings/UserManageDetailView.vue'),
        meta: { sidebarKey: 'sys-user', tabKey: 'sys-user', title: '用户详情' },
      },
      {
        path: 'settings/role/form',
        name: 'SysRoleCreate',
        component: () => import('../views/settings/RoleManageFormView.vue'),
        meta: { sidebarKey: 'sys-role', tabKey: 'sys-role', title: '角色新增' },
      },
      {
        path: 'settings/role/form/:id',
        name: 'SysRoleEdit',
        component: () => import('../views/settings/RoleManageFormView.vue'),
        meta: { sidebarKey: 'sys-role', tabKey: 'sys-role', title: '角色编辑' },
      },
    ],
  },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
