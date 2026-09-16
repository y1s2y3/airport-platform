<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { getCocLaborPanelStats } from '../../mock/laborManagement.js'

const props = defineProps({
  projects: { type: Array, required: true },
  focusProject: { type: Object, default: null },
  isEnterprise: { type: Boolean, default: false },
})

const chartRef = ref(null)
let chart = null

const LEGEND_KEYS = ['建筑工人', '管理人员', '出勤率']
const legendSelected = ref({
  建筑工人: true,
  管理人员: true,
  出勤率: true,
})

const legendItems = [
  { name: '建筑工人', icon: 'bar labor' },
  { name: '管理人员', icon: 'bar manage' },
  { name: '出勤率', icon: 'line total' },
]

const laborStats = computed(() => {
  if (props.isEnterprise) return getCocLaborPanelStats('hq')
  return getCocLaborPanelStats(props.focusProject?.id || '')
})

const statsRows = computed(() => {
  const s = laborStats.value
  return [
    {
      label: '全部人员',
      total: s.total,
      today: s.allToday,
      rate: s.rate,
    },
    {
      label: '管理人员',
      total: s.manage,
      today: s.manageToday,
      rate: s.manageRate,
    },
    {
      label: '建筑工人',
      total: s.labor,
      today: s.laborToday,
      rate: s.laborRate,
    },
    {
      label: '特种作业人员',
      total: s.special,
      today: s.specialToday,
      rate: s.specialRate,
    },
  ]
})

const trendChartData = computed(() => laborStats.value.trend || { labels: [], labor: [], manage: [], rate: [] })

function buildProjectTrendOption() {
  const data = trendChartData.value
  return {
    tooltip: {
      trigger: 'axis',
      textStyle: { fontSize: 11 },
      axisPointer: { type: 'shadow' },
      formatter(params) {
        if (!Array.isArray(params) || !params.length) return ''
        const lines = [`${params[0].axisValue}`]
        params.forEach((item) => {
          const unit = item.seriesName === '出勤率' ? '%' : '人'
          lines.push(`${item.marker}${item.seriesName}：${item.value}${unit}`)
        })
        return lines.join('<br/>')
      },
    },
    legend: {
      show: false,
      data: LEGEND_KEYS,
      selected: { ...legendSelected.value },
    },
    grid: {
      left: 6,
      right: 6,
      top: 28,
      bottom: 2,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      boundaryGap: true,
      axisTick: { show: false },
      axisLabel: {
        fontSize: 10,
        color: '#909399',
        margin: 10,
        interval: 0,
      },
      axisLine: { lineStyle: { color: '#e4e7ed' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '人数',
        position: 'left',
        splitNumber: 4,
        nameGap: 8,
        nameTextStyle: { fontSize: 10, color: '#c97b63', padding: [0, 0, 0, 0] },
        axisLabel: {
          fontSize: 10,
          color: '#909399',
          margin: 6,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f0f2f5', type: 'dashed' } },
      },
      {
        type: 'value',
        name: '百分数',
        position: 'right',
        min: 0,
        max: 100,
        splitNumber: 5,
        nameGap: 8,
        nameTextStyle: { fontSize: 10, color: '#67c23a', padding: [0, 0, 0, 0] },
        axisLabel: {
          fontSize: 10,
          color: '#909399',
          margin: 6,
          formatter: '{value}%',
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '建筑工人',
        type: 'bar',
        yAxisIndex: 0,
        data: data.labor,
        barMaxWidth: 18,
        barGap: '18%',
        barCategoryGap: '36%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#e8b4a0' },
            { offset: 1, color: '#c97b63' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '管理人员',
        type: 'bar',
        yAxisIndex: 0,
        data: data.manage,
        barMaxWidth: 18,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#79bbff' },
            { offset: 1, color: '#409eff' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '出勤率',
        type: 'line',
        yAxisIndex: 1,
        data: data.rate,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        z: 5,
        itemStyle: { color: '#67c23a', borderWidth: 2, borderColor: '#fff' },
        lineStyle: { width: 2.5, color: '#67c23a' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.16)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0)' },
          ]),
        },
      },
    ],
  }
}

function renderChart() {
  if (!chartRef.value || props.isEnterprise) return
  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption(buildProjectTrendOption(), true)
  requestAnimationFrame(() => chart?.resize())
}

function toggleLegend(name) {
  const next = !legendSelected.value[name]
  legendSelected.value = { ...legendSelected.value, [name]: next }
  if (!chart) {
    renderChart()
    return
  }
  chart.dispatchAction({
    type: next ? 'legendSelect' : 'legendUnSelect',
    name,
  })
}

function handleResize() {
  chart?.resize()
}

watch([() => props.isEnterprise, () => props.focusProject?.id], renderChart)

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
      <span class="panel-v2-tip">V2版本上线</span>
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
        <div class="trend-header">
          <div class="trend-title">劳务出勤趋势<span class="trend-range">近七天</span></div>
          <div class="chart-legend">
            <button
              v-for="item in legendItems"
              :key="item.name"
              type="button"
              class="legend-item"
              :class="{ 'is-off': !legendSelected[item.name] }"
              :title="legendSelected[item.name] ? `点击隐藏${item.name}` : `点击显示${item.name}`"
              @click="toggleLegend(item.name)"
            >
              <i class="legend-icon" :class="item.icon" />{{ item.name }}
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

  font-size: calc(18px + var(--coc-font-boost));
  justify-content: flex-start;
  gap: 16px;
}

.scope-tag {
  font-size: calc(11px + var(--coc-font-boost));
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
  padding: 8px 16px 12px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
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
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  padding: 4px 0 8px;
  border-bottom: 1px solid var(--coc-border);
}

.stat-table-row {
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: calc(13px + var(--coc-font-boost));
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
  font-size: calc(15px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
}

.col-num.accent {
  color: var(--coc-accent);
}

.col-rate {
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-success);
}

.trend-section {
  border-top: 1px solid var(--coc-border);
  padding-top: 8px;
  margin-top: 4px;
  flex: 1.35;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.trend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 2px;
  flex-shrink: 0;
  padding: 0 2px;
}

.trend-title {
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.trend-range {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 500;
  color: var(--coc-text-muted);
}

.chart-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 20px;
  min-width: 0;
  margin-left: auto;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  white-space: nowrap;
  border: none;
  background: transparent;
  padding: 2px 0;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s ease, color 0.15s ease;
}

.legend-item:hover {
  color: var(--coc-text);
}

.legend-item.is-off {
  opacity: 0.38;
  color: var(--coc-text-muted);
}

.legend-item.is-off .legend-icon {
  filter: grayscale(1);
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

.trend-chart {
  flex: 1;
  width: 100%;
  min-height: 0;
  height: 100%;
}
</style>
