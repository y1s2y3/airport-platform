<script setup>
import { computed } from 'vue'
import QmRectifyDetailView from '../../quality/QmRectifyDetailView.vue'

const props = defineProps({
  todo: { type: Object, required: true },
  isReadonly: { type: Boolean, default: false },
  onBack: { type: Function, default: null },
})

const rectifyId = computed(() => props.todo?.qmRectifyId || '')

function handleBack() {
  props.onBack?.()
}
</script>

<template>
  <QmRectifyDetailView
    embedded
    :rectify-id="rectifyId"
    :todo-id="todo?.id || ''"
    :readonly="isReadonly"
    @back="handleBack"
  />
</template>
