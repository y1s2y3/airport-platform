<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodoHandleContext } from './personalCenter/composables/useTodoHandleContext.js'
import TodoHandleShell from './personalCenter/components/TodoHandleShell.vue'
import TodoApprovalFlowSection from './personalCenter/components/TodoApprovalFlowSection.vue'
import SubcontractorApprovalFlow from '../components/basicData/SubcontractorApprovalFlow.vue'
import {
  resolveTodoHandlerMeta,
  resolveCommonApprovePanel,
  COMMON_APPROVE_TYPES,
} from './personalCenter/todoHandlers/registry.js'
import {
  buildPenaltyApprovalFlow,
  buildDispatchHazardApprovalFlow,
} from '../mock/personalCenter.js'
import { findSubcontractorApplication } from '../mock/subcontractorManagement.js'
import {
  resolveBrandTodoAssigneeUserId,
} from '../mock/brand.js'
import {
  getCurrentUserSnapshot,
  getEffectiveUserId,
} from '../mock/currentUser.js'
import './personalCenter/styles/todoHandleBlocks.css'

const router = useRouter()
const route = useRoute()

const {
  fromTab,
  warningId,
  todoId,
  todo,
  isReadonly,
  pageTitle,
  emptyText,
  embedType,
} = useTodoHandleContext()

const handlerMeta = computed(() =>
  resolveTodoHandlerMeta({
    todoType: todo.value?.type,
    embedType: embedType.value,
  }),
)

const commonApprovePanel = resolveCommonApprovePanel()

const showCommonApprove = computed(() => {
  if (isReadonly.value || !todo.value || handlerMeta.value?.kind !== 'detail') return false
  if (!COMMON_APPROVE_TYPES.has(todo.value.type)) return false
  if (todo.value.type === 'brand' && !brandCanApprove.value) return false
  return true
})

const brandAssigneeUserId = computed(() =>
  todo.value?.type === 'brand' ? resolveBrandTodoAssigneeUserId(todo.value) : '',
)

const brandCanApprove = computed(() => {
  if (todo.value?.type !== 'brand') return true
  if (!brandAssigneeUserId.value) return true
  return getEffectiveUserId(getCurrentUserSnapshot()) === brandAssigneeUserId.value
})

const subcontractorLiveDetail = computed(() => {
  const id = todo.value?.subcontractorApplicationId
  if (!id || todo.value?.type !== 'subcontractor') return null
  return findSubcontractorApplication(id)
})

const approvalFlow = computed(() => {
  if (!todo.value) return []
  if (todo.value.type === 'penalty') return buildPenaltyApprovalFlow(todo.value)
  if (todo.value.type === 'dispatch_hazard') return buildDispatchHazardApprovalFlow(todo.value)
  if (todo.value.type === 'subcontractor' && subcontractorLiveDetail.value?.approvalFlow?.length) {
    return subcontractorLiveDetail.value.approvalFlow
  }
  return todo.value.approvalFlow || []
})

const todoSourceLabel = computed(() => {
  if (!todo.value) return ''
  if (todo.value.sourceLabel) return todo.value.sourceLabel
  if (todo.value.category) return todo.value.category
  const typeLabels = {
    penalty: '处罚单',
    dispatch_hazard: '调度隐患',
    brand: '品牌报审',
    subcontractor: '分包报审',
    sample: '样板管理',
    mat_entry: '材料设备进场',
    eq_entry: '材料设备进场',
    asbuilt: '实模一致验收',
    qm_inspect: '质量验评',
    qm_rectify: '质量验评',
    labor_warning: '人员预警',
    module_warning: todo.value.sourceLabel || '预警中心',
    inspection: '巡检管理',
  }
  if (typeLabels[todo.value.type]) return typeLabels[todo.value.type]
  const pn = todo.value.processName || ''
  if (pn.startsWith('品牌报审')) return '品牌报审'
  if (pn.startsWith('质量验评')) return '质量验评'
  if (pn.startsWith('巡检任务') || pn.startsWith('隐患整改')) return '巡检管理'
  if (pn.startsWith('调度隐患')) return '调度隐患'
  if (pn.startsWith('处罚单')) return '处罚单'
  return '流程'
})

function goBack() {
  const tab = fromTab.value
  // 建管 APP 壳内处置页：返回 APP 个人中心
  if (route.path.startsWith('/app')) {
    const q =
      tab === 'todo'
        ? {}
        : tab === 'warning-center'
          ? { tab: 'warning-center' }
          : { tab }
    router.push({ path: '/app/personal', query: q })
    return
  }
  router.push({
    path: '/personal-center',
    query: tab === 'todo' ? {} : { tab },
  })
}
</script>

<template>
  <TodoHandleShell
    :page-title="pageTitle"
    :todo-source-label="todoSourceLabel"
    :process-name="todo?.processName || ''"
    :is-readonly="isReadonly"
    :page-class="todo?.type === 'brand' ? 'is-brand' : ''"
    @back="goBack"
  >
    <el-empty v-if="!todo && !handlerMeta" :description="emptyText" :image-size="80">
      <el-button type="primary" @click="goBack">返回</el-button>
    </el-empty>

    <template v-else-if="handlerMeta?.kind === 'embed' && todo">
      <component
        :is="handlerMeta.component"
        :todo="todo"
        :warning-id="warningId"
        :from-tab="fromTab"
        :is-readonly="isReadonly"
        :on-back="goBack"
      />
      <SubcontractorApprovalFlow
        v-if="todo.type === 'subcontractor'"
        panel
        :approval-flow="approvalFlow"
      />
      <TodoApprovalFlowSection
        v-else-if="todo.type !== 'qm_inspect' && todo.type !== 'module_warning' && todo.type !== 'labor_warning'"
        :approval-flow="approvalFlow"
        :is-inspection="false"
      />
    </template>

    <template v-else-if="todo">
      <component
        :is="handlerMeta.component"
        v-if="handlerMeta?.kind === 'full'"
        :todo="todo"
        :todo-id="todoId"
        :is-readonly="isReadonly"
        @back="goBack"
      />

      <template v-else-if="handlerMeta?.kind === 'detail'">
        <component :is="handlerMeta.component" :todo="todo" />

        <el-alert
          v-if="todo.type === 'brand' && !isReadonly && brandAssigneeUserId && !brandCanApprove"
          type="warning"
          :closable="false"
          show-icon
          class="brand-assignee-alert"
          title="无法办理"
          description="当前登录用户不是本单指定审批人"
        />

        <component
          :is="commonApprovePanel"
          v-if="showCommonApprove"
          :todo="todo"
          :todo-id="todoId"
          @back="goBack"
        />
      </template>

      <SubcontractorApprovalFlow
        v-if="todo.type === 'subcontractor'"
        panel
        :approval-flow="approvalFlow"
      />
      <TodoApprovalFlowSection
        v-else
        :approval-flow="approvalFlow"
        :is-inspection="todo.type === 'inspection'"
      />
    </template>
  </TodoHandleShell>
</template>

<style scoped>
:deep(.handle-page.is-brand) {
  padding-bottom: 24px;
  max-width: 980px;
}
.brand-assignee-alert {
  margin-bottom: 12px;
}
</style>
