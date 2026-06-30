<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { calcLaborBreakdown } from '../mock/data.js'

const props = defineProps({
  projects: { type: Array, required: true },
  focusProject: { type: Object, default: null },
  isEnterprise: { type: Boolean, default: false },
})

const chartRef = ref(null)
const timeDim = ref('day')
let chart = null

const buildingProjects = computed(() =>
  props.projects.filter((p) => p.status === '在建'),
)

const statsRows = computed(() => {
  const totalAll = props.isEnterprise
    ? buildingProjects.value.reduce((s, p) => s + p.onSiteWorkers, 0)
    : props.focusProject?.onSiteWorkers || 0
  const breakdown = calcLaborBreakdown(totalAll)
  const rate = (today, total) => (total ? `${((today / total) * 100).toFixed(1)}%` : '—')

  return [
    {
      label: '全部人员',
      total: totalAll,
      today: breakdown.allToday,
      rate: rate(breakdown.allToday, totalAll),
    },
    {
      label: '管理人员',
      total: breakdown.manage,
      today: breakdown.manageToday,
      rate: rate(breakdown.manageToday, breakdown.manage),
    },
    {
      label: '劳务人员',
      total: breakdown.labor,
      today: breakdown.laborToday,
      rate: rate(breakdown.laborToday, breakdown.labor),
    },
  ]
})

const trendChartData = computed(() => {
  const base = props.focusProject?.onSiteWorkers || 400
  const manageBase = Math.round(base * 0.052)
  const laborBase = base - manageBase
  if (timeDim.value === 'day') {
    const factors = [0.96, 1.01, 0.98, 1.05, 0.99, 1.06, 1.02]
    const labor = factors.map((f) => Math.round(laborBase * f))
    const manage = factors.map((f, i) => Math.round(manageBase * (0.94 + (i % 3) * 0.04)))
    return {
      labels: ['6/6', '6/7', '6/8', '6/9', '6/10', '6/11', '6/12'],
      labor,
      manage,
      total: labor.map((v, i) => v + manage[i]),
    }
  }
  const factors = [0.92, 0.98, 0.95, 1.02, 0.99, 1.08]
  const labor = factors.map((f) => Math.round(laborBase * f * 8.5))
  const manage = factors.map((f, i) => Math.round(manageBase * f * 8.5 * (0.96 + (i % 2) * 0.05)))
  return {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
    labor,
    manage,
    total: labor.map((v, i) => v + manage[i]),
  }
})

