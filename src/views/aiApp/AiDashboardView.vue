<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Refresh, Search } from '@element-plus/icons-vue'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions.js'
import {
  AI_ALERT_TYPES,
  aiAlerts,
  getProjectAiSummary,
} from '../../mock/aiApp.js'
import './ai-app.css'

const router = useRouter()
const filters = reactive({ projectId: '' })
const trendRef = ref(null)
const typeRef = ref(null)
let trendChart = null
let typeChart = null

const filteredAlerts = computed(() =>
  aiAlerts.value.filter((row) => {
    if (filters.projectId && row.projectId !== filters.projectId) return false
    return true
  }),
)

const summary = computed(() => {
  const rows = filteredAlerts.value
  const handled = rows.filter((item) => item.status === '已处置').length
  const unhandled = rows.length - handled
  const processed = rows.filter((item) => item.disposition === '已处理').length
  const falseAlarm = rows.filter((item) => item.disposition === '误报').length
  return {
    total: rows.length,
    handled,
    unhandled,
    processed,
    falseAlarm,
    rate: rows.length ? `${((handled / rows.length) * 100).toFixed(1)}%` : '0.0%',
  }
})

const projectRows = computed(() =>
  COC_PROJECT_OPTIONS.map((project) => ({
    projectId: project.id,
    projectName: project.label,
    projectFullName: project.fullName,
    ...getProjectAiSummary(project.id, filteredAlerts.value),
  })).filter((item) => item.total > 0 || filters.projectId === item.projectId),
)

watch(filteredAlerts, () => nextTick(renderCharts), { deep: true })

onMounted(() => {
  trendChart = echarts.init(trendRef.value)
  typeChart = echarts.init(typeRef.value)
  renderCharts()
  window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  trendChart?.dispose()
  typeChart?.dispose()
})

