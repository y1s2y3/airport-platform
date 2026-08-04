<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import { getLaborDashboardData } from '../../mock/laborManagement'
import { warningStatusTagClass } from '../../mock/laborWarningList'

const router = useRouter()
const { isHqSelected, laborProjectId, projectLabel } = useCurrentProject()

const ageChartRef = ref(null)
const categoryChartRef = ref(null)
const trendChartRef = ref(null)
const charts = { age: null, category: null, trend: null }

const dashboardProjectId = computed(() =>
  isHqSelected.value ? HQ_PROJECT_OPTION.id : laborProjectId.value,
)

const data = computed(() => getLaborDashboardData(dashboardProjectId.value))

const ageStats = computed(() => buildRingStats(data.value.ageAnalysis || []))
const categoryStats = computed(() => buildRingStats(data.value.categoryAnalysis || []))

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
            total: { fontSize: 18, fontWeight: 700, color: '#333', lineHeight: 22, align: 'center' },
            sub: { fontSize: 11, color: '#909399', lineHeight: 16, align: 'center' },
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
        const present = params.find((item) => item.seriesName === '出勤人数')
        const rate = params.find((item) => item.seriesName === '出勤率')
        return [
          date,
          present ? `${present.marker}${present.seriesName}：${present.value} 人` : '',
          rate ? `${rate.marker}${rate.seriesName}：${rate.value}%` : '',
        ].filter(Boolean).join('<br/>')
      },
    },
    legend: {
      data: ['出勤人数', '出勤率'],
      top: 0,
      right: 0,
      textStyle: { fontSize: 12 },
    },
    grid: { left: 48, right: 48, top: 36, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
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
        name: '出勤人数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#4285f4' },
        itemStyle: { color: '#4285f4' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(66, 133, 244, 0.25)' },
            { offset: 1, color: 'rgba(66, 133, 244, 0.02)' },
          ]),
        },
        data: list.map((item) => item.presentCount),
      },
      {
        name: '出勤率',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#43a047' },
        itemStyle: { color: '#43a047' },
        data: list.map((item) => item.attendanceRate),
      },
    ],
  }
}

function renderHqCharts() {
  if (!isHqSelected.value) return
  nextTick(() => {
    if (ageChartRef.value?.clientWidth > 20) {
      if (!charts.age) charts.age = echarts.init(ageChartRef.value)
      charts.age.setOption(buildRingOption(data.value.ageAnalysis || [], '总人数'), true)
    }
    if (categoryChartRef.value?.clientWidth > 20) {
      if (!charts.category) charts.category = echarts.init(categoryChartRef.value)
      charts.category.setOption(buildRingOption(data.value.categoryAnalysis || [], '总人数'), true)
    }
    if (trendChartRef.value?.clientWidth > 20) {
      if (!charts.trend) charts.trend = echarts.init(trendChartRef.value)
      charts.trend.setOption(buildTrendOption(data.value.attendanceTrend), true)
    }
  })
}

function disposeHqCharts() {
  Object.keys(charts).forEach((key) => {
    charts[key]?.dispose()
    charts[key] = null
  })
}

function handleResize() {
  charts.age?.resize()
  charts.category?.resize()
  charts.trend?.resize()
}

watch([isHqSelected, data], () => {
  if (isHqSelected.value) renderHqCharts()
  else disposeHqCharts()
})

onMounted(() => {
  renderHqCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeHqCharts()
})

function goWarningList() {
  router.push({ name: 'LaborWarningList' })
}
</script>

