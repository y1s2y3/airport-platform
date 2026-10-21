<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close, FullScreen, Location, Refresh } from '@element-plus/icons-vue'
import HqEdgeLights from '../coc/components/hq/HqEdgeLights.vue'
import headerBg from '../coc/assets/hq/header/header-bg.png'
import weatherIcon from '../coc/assets/hq/header/weather-icon.svg?url'
import {
  HQ_SELECTION_ID,
  buildMapPoints,
  buildMonitorRows,
  buildProjectRows,
  buildScopeSummary,
  buildTrend,
  getAiOverview,
  getTypeMeta,
} from './mock/situationData.js'
import { inspectionHazards } from '../mock/inspectionDemoData.js'
import { listMobileInspectionTasks } from '../mock/mobileInspectionTasks.js'
import './styles/screen.css'

const route = useRoute()
const router = useRouter()
const projectRows = buildProjectRows()
const allowedIds = new Set([HQ_SELECTION_ID, ...projectRows.map((item) => item.id)])
const requestedProjectId = String(route.query.projectId || '')

// 与两级安全态势大屏一致的地图图层筛选项；风险/隐患图层保留入口，
// 具体点位仍以当前已有 BIM+GIS 数据为准。
const MAP_LAYER_OPTIONS = [
  { value: 'risk', label: '风险', color: '#ffd166' },
  { value: 'hazard', label: '隐患', color: '#ff6680' },
  { value: 'major', label: '危大监测', color: '#ff6680' },
  { value: 'ai', label: '监测报警', color: '#ff9a52' },
  { value: 'labor', label: '人员', color: '#31e8ff' },
  { value: 'vehicle', label: '车辆', color: '#62d9a7' },
  { value: 'machine', label: '机械', color: '#b78aff' },
  { value: 'inspection', label: '巡检', color: '#4ba8ff' },
]

const selectionId = ref(allowedIds.has(requestedProjectId) ? requestedProjectId : HQ_SELECTION_ID)
const mapMode = ref('gis')
const trendRange = ref(7)
const activeLayers = ref(MAP_LAYER_OPTIONS.map((item) => item.value))
const selectedPoint = ref(null)
const clockText = ref('')
const dateText = ref('')
const weekdayText = ref('')
const lastRefresh = ref('')
const detailType = ref('')
const detailFilter = ref('')
let timer = null

const DETAIL_CONFIG = {
  labor: {
    title: '人员实名制管理明细',
    source: '人员实名制管理 > 实名制统计',
    columns: [
      { label: '在岗人数', key: 'people', suffix: '人' },
      { label: '管理人员', key: 'managers', suffix: '人' },
      { label: '建筑工人', key: 'workers', suffix: '人' },
      { label: '特种作业人员', key: 'specialPeople', suffix: '人' },
      { label: '今日出勤率', key: 'attendanceRate', suffix: '%' },
    ],
  },
  vehicle: {
    title: '车辆进出场明细',
    source: '车辆管理 > 车辆管理看板 / 进出场记录（当日）',
    columns: [
      { label: '今日进场', key: 'vehicleIn', suffix: '辆' },
      { label: '当前在场', key: 'vehicles', suffix: '辆' },
      { label: '今日出场', key: 'vehicleOut', suffix: '辆' },
    ],
  },
  inspection: {
    title: '巡检管理明细',
    source: '巡检管理 > 巡检看板 / 巡检任务',
    columns: [
      { label: '任务总数', key: 'inspectionTotal', suffix: '项' },
      { label: '待执行', key: 'inspectionPending', suffix: '项' },
      { label: '逾期任务', key: 'inspectionOverdue', suffix: '项' },
      { label: '待整改隐患', key: 'hazardPending', suffix: '条' },
    ],
  },
  ai: {
    title: 'AI应用预警明细',
    source: 'AI应用 > 三类预警台账',
    columns: [
      { label: '预警总数', key: 'aiTotal', suffix: '条' },
      { label: '未处置', key: 'aiUnhandled', suffix: '条' },
      { label: '已处置', key: 'aiHandled', suffix: '条' },
      { label: '消息提醒', key: 'aiReminder', suffix: '条' },
      { label: '处置率', key: 'aiHandlingRate', suffix: '%' },
    ],
  },
  machine: {
    title: '机械设备监管明细',
    source: '机械设备监管 > 运行监管 / 预警记录',
    columns: [
      { label: '监测设备', key: 'machineDevices', suffix: '台' },
      { label: '在线设备', key: 'machineOnline', suffix: '台' },
      { label: '离线设备', key: 'machineOffline', suffix: '台' },
      { label: '未处置预警', key: 'machineUnhandled', suffix: '条' },
    ],
  },
  major: {
    title: '危大工程监测明细',
    source: '危大工程监测 > 安全监管页面 / 预警记录',
    columns: [
      { label: '监测区域', key: 'majorRegions', suffix: '个' },
      { label: '监测点', key: 'majorPoints', suffix: '个' },
      { label: '接入设备', key: 'majorDevices', suffix: '台' },
      { label: '未处置预警', key: 'majorUnhandled', suffix: '条' },
    ],
  },
}

