<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import { getLaborDashboardData, LABOR_HQ_STATS_TODAY } from '../../mock/laborManagement'
import { warningStatusTagClass } from '../../mock/laborWarningList'

const router = useRouter()
const { isHqSelected, laborProjectId } = useCurrentProject()

const ageChartRef = ref(null)
const categoryChartRef = ref(null)
const trendChartRef = ref(null)
const warningTrendChartRef = ref(null)
const charts = { age: null, category: null, trend: null, warningTrend: null }

const dashboardProjectId = computed(() =>
  isHqSelected.value ? HQ_PROJECT_OPTION.id : laborProjectId.value,
)

const data = computed(() => getLaborDashboardData(dashboardProjectId.value))

const ageStats = computed(() => buildRingStats(data.value.ageAnalysis || []))
const categoryStats = computed(() => buildRingStats(data.value.categoryAnalysis || []))

const trendRangeLabel = computed(() => {
  const list = data.value.attendanceTrend || []
  if (!list.length) return ''
  return `${list[0].date} 至 ${list[list.length - 1].date}`
})

function buildRingStats(segments) {
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 0
  return segments.map((item) => ({
    ...item,
    percent: total ? `${((item.value / total) * 100).toFixed(1)}%` : '0%',
  }))
}

function buildRingOption(segments, centerSub) {
  const total = segments.reduce((sum, item) => sum + item.value, 0)
  const chartData = segments.map((item) => ({
    name: item.name,
    value: Math.max(item.value, 0),
    itemStyle: { color: item.color },
  }))
  if (!chartData.some((item) => item.value > 0)) {
    chartData.push({ name: '暂无', value: 1, itemStyle: { color: '#e8e8e8' } })
  }
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}：{c} 人 ({d}%)',
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 8,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{total|${total}}\n{sub|${centerSub}}`,
          rich: {
            total: { fontSize: 16, fontWeight: 700, color: '#333', lineHeight: 20, align: 'center' },
            sub: { fontSize: 11, color: '#909399', lineHeight: 15, align: 'center' },
          },
        },
        emphasis: { scale: false },
        labelLine: { show: false },
        data: chartData,
      },
    ],
  }
}

function buildTrendOption(trend) {
  const list = trend || []
  return {
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        const date = params[0]?.axisValueLabel || ''
        return [
          date,
          ...params.map((item) => {
            const unit = item.seriesName === '出勤率' ? '%' : ' 人'
            return `${item.marker}${item.seriesName}：${item.value}${unit}`
          }),
        ].join('<br/>')
      },
    },
    legend: {
      data: ['管理人员', '建筑工人', '出勤率'],
      top: 0,
      right: 96,
      textStyle: { fontSize: 12 },
    },
    grid: { left: 48, right: 48, top: 36, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: list.map((item) => item.label),
      axisLabel: { fontSize: 11, color: '#909399', interval: 4 },
      axisLine: { lineStyle: { color: '#e4e7ed' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '人数',
        axisLabel: { fontSize: 11, color: '#909399' },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
      },
      {
        type: 'value',
        name: '出勤率',
        min: 80,
        max: 100,
        axisLabel: { formatter: '{value}%', fontSize: 11, color: '#909399' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '管理人员',
        type: 'bar',
        stack: 'present',
        barMaxWidth: 14,
        itemStyle: { color: '#43a047' },
        data: list.map((item) => item.managePresent),
      },
      {
        name: '建筑工人',
        type: 'bar',
        stack: 'present',
        barMaxWidth: 14,
        itemStyle: { color: '#4285f4' },
        data: list.map((item) => item.laborPresent),
      },
      {
        name: '出勤率',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#ff9800' },
        itemStyle: { color: '#ff9800' },
        data: list.map((item) => item.attendanceRate),
      },
    ],
  }
}

function buildWarningTrendOption(trend) {
  const list = trend || []
  return {
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        const date = params[0]?.axisValueLabel || ''
        return [
          date,
          ...params.map((item) => `${item.marker}${item.seriesName}：${item.value}`),
        ].join('<br/>')
      },
    },
    legend: {
      data: ['新增预警', '未处置'],
      top: 0,
      right: 0,
      textStyle: { fontSize: 12 },
    },
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: list.map((item) => item.label),
      axisLabel: { fontSize: 11, color: '#909399', interval: 4 },
      axisLine: { lineStyle: { color: '#e4e7ed' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11, color: '#909399' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [
      {
        name: '新增预警',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#ff9800' },
        itemStyle: { color: '#ff9800' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 152, 0, 0.22)' },
            { offset: 1, color: 'rgba(255, 152, 0, 0.02)' },
          ]),
        },
        data: list.map((item) => item.newCount),
      },
      {
        name: '未处置',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#e53935' },
        itemStyle: { color: '#e53935' },
        data: list.map((item) => item.pendingCount),
      },
    ],
  }
}

function ensureChart(key, el) {
  if (!el || el.clientWidth <= 20) return null
  if (!charts[key]) charts[key] = echarts.init(el)
  return charts[key]
}

function renderCharts() {
  nextTick(() => {
    const category = ensureChart('category', categoryChartRef.value)
    if (category) category.setOption(buildRingOption(data.value.categoryAnalysis || [], '总人数'), true)

    const age = ensureChart('age', ageChartRef.value)
    if (age) age.setOption(buildRingOption(data.value.ageAnalysis || [], '总人数'), true)

    const trend = ensureChart('trend', trendChartRef.value)
    if (trend) trend.setOption(buildTrendOption(data.value.attendanceTrend), true)

    const warningTrend = ensureChart('warningTrend', warningTrendChartRef.value)
    if (warningTrend) warningTrend.setOption(buildWarningTrendOption(data.value.warningTrend), true)
  })
}

function disposeCharts() {
  Object.keys(charts).forEach((key) => {
    charts[key]?.dispose()
    charts[key] = null
  })
}

function handleResize() {
  Object.values(charts).forEach((chart) => chart?.resize())
}

watch(data, () => {
  renderCharts()
}, { deep: true })

onMounted(() => {
  renderCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})

function goWarningList() {
  router.push({ name: 'LaborWarningList' })
}
</script>

<template>
  <div class="dash-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 人员实名制看板</div>
      <h1 class="page-title">人员实名制看板</h1>
      <p v-if="isHqSelected" class="page-tip">
        指挥部监管看板：指标卡与「实名制统计」汇总口径一致；上半为结构占比与出勤趋势，下半为预警趋势与预警清单。
      </p>
    </div>

    <div class="dash-content">
      <div class="stats-row">
        <div class="stat-card"><span class="stat-label">在岗人数</span><span class="stat-value">{{ data.summary.total }}</span></div>
        <div class="stat-card"><span class="stat-label">管理人员</span><span class="stat-value">{{ data.summary.manage }}</span></div>
        <div class="stat-card"><span class="stat-label">建筑工人</span><span class="stat-value">{{ data.summary.labor }}</span></div>
        <div class="stat-card"><span class="stat-label">特种作业人员</span><span class="stat-value warn">{{ data.summary.special }}</span></div>
        <div class="stat-card"><span class="stat-label">今日综合出勤率</span><span class="stat-value ok">{{ data.summary.todayAttendanceRate }}</span></div>
        <div class="stat-card"><span class="stat-label">今日管理人员出勤率</span><span class="stat-value ok">{{ data.summary.todayManageRate }}</span></div>
        <div class="stat-card"><span class="stat-label">今日实名制预警</span><span class="stat-value warn">{{ data.summary.todayWarningCount }}</span></div>
        <div class="stat-card"><span class="stat-label">预警未处置</span><span class="stat-value warn">{{ data.summary.pendingWarningCount }}</span></div>
      </div>

      <div class="structure-row">
        <section class="panel chart-panel">
          <div class="panel-title">工人类型</div>
          <div class="chart-stack">
            <div ref="categoryChartRef" class="ring-chart" />
            <ul class="ring-legend">
              <li v-for="item in categoryStats" :key="item.name" class="ring-legend-item">
                <span class="legend-dot" :style="{ background: item.color }" />
                <span class="legend-name">{{ item.name }}</span>
                <span class="legend-val">{{ item.value }} 人</span>
                <span class="legend-pct">{{ item.percent }}</span>
              </li>
            </ul>
          </div>
        </section>

        <section class="panel chart-panel">
          <div class="panel-title">年龄分布</div>
          <div class="chart-stack">
            <div ref="ageChartRef" class="ring-chart" />
            <ul class="ring-legend">
              <li v-for="item in ageStats" :key="item.name" class="ring-legend-item">
                <span class="legend-dot" :style="{ background: item.color }" />
                <span class="legend-name">{{ item.name }}</span>
                <span class="legend-val">{{ item.value }} 人</span>
                <span class="legend-pct">{{ item.percent }}</span>
              </li>
            </ul>
          </div>
        </section>

        <section class="panel chart-panel attendance-panel">
          <div class="panel-title">整体出勤趋势</div>
          <p class="panel-sub">近 30 天出勤汇总（{{ trendRangeLabel || LABOR_HQ_STATS_TODAY }}）</p>
          <div ref="trendChartRef" class="trend-chart" />
        </section>
      </div>

      <div class="warning-row">
        <section class="panel chart-panel">
          <div class="panel-title">预警趋势</div>
          <p class="panel-sub">近 30 日新增预警与未处置数量</p>
          <div ref="warningTrendChartRef" class="trend-chart warning-trend-chart" />
        </section>

        <section class="panel">
          <div class="panel-title-row">
            <div class="panel-title">预警清单</div>
            <el-button link type="primary" @click="goWarningList">查看全部</el-button>
          </div>
          <el-table :data="data.pendingWarningList" border stripe size="small" class="ap-table warning-table">
            <el-table-column v-if="isHqSelected" prop="projectName" label="项目" min-width="100" show-overflow-tooltip />
            <el-table-column v-if="!isHqSelected" prop="warningNo" label="编号" width="110" />
            <el-table-column prop="name" label="姓名" width="64" />
            <el-table-column prop="ruleLabel" label="预警类型" min-width="110" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="72" align="center">
              <template #default="{ row }">
                <span class="ap-status-tag" :class="warningStatusTagClass[row.status]">{{ row.status }}</span>
              </template>
            </el-table-column>
            <el-table-column v-if="!isHqSelected" prop="time" label="时间" width="70" align="center" />
          </el-table>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
.page-tip { margin: 0 0 8px; font-size: 12px; color: var(--ap-text-muted); }
.stats-row { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
.stat-card { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 12px 10px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.stat-label { font-size: 12px; color: var(--ap-text-muted); line-height: 1.3; word-break: break-all; }
.stat-value { font-size: 20px; font-weight: 700; color: var(--ap-primary); }
.stat-value.warn { color: var(--ap-warning); }
.stat-value.ok { color: var(--ap-success); }
.structure-row {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  gap: 16px;
  margin-bottom: 16px;
  align-items: stretch;
}
.warning-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 0;
  align-items: stretch;
}
.structure-row .panel,
.warning-row .panel { min-width: 0; }
.panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 12px; }
.panel-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: var(--ap-text); }
.panel-sub { margin: -2px 0 8px; font-size: 12px; color: var(--ap-text-muted); }
.panel-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
.panel-title-row .panel-title { margin-bottom: 0; }
.chart-panel { min-height: 240px; }
.structure-row .panel,
.warning-row .panel { min-height: 240px; }
.chart-stack {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  min-height: 186px;
}
.warning-table { width: 100%; }
.ring-chart { width: 128px; height: 128px; flex-shrink: 0; }
.ring-legend {
  flex: 1;
  min-width: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ring-legend-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto auto;
  gap: 6px;
  align-items: center;
  font-size: 12px;
}
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
.legend-name { color: var(--ap-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-val { color: var(--ap-text-secondary); white-space: nowrap; }
.legend-pct { color: var(--ap-text-muted); font-size: 12px; white-space: nowrap; }
.trend-chart { width: 100%; height: 186px; }
.warning-trend-chart { height: 173px; }
</style>
