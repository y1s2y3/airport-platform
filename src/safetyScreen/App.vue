<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close, FullScreen, Location, Refresh } from '@element-plus/icons-vue'
import HqEdgeLights from '../coc/components/hq/HqEdgeLights.vue'
import headerBg from '../coc/assets/hq/header/header-bg.png'
import weatherIcon from '../coc/assets/hq/header/weather-icon.svg?url'
import {
  HQ_SELECTION_ID,
  LAYER_OPTIONS,
  buildMapPoints,
  buildMonitorRows,
  buildProjectCompareRows,
  buildProjectRows,
  buildScopeSummary,
  buildTrend,
  getAiOverview,
  getTypeMeta,
} from './mock/situationData.js'
import './styles/screen.css'

const route = useRoute()
const router = useRouter()
const projectRows = buildProjectRows()
const allowedIds = new Set([HQ_SELECTION_ID, ...projectRows.map((item) => item.id)])
const requestedProjectId = String(route.query.projectId || '')

const selectionId = ref(allowedIds.has(requestedProjectId) ? requestedProjectId : HQ_SELECTION_ID)
const mapMode = ref('gis')
const trendRange = ref(7)
const activeLayers = ref(LAYER_OPTIONS.map((item) => item.value))
const selectedPoint = ref(null)
const clockText = ref('')
const dateText = ref('')
const weekdayText = ref('')
const lastRefresh = ref('')
const detailType = ref('')
let timer = null