const selectedProject = computed(() => selectionId.value === HQ_SELECTION_ID
  ? null
  : projectRows.find((item) => item.id === selectionId.value) || null)
const headerTitle = computed(() => selectedProject.value
  ? `${selectedProject.value.label}项目安全态势`
  : '深圳机场建设工程安全态势大屏')
const scope = computed(() => buildScopeSummary(selectedProject.value, projectRows))
function getProjectStatus(row) {
  const danger = Number(row.inspectionOverdue || 0) + Number(row.hazardOverdue || 0) + Number(row.aiUnhandled || 0)
    + Number(row.machineUnhandled || 0) + Number(row.majorUnhandled || 0)
  if (danger >= 7) return '预警'
  if (danger >= 3) return '关注'
  return '正常'
}
const hazardBreakdown = computed(() => {
  const total = Number(scope.value.inspectionHazards || 0)
  let remaining = total
  const pending = Math.min(remaining, Math.max(0, Number(scope.value.hazardPending || 0)))
  remaining -= pending
  const review = Math.min(remaining, Math.max(0, Number(scope.value.hazardReview || 0)))
  remaining -= review
  const reviewed = Math.min(remaining, Math.max(0, Number(scope.value.hazardReviewed || 0)))
  remaining -= reviewed
  const closed = Math.max(0, remaining)
  return { total, pending, review, reviewed, closed, overdue: Number(scope.value.hazardOverdue || 0) }
})
const hqProjectRows = computed(() => [
  {
    id: HQ_SELECTION_ID,
    label: '深圳机场建设工程',
    fullName: '深圳机场建设工程',
    isAggregate: true,
    status: '关注',
    hazardPending: hazardBreakdown.value.pending,
    unhandled: scope.value.aiUnhandled + scope.value.machineUnhandled + scope.value.majorUnhandled,
  },
  ...projectRows.slice(0, 5).map((row) => ({
    ...row,
    status: getProjectStatus(row),
    unhandled: row.aiUnhandled + row.machineUnhandled + row.majorUnhandled,
  })),
])
const aiOverview = computed(() => getAiOverview(selectionId.value))
const trend = computed(() => buildTrend(selectedProject.value, projectRows, trendRange.value))
const monitorRows = computed(() => buildMonitorRows(selectedProject.value, projectRows))
const detailRows = computed(() => selectedProject.value ? [selectedProject.value] : projectRows)
const detailScopeLabel = computed(() => {
  if (!selectedProject.value) return `工程指挥部级 · ${projectRows.length}个在建项目`
  if (detailType.value === 'inspection' && detailFilter.value === 'pending') return `项目级 · ${selectedProject.value.label} · 待巡检任务单`
  if (detailType.value === 'inspection' && detailFilter.value === 'hazard') return `项目级 · ${selectedProject.value.label} · 隐患整改明细`
  if (detailType.value === 'major') return `项目级 · ${selectedProject.value.label} · 监测点明细`
  return `项目级 · ${selectedProject.value.label} · 指标明细`
})
const monitorTableRows = computed(() => {
  const project = selectedProject.value?.label || 'T2航站区配套'
  const source = monitorRows.value
  const templates = [
    ['屋面沉降监测点-01', '竖向位移', '15.2mm', '10.0mm', '10:28', '超阈值'],
    ['大跨度屋面应力-03', '结构应力', '68.5MPa', '70.0MPa', '10:27', '正常'],
    ['基坑支护变形监测点-02', '水平位移', '8.6mm', '15.0mm', '10:26', '正常'],
    ['高支模立杆轴力监测点-04', '立杆轴力', '42.8kN', '50.0kN', '10:25', '正常'],
    ['地基沉降监测点-05', '累计沉降', '6.4mm', '12.0mm', '10:24', '正常'],
  ]
  return templates.map((row, index) => ({
    id: `monitor-table-${selectedProject.value?.id || 'hq'}-${index}`,
    point: row[0], metric: row[1], latest: row[2], threshold: row[3], time: row[4], status: row[5], project,
    source: source[index % Math.max(1, source.length)]?.title || '危大工程监测点',
  }))
})
const projectInspectionRows = computed(() => {
  const projectId = selectedProject.value?.id
  if (!projectId || detailType.value !== 'inspection' || detailFilter.value !== 'pending') return []
  return listMobileInspectionTasks()
    .filter((item) => item.project_id === projectId && item.status === '待执行')
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || String(a.deadline).localeCompare(String(b.deadline)))
})
const projectHazardRows = computed(() => {
  const projectId = selectedProject.value?.id
  if (!projectId || detailType.value !== 'inspection' || detailFilter.value !== 'hazard') return []
  return inspectionHazards
    .filter((item) => item.project_id === projectId)
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
})
const projectDrillColumns = computed(() => {
  if (!selectedProject.value) return []
  if (detailType.value === 'inspection' && detailFilter.value === 'pending') {
    return [
      { label: '巡检任务单编号', key: 'taskNo' },
      { label: '任务名称', key: 'taskName' },
      { label: '巡检分类', key: 'inspectionCategory' },
      { label: '巡检人', key: 'inspector' },
      { label: '截止日期', key: 'deadline' },
      { label: '执行状态', key: 'status' },
    ]
  }
  if (detailType.value === 'inspection' && detailFilter.value === 'hazard') {
    return [
      { label: '整改单编号', key: 'rectifyNo' },
      { label: '巡检任务单编号', key: 'taskNo' },
      { label: '隐患描述', key: 'desc' },
      { label: '整改状态', key: 'status' },
      { label: '整改截止日期', key: 'deadline' },
      { label: '整改日期', key: 'rectDate' },
      { label: '复查日期', key: 'reviewDate' },
    ]
  }
  if (detailType.value === 'major') {
    return [
      { label: '监测点', key: 'point' },
      { label: '监测指标', key: 'metric' },
      { label: '最新值', key: 'latest' },
      { label: '预警阈值', key: 'threshold' },
      { label: '采集时间', key: 'time' },
      { label: '状态', key: 'status' },
    ]
  }
  return []
})
const projectDrillRows = computed(() => {
  if (!selectedProject.value) return []
  if (detailType.value === 'inspection' && detailFilter.value === 'pending') return projectInspectionRows.value
  if (detailType.value === 'inspection' && detailFilter.value === 'hazard') return projectHazardRows.value
  if (detailType.value === 'major') return monitorTableRows.value
  return []
})
const isProjectDrill = computed(() => Boolean(selectedProject.value && projectDrillColumns.value.length))
const detailConfig = computed(() => DETAIL_CONFIG[detailType.value] || null)
const mapPoints = computed(() => buildMapPoints(selectionId.value, projectRows)
  .filter((item) => activeLayers.value.includes(item.type)))