<template>
  <div class="dash-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 劳务看板</div>
      <h1 class="page-title">劳务看板</h1>
      <p v-if="isHqSelected" class="page-tip">指挥部监管看板：汇总人数、工种/类别占比、特种作业在岗与预警；班组明细由项目自有系统完成。</p>
      <template v-else>
        <p class="page-scope">当前项目：{{ projectLabel }}</p>
        <p class="page-tip">项目监管汇总：在场人数、特种作业、预警与工种结构；不做班组级明细与平台填报。</p>
      </template>
    </div>

    <div class="dash-content">
      <div class="stats-row">
        <div class="stat-card"><span class="stat-label">在册人数</span><span class="stat-value">{{ data.summary.total }}</span></div>
        <div class="stat-card"><span class="stat-label">已入场</span><span class="stat-value">{{ data.summary.entered }}</span></div>
        <div class="stat-card"><span class="stat-label">在场人数</span><span class="stat-value ok">{{ data.summary.onSite }}</span></div>
        <div class="stat-card"><span class="stat-label">特种作业</span><span class="stat-value warn">{{ data.summary.special }}</span></div>
        <div class="stat-card"><span class="stat-label">预警动态</span><span class="stat-value warn">{{ data.summary.pendingWarnings }}</span></div>
        <div class="stat-card"><span class="stat-label">处理中预警</span><span class="stat-value">{{ data.summary.processingWarnings }}</span></div>
        <div class="stat-card"><span class="stat-label">本月出勤率</span><span class="stat-value ok">{{ data.summary.attendanceRate }}</span></div>
      </div>

      <!-- 指挥部层级 -->
      <template v-if="isHqSelected">
        <div class="hq-main-row">
          <section class="panel">
            <div class="panel-title-row">
              <div class="panel-title">预警动态</div>
              <el-button link type="primary" @click="goWarningList">查看全部</el-button>
            </div>
            <el-table :data="data.pendingWarningList" border stripe size="small" class="ap-table hq-warning-table">
              <el-table-column prop="projectName" label="项目" min-width="100" show-overflow-tooltip />
              <el-table-column prop="name" label="姓名" width="64" />
              <el-table-column prop="ruleLabel" label="预警类型" min-width="110" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="72" align="center">
                <template #default="{ row }">
                  <span class="ap-status-tag" :class="warningStatusTagClass[row.status]">{{ row.status }}</span>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <section class="panel chart-panel">
            <div class="panel-title">人员类别</div>
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
        </div>

        <section class="panel full">
          <div class="panel-title">整体出勤趋势</div>
          <p class="panel-sub">近 30 天全指挥部出勤汇总（2026-06-01 至 2026-06-29）</p>
          <div ref="trendChartRef" class="trend-chart" />
        </section>
      </template>

      <!-- 项目层级 -->
      <template v-else>
        <div class="panel-grid">
          <section class="panel">
            <div class="panel-title-row">
              <div class="panel-title">预警动态</div>
              <el-button link type="primary" @click="goWarningList">查看全部</el-button>
            </div>
            <el-table :data="data.pendingWarningList" border stripe size="small" class="ap-table">
              <el-table-column prop="warningNo" label="编号" width="110" />
              <el-table-column prop="name" label="姓名" width="80" />
              <el-table-column prop="ruleLabel" label="预警类型" min-width="160" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="80" align="center">
                <template #default="{ row }">
                  <span class="ap-status-tag" :class="warningStatusTagClass[row.status]">{{ row.status }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="time" label="时间" width="70" align="center" />
            </el-table>
          </section>

          <section class="panel">
            <div class="panel-title">培训/证书类预警</div>
            <el-table :data="data.trainingAbnormalList" border stripe size="small" class="ap-table">
              <el-table-column prop="name" label="姓名" width="80" />
              <el-table-column prop="company" label="单位" min-width="120" show-overflow-tooltip />
              <el-table-column prop="abnormalType" label="预警类型" min-width="140" show-overflow-tooltip />
              <el-table-column prop="expireDate" label="状态" width="80" align="center" />
            </el-table>
          </section>
        </div>

        <section class="panel full">
          <div class="panel-title">工种结构汇总</div>
          <el-table :data="data.workTypeSummary" border stripe class="ap-table">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="workType" label="工种" min-width="160" />
            <el-table-column prop="headcount" label="人数" width="100" align="center" />
          </el-table>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dash-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
.page-scope { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--ap-text); }
.page-tip { margin: 0 0 8px; font-size: 12px; color: var(--ap-text-muted); }
.stats-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
.stat-label { font-size: 13px; color: var(--ap-text-muted); }
.stat-value { font-size: 22px; font-weight: 700; color: var(--ap-primary); }
.stat-value.warn { color: var(--ap-warning); }
.stat-value.ok { color: var(--ap-success); }
.panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.hq-main-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
  align-items: stretch;
}
.hq-main-row .panel { min-width: 0; height: 100%; }
.panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
.panel.full { margin-bottom: 16px; }
.panel.full:last-child { margin-bottom: 0; }
.panel-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: var(--ap-text); }
.panel-sub { margin: -4px 0 12px; font-size: 12px; color: var(--ap-text-muted); }
.panel-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
.panel-title-row .panel-title { margin-bottom: 0; }
.chart-panel { min-height: 360px; }
.chart-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 300px;
}
.hq-warning-table { width: 100%; }
.ring-chart { width: 168px; height: 168px; flex-shrink: 0; }
.ring-legend { width: 100%; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
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
.trend-chart { width: 100%; height: 320px; }
</style>
