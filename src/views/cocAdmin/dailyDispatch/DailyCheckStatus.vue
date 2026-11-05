<script setup>
import { computed } from 'vue'
const props = defineProps({ status: String, count: Number })
const states = { normal: { label: '正常', type: 'success' }, problem: { label: '发现问题', type: 'warning' }, other: { label: '其他', type: 'info' } }
const state = computed(() => states[props.status])
</script>
<template>
  <span v-if="state" class="daily-check-status">
    <el-tag :class="'daily-result-' + status" :type="state.type" effect="light" size="small">{{ state.label }}</el-tag>
    <span v-if="status === 'problem' && Number.isFinite(count)" class="daily-status-count">{{ count }}项</span>
  </span>
</template>
<style scoped>
.daily-check-status { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px; max-width: 100%; }
.daily-status-count { color: var(--ap-text-secondary); font-size: 12px; }
.daily-result-other { --el-tag-bg-color: #f3f4f6; --el-tag-border-color: var(--ap-border); --el-tag-text-color: var(--ap-text-secondary); }
</style>