const trendPoints = computed(() => {
  const width = 700
  const height = 104
  const makePoints = (keys) => {
    const maximum = Math.max(...trend.value.flatMap((item) => keys.map((key) => Number(item[key] || 0))), 1)
    return Object.fromEntries(keys.map((key) => [
      key,
      trend.value.map((item, index) => {
        const x = trend.value.length === 1 ? width / 2 : (index / (trend.value.length - 1)) * width
        const y = height - (Number(item[key] || 0) / maximum) * 82 - 10
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' '),
    ]))
  }
  return {
    ...makePoints(['ai', 'aiUnhandled']),
    ...makePoints(['inspectionCount', 'hazardCount']),
  }
})

const realtimeAlerts = computed(() => {
  const alerts = []
  aiOverview.value.latest.slice(0, 3).forEach((item) => {
    alerts.push({
      id: `ai-${item.id}`,
      type: 'ai',
      time: String(item.occurredAt || '').slice(11, 16) || '10:25',
      source: 'AI预警',
      content: item.alertType || '现场不安全行为',
      location: selectedProject.value ? item.location : (item.projectName || item.location),
      project: item.projectName || selectedProject.value?.label || '全机场工程',
      level: item.requiresDisposal === false ? '—' : item.status === '未处置' ? '重大' : '一般',
      status: item.status,
    })
  })
  monitorRows.value.slice(0, 3).forEach((item, index) => {
    alerts.push({
      id: `monitor-${item.id}`,
      type: item.type === '危大' ? 'major' : 'machine',
      time: item.time || `10:${String(20 - index).padStart(2, '0')}`,
      source: item.type === '危大' ? '危大监测' : '机械设备',
      content: item.title,
      location: selectedProject.value ? item.position : item.project,
      project: item.project || selectedProject.value?.label || '全机场工程',
      level: item.level || '一般',
      status: '未处置',
    })
  })
  const overdue = (selectedProject.value ? [selectedProject.value] : projectRows)
    .filter((row) => row.inspectionOverdue > 0)
    .slice(0, 2)
  overdue.forEach((row, index) => {
    alerts.push({
      id: `inspection-${row.id}`,
      type: 'inspection',
      time: `10:${String(20 - index * 3).padStart(2, '0')}`,
      source: '巡检',
      content: '隐患逾期未整改',
      location: selectedProject.value ? '施工现场' : row.label,
      project: row.label,
      level: '较大',
      status: '待处理',
    })
  })
  return alerts.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5)
})

function pad(value) {
  return String(value).padStart(2, '0')
}

function tick() {
  const now = new Date()
  clockText.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  dateText.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  weekdayText.value = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()]
  if (!lastRefresh.value) lastRefresh.value = clockText.value
}

function changeProject(eventOrId) {
  const id = typeof eventOrId === 'string' ? eventOrId : eventOrId.target.value
  if (!allowedIds.has(id)) return
  selectionId.value = id
  selectedPoint.value = null
  if (id === HQ_SELECTION_ID) mapMode.value = 'gis'
  router.replace({ query: { ...route.query, projectId: id } })
}

function changeLevel(event) {
  const level = event.target.value
  if (level === 'hq') changeProject(HQ_SELECTION_ID)
  else if (!selectedProject.value) changeProject(projectRows[0]?.id || HQ_SELECTION_ID)
}

function toggleLayer(type) {
  activeLayers.value = activeLayers.value.includes(type)
    ? activeLayers.value.filter((item) => item !== type)
    : [...activeLayers.value, type]
}