function buildProjectTrendOption() {
  const data = trendChartData.value
  return {
    tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
    legend: { show: false },
    grid: { left: 56, right: 56, top: 12, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLabel: { fontSize: 10, color: '#909399' },
      axisLine: { lineStyle: { color: '#e4e7ed' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '劳务人数',
        position: 'left',
        nameTextStyle: { fontSize: 10, color: '#c97b63' },
        axisLabel: { fontSize: 10, color: '#909399' },
        splitLine: { lineStyle: { color: '#f0f2f5', type: 'dashed' } },
      },
      {
        type: 'value',
        name: '管理人数',
        position: 'right',
        nameTextStyle: { fontSize: 10, color: '#409eff' },
        axisLabel: { fontSize: 10, color: '#909399' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '劳务人员',
        type: 'bar',
        yAxisIndex: 0,
        data: data.labor,
        barGap: '20%',
        barWidth: timeDim.value === 'day' ? '22%' : '26%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#e8b4a0' },
            { offset: 1, color: '#c97b63' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
      },
      {
        name: '管理人员',
        type: 'bar',
        yAxisIndex: 1,
        data: data.manage,
        barWidth: timeDim.value === 'day' ? '22%' : '26%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#79bbff' },
            { offset: 1, color: '#409eff' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
      },
      {
        name: '合计',
        type: 'line',
        yAxisIndex: 0,
        data: data.total,
        smooth: false,
        symbol: 'circle',
        symbolSize: 9,
        itemStyle: { color: '#67c23a' },
        lineStyle: { width: 3, color: '#67c23a' },
      },
    ],
  }
}

function renderChart() {
  if (!chartRef.value || props.isEnterprise) return
  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption(buildProjectTrendOption(), true)
}

function handleResize() {
  chart?.resize()
}

watch([() => props.isEnterprise, () => props.focusProject?.id, timeDim], renderChart)

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="panel-card labor-panel">
    <div class="panel-title compact title-left">
      <span>劳务统计</span>
      <span v-if="isEnterprise" class="scope-tag">企业级</span>
      <span v-else-if="focusProject" class="scope-tag project">{{ focusProject.shortName || focusProject.name }}</span>
    </div>
    <div class="panel-body compact-body">
      <div class="stat-table">
        <div class="stat-table-head">
          <span class="col-label" />
          <span>人员数量</span>
          <span>今日出勤</span>
          <span>出勤率</span>
        </div>
        <div v-for="row in statsRows" :key="row.label" class="stat-table-row">
          <span class="col-label">{{ row.label }}</span>
          <span class="col-num">{{ row.total.toLocaleString() }}</span>
          <span class="col-num accent">{{ row.today.toLocaleString() }}</span>
          <span class="col-rate">{{ row.rate }}</span>
        </div>
      </div>

      <div v-if="!isEnterprise" class="trend-section">
        <div class="trend-title">劳务出勤趋势</div>
        <div class="trend-toolbar">
          <div class="chart-legend">
            <span class="legend-item">
              <i class="legend-icon bar labor" />劳务人员
            </span>
            <span class="legend-item">
              <i class="legend-icon bar manage" />管理人员
            </span>
            <span class="legend-item">
              <i class="legend-icon line total" />合计
            </span>
          </div>
          <div class="time-toggle">
            <button
              class="time-btn"
              :class="{ active: timeDim === 'day' }"
              @click="timeDim = 'day'"
            >
              按天
            </button>
            <button
              class="time-btn"
              :class="{ active: timeDim === 'month' }"
              @click="timeDim = 'month'"
            >
              按月
            </button>
          </div>
        </div>
        <div ref="chartRef" class="trend-chart" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.labor-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-title.compact.title-left {

  font-size: 18px;
  justify-content: flex-start;
  gap: 16px;
}

.scope-tag {
  font-size: 11px;
  font-weight: 500;
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.1);
  padding: 4px 14px;
  border-radius: 20px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scope-tag.project {
  color: var(--coc-text-secondary);
  background: #f5f5f5;
}

.compact-body {
  flex: 1;
  min-height: 0;
  padding: 12px 20px 16px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.stat-table {
  margin-bottom: 0;
  flex-shrink: 0;
}

.trend-section .stat-table {
  margin-bottom: 12px;
}

.stat-table-head,
.stat-table-row {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr 0.9fr;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.stat-table-head {
  font-size: 11px;
  color: var(--coc-text-muted);
  padding: 8px 0 10px;
  border-bottom: 1px solid var(--coc-border);
}

.stat-table-row {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 13px;
}

.stat-table-row:last-child {
  border-bottom: none;
}

.col-label {
  text-align: left;
  font-weight: 600;
  color: var(--coc-text);
  padding-left: 4px;
}

.col-num {
  font-size: 15px;
  font-weight: 700;
  color: var(--coc-text);
}

.col-num.accent {
  color: var(--coc-accent);
}

.col-rate {
  font-size: 13px;
  font-weight: 600;
  color: var(--coc-success);
}

.trend-section {
  border-top: 1px solid var(--coc-border);
  padding-top: 10px;
  margin-top: 12px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.trend-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--coc-text);
  margin-bottom: 8px;
}

.trend-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 6px;
}

.chart-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  min-width: 0;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--coc-text-secondary);
  white-space: nowrap;
}

.legend-icon {
  display: inline-block;
  flex-shrink: 0;
}

.legend-icon.bar {
  width: 16px;
  height: 12px;
  border-radius: 3px;
}

.legend-icon.bar.labor {
  background: linear-gradient(180deg, #e8b4a0, #c97b63);
}

.legend-icon.bar.manage {
  background: linear-gradient(180deg, #79bbff, #409eff);
}

.legend-icon.line {
  width: 20px;
  height: 3px;
  border-radius: 2px;
  background: #67c23a;
  position: relative;
}

.legend-icon.line::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: #67c23a;
}

.time-toggle {
  display: flex;
  flex-shrink: 0;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  overflow: hidden;
}

.time-btn {
  padding: 5px 16px;
  border: none;
  background: #fff;
  font-size: 11px;
  color: var(--coc-text-secondary);
  cursor: pointer;
}

.time-btn.active {
  background: var(--coc-accent);
  color: #fff;
}

.time-btn:not(:last-child) {
  border-right: 1px solid var(--coc-border);
}

.trend-chart {
  flex: 1;
  width: 100%;
  min-height: 120px;
}
</style>
