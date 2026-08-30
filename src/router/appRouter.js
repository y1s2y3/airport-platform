/**
 * 建管 APP 专用路由（独立 HTML 打包）
 * 与主站 router/index.js 中 /app 段保持一致。
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import { appLoggedIn, hydrateAppSession } from '../mock/appSession.js'

const APP_DOC_TITLE = '建管 APP · 智慧工程建设管控一体化平台'

const routes = [
  {
    path: '/',
    redirect: '/app/login',
  },
  {
    path: '/app/login',
    name: 'AppLogin',
    component: () => import('../views/app/AppLoginView.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/app',
    component: () => import('../views/app/AppShellView.vue'),
    redirect: '/app/personal',
    children: [
      {
        path: 'personal',
        name: 'AppPersonal',
        component: () => import('../views/app/AppPersonalCenterView.vue'),
        meta: { title: '个人中心' },
      },
      {
        path: 'todo/handle',
        name: 'AppTodoHandle',
        component: () => import('../views/app/AppTodoHandleView.vue'),
        meta: { title: '处置详情', hideTabBar: true, appPersonal: true },
      },
      {
        path: 'warning/:id',
        name: 'AppWarningDetail',
        component: () => import('../views/app/AppWarningDetailView.vue'),
        meta: { title: '预警详情', hideTabBar: true, appPersonal: true },
      },
      {
        path: 'biz',
        name: 'AppBiz',
        component: () => import('../views/app/AppBizHomeView.vue'),
        meta: { title: '业务功能' },
      },
      {
        path: 'mine',
        name: 'AppMine',
        component: () => import('../views/app/AppMineView.vue'),
        meta: { title: '我的' },
      },
      {
        path: 'video',
        name: 'AppVideo',
        component: () => import('../views/app/AppVideoCenterView.vue'),
        meta: { title: '视频中心', hideTabBar: true, appBiz: true },
      },
      {
        path: 'tasks',
        name: 'AppTasks',
        component: () => import('../views/app/AppBizTasksView.vue'),
        meta: { title: '巡检管理', hideTabBar: true, appBiz: true },
      },
      {
        path: 'rectify',
        name: 'AppRectify',
        component: () => import('../views/app/AppBizRectifyView.vue'),
        meta: { title: '整改复查', hideTabBar: true, appBiz: true },
      },
      {
        path: 'mat/entry',
        name: 'AppMatEntry',
        component: () => import('../views/app/AppBizMatEntryView.vue'),
        meta: { title: '材料设备进场', hideTabBar: true, appBiz: true },
      },
      {
        path: 'mat/exit',
        name: 'AppMatExit',
        component: () => import('../views/app/AppBizMatExitView.vue'),
        meta: { title: '材料设备退场', hideTabBar: true, appBiz: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/app/login',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  if (!to.path.startsWith('/app')) return true
  hydrateAppSession()
  const isLogin = to.path === '/app/login'
  if (!isLogin && !appLoggedIn.value) {
    return { path: '/app/login', replace: true }
  }
  if (isLogin && appLoggedIn.value && to.query.force !== '1') {
    return { path: '/app/personal', replace: true }
  }
  return true
})

router.afterEach((to) => {
  const pageTitle = [...to.matched].reverse().find((record) => record.meta?.title)?.meta?.title
  document.title = pageTitle ? `${pageTitle} · ${APP_DOC_TITLE}` : APP_DOC_TITLE
})

export default router
