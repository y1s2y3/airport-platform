import { defineAsyncComponent } from 'vue'
import TodoHandlerLoading from '../components/TodoHandlerLoading.vue'

/**
 * 个人中心待办 Handler 统一注册表。
 *
 * kind 说明：
 * - embed：内嵌业务模块处置（质量验评 / 人员预警等），不再外跳
 * - detail：仅详情区，审批走 TodoCommonApprovePanel
 * - full：详情 + 操作一体
 */
export const TODO_HANDLER_REGISTRY = {
  qm_inspect: { kind: 'embed', loader: () => import('./TodoQmInspectPanel.vue') },
  qm_rectify: { kind: 'embed', loader: () => import('./TodoQmRectifyPanel.vue') },
  labor_warning: { kind: 'embed', loader: () => import('./TodoLaborWarningPanel.vue') },
  module_warning: { kind: 'embed', loader: () => import('./TodoModuleWarningPanel.vue') },
  brand: { kind: 'detail', loader: () => import('./TodoBrandPanel.vue') },
  sample: { kind: 'detail', loader: () => import('./TodoSamplePanel.vue') },
  asbuilt: { kind: 'detail', loader: () => import('./TodoAsbuiltPanel.vue') },
  subcontractor: { kind: 'detail', loader: () => import('./TodoSubcontractorPanel.vue') },
  mat_entry: { kind: 'detail', loader: () => import('./TodoMatEqEntryPanel.vue') },
  eq_entry: { kind: 'detail', loader: () => import('./TodoMatEqEntryPanel.vue') },
  inspection: { kind: 'full', loader: () => import('./TodoInspectionPanel.vue') },
  penalty: { kind: 'full', loader: () => import('./TodoPenaltyPanel.vue') },
  dispatch_hazard: { kind: 'full', loader: () => import('./TodoDispatchHazardPanel.vue') },
}

/** 通用通过/驳回面板（detail 类待办共用） */
export const COMMON_APPROVE_PANEL_LOADER = () => import('./TodoCommonApprovePanel.vue')

/** 使用通用通过/驳回表单的待办类型 */
export const COMMON_APPROVE_TYPES = new Set([
  'brand',
  'sample',
  'subcontractor',
  'mat_entry',
  'eq_entry',
  'asbuilt',
])

const asyncComponentCache = new Map()

function getLazyComponent(cacheKey, loader) {
  if (!asyncComponentCache.has(cacheKey)) {
    asyncComponentCache.set(
      cacheKey,
      defineAsyncComponent({
        loader,
        loadingComponent: TodoHandlerLoading,
        delay: 120,
        timeout: 30_000,
      }),
    )
  }
  return asyncComponentCache.get(cacheKey)
}

/**
 * 解析当前待办应加载的 Handler（异步组件 + kind）。
 * @returns {{ key: string, kind: 'embed'|'detail'|'full', component: import('vue').Component } | null}
 */
export function resolveTodoHandlerMeta({ todoType, embedType }) {
  const key = embedType || todoType
  if (!key) return null

  const entry = TODO_HANDLER_REGISTRY[key]
  if (!entry) return null

  if (embedType) {
    if (entry.kind !== 'embed') return null
    return {
      key,
      kind: 'embed',
      component: getLazyComponent(`handler:embed:${key}`, entry.loader),
    }
  }

  if (entry.kind === 'embed') {
    return {
      key,
      kind: 'embed',
      component: getLazyComponent(`handler:embed:${key}`, entry.loader),
    }
  }
  if (entry.kind === 'full') {
    return {
      key,
      kind: 'full',
      component: getLazyComponent(`handler:full:${key}`, entry.loader),
    }
  }
  if (entry.kind === 'detail') {
    return {
      key,
      kind: 'detail',
      component: getLazyComponent(`handler:detail:${key}`, entry.loader),
    }
  }
  return null
}

/** 懒加载通用审批面板（与 detail 类搭配） */
export function resolveCommonApprovePanel() {
  return getLazyComponent('handler:common-approve', COMMON_APPROVE_PANEL_LOADER)
}

/** 是否为 embed 类待办（内嵌处置、不外跳业务模块） */
export function isEmbedHandlerKey(key) {
  return TODO_HANDLER_REGISTRY[key]?.kind === 'embed'
}

/**
 * 从路由上下文解析 embed 类型（与 TODO_HANDLER_REGISTRY 对齐）。
 */
export function resolveEmbedTypeFromContext({ todoType, warningId, fromTab }) {
  if (todoType === 'module_warning') return 'module_warning'
  if (warningId && fromTab === 'warning-center') return 'labor_warning'
  if (todoType && isEmbedHandlerKey(todoType)) return todoType
  return null
}