function renderCharts() {
  if (!trendChart || !typeChart) return
  const dates = [...new Set(filteredAlerts.value.map((item) => item.occurredAt.slice(0, 10)))].sort()
  const totalData = dates.map((date) => filteredAlerts.value.filter((item) => item.occurredAt.startsWith(date)).length)
  const handledData = dates.map((date) => filteredAlerts.value.filter((item) => item.occurredAt.startsWith(date) && item.status === '已处置').length)
  const unhandledData = dates.map((date) => filteredAlerts.value.filter((item) => item.occurredAt.startsWith(date) && item.status === '未处置').length)

  trendChart.setOption({
    color: ['#8f0045', '#34a853', '#f5a623'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0, data: ['预警总数', '已处置', '未处置'] },
    grid: { left: 42, right: 20, top: 42, bottom: 32 },
    xAxis: { type: 'category', data: dates.map((date) => date.slice(5)), axisTick: { show: false } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#eef0f3' } } },
    series: [
      { name: '预警总数', type: 'line', smooth: true, data: totalData, symbolSize: 7 },
      { name: '已处置', type: 'line', smooth: true, data: handledData, symbolSize: 7 },
      { name: '未处置', type: 'line', smooth: true, data: unhandledData, symbolSize: 7 },
    ],
  })

  const typeData = AI_ALERT_TYPES.map((type) => ({
    name: type.value,
    value: filteredAlerts.value.filter((item) => item.alertType === type.value).length,
  })).filter((item) => item.value > 0)

  typeChart.setOption({
    color: ['#8f0045', '#c24174', '#df769d', '#e69b42', '#d35b39', '#7c3aed', '#4f46e5', '#64748b'],
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 条（{d}%）' },
    legend: { type: 'scroll', bottom: 0, left: 'center' },
    series: [
      {
        name: '预警类型',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        label: { formatter: '{b}\n{c} 条' },
        data: typeData,
      },
    ],
  })
}

function resizeCharts() {
  trendChart?.resize()
  typeChart?.resize()
}

function resetFilters() {
  filters.projectId = ''
}

function openProjectLedger(row, category) {
  router.push(`/ai-alert-dashboard/project/${row.projectId}/${category}`)
}
</script>

<template>
  <div class="ai-page page-card">
    <div class="ai-page-header">
      <div>
        <div class="ai-page-breadcrumb">工程指挥部 / AI 预警统计看板</div>
        <h1 class="ai-page-title">AI 预警统计看板</h1>
        <p class="ai-page-tip">按项目、预警类型和处置状态展示 AI 预警数量及处置情况。</p>
      </div>
      <div class="ai-project-chip">工程指挥部</div>
    </div>

    <div class="ai-panel">
      <div class="ai-panel-title">查询条件</div>
      <div class="ai-filter-bar">
        <el-select v-model="filters.projectId" placeholder="项目" clearable filterable style="width: 190px">
          <el-option v-for="item in COC_PROJECT_OPTIONS" :key="item.id" :label="item.label" :value="item.id" />
        </el-select>
        <div class="ai-filter-actions">
          <el-button type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </div>
      </div>
    </div>

    <div class="ai-metric-grid ai-metric-grid-six">
      <div class="ai-metric-card">
        <div class="ai-metric-value">{{ summary.total }}</div>
        <div class="ai-metric-label">预警总数</div>
      </div>
      <div class="ai-metric-card warning">
        <div class="ai-metric-value">{{ summary.unhandled }}</div>
        <div class="ai-metric-label">未处置数量</div>
      </div>
      <div class="ai-metric-card success">
        <div class="ai-metric-value">{{ summary.handled }}</div>
        <div class="ai-metric-label">已处置数量</div>
      </div>
      <div class="ai-metric-card">
        <div class="ai-metric-value">{{ summary.rate }}</div>
        <div class="ai-metric-label">处置率</div>
      </div>
      <div class="ai-metric-card success">
        <div class="ai-metric-value">{{ summary.processed }}</div>
        <div class="ai-metric-label">现场处理数量</div>
      </div>
      <div class="ai-metric-card">
        <div class="ai-metric-value">{{ summary.falseAlarm }}</div>
        <div class="ai-metric-label">误报数量</div>
      </div>
    </div>

    <div class="ai-chart-grid">
      <div class="ai-panel">
        <div class="ai-panel-title">预警趋势</div>
        <div ref="trendRef" class="ai-chart" />
      </div>
      <div class="ai-panel">
        <div class="ai-panel-title">预警类型分布</div>
        <div ref="typeRef" class="ai-chart" />
      </div>
    </div>

    <div class="ai-panel">
      <div class="ai-panel-title">项目预警统计</div>
      <el-table :data="projectRows" stripe border class="ap-table" empty-text="当前条件下暂无项目预警数据">
        <el-table-column prop="projectName" label="项目名称" min-width="190" fixed show-overflow-tooltip />
        <el-table-column prop="total" label="预警总数" width="100" align="center" />
        <el-table-column prop="unhandled" label="未处置数量" width="110" align="center">
          <template #default="{ row }"><span :style="row.unhandled ? 'color:#d97706;font-weight:600' : ''">{{ row.unhandled }}</span></template>
        </el-table-column>
        <el-table-column prop="handled" label="已处置数量" width="110" align="center" />
        <el-table-column prop="processed" label="现场处理数量" width="110" align="center" />
        <el-table-column prop="falseAlarm" label="误报数量" width="100" align="center" />
        <el-table-column label="处置率" width="100" align="center">
          <template #default="{ row }">{{ row.handlingRate.toFixed(1) }}%</template>
        </el-table-column>
        <el-table-column label="查看明细" width="230" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openProjectLedger(row, 'unsafe')">行为预警</el-button>
            <el-button link type="primary" @click="openProjectLedger(row, 'hazard')">隐患预警</el-button>
            <el-button link type="primary" @click="openProjectLedger(row, 'fence')">围栏预警</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
