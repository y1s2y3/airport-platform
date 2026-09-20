<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions.js'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  MAJOR_HAZARD_CHANGE_EVENT,
  buildCalendarAlerts,
  buildLedgerRows,
  getLedgerStatus,
  getMajorHazardData,
} from '../../utils/majorHazardManualStorage.js'

const { isHqSelected } = useCurrentProject()
const projectChartRef = ref(null)
const categoryChartRef = ref(null)
const trendChartRef = ref(null)
const refreshTick = ref(0)
const drawerVisible = ref(false)
const drawerTitle = ref('危大工程明细')
const drawerRows = ref([])
const alertDrawerVisible = ref(false)
const alertDrawerRows = ref([])
const detailVisible = ref(false)
const detailEntry = ref(null)
const ledgerKeyword = ref('')
let projectChart = null
let categoryChart = null
let trendChart = null

function localDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function recordTime(record = {}) {
  return record.createdAt || record.date || record.recordDate || ''
}

function latestRecord(records = []) {
  return [...records].sort((a, b) => recordTime(b).localeCompare(recordTime(a))).at(0)
}

function latestProgress(part) {
  const node = part?.process?.progress || {}
  const record = latestRecord(node.records || [])
  const raw = record?.executionRate ?? node.executionRate ?? 0
  return Math.max(0, Math.min(100, Number(raw) || 0))
}

function controlPointStats(ledger, part) {
  const definitions = ledger.controlPoints || []
  const records = part?.process?.controlPoints?.records || []
  let green = 0
  let red = 0
  definitions.forEach((point) => {
    const current = latestRecord(records.filter((record) => record.controlPointId === point.id))
    const status = current?.displayStatus || (current?.status === '已落实' ? 'green' : current?.status === '需整改' ? 'red' : '')
    const fallback = point.handlingStatus === '已落实' ? 'green' : point.handlingStatus === '需整改' ? 'red' : ''
    if ((status || fallback) === 'green') green += 1
    if ((status || fallback) === 'red') red += 1
  })
  return { green, red, total: definitions.length }
}

function ledgerDates(ledger) {
  const starts = [ledger.source?.plannedStart, ...(ledger.parts || []).map((part) => part.startDate)].filter(Boolean).sort()
  const ends = [ledger.source?.plannedEnd, ...(ledger.parts || []).map((part) => part.plannedEndDate)].filter(Boolean).sort()
  return { start: starts[0] || '', end: ends.at(-1) || starts[0] || '' }
}

/**
 * 一个危大工程只计一次：任一施工部位已超过计划完工日，且尚无“危大工程验收合格”记录，
 * 即纳入“超期未验收”指标。该指标不受异常是否已处置影响。
 */
function isOverdueUnacceptedLedger(ledger, today = localDate()) {
  return (ledger.parts || []).some((part) => (
    part.plannedEndDate
    && part.plannedEndDate < today
    && !(part.process?.acceptance?.status === '已完成' && part.process?.acceptance?.result === '合格')
  ))
}

const projectDataRows = computed(() => {
  void refreshTick.value
  return COC_PROJECT_OPTIONS.map((project) => {
    const data = getMajorHazardData(project.id)
    const ledgers = buildLedgerRows(data)
    const alerts = buildCalendarAlerts(data, ledgers).map((alert) => ({ ...alert, projectId: project.id, projectName: project.label }))
    return { project, ledgers, alerts }
  })
})

const allEntries = computed(() => projectDataRows.value.flatMap(({ project, ledgers, alerts }) => ledgers.map((ledger) => {
  const dates = ledgerDates(ledger)
  const points = (ledger.parts || []).reduce((sum, part) => {
    const stats = controlPointStats(ledger, part)
    return { green: sum.green + stats.green, red: sum.red + stats.red, total: sum.total + stats.total }
  }, { green: 0, red: 0, total: 0 })
  const ledgerAlerts = alerts.filter((alert) => alert.ledgerId === ledger.id || alert.ledgerName === ledger.name)
  return {
    projectId: project.id,
    projectName: project.label,
    projectFullName: project.fullName,
    ledger,
    status: getLedgerStatus(ledger),
    start: dates.start,
    end: dates.end,
    greenPoints: points.green,
    redPoints: points.red,
    totalPoints: points.total,
    overdueAcceptance: isOverdueUnacceptedLedger(ledger) ? 1 : 0,
    pendingAlerts: ledgerAlerts.filter((alert) => alert.status !== '已处理').length,
    alerts: ledgerAlerts,
  }
})))

