<script setup>
import { computed } from 'vue'
import { listProfileConstructionSites } from '../../mock/profilePortraitOptions'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  projectId: {
    type: String,
    default: '',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const siteOptions = computed(() => {
  const map = new Map()
  for (const name of listProfileConstructionSites(props.projectId)) {
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
  <span v-if="readonly" class="site-text">{{ displayText }}</span>
  <el-select
    v-else
    v-model="selected"
    class="site-select"
    filterable
    clearable
    placeholder="请选择或搜索施工地点" aria-label="请选择或搜索施工地点">
    <el-option v-for="name in siteOptions" :key="name" :label="name" :value="name" />
  </el-select>
</template>

<style scoped>
.site-select {
  width: 100%;
}

.site-text {
  padding: 2px 4px;
  line-height: 1.5;
  word-break: break-all;
}
</style>
