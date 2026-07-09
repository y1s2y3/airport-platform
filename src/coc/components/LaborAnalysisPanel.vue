<script setup>
import { computed } from 'vue'
import HqLaborKpiCard from './hq/HqLaborKpiCard.vue'
import { calcLaborBreakdown, calcHqCertWarningCount } from '../mock/data.js'

const props = defineProps({
  projects: { type: Array, required: true },
  darkTheme: { type: Boolean, default: false },
})

const buildingProjects = computed(() =>
  props.projects.filter((p) => p.status === '在建'),
)

const stats = computed(() => {
  const total = buildingProjects.value.reduce((s, p) => s + p.onSiteWorkers, 0)
  const breakdown = calcLaborBreakdown(total)
  const rate = total ? `${((breakdown.allToday / total) * 100).toFixed(1)}%` : '—'
  return {
    total,
    today: breakdown.allToday,
    rate,
    certWarning: calcHqCertWarningCount(),
  }
})

const kpis = computed(() => [
  { label: '总人数', value: stats.value.total.toLocaleString(), cls: '', unit: '人' },
  { label: '今日出勤', value: stats.value.today.toLocaleString(), cls: '', unit: '人' },
  { label: '出勤率', value: stats.value.rate, cls: 'ok', unit: '' },
  { label: '持证预警', value: stats.value.certWarning.toLocaleString(), cls: 'warn', unit: '人' },
])
</script>

<template>
  <div class="panel-card labor-analysis-panel">
    <div class="panel-title compact title-left">
      <span>劳务分析</span>
      <span class="panel-v2-tip">V2版本上线</span>
    </div>
    <div class="panel-body analysis-body">
      <div class="kpi-grid" :class="{ 'kpi-grid--hq': darkTheme }">
        <template v-if="darkTheme">
          <HqLaborKpiCard
            v-for="item in kpis"
            :key="item.label"
            :label="item.label"
            :value="item.value"
            :unit="item.unit"
            :tone="item.cls"
          />
        </template>
        <template v-else>
          <div v-for="item in kpis" :key="item.label" class="kpi-item">
            <div class="kpi-val" :class="item.cls">{{ item.value }}</div>
            <div class="kpi-lbl">{{ item.label }}</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.labor-analysis-panel {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
}

.panel-title.compact.title-left {
  font-size: calc(18px + var(--coc-font-boost));
  justify-content: flex-start;
}

.analysis-body {
  padding: 8px 12px 10px !important;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.kpi-grid--hq {
  gap: 6px;
}

.kpi-item {
  background: #faf8f6;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  padding: 10px 8px;
  text-align: center;
}

.kpi-val {
  font-size: calc(18px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
  line-height: 1.1;
}

.kpi-val.accent { color: var(--coc-accent); }
.kpi-val.ok { color: var(--coc-success); }
.kpi-val.warn { color: #e6a23c; }

.kpi-lbl {
  margin-top: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
}
</style>