const summary = computed(() => ({
  total: allEntries.value.length,
  active: allEntries.value.filter((entry) => entry.status === '在施').length,
  superMajor: allEntries.value.filter((entry) => entry.ledger.isSuperMajor === '是').length,
  overdueAcceptance: allEntries.value.reduce((sum, entry) => sum + entry.overdueAcceptance, 0),
  pendingAlerts: allEntries.value.reduce((sum, entry) => sum + entry.pendingAlerts, 0),
}))

const projectStats = computed(() => {
  const map = new Map()
  allEntries.value.forEach((entry) => {
    const row = map.get(entry.projectId) || { projectId: entry.projectId, projectName: entry.projectName, 未开工: 0, 在施: 0, 完工: 0, total: 0 }
    row[entry.status] += 1
    row.total += 1
    map.set(entry.projectId, row)
  })
  return [...map.values()].sort((a, b) => b.total - a.total || a.projectName.localeCompare(b.projectName, 'zh-CN')).slice(0, 10)
})

const categoryStats = computed(() => {
  const map = new Map()
  allEntries.value.forEach((entry) => {
    const name = entry.ledger.categoryName || '未分类'
    const row = map.get(name) || { name, total: 0, active: 0, superMajor: 0 }
    row.total += 1
    if (entry.status === '在施') row.active += 1
    if (entry.ledger.isSuperMajor === '是') row.superMajor += 1
    map.set(name, row)
  })
  return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'zh-CN')).slice(0, 8)
})

const PROCESS_TYPES = [
  ['scheme', '专项施工方案'],
  ['schemeDisclosure', '方案交底'],
  ['safetyDisclosure', '安全技术交底'],
  ['workerRegistration', '作业人员登记'],
  ['conditionAcceptance', '施工条件验收'],
  ['progress', '施工进度'],
  ['patrol', '现场巡视'],
  ['acceptance', '危大工程验收'],
  ['controlPoints', '管控要点'],
]

function nodeCompleted(node = {}) {
  return (node.records || []).length > 0 || node.status === '已完成'
}

const processStats = computed(() => PROCESS_TYPES.map(([key, label]) => {
  if (key === 'controlPoints') {
    const total = allEntries.value.reduce((sum, entry) => sum + entry.totalPoints, 0)
    const completed = allEntries.value.reduce((sum, entry) => sum + entry.greenPoints, 0)
    return { key, label, total, completed, rate: total ? Math.round((completed / total) * 100) : 0 }
  }
  let total = 0
  let completed = 0
  allEntries.value.forEach((entry) => (entry.ledger.parts || []).forEach((part) => {
    total += 1
    if (nodeCompleted(part.process?.[key])) completed += 1
  }))
  return { key, label, total, completed, rate: total ? Math.round((completed / total) * 100) : 0 }
}))

function rateClass(rate) {
  if (rate >= 90) return 'rate-good'
  if (rate >= 60) return 'rate-ok'
  if (rate > 0) return 'rate-warn'
  return 'rate-none'
}

const trendDates = computed(() => {
  const dates = []
  const now = new Date()
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - offset)
    dates.push(localDate(date))
  }
  return dates
})

const trendStats = computed(() => {
  const started = new Map(trendDates.value.map((date) => [date, 0]))
  const completed = new Map(trendDates.value.map((date) => [date, 0]))
  const alerts = new Map(trendDates.value.map((date) => [date, 0]))
  allEntries.value.forEach((entry) => (entry.ledger.parts || []).forEach((part) => {
    if (started.has(part.startDate)) started.set(part.startDate, started.get(part.startDate) + 1)
    const acceptance = latestRecord(part.process?.acceptance?.records || [])
    const acceptedAt = acceptance?.date || (part.process?.acceptance?.result === '合格' ? part.process?.acceptance?.date : '')
    if (completed.has(acceptedAt)) completed.set(acceptedAt, completed.get(acceptedAt) + 1)
  }))
  allEntries.value.forEach((entry) => entry.alerts.filter((alert) => alert.status !== '已处理').forEach(() => {
    const today = localDate()
    alerts.set(today, (alerts.get(today) || 0) + 1)
  }))
  return {
    started: trendDates.value.map((date) => started.get(date) || 0),
    completed: trendDates.value.map((date) => completed.get(date) || 0),
    alerts: trendDates.value.map((date) => alerts.get(date) || 0),
  }
})