function enterPointProject() {
  if (selectedPoint.value?.projectId) changeProject(selectedPoint.value.projectId)
}

function refreshData() {
  const now = new Date()
  lastRefresh.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  else document.exitFullscreen?.()
}

function closeScreen() {
  if (window.opener && !window.opener.closed) {
    window.close()
    return
  }
  window.location.hash = '#/workbench'
}

function openDetail(type, filter = '') {
  if (!DETAIL_CONFIG[type]) return
  detailType.value = type
  detailFilter.value = filter
}

function openHqDetail(type) {
  openDetail(type)
}

function closeHqDetail() {
  detailType.value = ''
  detailFilter.value = ''
}

function enterDetailProject(projectId) {
  closeHqDetail()
  changeProject(projectId)
}

function handleRealtimeAlert(item) {
  if (item.type === 'inspection') {
    router.push('/safety-inspection/task')
    return
  }
  if (item.type === 'ai') {
    router.push('/ai-app/unsafe-behavior')
    return
  }
  if (item.type === 'major') {
    router.push('/major-hazard/alert-record')
    return
  }
  router.push('/machine-supervise/alert-record')
}

function detailValue(row, column) {
  if (column.key === 'status' && row.overdue && row.status === '待执行') return '逾期未执行'
  const value = row[column.key]
  if (value === '' || value === null || value === undefined) return '—'
  return `${value}${column.suffix || ''}`
}

/**
 * 画布等比缩放（用户 2026-10-21，方案 A）：
 * 大屏按 1920×1080 设计稿排版，再整体缩放到视口内并居中，
 * 避免窗口偏矮时面板被压扁、文字重叠（看着像乱码）。
 */
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
const screenScale = ref(1)

function updateScreenScale() {
  const w = window.innerWidth || DESIGN_WIDTH
  const h = window.innerHeight || DESIGN_HEIGHT
  const scale = Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT)
  screenScale.value = Number.isFinite(scale) && scale > 0 ? Number(scale.toFixed(4)) : 1
}

onMounted(() => {
  document.body.classList.add('coc-hq-shell')
  updateScreenScale()
  window.addEventListener('resize', updateScreenScale)
  tick()
  timer = window.setInterval(tick, 1000)
})

