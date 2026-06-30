import { createRouter, createWebHashHistory } from 'vue-router'
import AdminLayout from '../layout/AdminLayout.vue'
import { basicDataRoutes } from '../config/basicDataMenu.js'
import { cocAdminRoutes } from '../config/cocAdminMenu.js'
import { settingsMenuGroups } from '../config/settingsMenu.js'

const engineeringLibraryPath = '/basic-data/engineering-library'

const laborRoutes = [
  { path: 'labor/dashboard', name: 'LaborDashboard', component: () => import('../views/safety/LaborDashboardView.vue'), meta: { sidebarKey: 'labor-dashboard', tabKey: 'labor-dashboard', title: '劳务看板' } },
  { path: 'labor/realname', name: 'RealNamePersonnel', component: () => import('../views/safety/RealNamePersonnelView.vue'), meta: { sidebarKey: 'labor-realname', tabKey: 'labor-realname', title: '人员实名制' } },
  { path: 'labor/access', name: 'LaborAccess', component: () => import('../views/safety/LaborAccessView.vue'), meta: { sidebarKey: 'labor-access', tabKey: 'labor-access', title: '准入核验' } },
  { path: 'labor/attendance-detail', name: 'LaborAttendanceDetail', component: () => import('../views/safety/LaborAttendanceDetailView.vue'), meta: { sidebarKey: 'labor-attendance-detail', tabKey: 'labor-attendance-detail', title: '考勤明细' } },
  { path: 'labor/attendance', name: 'LaborAttendanceStats', component: () => import('../views/safety/LaborAttendanceStatsView.vue'), meta: { sidebarKey: 'labor-attendance', tabKey: 'labor-attendance', title: '考勤统计' } },
  { path: 'labor/blacklist', name: 'LaborBlacklist', component: () => import('../views/safety/LaborBlacklistView.vue'), meta: { sidebarKey: 'labor-blacklist', tabKey: 'labor-blacklist', title: '劳务黑名单' } },
  { path: 'labor', redirect: '/labor/dashboard' },
]

const legacyLaborRedirects = [
  { path: 'safety/labor/dashboard', redirect: '/labor/dashboard' },
  { path: 'safety/labor/realname', redirect: '/labor/realname' },
  { path: 'safety/labor/access', redirect: '/labor/access' },
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
  '/settings/permission': () => import('../views/settings/PermissionManageView.vue'),
  '/settings/menu': () => import('../views/settings/MenuManageView.vue'),
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
      ...legacyLaborRedirects,
      ...legacyEngineeringRedirects,
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
    ],
  },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
