<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Array], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择人员（可多选）' },
})
const emit = defineEmits(['update:modelValue'])
const selected = computed({
  get: () => Array.isArray(props.modelValue) ? props.modelValue : props.modelValue.split('、').filter(Boolean),
  set: value => emit('update:modelValue', value.join('、')),
})
const candidates = computed(() => [...new Set([...props.options, ...selected.value])])
</script>

<template>
  <el-select v-model="selected" multiple filterable :placeholder="placeholder" class="person-multi-select">
    <el-option v-for="person in candidates" :key="person" :label="person" :value="person" />
  </el-select>
</template>

<style scoped>
.person-multi-select { flex:1; min-width:0; width:100%; }
.person-multi-select :deep(.el-select__wrapper) { min-height:36px; border-radius:8px; }
.person-multi-select :deep(.el-select__selection) { min-width:0; }
.person-multi-select :deep(.el-tag) { max-width:100%; height:auto; min-height:24px; }
.person-multi-select :deep(.el-tag__content) { white-space:normal; overflow-wrap:anywhere; }
</style>