onUnmounted(() => {
  document.body.classList.remove('coc-hq-shell')
  window.removeEventListener('resize', updateScreenScale)
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="safety-screen-app" :style="{ '--screen-scale': screenScale }">
    <HqEdgeLights />

    <header class="safety-header">
      <img class="safety-header__bg" :src="headerBg" alt="" aria-hidden="true" />
      <div class="safety-header__left">
        <select class="level-chip level-select" :value="selectedProject ? 'project' : 'hq'" @change="changeLevel">
          <option value="hq">全机场工程</option>
          <option value="project">项目层级</option>
        </select>
        <select class="project-select" :value="selectionId" @change="changeProject">
          <option :value="HQ_SELECTION_ID">全部项目</option>
          <option v-for="project in projectRows" :key="project.id" :value="project.id">{{ project.label }}</option>
        </select>
      </div>
      <h1>{{ headerTitle }}</h1>
      <div class="safety-header__right">
        <span class="refresh-time">更新 {{ lastRefresh }}</span>
        <div class="header-clock"><strong>{{ clockText }}</strong><span>{{ dateText }}<br />{{ weekdayText }}</span></div>
        <img :src="weatherIcon" alt="" class="weather-icon" />
        <span class="temperature">32℃</span>
        <button title="刷新数据" @click="refreshData"><el-icon><Refresh /></el-icon></button>
        <button title="全屏" @click="toggleFullscreen"><el-icon><FullScreen /></el-icon></button>
        <button title="关闭" @click="closeScreen"><el-icon><Close /></el-icon></button>
      </div>
    </header>

    <main class="dashboard-shell" :class="{ 'dashboard-shell--hq': !selectedProject, 'dashboard-shell--project': selectedProject }">
      <template v-if="!selectedProject">
        <section class="screen-panel layout-left-top hq-project-panel">
          <div class="panel-heading"><span>工程层级与项目状态</span><small>点击项目可下钻</small></div>
          <div class="project-status-table">
            <div class="project-status-head"><span>项目名称</span><span>状态</span><span>待整改隐患</span><span>未处置预警</span></div>
            <button v-for="row in hqProjectRows" :key="row.id" class="project-status-row" @click="row.id !== HQ_SELECTION_ID && changeProject(row.id)">
              <span class="project-name" :title="row.fullName">▸ {{ row.label }}</span>
              <b class="status-pill" :class="{ 'status-pill--danger': row.status === '预警', 'status-pill--warning': row.status === '关注', 'status-pill--normal': row.status === '正常' }">{{ row.status }}</b>
              <em>{{ row.hazardPending }}</em>
              <em :class="{ danger: row.unhandled > 0 }">{{ row.unhandled }}</em>
            </button>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="screen-panel layout-left-top project-overview-panel">
          <div class="panel-heading"><span>项目实时安全总览</span><small>{{ selectedProject.label }}</small></div>
          <div class="project-overview-list">
            <button type="button" class="overview-item overview-item--labor is-drillable" title="点击查看人员实名制明细" @click="openDetail('labor')">
              <div class="overview-icon">人</div><strong>人员</strong>
              <div class="overview-metrics"><div><span>在岗人数</span><b>{{ scope.people }}</b><em>人</em></div><div><span>特种作业人员</span><b>{{ scope.specialPeople }}</b><em>人</em></div><div><span>今日综合出勤率</span><b>{{ scope.attendanceRate }}%</b></div></div>
            </button>
            <button type="button" class="overview-item overview-item--vehicle is-drillable" title="点击查看车辆进出场明细" @click="openDetail('vehicle')">
              <div class="overview-icon">车</div><strong>车辆</strong>
              <div class="overview-metrics"><div><span>今日进场</span><b>{{ scope.vehicleIn }}</b><em>辆</em></div><div><span>今日出场</span><b>{{ scope.vehicleOut }}</b><em>辆</em></div><div><span>在场车辆</span><b>{{ scope.vehicles }}</b><em>辆</em></div></div>
            </button>
            <button type="button" class="overview-item overview-item--machine is-drillable" title="点击查看机械设备监管明细" @click="openDetail('machine')">
              <div class="overview-icon">机</div><strong>机械</strong>
              <div class="overview-metrics"><div><span>在场监测设备</span><b>{{ scope.machineDevices }}</b><em>台</em></div><div><span>离线监测设备</span><b class="danger">{{ scope.machineOffline }}</b><em>台</em></div><div><span>监测设备在线率</span><b>{{ scope.machineOnlineRate }}%</b></div></div>
            </button>
            <button type="button" class="overview-item overview-item--inspection is-drillable" title="点击查看该项目待巡检任务单" @click="openDetail('inspection', 'pending')">
              <div class="overview-icon">巡</div><strong>巡检</strong>
              <div class="overview-metrics"><div><span>待执行巡检</span><b>{{ scope.inspectionPending }}</b><em>项</em></div><div><span>逾期巡检</span><b class="danger">{{ scope.inspectionOverdue }}</b><em>项</em></div><div><span>巡检任务完成率</span><b>{{ scope.inspectionRate }}%</b></div></div>
            </button>
            <button type="button" class="overview-item overview-item--hazard is-drillable" title="点击查看该项目隐患整改明细" @click="openDetail('inspection', 'hazard')">
              <div class="overview-icon">!</div><strong>隐患</strong>
              <div class="overview-metrics overview-metrics--four"><div><span>待整改</span><b class="warn">{{ hazardBreakdown.pending }}</b></div><div><span>待复查</span><b>{{ hazardBreakdown.review }}</b></div><div><span>逾期隐患</span><b class="danger">{{ hazardBreakdown.overdue }}</b></div><div><span>隐患闭环率</span><b>{{ scope.hazardClosureRate }}%</b></div></div>
            </button>
          </div>
        </section>
      </template>

      <section class="screen-panel layout-center-top map-panel">
        <div class="map-toolbar">
          <div>
            <span class="map-title"><el-icon><Location /></el-icon>{{ selectedProject ? `${selectedProject.label} / BIM+GIS安全空间视图` : 'BIM+GIS安全空间视图' }}</span>
            <small>{{ selectedProject ? '项目安全数据与模型点位融合展示' : '全机场工程安全数据汇聚展示' }}</small>
          </div>
          <div class="mode-switch">
            <button :class="{ active: mapMode === 'gis' }" @click="mapMode = 'gis'">GIS</button>
            <button :class="{ active: mapMode === 'bim' }" :disabled="!selectedProject" @click="mapMode = 'bim'">BIM</button>
          </div>
        </div>
        <div class="layer-bar map-layer-bar">
          <span>数据图层</span>
          <button v-for="layer in MAP_LAYER_OPTIONS" :key="layer.value" :class="{ active: activeLayers.includes(layer.value) }" @click="toggleLayer(layer.value)"><i :style="{ background: layer.color }" />{{ layer.label }}</button>
        </div>
        <div class="map-scene" :class="[`mode-${mapMode}`, { 'project-scene': selectedProject }]">
          <div class="map-grid-lines" />
          <div class="airport-runway runway-a"><span>16L / 34R</span></div>
          <div class="airport-runway runway-b"><span>16R / 34L</span></div>
          <div class="terminal-shape terminal-main"><i /><i /><i /><span>{{ selectedProject && mapMode === 'bim' ? 'BIM施工模型' : '航站区' }}</span></div>
          <div class="terminal-shape terminal-side"><i /><i /><span>施工区域</span></div>
          <div v-if="selectedProject && mapMode === 'bim'" class="bim-model">
            <div class="bim-floor floor-4">屋面层</div><div class="bim-floor floor-3">设备层</div><div class="bim-floor floor-2">主体结构</div><div class="bim-floor floor-1">基础层</div>
          </div>
          <div class="map-metric-rail">
            <div><span>在岗人员</span><strong>{{ scope.people }}</strong><em>人</em></div>
            <div><span>在场车辆</span><strong>{{ scope.vehicles }}</strong><em>辆</em></div>
            <div><span>巡检待执行</span><strong>{{ scope.inspectionPending }}</strong><em>项</em></div>
            <div><span>监测未处置</span><strong>{{ scope.machineUnhandled + scope.majorUnhandled }}</strong><em>条</em></div>
            <div><span>AI未处置</span><strong>{{ scope.aiUnhandled }}</strong><em>条</em></div>
          </div>
          <button
            v-for="point in mapPoints"
            :key="point.id"
            class="map-point"
            :class="[`point-${point.type}`, { selected: selectedPoint?.id === point.id, cluster: !selectedProject }]"
            :style="{ left: `${point.x}%`, top: `${point.y}%`, '--point-color': getTypeMeta(point.type).color }"
            :title="point.title"
            @click="selectedPoint = point"
          >
            <span>{{ selectedProject ? getTypeMeta(point.type).icon : point.value }}</span>
            <em v-if="selectedProject">{{ point.title }}</em>
          </button>
          <div v-if="selectedPoint" class="point-popover">
            <button class="popover-close" @click="selectedPoint = null">×</button>
            <div class="popover-type" :style="{ color: getTypeMeta(selectedPoint.type).color }">{{ getTypeMeta(selectedPoint.type).label }}</div>
            <h4>{{ selectedPoint.title }}</h4>
            <p>{{ selectedPoint.subtitle }}</p>
            <div class="popover-detail">{{ selectedPoint.detail }}</div>
            <button v-if="!selectedProject" class="enter-project-btn" @click="enterPointProject">进入项目级大屏</button>
          </div>
          <div class="map-compass"><span>N</span><i /></div>
          <div class="map-scale"><i />500m</div>
          <div class="map-status"><span />BIM+GIS服务正常</div>
        </div>
      </section>

      <template v-if="!selectedProject">
        <section class="screen-panel layout-right-top hq-detail-panel">
          <div class="panel-heading"><span>全机场工程 / 当前安全详情</span><small>指挥部级</small></div>
          <button class="hq-detail-block is-drillable" @click="openHqDetail('inspection')">
            <h3>巡检隐患</h3><div class="detail-metric-row"><div><span>巡检隐患总数</span><b>{{ hazardBreakdown.total }}</b></div><div><span>待整改隐患</span><b class="warn">{{ hazardBreakdown.pending }}</b></div><div><span>待复查隐患</span><b>{{ hazardBreakdown.review }}</b></div><div><span>逾期隐患</span><b class="danger">{{ hazardBreakdown.overdue }}</b></div><div><span>隐患闭环率</span><b>{{ scope.hazardClosureRate }}%</b></div></div>
          </button>
          <button class="hq-detail-block is-drillable" @click="openHqDetail('major')">
            <h3>危大工程监测</h3><div class="detail-metric-row"><div><span>监测区域</span><b>{{ scope.majorRegions }}</b></div><div><span>监测点</span><b>{{ scope.majorPoints }}</b></div><div><span>当前超阈值</span><b class="danger">{{ scope.majorUnhandled }}</b></div><div><span>在线设备率</span><b>{{ scope.majorOnlineRate }}%</b></div></div>
          </button>
          <button class="hq-detail-block is-drillable" @click="openHqDetail('labor')">
            <h3>现场资源</h3><div class="detail-metric-row"><div><span>在岗人员</span><b>{{ scope.people }}</b></div><div><span>在场车辆</span><b>{{ scope.vehicles }}</b></div><div><span>巡检任务完成率</span><b>{{ scope.inspectionRate }}%</b></div><div><span>在线监测设备</span><b>{{ scope.machineOnline }}/{{ scope.machineDevices }}</b></div></div>
          </button>
          <button class="hq-detail-block is-drillable" @click="openHqDetail('ai')">
            <h3>AI预警</h3><div class="detail-metric-row detail-metric-row--short"><div><span>未处置</span><b class="danger">{{ aiOverview.unhandled }}</b></div><div><span>AI预警处置率</span><b>{{ aiOverview.handlingRate }}%</b></div></div>
          </button>
        </section>
      </template>

      <template v-else>
        <section class="screen-panel layout-right-top project-monitor-panel is-drillable" title="点击查看危大工程监测明细" @click="openDetail('major')">
          <div class="panel-heading"><span>危大工程监测</span><small>深基坑 · 地铁铁路 · 高支模</small></div>
          <div class="major-metrics project-major-metrics">
            <div><span>监测区域</span><strong>{{ scope.majorRegions }}</strong></div><div><span>监测点</span><strong>{{ scope.majorPoints }}</strong></div><div><span>当前超阈值</span><strong class="danger">{{ scope.majorUnhandled }}</strong></div><div><span>在线设备率</span><strong>{{ scope.majorOnlineRate }}%</strong></div>
          </div>
          <div class="monitor-table">
            <div class="monitor-table-head"><span>监测点</span><span>监测指标</span><span>最新值</span><span>预警阈值</span><span>采集时间</span><span>状态</span></div>
            <div v-for="item in monitorTableRows" :key="item.id" class="monitor-table-row"><span :title="item.point">{{ item.point }}</span><span>{{ item.metric }}</span><span :class="{ danger: item.status === '超阈值' }">{{ item.latest }}</span><span>{{ item.threshold }}</span><span>{{ item.time }}</span><b :class="item.status === '超阈值' ? 'danger' : 'normal'">{{ item.status }}</b></div>
          </div>
        </section>
      </template>

      <template v-if="!selectedProject">
        <section class="screen-panel layout-left-bottom hq-ai-trend trend-panel">
          <div class="panel-heading"><span>AI预警趋势</span><small>本周：{{ trend[0]?.label }}—{{ trend[trend.length - 1]?.label }}</small></div>
          <div class="trend-stat-strip"><div><span>本周AI预警数</span><b>{{ aiOverview.total }}</b></div><div><span>本周未处置AI预警数</span><b class="warn">{{ aiOverview.unhandled }}</b></div><div><span>本周已处置AI预警数</span><b>{{ aiOverview.handled }}</b></div><div><span>本周AI预警处置率</span><b>{{ aiOverview.handlingRate }}%</b></div></div>
          <div class="trend-legend"><span class="ai">AI预警数</span><span class="machine">未处置AI预警数</span></div>
          <svg viewBox="0 0 700 112" preserveAspectRatio="none" aria-label="AI预警趋势图"><line v-for="n in 4" :key="n" x1="0" :y1="n * 22" x2="700" :y2="n * 22" class="grid-line" /><polyline :points="trendPoints.ai" class="trend-line ai" /><polyline :points="trendPoints.aiUnhandled" class="trend-line machine" /></svg>
          <div class="trend-axis"><span v-for="(item, index) in trend" v-show="trendRange === 7 || index % 5 === 0 || index === trend.length - 1" :key="item.label">{{ item.label }}</span></div>
        </section>
        <section class="screen-panel layout-center-bottom hq-task-hazard-panel">
          <div class="panel-heading"><span>巡检任务与隐患</span><small>单位：项</small></div>
          <div class="stacked-bar-list">
            <div class="stacked-bar-row">
              <div class="stacked-bar-row__head"><strong>巡检任务</strong><div class="stacked-bar-legend"><span class="done">已完成</span><span class="pending">待执行</span></div></div>
              <div class="stacked-bar-row__chart"><div class="stacked-track"><i class="stacked-segment stacked-segment--done" :style="{ width: `${scope.inspectionTotal ? scope.inspectionDone / scope.inspectionTotal * 100 : 0}%` }">{{ scope.inspectionDone }}</i><i class="stacked-segment stacked-segment--pending" :style="{ width: `${scope.inspectionTotal ? scope.inspectionPending / scope.inspectionTotal * 100 : 0}%` }">{{ scope.inspectionPending }}</i></div><b>{{ scope.inspectionTotal }}</b></div>
            </div>
            <div class="stacked-bar-row">
              <div class="stacked-bar-row__head"><strong>隐患状态</strong><div class="stacked-bar-legend"><span class="danger-text">待整改</span><span class="warn-text">待复查</span><span class="blue-text">已复查</span><span class="done-text">已关闭</span></div></div>
              <div class="stacked-bar-row__chart"><div class="stacked-track"><i class="stacked-segment stacked-segment--danger" :style="{ width: `${hazardBreakdown.total ? hazardBreakdown.pending / hazardBreakdown.total * 100 : 0}%` }">{{ hazardBreakdown.pending }}</i><i class="stacked-segment stacked-segment--warn" :style="{ width: `${hazardBreakdown.total ? hazardBreakdown.review / hazardBreakdown.total * 100 : 0}%` }">{{ hazardBreakdown.review }}</i><i class="stacked-segment stacked-segment--blue" :style="{ width: `${hazardBreakdown.total ? hazardBreakdown.reviewed / hazardBreakdown.total * 100 : 0}%` }">{{ hazardBreakdown.reviewed }}</i><i class="stacked-segment stacked-segment--closed" :style="{ width: `${hazardBreakdown.total ? hazardBreakdown.closed / hazardBreakdown.total * 100 : 0}%` }">{{ hazardBreakdown.closed }}</i></div><b>{{ hazardBreakdown.total }}</b></div>
            </div>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="screen-panel layout-left-bottom project-ai-panel trend-panel">
          <div class="panel-heading"><span>AI预警</span><small>本周：{{ trend[0]?.label }}—{{ trend[trend.length - 1]?.label }}</small></div>
          <div class="trend-stat-strip"><div><span>本周AI预警数</span><b>{{ aiOverview.total }}</b></div><div><span>本周未处置AI预警数</span><b class="warn">{{ aiOverview.unhandled }}</b></div><div><span>本周已处置AI预警数</span><b>{{ aiOverview.handled }}</b></div><div><span>本周AI预警处置率</span><b>{{ aiOverview.handlingRate }}%</b></div></div>
          <div class="trend-legend"><span class="ai">AI预警数</span><span class="machine">未处置AI预警数</span></div>
          <svg viewBox="0 0 700 112" preserveAspectRatio="none" aria-label="AI预警趋势图"><line v-for="n in 4" :key="n" x1="0" :y1="n * 22" x2="700" :y2="n * 22" class="grid-line" /><polyline :points="trendPoints.ai" class="trend-line ai" /><polyline :points="trendPoints.aiUnhandled" class="trend-line machine" /></svg>
          <div class="trend-axis"><span v-for="(item, index) in trend" v-show="trendRange === 7 || index % 5 === 0 || index === trend.length - 1" :key="item.label">{{ item.label }}</span></div>
        </section>
        <section class="screen-panel layout-center-bottom project-inspection-trend trend-panel">
          <div class="panel-heading"><span>巡检隐患趋势</span><small>本周：{{ trend[0]?.label }}—{{ trend[trend.length - 1]?.label }}</small></div>
          <div class="trend-stat-strip"><div><span>本周巡检数</span><b>{{ scope.inspectionTotal }}</b></div><div><span>本周隐患数</span><b class="warn">{{ scope.inspectionHazards }}</b></div><div><span>本周已关闭隐患数</span><b>{{ hazardBreakdown.closed }}</b></div><div><span>本周隐患闭环率</span><b>{{ scope.hazardClosureRate }}%</b></div></div>
          <div class="trend-legend"><span class="inspection">每日巡检数</span><span class="machine">每日隐患数</span></div>
          <svg viewBox="0 0 700 112" preserveAspectRatio="none" aria-label="巡检隐患趋势图"><line v-for="n in 4" :key="n" x1="0" :y1="n * 22" x2="700" :y2="n * 22" class="grid-line" /><polyline :points="trendPoints.inspectionCount" class="trend-line inspection" /><polyline :points="trendPoints.hazardCount" class="trend-line machine" /></svg>
          <div class="trend-axis"><span v-for="(item, index) in trend" v-show="trendRange === 7 || index % 5 === 0 || index === trend.length - 1" :key="item.label">{{ item.label }}</span></div>
        </section>
      </template>

      <section class="screen-panel layout-right-bottom realtime-panel">
        <div class="panel-heading"><span>实时预警列表</span><small>{{ realtimeAlerts.length }}条</small></div>
        <div class="realtime-table">
          <div class="realtime-head" :class="{ 'realtime-head--hq': !selectedProject }"><span>时间</span><span>来源</span><span>预警内容</span><span>{{ selectedProject ? '位置' : '项目/区域' }}</span><span v-if="selectedProject">等级</span><span>操作</span></div>
          <div v-for="item in realtimeAlerts" :key="item.id" class="realtime-row" :class="{ 'realtime-row--hq': !selectedProject }" @click="handleRealtimeAlert(item)">
            <span>{{ item.time }}</span><span class="realtime-source"><i :class="`realtime-dot realtime-dot--${item.type}`" />{{ item.source }}</span><span class="realtime-content" :title="item.content">{{ item.content }}</span><span class="realtime-location" :title="selectedProject ? item.location : item.project">{{ selectedProject ? item.location : item.project }}</span><b v-if="selectedProject" :class="{ danger: item.level === '重大' || item.level === '较大', warn: item.level === '一般' }">{{ item.level }}</b><button @click.stop="handleRealtimeAlert(item)">处理</button>
          </div>
          <div v-if="!realtimeAlerts.length" class="empty-state">当前范围暂无实时预警</div>
        </div>
      </section>
    </main>

    <div v-if="detailConfig" class="detail-modal-mask" @click.self="closeHqDetail">
      <section class="detail-modal" role="dialog" aria-modal="true" :aria-label="detailConfig.title">
        <header class="detail-modal__header">
          <div><span>{{ detailConfig.title }}</span><small>{{ detailScopeLabel }}</small></div>
          <button title="关闭明细" @click="closeHqDetail">×</button>
        </header>
        <div class="detail-modal__source"><span>数据来源</span>{{ detailConfig.source }}<em>{{ selectedProject ? (isProjectDrill ? '当前项目明细清单' : '当前项目指标明细') : '点击项目名称可进入项目级大屏' }}</em></div>
        <div class="detail-table-wrap">
          <table v-if="isProjectDrill" class="detail-table detail-table--drill">
            <thead><tr><th v-for="column in projectDrillColumns" :key="column.key">{{ column.label }}</th></tr></thead>
            <tbody>
              <tr v-for="row in projectDrillRows" :key="row.id">
                <td v-for="column in projectDrillColumns" :key="column.key" :class="{ 'detail-cell--danger': column.key === 'status' && (row.status === '待执行' && row.overdue || row.status === '待整改'), 'detail-cell--warn': column.key === 'status' && row.status === '待复查' }" :title="String(row[column.key] ?? '')">{{ detailValue(row, column) }}</td>
              </tr>
            </tbody>
          </table>
          <table v-else class="detail-table">
            <thead><tr><th>项目名称</th><th v-for="column in detailConfig.columns" :key="column.key">{{ column.label }}</th></tr></thead>
            <tbody>
              <tr v-for="row in detailRows" :key="row.id">
                <td><button v-if="!selectedProject" :title="row.fullName" @click="enterDetailProject(row.id)">{{ row.label }}</button><span v-else>{{ row.label }}</span></td>
                <td v-for="column in detailConfig.columns" :key="column.key">{{ detailValue(row, column) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

  </div>
</template>