/** 各项目危大工程台账：每个项目一条 */
const projectLedgerRows = computed(() => COC_PROJECT_OPTIONS.map((project) => {
  const entries = allEntries.value.filter((entry) => entry.projectId === project.id)
  return {
    projectId: project.id,
    projectName: project.label,
    projectFullName: project.fullName,
    total: entries.length,
    active: entries.filter((entry) => entry.status === '在施').length,
    notStarted: entries.filter((entry) => entry.status === '未开工').length,
    completed: entries.filter((entry) => entry.status === '完工').length,
    superMajor: entries.filter((entry) => entry.ledger.isSuperMajor === '是').length,
    pendingAlerts: entries.reduce((sum, entry) => sum + entry.pendingAlerts, 0),
  }
}))

const filteredProjectLedger = computed(() => {
  const kw = ledgerKeyword.value.trim()
  if (!kw) return projectLedgerRows.value
  return projectLedgerRows.value.filter((row) => `${row.projectName}${row.projectFullName}`.includes(kw))
})

function searchProjectLedger() {
  ElMessage.success(`查询完成，共 ${filteredProjectLedger.value.length} 个项目`)
}

function resetProjectLedger() {
  ledgerKeyword.value = ''
}

/** 异常跟踪台账（跨项目）：与项目级「危大工程日历 · 异常跟踪」更多台账一致，并补充项目名称 */
const alertRows = computed(() => allEntries.value.flatMap((entry) => entry.alerts.map((alert) => ({
  projectId: entry.projectId,
  projectName: entry.projectName,
  sourceId: entry.ledger.sourceId,
  ledgerName: alert.ledgerName,
  partName: alert.part?.name || alert.part?.wbsPath || '—',
  type: alert.type,
  content: alert.content,
  status: alert.status,
  handledAt: alert.handledAt || '—',
}))))

function openAlertLedger() {
  alertDrawerRows.value = alertRows.value
  alertDrawerVisible.value = true
}

function emptyGraphic(text) {
  return [{ type: 'text', left: 'center', top: 'middle', style: { text, fill: '#94a3b8', fontSize: 13 } }]
}

