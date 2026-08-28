import { createRouter, createWebHashHistory } from 'vue-router'
import AdminLayout from '../layout/AdminLayout.vue'
import { buildRoutes, redirects } from '../config/menu'
import { HQ_PROJECT_OPTION } from '../config/projectOptions'
import { selectedProjectId } from '../composables/useCurrentProject'
import { resolveHqLevelPathRedirect } from './hqLevelPathRedirect'

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
      ...buildRoutes(),
      ...redirects.map((r) => ({
        path: r.path.replace(/^\//, ''),
        redirect: r.redirect,
      })),
    ],
  },
]

const APP_DOC_TITLE = '智慧工程建设管控一体化平台'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  const isHqSelected = selectedProjectId.value === HQ_PROJECT_OPTION.id
  const redirectTarget = resolveHqLevelPathRedirect(to, isHqSelected)
  if (redirectTarget) return redirectTarget
  return true
})

router.afterEach((to) => {
  const pageTitle = [...to.matched].reverse().find((record) => record.meta?.title)?.meta?.title
  document.title = pageTitle ? `${pageTitle} · ${APP_DOC_TITLE}` : APP_DOC_TITLE
})

export default router
