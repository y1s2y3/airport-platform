<script setup>
import { computed } from 'vue'
import LaborWarningDetailView from '../../safety/LaborWarningDetailView.vue'

const props = defineProps({
  todo: { type: Object, default: null },
  warningId: { type: String, default: '' },
  fromTab: { type: String, default: 'todo' },
  isReadonly: { type: Boolean, default: false },
  onBack: { type: Function, default: null },
})

const resolvedWarningId = computed(
  () => props.warningId || props.todo?.laborWarningId || '',
)
const resolvedTodoId = computed(() => props.todo?.id || '')
const personalTab = computed(() => {
  if (props.fromTab === 'warning-center') return 'warning-center'
  return props.fromTab === 'done' ? 'done' : 'todo'
})

function handleBack() {
  props.onBack?.()
}
</script>

<template>
  <LaborWarningDetailView
    embedded
    :warning-id="resolvedWarningId"
    :todo-id="resolvedTodoId"
    :personal-tab="personalTab"
    :readonly="isReadonly"
    @back="handleBack"
  />
</template>