const DETAIL_CONFIG = {
  labor: {
    title: '人员实名制管理明细',
    source: '人员实名制管理 > 实名制统计',
    columns: [
      { label: '在岗人数', key: 'people', suffix: '人' },
      { label: '管理人员', key: 'managers', suffix: '人' },
      { label: '建筑工人', key: 'workers', suffix: '人' },
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
const levelLabel = computed(() => selectedProject.value ? '项目级' : '工程指挥部级')
const scope = computed(() => buildScopeSummary(selectedProject.value, projectRows))
const vehicleTrafficTotal = computed(() => scope.value.vehicleIn + scope.value.vehicleOut)
const vehicleInAngle = computed(() => vehicleTrafficTotal.value
  ? Math.round((scope.value.vehicleIn / vehicleTrafficTotal.value) * 360)
  : 0)
const vehicleBalance = computed(() => {
  const difference = scope.value.vehicleIn - scope.value.vehicleOut
  if (difference > 0) return `净进场 ${difference}辆`
  if (difference < 0) return `净出场 ${Math.abs(difference)}辆`
  return '进出持平'
})
const aiOverview = computed(() => getAiOverview(selectionId.value))
const trend = computed(() => buildTrend(selectedProject.value, projectRows, trendRange.value))
const projectCompareRows = computed(() => buildProjectCompareRows(selectedProject.value ? [selectedProject.value] : projectRows))
const monitorRows = computed(() => buildMonitorRows(selectedProject.value, projectRows))
const detailConfig = computed(() => DETAIL_CONFIG[detailType.value] || null)
const mapPoints = computed(() => buildMapPoints(selectionId.value, projectRows)
  .filter((item) => activeLayers.value.includes(item.type)))

const trendPoints = computed(() => {
  const width = 700
  const height = 104
  const keys = ['inspection', 'machine', 'major', 'ai']
  const maximum = Math.max(...trend.value.flatMap((item) => keys.map((key) => item[key])), 1)
  return Object.fromEntries(keys.map((key) => [
    key,
    trend.value.map((item, index) => {
      const x = trend.value.length === 1 ? width / 2 : (index / (trend.value.length - 1)) * width
      const y = height - (item[key] / maximum) * 82 - 10
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' '),
  ]))
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

function toggleLayer(type) {
  activeLayers.value = activeLayers.value.includes(type)
    ? activeLayers.value.filter((item) => item !== type)
    : [...activeLayers.value, type]
}

function enterPointProject() {
  if (selectedPoint.value?.projectId) changeProject(selectedPoint.value.projectId)
}

function attentionTone(row) {
  if (row.attention >= 8) return 'danger'
  if (row.attention >= 4) return 'warning'
  return 'normal'
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

function openHqDetail(type) {
  if (selectedProject.value || !DETAIL_CONFIG[type]) return
  detailType.value = type
}

function closeHqDetail() {
  detailType.value = ''
}

function enterDetailProject(projectId) {
  closeHqDetail()
  changeProject(projectId)
}

function detailValue(row, column) {
  return `${row[column.key] ?? 0}${column.suffix || ''}`
}

onMounted(() => {
  document.body.classList.add('coc-hq-shell')
  tick()
  timer = window.setInterval(tick, 1000)
})

onUnmounted(() => {
  document.body.classList.remove('coc-hq-shell')
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="safety-screen-app">
    <HqEdgeLights />

    <header class="safety-header">
      <img class="safety-header__bg" :src="headerBg" alt="" aria-hidden="true" />
      <div class="safety-header__left">
        <span class="level-chip"><i />{{ levelLabel }}</span>
        <select class="project-select" :value="selectionId" @change="changeProject">
          <option :value="HQ_SELECTION_ID">工程指挥部 · 全部项目</option>
          <option v-for="project in projectRows" :key="project.id" :value="project.id">{{ project.label }}</option>
        </select>
      </div>
      <h1>深圳机场建设工程安全态势大屏</h1>
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

    <main class="dashboard-shell">
      <aside class="dashboard-column dashboard-column--left">
        <section class="screen-panel labor-panel" :class="{ 'is-drillable': !selectedProject }" @click="openHqDetail('labor')">
          <div class="panel-heading"><span>人员实名制管理</span><small>{{ selectedProject ? '当前在岗' : '点击查看明细' }}</small></div>
          <div class="metric-quad">
            <div><span>在岗人数</span><strong>{{ scope.people }}</strong><em>人</em></div>
            <div><span>管理人员</span><strong>{{ scope.managers }}</strong><em>人</em></div>
            <div><span>建筑工人</span><strong>{{ scope.workers }}</strong><em>人</em></div>
            <div><span>特种作业</span><strong>{{ scope.specialPeople }}</strong><em>人</em></div>
          </div>
          <div class="rate-list">
            <div><p><span>今日综合出勤率</span><b>{{ scope.attendanceRate }}%</b></p><i><em :style="{ width: `${scope.attendanceRate}%` }" /></i></div>
            <div><p><span>管理人员出勤率</span><b>{{ scope.manageAttendanceRate }}%</b></p><i><em :style="{ width: `${scope.manageAttendanceRate}%` }" /></i></div>
          </div>
          <div class="inline-alerts">
            <span>今日实名制预警 <b>{{ scope.laborTodayWarnings }}</b></span>
            <span>未处置 <b class="warn">{{ scope.laborPendingWarnings }}</b></span>
          </div>
        </section>

        <section class="screen-panel vehicle-panel" :class="{ 'is-drillable': !selectedProject, 'is-hq-card': !selectedProject }" @click="openHqDetail('vehicle')">
          <div class="panel-heading"><span>车辆进出场</span><small>{{ selectedProject ? '当日' : '点击查看明细' }}</small></div>
          <div v-if="!selectedProject" class="vehicle-traffic-visual">
            <div class="vehicle-direction vehicle-direction--in"><span>今日进场</span><strong>{{ scope.vehicleIn }}</strong><em>辆</em><i /></div>
            <div class="vehicle-traffic-ring" :style="{ '--in-rate': `${vehicleInAngle}deg` }">
              <div><span>今日通行</span><strong>{{ vehicleTrafficTotal }}</strong><em>车次</em></div>
            </div>
            <div class="vehicle-direction vehicle-direction--out"><span>今日出场</span><strong>{{ scope.vehicleOut }}</strong><em>辆</em><i /></div>
            <div class="vehicle-traffic-status"><span>当前在场 <b>{{ scope.vehicles }}</b> 辆</span><span>{{ vehicleBalance }}</span></div>
          </div>
          <div v-else class="vehicle-flow">
            <div><span>进场</span><strong>{{ scope.vehicleIn }}</strong><em>辆</em></div>
            <i class="flow-line"><b /></i>
            <div class="onsite"><span>在场</span><strong>{{ scope.vehicles }}</strong><em>辆</em></div>
            <i class="flow-line reverse"><b /></i>
            <div><span>出场</span><strong>{{ scope.vehicleOut }}</strong><em>辆</em></div>
          </div>
          <p v-if="selectedProject" class="panel-note">仅展示车辆管理看板的进场、出场与在场数据</p>
        </section>

        <section class="screen-panel inspection-panel" :class="{ 'is-drillable': !selectedProject }" @click="openHqDetail('inspection')">
          <div class="panel-heading"><span>巡检管理</span><small>{{ selectedProject ? '任务与隐患闭环' : '点击查看明细' }}</small></div>
          <div class="inspection-overview">
            <div class="ring" :style="{ '--rate': `${scope.inspectionRate * 3.6}deg` }"><div><strong>{{ scope.inspectionRate }}%</strong><span>任务完成率</span></div></div>
            <div class="inspection-stats">
              <div><span>任务总数</span><b>{{ scope.inspectionTotal }}</b></div>
              <div><span>待执行</span><b class="warn">{{ scope.inspectionPending }}</b></div>
              <div><span>已完成</span><b>{{ scope.inspectionDone }}</b></div>
              <div><span>逾期任务</span><b class="danger">{{ scope.inspectionOverdue }}</b></div>
            </div>
          </div>
          <div class="hazard-strip">
            <div><span>巡检隐患</span><strong>{{ scope.inspectionHazards }}</strong></div>
            <div><span>待整改</span><strong class="warn">{{ scope.hazardPending }}</strong></div>
            <div><span>逾期</span><strong class="danger">{{ scope.hazardOverdue }}</strong></div>
            <div><span>闭环率</span><strong>{{ scope.hazardClosureRate }}%</strong></div>
          </div>
        </section>
      </aside>

      <section class="dashboard-center">
        <section class="screen-panel map-panel">
          <div class="map-toolbar">
            <div>
              <span class="map-title"><el-icon><Location /></el-icon>{{ selectedProject ? selectedProject.fullName : '深圳机场建设工程安全总图' }}</span>
              <small>{{ selectedProject ? '项目安全数据与模型点位融合展示' : '全部在建项目安全数据汇聚展示' }}</small>
            </div>
            <div class="mode-switch">
              <button :class="{ active: mapMode === 'gis' }" @click="mapMode = 'gis'">GIS</button>
              <button :class="{ active: mapMode === 'bim' }" :disabled="!selectedProject" @click="mapMode = 'bim'">BIM</button>
            </div>
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

          <div class="layer-bar">
            <span>数据图层</span>
            <button v-for="layer in LAYER_OPTIONS" :key="layer.value" :class="{ active: activeLayers.includes(layer.value) }" @click="toggleLayer(layer.value)">
              <i :style="{ background: layer.color }" />{{ layer.label }}
            </button>
          </div>
        </section>

        <div class="center-lower-grid">
          <section class="screen-panel trend-panel">
            <div class="panel-heading">
              <span>巡检与预警趋势</span>
              <div class="range-switch"><button :class="{ active: trendRange === 7 }" @click="trendRange = 7">近7日</button><button :class="{ active: trendRange === 30 }" @click="trendRange = 30">近30日</button></div>
            </div>
            <div class="trend-legend"><span class="inspection">巡检待执行</span><span class="machine">机械预警</span><span class="major">危大预警</span><span class="ai">AI预警</span></div>
            <svg viewBox="0 0 700 112" preserveAspectRatio="none" aria-label="巡检与预警趋势图">
              <line v-for="n in 4" :key="n" x1="0" :y1="n * 22" x2="700" :y2="n * 22" class="grid-line" />
              <polyline :points="trendPoints.inspection" class="trend-line inspection" />
              <polyline :points="trendPoints.machine" class="trend-line machine" />
              <polyline :points="trendPoints.major" class="trend-line major" />
              <polyline :points="trendPoints.ai" class="trend-line ai" />
            </svg>
            <div class="trend-axis"><span v-for="(item, index) in trend" v-show="trendRange === 7 || index % 5 === 0 || index === trend.length - 1" :key="item.label">{{ item.label }}</span></div>
          </section>

          <section class="screen-panel compare-panel">
            <div class="panel-heading"><span>{{ selectedProject ? '当前项目关键状态' : '项目关注度排名' }}</span><small>{{ selectedProject ? selectedProject.label : '可下钻' }}</small></div>
            <div class="compare-head"><span>项目</span><span>巡检逾期</span><span>监测未处置</span><span>AI未处置</span></div>
            <button v-for="row in projectCompareRows" :key="row.id" class="compare-row" @click="changeProject(row.id)">
              <span :title="row.fullName"><i :class="attentionTone(row)" />{{ row.label }}</span>
              <b>{{ row.inspectionOverdue }}</b><b>{{ row.machineUnhandled + row.majorUnhandled }}</b><b>{{ row.aiUnhandled }}</b>
            </button>
          </section>
        </div>
      </section>

      <aside class="dashboard-column dashboard-column--right">
        <section class="screen-panel ai-panel" :class="{ 'is-drillable': !selectedProject }" @click="openHqDetail('ai')">
          <div class="panel-heading"><span>AI应用预警</span><small>{{ selectedProject ? '三类预警台账' : '点击查看明细' }}</small></div>
          <div class="ai-summary">
            <div><span>预警总数</span><strong>{{ aiOverview.total }}</strong></div>
            <div class="warn"><span>未处置</span><strong>{{ aiOverview.unhandled }}</strong></div>
            <div><span>已处置</span><strong>{{ aiOverview.handled }}</strong></div>
            <div><span>处置率</span><strong>{{ aiOverview.handlingRate }}%</strong></div>
          </div>
          <div class="ai-result-strip"><span>现场处理 <b>{{ aiOverview.processed }}</b></span><span>误报 <b>{{ aiOverview.falseAlarm }}</b></span></div>
          <div class="category-bars">
            <div v-for="category in aiOverview.categories" :key="category.key">
              <span>{{ category.label.replace('检测', '') }}</span><i><b :style="{ width: `${aiOverview.total ? Math.max(4, category.value / aiOverview.total * 100) : 0}%`, background: category.color }" /></i><strong>{{ category.value }}</strong>
            </div>
          </div>
          <div class="ai-latest-list">
            <div v-for="item in aiOverview.latest.slice(0, 3)" :key="item.id">
              <span class="ai-thumb">AI</span>
              <p><strong>{{ item.alertType }}</strong><em>{{ item.projectName }} · {{ item.location }}</em></p>
              <b :class="item.status === '未处置' ? 'unhandled' : 'handled'">{{ item.status }}</b>
            </div>
            <p v-if="!aiOverview.latest.length" class="empty-state">当前范围暂无AI预警</p>
          </div>
        </section>

        <section class="screen-panel machine-panel" :class="{ 'is-drillable': !selectedProject, 'is-hq-card': !selectedProject }" @click="openHqDetail('machine')">
          <div class="panel-heading"><span>机械设备监管</span><small>{{ selectedProject ? '设备与预警' : '点击查看明细' }}</small></div>
          <div class="device-overview">
            <div class="mini-ring" :style="{ '--rate': `${scope.machineOnlineRate * 3.6}deg` }"><div><strong>{{ scope.machineOnlineRate }}%</strong><span>在线率</span></div></div>
            <div class="device-metrics">
              <div><span>监测设备</span><b>{{ scope.machineDevices }}</b></div><div><span>在线设备</span><b>{{ scope.machineOnline }}</b></div><div><span>离线设备</span><b class="danger">{{ scope.machineOffline }}</b></div>
            </div>
          </div>
          <div class="alert-metrics"><span>预警总数 <b>{{ scope.machineAlerts }}</b></span><span>未处置 <b class="warn">{{ scope.machineUnhandled }}</b></span><span>重大 <b class="danger">{{ scope.machineMajorAlerts }}</b></span></div>
        </section>

        <section class="screen-panel major-panel" :class="{ 'is-drillable': !selectedProject }" @click="openHqDetail('major')">
          <div class="panel-heading"><span>危大工程监测</span><small>{{ selectedProject ? '深基坑 · 地铁铁路 · 高支模' : '点击查看明细' }}</small></div>
          <div class="major-metrics">
            <div><span>监测区域</span><strong>{{ scope.majorRegions }}</strong></div><div><span>监测点</span><strong>{{ scope.majorPoints }}</strong></div><div><span>接入设备</span><strong>{{ scope.majorDevices }}</strong></div><div><span>在线率</span><strong>{{ scope.majorOnlineRate }}%</strong></div>
          </div>
          <div class="major-alert-line"><span>今日预警 <b>{{ scope.majorTodayAlerts }}</b></span><span>未处置 <b class="danger">{{ scope.majorUnhandled }}</b></span></div>
          <div class="monitor-list">
            <div v-for="item in monitorRows.slice(0, 3)" :key="item.id">
              <i :class="item.type === '危大' ? 'major' : 'machine'">{{ item.type.slice(0, 1) }}</i>
              <p><strong>{{ item.title }}</strong><span>{{ item.project }} · {{ item.position }}</span></p>
              <em>{{ item.time }}</em>
            </div>
          </div>
        </section>
      </aside>
    </main>

    <div v-if="detailConfig" class="detail-modal-mask" @click.self="closeHqDetail">
      <section class="detail-modal" role="dialog" aria-modal="true" :aria-label="detailConfig.title">
        <header class="detail-modal__header">
          <div><span>{{ detailConfig.title }}</span><small>工程指挥部级 · {{ projectRows.length }}个在建项目</small></div>
          <button title="关闭明细" @click="closeHqDetail">×</button>
        </header>
        <div class="detail-modal__source"><span>数据来源</span>{{ detailConfig.source }}<em>点击项目名称可进入项目级大屏</em></div>
        <div class="detail-table-wrap">
          <table class="detail-table">
            <thead><tr><th>项目名称</th><th v-for="column in detailConfig.columns" :key="column.key">{{ column.label }}</th></tr></thead>
            <tbody>
              <tr v-for="row in projectRows" :key="row.id">
                <td><button :title="row.fullName" @click="enterDetailProject(row.id)">{{ row.label }}</button></td>
                <td v-for="column in detailConfig.columns" :key="column.key">{{ detailValue(row, column) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

  </div>
</template>
