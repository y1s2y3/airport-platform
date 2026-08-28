import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  findPersonalProcess,
  resolveWarningCenterHandle,
  resolveModuleWarningCenterHandle,
} from '../../../mock/personalCenter.js'
import { resolveEmbedTypeFromContext } from '../todoHandlers/registry.js'

const FROM_TABS = new Set(['todo', 'done', 'started', 'cc', 'warning-center'])

/**
 * 个人中心待办处理页上下文：解析路由 query、待办记录与只读态。
 */
export function useTodoHandleContext() {
  const route = useRoute()

  const fromTab = computed(() => {
    const from = String(route.query.from || 'todo')
    return FROM_TABS.has(from) ? from : 'todo'
  })

  const todoId = computed(() => String(route.query.id || ''))
  const warningId = computed(() => String(route.query.warningId || ''))

  const todo = computed(() => {
    if (todoId.value) {
      const listFrom = fromTab.value === 'warning-center' ? 'todo' : fromTab.value
      const process = findPersonalProcess(todoId.value, listFrom)
      if (process) return process
      // 预警中心：AI / 机械 / 危大等非人员实名条目
      if (fromTab.value === 'warning-center') {
        return resolveModuleWarningCenterHandle(todoId.value)
      }
    }
    if (warningId.value && fromTab.value === 'warning-center') {
      return resolveWarningCenterHandle(warningId.value)
    }
    return null
  })

  const isReadonly = computed(() => {
    if (fromTab.value === 'warning-center') {
      return todo.value?.warnCenterReadonly !== false
    }
    return fromTab.value !== 'todo'
  })

  const pageTitle = computed(() => {
    // 模块预警（AI / 机械 / 危大）二级页文案与通用待办区分
    if (todo.value?.type === 'module_warning') {
      return isReadonly.value ? '预警详情' : '预警处置'
    }
    return isReadonly.value ? '详情' : '待办处理'
  })
  const emptyText = computed(() =>
    isReadonly.value ? '记录不存在或已删除' : '待办不存在或已处理',
  )

  const embedType = computed(() =>
    resolveEmbedTypeFromContext({
      todoType: todo.value?.type,
      warningId: warningId.value,
      fromTab: fromTab.value,
    }),
  )

  return {
    route,
    fromTab,
    todoId,
    warningId,
    todo,
    isReadonly,
    pageTitle,
    emptyText,
    embedType,
  }
}
