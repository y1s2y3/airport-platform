import { computed } from 'vue'
import { useRoute } from 'vue-router'

/**
 * 建管 APP（/app/*）与桌面端「移动端」菜单（/mobile/*）共用同一套页面组件。
 * 这里按当前路由前缀给出跳转基路径，避免在 APP 内点击卡片/返回时跳出 APP 外壳。
 */
export function useMobileRouteBase() {
  const route = useRoute()
  const inApp = computed(() => route.path.startsWith('/app/'))
  return {
    inApp,
    /** 巡检管理基路径 */
    tasksBase: computed(() => (inApp.value ? '/app/tasks' : '/mobile/tasks')),
    /** 整改复查基路径 */
    rectifyBase: computed(() => (inApp.value ? '/app/rectify' : '/mobile/rectify')),
    /** 危大清单基路径 */
    hazardBase: computed(() => (inApp.value ? '/app/hazard' : '/mobile/hazard')),
    /** 上一级：APP 内回到业务功能，桌面端回到工作台 */
    bizHome: computed(() => (inApp.value ? '/app/biz' : '/')),
  }
}
