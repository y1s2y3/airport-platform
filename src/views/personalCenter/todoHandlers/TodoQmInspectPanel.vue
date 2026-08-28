<script setup>
import { computed } from 'vue'
import QmTaskApprove from '../../quality/components/QmTaskApprove.vue'

const props = defineProps({
  todo: { type: Object, required: true },
  isReadonly: { type: Boolean, default: false },
  onBack: { type: Function, default: null },
})

const taskId = computed(() => props.todo?.qmTaskId || '')
const approvePath = computed(() => props.todo?.approvePath || '/qm/inspect/batch/approve')
const editPath = computed(() => approvePath.value.replace(/\/approve$/, '/edit'))
const listPath = computed(() => {
  const path = approvePath.value
  if (path.includes('/special/')) return '/qm/inspect/special-deep'
  if (path.includes('/complete/')) return '/qm/inspect/complete-deep'
  return '/qm/inspect/form-fill-deep'
})

function handleFinished() {
  props.onBack?.()
}

function handleBack() {
  props.onBack?.()
}
</script>

<template>
  <QmTaskApprove
    embedded
    title="质量验评审批"
    :task-id="taskId"
    :todo-id="todo?.id || ''"
    :readonly="isReadonly"
    :list-path="listPath"
    :edit-path="editPath"
    @back="handleBack"
    @finished="handleFinished"
  />
</template>