function renderCharts() {
  if (!projectChart || !categoryChart || !trendChart) return
  const projectRows = projectStats.value
  const projectNames = projectRows.map((row) => row.projectName)
  projectChart.setOption({
    color: ['#94a3b8', '#2563eb', '#16a34a'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { selectedMode: false, top: 0, data: ['未开工', '在施', '完工'] },
    grid: { left: 16, right: projectNames.length > 10 ? 42 : 22, top: 42, bottom: 16, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf1f5' } } },
    yAxis: { type: 'category', inverse: true, data: projectNames, axisTick: { show: false }, axisLabel: { width: 120, overflow: 'truncate' } },
    dataZoom: projectNames.length > 10 ? [{ type: 'slider', yAxisIndex: 0, right: 3, width: 14, startValue: 0, endValue: 9, zoomLock: true, brushSelect: false }] : [],
    graphic: projectNames.length ? [] : emptyGraphic('暂无项目数据'),
    series: ['未开工', '在施', '完工'].map((name) => ({ name, type: 'bar', cursor: 'default', stack: 'total', barMaxWidth: 20, data: projectRows.map((row) => row[name]) })),
  }, true)

  const categories = categoryStats.value.map((row) => row.name)
  categoryChart.setOption({
    color: ['#2563eb', '#14b8a6', '#dc2626'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { selectedMode: false, top: 0, data: ['总数', '在施', '超危'] },
    grid: { left: 16, right: 22, top: 42, bottom: 16, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf1f5' } } },
    yAxis: { type: 'category', inverse: true, data: categories, axisTick: { show: false }, axisLabel: { width: 150, overflow: 'truncate' } },
    graphic: categories.length ? [] : emptyGraphic('暂无类别数据'),
    series: [
      { name: '总数', type: 'bar', cursor: 'default', barMaxWidth: 18, data: categoryStats.value.map((row) => row.total) },
      { name: '在施', type: 'bar', cursor: 'default', barMaxWidth: 18, data: categoryStats.value.map((row) => row.active) },
      { name: '超危', type: 'bar', cursor: 'default', barMaxWidth: 18, data: categoryStats.value.map((row) => row.superMajor) },
    ],
  }, true)

  trendChart.setOption({
    color: ['#2563eb', '#16a34a', '#dc2626'],
    tooltip: { trigger: 'axis' },
    legend: { selectedMode: false, top: 0, data: ['新开工', '完工', '新增异常'] },
    grid: { left: 24, right: 22, top: 42, bottom: 28, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: trendDates.value.map((date) => date.slice(5)), axisLabel: { interval: 4 }, axisTick: { show: false } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf1f5' } } },
    series: [
      { name: '新开工', type: 'line', cursor: 'default', smooth: true, symbolSize: 6, data: trendStats.value.started, areaStyle: { opacity: 0.05 } },
      { name: '完工', type: 'line', cursor: 'default', smooth: true, symbolSize: 6, data: trendStats.value.completed },
      { name: '新增异常', type: 'line', cursor: 'default', smooth: true, symbolSize: 6, data: trendStats.value.alerts },
    ],
  }, true)
}

function resizeCharts() {
  projectChart?.resize()
  categoryChart?.resize()
  trendChart?.resize()
}

function entryForDrawer(entry) {
  return {
    ...entry,
    categoryName: entry.ledger.categoryName || '—',
    description: entry.ledger.description || '—',
    superMajor: entry.ledger.isSuperMajor || '否',
    progress: (entry.ledger.parts || []).length ? Math.round((entry.ledger.parts || []).reduce((sum, part) => sum + latestProgress(part), 0) / entry.ledger.parts.length) : 0,
  }
}

function showDrawer(title, entries) {
  drawerTitle.value = title
  drawerRows.value = entries.map(entryForDrawer)
  drawerVisible.value = true
}

function openMetric(type) {
  if (type === 'pendingAlerts') { openAlertLedger(); return }
  const configs = {
    total: ['危大工程明细', allEntries.value],
    active: ['在施危大工程', allEntries.value.filter((entry) => entry.status === '在施')],
    superMajor: ['超危工程', allEntries.value.filter((entry) => entry.ledger.isSuperMajor === '是')],
    overdueAcceptance: ['超期未验收危大工程', allEntries.value.filter((entry) => entry.overdueAcceptance > 0)],
  }
  showDrawer(...configs[type])
}

function showProject(projectName) {
  showDrawer(`${projectName} · 危大工程`, allEntries.value.filter((entry) => entry.projectName === projectName))
}

function showCategory(categoryName) {
  showDrawer(`${categoryName} · 危大工程`, allEntries.value.filter((entry) => entry.ledger.categoryName === categoryName))
}

/** 直接在弹窗内展示危大工程详情，不跳转项目 */
function openDetail(row) {
  detailEntry.value = row
  detailVisible.value = true
}

function openProjectLedgerDetail(row) {
  // 正式工程不恢复台账页「返回看板」条：项目明细留在看板抽屉内，避免指挥部下钻后无法回看板
  showProject(row.projectName)
}

const detailParts = computed(() => {
  const ledger = detailEntry.value?.ledger
  if (!ledger) return []
  return (ledger.parts || []).map((part) => {
    const stats = controlPointStats(ledger, part)
    return {
      id: part.id,
      partName: part.name || part.wbsPath || '—',
      time: `${part.startDate || '—'} 至 ${part.plannedEndDate || '—'}`,
      progress: latestProgress(part),
      pointText: `${stats.green}/${stats.total}`,
    }
  })
})

const detailAlerts = computed(() => (detailEntry.value?.alerts || []).map((alert) => ({
  id: alert.id,
  partName: alert.part?.name || alert.part?.wbsPath || '—',
  type: alert.type,
  content: alert.content,
  status: alert.status,
  handledAt: alert.handledAt || '—',
})))

function refresh() {
  refreshTick.value += 1
}

watch([projectStats, categoryStats, trendStats], () => nextTick(renderCharts), { deep: true })

onMounted(() => {
  if (!projectChartRef.value || !categoryChartRef.value || !trendChartRef.value) return
  projectChart = echarts.init(projectChartRef.value)
  categoryChart = echarts.init(categoryChartRef.value)
  trendChart = echarts.init(trendChartRef.value)
  nextTick(renderCharts)
  window.addEventListener('resize', resizeCharts)
  window.addEventListener(MAJOR_HAZARD_CHANGE_EVENT, refresh)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  window.removeEventListener(MAJOR_HAZARD_CHANGE_EVENT, refresh)
  projectChart?.dispose()
  categoryChart?.dispose()
  trendChart?.dispose()
})
</script>

<template>
  <div class="hazard-dashboard page-card">
    <template v-if="isHqSelected">
      <div class="page-header">
        <div>
          <div class="page-breadcrumb">工程指挥部 / 安全看板 / 危大工程看板</div>
          <h1 class="page-title">危大工程看板</h1>
          <p class="page-tip">汇总各项目危大工程规模、施工状态、过程执行和异常情况，具体业务在项目级办理。</p>
        </div>
        <el-tag type="info" effect="plain" size="large">工程指挥部 · 全项目</el-tag>
      </div>

      <section class="metric-grid">
        <div class="metric-card"><span>危大工程总数</span><strong>{{ summary.total }}</strong><small>审批通过并进入危大清单</small></div>
        <div class="metric-card primary"><span>在施数量</span><strong>{{ summary.active }}</strong><small>当前正在实施</small></div>
        <div class="metric-card danger"><span>超危数量</span><strong>{{ summary.superMajor }}</strong><small>超危工程总量</small></div>
        <div class="metric-card danger"><span>超期未验收</span><strong>{{ summary.overdueAcceptance }}</strong><small>任一施工部位超期且未验收合格</small></div>
        <div class="metric-card warning"><span>待处理异常</span><strong>{{ summary.pendingAlerts }}</strong><small>日历规则识别的未处理异常</small></div>
      </section>

      <section class="chart-grid">
        <div class="panel chart-panel">
          <div class="panel-title">危大工程TOP10项目分布情况</div>
          <div ref="projectChartRef" class="chart" />
        </div>
        <div class="panel chart-panel">
          <div class="panel-title">危大工程类别分布</div>
          <div ref="categoryChartRef" class="chart" />
        </div>
      </section>

      <section class="chart-grid">
        <div class="panel chart-panel">
          <div class="panel-title">近30天施工趋势</div>
          <div ref="trendChartRef" class="chart" />
        </div>
        <div class="panel process-panel">
          <div class="panel-title">过程管控完成情况</div>
          <el-table :data="processStats" border stripe size="small" max-height="300" class="process-table" empty-text="暂无过程数据">
            <el-table-column prop="label" label="过程环节" min-width="130" show-overflow-tooltip />
            <el-table-column prop="completed" label="已完成" width="82" align="center" />
            <el-table-column prop="total" label="总数" width="72" align="center" />
            <el-table-column label="完成率" width="104" align="center">
              <template #default="{ row }"><span class="rate-text" :class="rateClass(row.rate)">{{ row.rate }}%</span></template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section class="panel table-panel">
        <div class="table-title-row">
          <div>
            <div class="panel-title">各项目危大工程台账</div>
            <p>按项目汇总危大工程规模与施工状态，每个项目一条；点击「查看」直接展示该项目危大工程明细。</p>
          </div>
          <el-tag effect="plain">共 {{ filteredProjectLedger.length }} 个项目</el-tag>
        </div>
        <div class="filter-row ledger-filter-row">
          <el-input v-model="ledgerKeyword" clearable placeholder="项目名称" class="filter-keyword" :prefix-icon="Search" />
          <el-button type="primary" :icon="Search" @click="searchProjectLedger">查询</el-button>
          <el-button :icon="Refresh" @click="resetProjectLedger">重置</el-button>
        </div>
        <el-table :data="filteredProjectLedger" border stripe empty-text="暂无项目危大工程数据">
          <el-table-column prop="projectName" label="项目名称" min-width="200" fixed show-overflow-tooltip />
          <el-table-column prop="total" label="危大工程总数" width="120" align="center" />
          <el-table-column prop="active" label="在施" width="90" align="center" />
          <el-table-column prop="notStarted" label="未开工" width="90" align="center" />
          <el-table-column prop="completed" label="已完成" width="90" align="center" />
          <el-table-column prop="superMajor" label="超危" width="90" align="center" />
          <el-table-column prop="pendingAlerts" label="待处理异常" width="110" align="center"><template #default="{ row }"><span :class="{ 'warning-num': row.pendingAlerts }">{{ row.pendingAlerts }}</span></template></el-table-column>
          <el-table-column label="操作" width="90" fixed="right" align="center"><template #default="{ row }"><el-button link type="primary" @click="openProjectLedgerDetail(row)">查看</el-button></template></el-table-column>
        </el-table>
      </section>

      <el-drawer v-model="drawerVisible" :title="drawerTitle" size="86%" destroy-on-close>
        <el-table :data="drawerRows" border stripe empty-text="暂无明细">
          <el-table-column prop="projectName" label="项目名称" min-width="150" />
          <el-table-column prop="categoryName" label="危大工程类别" min-width="170" />
          <el-table-column prop="description" label="类别描述" min-width="220" show-overflow-tooltip />
          <el-table-column prop="status" label="施工状态" width="90" align="center" />
          <el-table-column label="超危" width="80" align="center"><template #default="{ row }"><el-tag v-if="row.superMajor === '是'" size="small" type="danger">超危</el-tag><span v-else>否</span></template></el-table-column>
          <el-table-column label="计划时间" width="205"><template #default="{ row }">{{ row.start || '—' }} 至 {{ row.end || '—' }}</template></el-table-column>
          <el-table-column prop="progress" label="施工进度" width="95" align="center"><template #default="{ row }">{{ row.progress }}%</template></el-table-column>
          <el-table-column prop="overdueAcceptance" label="超期未验收" width="105" align="center"><template #default="{ row }"><span :class="{ 'danger-num': row.overdueAcceptance }">{{ row.overdueAcceptance }}</span></template></el-table-column>
          <el-table-column prop="pendingAlerts" label="待处理异常" width="105" align="center" />
          <el-table-column label="操作" width="80" fixed="right" align="center"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">查看</el-button></template></el-table-column>
        </el-table>
      </el-drawer>

      <el-drawer v-model="alertDrawerVisible" title="危大工程异常跟踪" size="86%" destroy-on-close>
        <el-table :data="alertDrawerRows" border stripe empty-text="暂无异常跟踪">
          <el-table-column prop="projectName" label="项目名称" min-width="150" fixed show-overflow-tooltip />
          <el-table-column prop="ledgerName" label="危大工程" min-width="200" show-overflow-tooltip />
          <el-table-column prop="partName" label="施工部位" min-width="180" show-overflow-tooltip />
          <el-table-column prop="type" label="异常类型" width="110" />
          <el-table-column prop="content" label="异常内容" min-width="280" show-overflow-tooltip />
          <el-table-column label="状态" width="100" align="center"><template #default="{ row }"><el-tag size="small" :type="row.status === '已处理' ? 'success' : 'danger'">{{ row.status }}</el-tag></template></el-table-column>
          <el-table-column prop="handledAt" label="处理时间" width="130" align="center" />
        </el-table>
      </el-drawer>

      <el-dialog v-model="detailVisible" title="危大工程详情" width="920px" top="6vh" destroy-on-close>
        <template v-if="detailEntry">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="项目名称">{{ detailEntry.projectName }}</el-descriptions-item>
            <el-descriptions-item label="危大工程类别">{{ detailEntry.categoryName }}</el-descriptions-item>
            <el-descriptions-item label="类别描述" :span="2">{{ detailEntry.description }}</el-descriptions-item>
            <el-descriptions-item label="施工状态">
              <el-tag size="small" :type="detailEntry.status === '完工' ? 'success' : detailEntry.status === '在施' ? 'primary' : 'info'">{{ detailEntry.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="是否超危">
              <el-tag v-if="detailEntry.superMajor === '是'" size="small" type="danger">超危</el-tag>
              <span v-else>否</span>
            </el-descriptions-item>
            <el-descriptions-item label="责任分包单位">{{ detailEntry.ledger?.subcontractor || '—' }}</el-descriptions-item>
            <el-descriptions-item label="责任人">{{ detailEntry.ledger?.responsible || '—' }}</el-descriptions-item>
            <el-descriptions-item label="计划时间">{{ detailEntry.start || '—' }} 至 {{ detailEntry.end || '—' }}</el-descriptions-item>
            <el-descriptions-item label="施工进度">{{ detailEntry.progress }}%</el-descriptions-item>
            <el-descriptions-item label="超期未验收"><span :class="{ 'danger-num': detailEntry.overdueAcceptance }">{{ detailEntry.overdueAcceptance }}</span></el-descriptions-item>
            <el-descriptions-item label="待处理异常"><span :class="{ 'warning-num': detailEntry.pendingAlerts }">{{ detailEntry.pendingAlerts }}</span></el-descriptions-item>
          </el-descriptions>

          <div class="detail-subtitle">施工部位（{{ detailParts.length }}）</div>
          <el-table :data="detailParts" border stripe size="small" empty-text="暂无施工部位">
            <el-table-column type="index" label="序号" width="56" />
            <el-table-column prop="partName" label="施工部位" min-width="220" show-overflow-tooltip />
            <el-table-column prop="time" label="施工时间" width="205" />
            <el-table-column label="施工进度" width="120" align="center"><template #default="{ row }"><el-progress :percentage="row.progress" :stroke-width="7" /></template></el-table-column>
            <el-table-column prop="pointText" label="管控要点" width="95" align="center" />
          </el-table>

          <div class="detail-subtitle">异常跟踪（{{ detailAlerts.length }}）</div>
          <el-table :data="detailAlerts" border stripe size="small" empty-text="暂无异常跟踪">
            <el-table-column prop="partName" label="施工部位" min-width="180" show-overflow-tooltip />
            <el-table-column prop="type" label="异常类型" width="110" />
            <el-table-column prop="content" label="异常内容" min-width="260" show-overflow-tooltip />
            <el-table-column label="状态" width="90" align="center"><template #default="{ row }"><el-tag size="small" :type="row.status === '已处理' ? 'success' : 'danger'">{{ row.status }}</el-tag></template></el-table-column>
            <el-table-column prop="handledAt" label="处理时间" width="130" align="center" />
          </el-table>
        </template>
        <template #footer><el-button type="primary" @click="detailVisible = false">关闭</el-button></template>
      </el-dialog>
    </template>
    <el-empty v-else description="危大工程看板仅供工程指挥部查看。" />
  </div>
</template>

<style scoped>
.hazard-dashboard { min-height: 100%; padding: 20px 24px 36px; background: #f4f7fb; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
.page-breadcrumb, .page-tip { margin: 0 0 7px; color: #7a8493; font-size: 13px; }
.page-title { margin: 0 0 7px; color: #172033; font-size: 22px; font-weight: 650; }
.panel { border: 1px solid #e3e9f1; border-radius: 10px; background: #fff; box-shadow: 0 4px 16px rgba(30, 58, 95, .04); }
.panel-title { padding-left: 9px; border-left: 3px solid #2563eb; color: #273142; font-size: 15px; font-weight: 650; }
.filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.filter-keyword { width: 260px; }
.metric-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 13px; margin-bottom: 16px; }
.metric-card { position: relative; overflow: hidden; min-height: 112px; padding: 17px 16px; border: 1px solid #e3e9f1; border-radius: 10px; background: linear-gradient(145deg, #fff, #f8fafc); text-align: left; cursor: default; box-shadow: 0 4px 16px rgba(30, 58, 95, .04); transition: transform .18s ease, box-shadow .18s ease; }
.metric-card::before { position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #64748b; content: ''; }
.metric-card.primary::before { background: #2563eb; }
.metric-card.danger::before { background: #dc2626; }
.metric-card.warning::before { background: #d97706; }
.metric-card span { display: block; color: #5b6473; font-size: 13px; }
.metric-card strong { display: block; margin: 9px 0 6px; color: #172033; font-size: 29px; line-height: 1; }
.metric-card.danger strong, .danger-num { color: #dc2626; font-weight: 650; }
.metric-card.warning strong, .warning-num { color: #d97706; font-weight: 650; }
.metric-card small { color: #939baa; font-size: 12px; }
.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
.chart-panel, .process-panel { padding: 16px; }
.chart { height: 300px; }
.process-table { margin-top: 14px; }
.rate-text { font-weight: 650; }
.rate-good { color: #16a34a; }
.rate-ok { color: #2563eb; }
.rate-warn { color: #d97706; }
.rate-none { color: #94a3b8; }
.table-panel { padding: 16px; }
.table-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.table-title-row p { margin: 7px 0 0; color: #8992a1; font-size: 12px; }
.ledger-filter-row { margin-bottom: 12px; }
.link-number { color: #2563eb; cursor: pointer; font-weight: 650; }
.detail-subtitle { margin: 18px 0 10px; padding-left: 9px; border-left: 3px solid #2563eb; color: #273142; font-size: 14px; font-weight: 650; }
@media (max-width: 1480px) {
  .metric-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1050px) {
  .chart-grid { grid-template-columns: 1fr; }
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .metric-grid { grid-template-columns: 1fr; }
  .filter-row { align-items: stretch; flex-direction: column; }
  .filter-row > * { width: 100% !important; }
}
</style>
