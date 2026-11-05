<script setup>
import DailyCheckStatus from './DailyCheckStatus.vue'
defineProps({ value: { type: Object, default: () => ({}) } })
</script>
<template>
  <span class="daily-ledger-result" :data-state="value?.state || 'empty'">
    <DailyCheckStatus v-if="['normal', 'problem', 'other'].includes(value?.state)" :status="value.state" />
    <span v-else :class="value?.state === 'other' ? 'daily-ledger-other' : 'daily-ledger-empty'">{{ value?.label || '--' }}</span>
  </span>
</template>
<style scoped>
.daily-ledger-result { display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; max-width: 100%; }
.daily-ledger-other { color: var(--ap-text-secondary); }
.daily-ledger-empty { color: var(--ap-text-muted); }
</style>
