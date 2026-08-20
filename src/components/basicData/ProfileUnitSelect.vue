<script setup>
import { computed } from 'vue'
import {
  listProfileContractorUnits,
  listProfileSupervisorUnits,
  listProfileSubcontractorUnits,
} from '../../mock/profilePortraitOptions'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  projectId: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    default: 'contractor',
    validator: (value) => ['contractor', 'supervisor', 'subcontractor'].includes(value),
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: '请选择或搜索',
  },
})

const emit = defineEmits(['update:modelValue'])

const options = computed(() => {
  if (props.role === 'supervisor') return listProfileSupervisorUnits(props.projectId)
  if (props.role === 'subcontractor') return listProfileSubcontractorUnits(props.projectId)
  return listProfileContractorUnits(props.projectId)
})

const unitOptions = computed(() => {
  const map = new Map()
  for (const name of options.value) {
    map.set(name, name)
  }
  const current = String(props.modelValue || '').trim()
  if (current && !map.has(current)) {
    map.set(current, current)
  }
  return [...map.values()]
})

const selected = computed({
  get() {
    return props.modelValue || ''
  },
  set(value) {
    emit('update:modelValue', value || '')
  },
})

const displayText = computed(() => selected.value || '—')
</script>

<template>
  <span v-if="readonly" class="unit-text">{{ displayText }}</span>
  <el-select
    v-else
    v-model="selected"
    class="unit-select"
    filterable
    clearable
    :placeholder="placeholder" aria-label="placeholder">
    <el-option v-for="name in unitOptions" :key="name" :label="name" :value="name" />
  </el-select>
</template>

<style scoped>
.unit-select {
  width: 100%;
}

.unit-text {
  padding: 2px 4px;
  line-height: 1.5;
  word-break: break-all;
}
</style>
