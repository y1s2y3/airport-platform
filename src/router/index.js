import { createRouter, createWebHashHistory } from 'vue-router'
import AdminLayout from '../layout/AdminLayout.vue'
import { basicDataRoutes } from '../config/basicDataMenu.js'
import { cocAdminRoutes } from '../config/cocAdminMenu.js'
import { settingsMenuGroups } from '../config/settingsMenu.js'
import { videoMonitorRoutes } from '../config/videoMonitorMenu.js'
import { vehicleRoutes } from '../config/vehicleMenu.js'

const engineeringLibraryPath = '/basic-data/engineering-library'

const laborRoutes = [
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
  { path: 'labor', redirect: '/labor/dashboard' },
]

const vehicleRouteComponents = {
  'vehicle-dashboard': () => import('../views/vehicle/VehicleDashboardView.vue'),
  'vehicle-access': () => import('../views/vehicle/VehicleAccessView.vue'),
  'vehicle-track': () => import('../views/vehicle/VehicleTrackView.vue'),
  'vehicle-registry': () => import('../views/vehicle/VehicleListView.vue'),
  'vehicle-device': () => import('../views/vehicle/VehicleDeviceView.vue'),
  'vehicle-warning-list': () => import('../views/vehicle/VehicleWarningListView.vue'),
}

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
        meta: { sidebarKey: 'workbench', tabKey: 'workbench', title: '首页' },
      },
      ...laborRoutes,
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
