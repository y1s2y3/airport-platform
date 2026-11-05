<script setup>
import { problemText } from '../../../utils/dailyDispatchCheckRules.js'
import DailyCheckImages from './DailyCheckImages.vue'
defineProps({ problems: { type: Array, default: () => [] }, ariaLabel: { type: String, default: '检查问题' } })
</script>

<template>
  <ol class="daily-read-issues" :aria-label="ariaLabel">
    <li v-for="(problem, index) in problems" :key="index" class="daily-read-issue">
      <span class="daily-issue-number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
      <div class="daily-issue-content">
        <p v-if="problemText(problem)" class="daily-issue-description">{{ problemText(problem) }}</p>
        <p v-else-if="!problem?.images?.length" class="daily-issue-empty">--</p>
        <DailyCheckImages v-if="problem?.images?.length" :model-value="problem.images" readonly />
      </div>
    </li>
  </ol>
</template>

<style scoped>
.daily-read-issues { box-sizing: border-box; width: 100%; min-width: 0; margin: 0; padding: 4px 12px; list-style: none; background: var(--ap-bg-soft); border-radius: 6px; }
.daily-read-issue { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 8px; padding: 10px 0; }
.daily-read-issue + .daily-read-issue { border-top: 1px solid var(--ap-border); }
.daily-issue-number { color: var(--ap-text-muted); font-size: 12px; font-weight: 400; line-height: 22px; font-variant-numeric: tabular-nums; }
.daily-issue-content { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.daily-issue-description, .daily-issue-empty { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; font-weight: 400; line-height: 22px; text-align: left; }
.daily-issue-description { color: var(--ap-text); }
.daily-issue-empty { color: var(--ap-text-muted); }
</style>
