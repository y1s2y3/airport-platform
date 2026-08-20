<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 999999,
  },
  precision: {
    type: Number,
    default: 0,
  },
  unit: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '请输入',
  },
})

const emit = defineEmits(['update:modelValue'])

const numericValue = computed({
  get() {
    const raw = props.modelValue
    if (raw === '' || raw === null || raw === undefined) return null
    const num = Number(raw)
    return Number.isFinite(num) ? num : null
  },
  set(value) {
    if (value === null || value === undefined || value === '') {
      emit('update:modelValue', '')
      return
    }
    emit('update:modelValue', String(value))
  },
})

const displayText = computed(() => {
  if (props.modelValue === '' || props.modelValue === null || props.modelValue === undefined) return '—'
  return props.unit ? `${props.modelValue}${props.unit}` : String(props.modelValue)
})
</script>

<template>
  <span v-if="readonly" class="number-text">{{ displayText }}</span>
  <el-input-number
    v-else
    v-model="numericValue"
    class="number-input"
    :min="min"
    :max="max"
    :precision="precision"
    :controls="false"
    :placeholder="placeholder" aria-label="placeholder"/>
</template>

<style scoped>
.number-input {
  width: 100%;
}

.number-input :deep(.el-input__wrapper) {
  padding-left: 8px;
  padding-right: 8px;
}

.number-text {
  padding: 2px 4px;
  line-height: 1.5;
}
</style>
