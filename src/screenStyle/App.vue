<script setup>
import { SHOW_HAZARD_SAMPLING } from '../config/hazardSamplingVisibility.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Aim, ArrowLeft, ArrowRight, Clock, FullScreen, Location, Refresh, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import SafetyPanel from './components/SafetyPanel.vue'
import SafetyDetailDialog from './components/SafetyDetailDialog.vue'
import headerImage from '../coc/assets/hq/header/header-bg.png'
import aerialImage from './assets/airport-aerial.jpg'
import situationTabs from './assets/situation-tabs.png'
import {
  assessmentPeriods, clockText, dayKey, getAssessmentPreview, getDisplayedWork,
  getGeneratedInspectionTasks, getInspectionPeriod, getSamplingRowsInRange, getWorkGroups, getWorkRows, groupProjects,
  hazardStates, loadDashboard, percent, workColor,
} from './dashboardData.js'
import './styles/screen-style.css'

const WIDTH = 1920
const HEIGHT = 1080
const OVERDUE_PAGE_SIZE = 5
const OVERDUE_PAGE_INTERVAL = 5000
const REVIEW_BACKLOG_LABEL = '施工全面复查未办结'
const sections = [
  { key: 'quality', label: '质量态势' },
  { key: 'safety', label: '安全态势' },
  { key: 'project', label: '项目要素' },
]
const developmentSections = sections.filter(section => section.key !== 'safety')
const canvas = ref(null)
const sectionOrder = ref(sections)
const activeSection = computed(() => sectionOrder.value[1].key)
const scale = ref(1)
const now = ref(new Date())
const today = computed(() => dayKey(now.value))
const data = shallowRef(loadDashboard(today.value))
const overduePage = ref(0)
const overdueList = ref(null)
const workType = ref('danger')
const workDate = ref(today.value)
const detail = ref(null)
const assessmentPeriod = ref(assessmentPeriods()[0])
const assessmentGroup = ref('top')
let assessmentChangedAt = 0
const paused = ref(false)
const focusIndex = ref(0)
let focusReturn
let clockTimer
let refreshTimer
let carouselTimer
let overdueTimer

const clock = computed(() => clockText(now.value))
const canvasStyle = computed(() => ({ width: WIDTH + 'px', height: HEIGHT + 'px', transform: 'scale(' + scale.value + ')' }))
const assessmentRows = computed(() => assessmentPeriod.value ? getAssessmentPreview(assessmentPeriod.value.id) : [])
const assessmentAverage = computed(() => {
  const rows = assessmentRows.value
  if (!rows.length) return null
  return Math.round(rows.reduce((sum, row) => sum + row.points, 0) / rows.length * 10) / 10
})
const assessmentRank = computed(() => {
  const ranked = assessmentRows.value.map((row, index) => ({ ...row, rank: index + 1 }))
  return assessmentGroup.value === 'top' ? ranked.slice(0, 3) : ranked.slice(-3).reverse()
})

const inspection = computed(() => {
  const generated = getGeneratedInspectionTasks(data.value.tasks, 'month', today.value)
  const overdue = data.value.tasks.filter(row => row.overdue)
  const { rows: due, exampleMonth } = getInspectionPeriod(data.value.tasks, today.value)
  const done = due.filter(row => row.completed).length
  const projects = groupProjects(overdue, data.value.projects).sort((a, b) => b.rows.length - a.rows.length)
  return { generated, overdue, due, done, projects, exampleMonth }
})
const overduePageCount = computed(() => Math.max(1, Math.ceil(inspection.value.projects.length / OVERDUE_PAGE_SIZE)))
const overdueStart = computed(() => overduePage.value * OVERDUE_PAGE_SIZE)
const visibleOverdueProjects = computed(() =>
  inspection.value.projects.slice(overdueStart.value, overdueStart.value + OVERDUE_PAGE_SIZE),
)
watch(overduePageCount, count => {
  overduePage.value = Math.min(overduePage.value, count - 1)
})
const hazards = computed(() => {
  const issued = data.value.hazards.filter(row => row.issuedThisMonth)
  const overdue = data.value.hazards.filter(row => row.overdue)
  const byState = hazardStates.map(item => ({ ...item, count: issued.filter(row => row.status === item.label).length }))
  const sum = byState.reduce((total, item) => total + item.count, 0)
  const unclassified = issued.length - sum
  if (unclassified > 0) byState.push({ label: '未归类', count: unclassified, color: '#8596a4', tone: 'muted' })
  const stops = []
  let angle = 0
  for (const item of byState.filter(item => item.count)) {
    const end = angle + item.count * 360 / issued.length
    stops.push(item.color + ' ' + angle + 'deg ' + end + 'deg')
    angle = end
  }
  return {
    issued, overdue, byState, newest: data.value.hazards.filter(row => row.newThisMonth).length,
    fill: stops.length ? 'conic-gradient(' + stops.join(', ') + ')' : '#374e61',
  }
})
const sampling = computed(() => {
  const monthStart = today.value.slice(0, 7) + '-01'
  const coverage = getSamplingRowsInRange(data.value.coverage, 'registered', monthStart, today.value)
  const results = getSamplingRowsInRange(data.value.results, 'time', monthStart, today.value)
  const pending = data.value.batches.filter(row => !row.complete)
  return {
    covers: coverage.length,
    covered: coverage.filter(row => row.check).length,
    samples: results.length,
    failed: results.filter(row => row.outcome === '不合格').length,
    monitor: pending.filter(row => row.stage === 'supervisor'),
    review: pending.filter(row => row.stage === 'manager'),
  }
})
const displayedWork = computed(() => getDisplayedWork(data.value, workDate.value, workType.value, today.value))
const workRows = computed(() => displayedWork.value.rows)
const work = computed(() => getWorkGroups(workRows.value, data.value.projects, workType.value))
const shownWork = computed(() => work.value.groups.slice(0, 5))
const workMax = computed(() => work.value.groups[0]?.total || 1)
const major = computed(() => ({
  overdue: data.value.engineering.filter(row => row.overdue),
  alerts: data.value.alerts.filter(row => row.status !== '已关闭'),
  active: data.value.engineering.filter(row => row.status === '在施'),
  superMajor: data.value.engineering.filter(row => row.status === '在施' && row.superMajor),
}))

const spotlight = computed(() => {
  const topics = [
    { label: '整改及验收逾期', unit: '条', tone: 'amber', kind: 'hazards', view: 'overdue', rows: hazards.value.overdue },
    ...(SHOW_HAZARD_SAMPLING ? [{ label: REVIEW_BACKLOG_LABEL, unit: '批', tone: 'cyan', kind: 'sampling', view: 'review', rows: sampling.value.review }] : []),
    { label: '危大工程超期未验收', unit: '项', tone: 'red', kind: 'major', view: 'overdue', rows: major.value.overdue },
    { label: '当日危险作业', unit: '项', tone: 'cyan', kind: 'work', view: 'danger',
      rows: getWorkRows(data.value, today.value, 'danger') },
  ]
  const items = new Map()
  for (const topic of topics) {
    const groups = groupProjects(topic.rows, data.value.projects).sort((a, b) => b.rows.length - a.rows.length)
    for (const group of groups.slice(0, 3)) {
      const entry = { ...topic, count: group.rows.length }
      const point = items.get(group.id)
      if (point) point.metrics.push(entry)
      else items.set(group.id, { id: group.id, name: group.name, metrics: [entry] })
    }
  }
  return [...items.values()].slice(0, 7)
})
const pinSlots = [
  { x: 42, y: 39 }, { x: 62, y: 52 }, { x: 44, y: 70 }, { x: 55, y: 33 },
  { x: 59, y: 76 }, { x: 64, y: 39 }, { x: 48, y: 56 },
]
const activePin = computed(() => spotlight.value[focusIndex.value])
const totals = computed(() => [
  { label: '整改及验收逾期', count: hazards.value.overdue.length, unit: '条', tone: 'amber', kind: 'hazards', view: 'overdue' },
  ...(SHOW_HAZARD_SAMPLING ? [{ label: REVIEW_BACKLOG_LABEL, count: sampling.value.review.length, unit: '批', tone: 'cyan', kind: 'sampling', view: 'review' }] : []),
  { label: '危大工程超期未验收', count: major.value.overdue.length, unit: '项', tone: 'red', kind: 'major', view: 'overdue' },
])

watch(spotlight, (next, previous) => {
  const currentId = previous?.[focusIndex.value]?.id
  const newIndex = next.findIndex(point => point.id === currentId)
  focusIndex.value = Math.max(0, newIndex)
})
watch(today, (day, previous) => {
  if (workDate.value === previous) workDate.value = day
  assessmentPeriod.value = assessmentPeriods()[0]
  reload()
})

function resize() {
  scale.value = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT)
}

function reload() {
  data.value = loadDashboard(today.value)
}

function updateWorkDate(value) {
  if (value && value <= today.value) workDate.value = value
}

function stepFocus(step) {
  const size = spotlight.value.length
  if (size) focusIndex.value = (focusIndex.value + step + size) % size
}

function selectSection(index) {
  if (index === 1) return
  const order = [...sectionOrder.value]
  const selected = order[index]
  order[index] = order[1]
  order[1] = selected
  sectionOrder.value = order
  nextTick(() => document.getElementById('hd-tab-' + selected.key)?.focus({ preventScroll: true }))
}

function handleSectionKeys(event, index) {
  const count = sectionOrder.value.length
  const targets = {
    ArrowLeft: (index + count - 1) % count,
    ArrowRight: (index + 1) % count,
    Home: 0,
    End: count - 1,
  }
  const target = targets[event.key]
  if (target === undefined) return

  event.preventDefault()
  selectSection(target)
}

function stepOverduePage(step) {
  const count = overduePageCount.value
  overduePage.value = (overduePage.value + step + count) % count
}

function selectAssessmentGroup(group) {
  assessmentGroup.value = group
  assessmentChangedAt = Date.now()
}

function openDetail(kind, view, projectId, filter) {
  focusReturn = document.activeElement
  detail.value = { kind, view, projectId, filter }
}

function openPin(point, metric = point.metrics[0]) {
  if (metric.kind === 'work') workDate.value = today.value
  openDetail(metric.kind, metric.view, point.id, metric.filter)
}

function closeDetail() {
  detail.value = null
  nextTick(() => focusReturn?.focus())
}

async function toggleFullScreen() {
  if (document.fullscreenElement) await document.exitFullscreen()
  else await canvas.value.closest('.screen-style-app').requestFullscreen?.()
}

function refreshWhenVisible() {
  if (!document.hidden) {
    now.value = new Date()
    reload()
  }
}

onMounted(() => {
  resize()
  paused.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.addEventListener('resize', resize)
  window.addEventListener('storage', refreshWhenVisible)
  document.addEventListener('visibilitychange', refreshWhenVisible)
  clockTimer = window.setInterval(() => { now.value = new Date() }, 1000)
  refreshTimer = window.setInterval(refreshWhenVisible, 60000)
  overdueTimer = window.setInterval(() => {
    if (activeSection.value !== 'safety' || paused.value || detail.value || document.hidden || overduePageCount.value <= 1) return
    if (overdueList.value?.matches(':hover') || overdueList.value?.contains(document.activeElement)) return
    stepOverduePage(1)
  }, OVERDUE_PAGE_INTERVAL)
  carouselTimer = window.setInterval(() => {
    if (activeSection.value !== 'safety' || paused.value || detail.value || document.hidden) return
    stepFocus(1)
    if (assessmentRows.value.length > 3 && Date.now() - assessmentChangedAt >= 12000) {
      assessmentGroup.value = assessmentGroup.value === 'top' ? 'bottom' : 'top'
    }
  }, 12000)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  window.removeEventListener('storage', refreshWhenVisible)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
  window.clearInterval(clockTimer)
  window.clearInterval(refreshTimer)
  window.clearInterval(carouselTimer)
  window.clearInterval(overdueTimer)
})
</script>

<template>
  <main class="screen-style-app">
    <div class="hd-viewport">
      <div ref="canvas" class="hd-canvas" :style="canvasStyle">
        <img class="hd-background" :src="aerialImage" alt="" draggable="false">
        <div class="hd-map-tint" aria-hidden="true"></div>
        <div class="hd-frame" aria-hidden="true"></div>
        <img class="hd-frame-header" :src="headerImage" alt="" draggable="false">
        <header class="hd-header">
          <h1>工程建设智慧管控一体化平台</h1>
          <div class="hd-clock"><strong>{{ clock }}</strong><span>{{ today }}<br>北京时间</span></div>
        </header>

        <div class="hd-bottom-nav" role="tablist" aria-label="态势大屏切页">
          <img :src="situationTabs" alt="" draggable="false">
          <button v-for="(section, index) in sectionOrder" :id="'hd-tab-' + section.key" :key="section.key"
            type="button" role="tab" :class="'hd-nav-slot-' + index"
            :aria-selected="index === 1" :aria-controls="'hd-view-' + section.key" :tabindex="index === 1 ? 0 : -1"
            @click="selectSection(index)" @keydown="handleSectionKeys($event, index)">
            {{ section.label }}
          </button>
        </div>

        <section v-show="activeSection === 'safety'" id="hd-view-safety" class="hd-dashboard"
          role="tabpanel" aria-labelledby="hd-tab-safety">
          <div class="hd-summary" aria-label="指挥部重点指标">
            <button v-for="metric in totals" :key="metric.label" type="button" class="hd-summary-card"
              :class="'is-' + metric.tone" @click="openDetail(metric.kind, metric.view, '', metric.filter)">
              <span>{{ metric.label }}</span><strong>{{ metric.count }}<small>{{ metric.unit }}</small></strong>
            </button>
          </div>

          <div class="hd-map" aria-label="机场航拍和项目示意点位">
            <article v-for="(point, index) in spotlight" :key="point.id" class="hd-map-point"
              :class="{ 'is-active': activePin?.id === point.id, 'is-right': pinSlots[index].x > 53 }"
              :style="{ left: pinSlots[index].x + '%', top: pinSlots[index].y + '%' }">
              <button type="button" class="hd-pin" :aria-label="'定位' + point.name" :aria-pressed="activePin?.id === point.id"
                @click="focusIndex = index"><i></i></button>
              <div v-if="activePin?.id === point.id" class="hd-point-card">
                <button type="button" class="hd-point-title" @click="openPin(point)"><Location />{{ point.name }}</button>
                <button v-for="metric in point.metrics" :key="metric.label" type="button" class="hd-point-row"
                  :class="'is-' + metric.tone" @click="openPin(point, metric)">
                  <span>{{ metric.label }}</span><b>{{ metric.count }} {{ metric.unit }}</b>
                </button>
              </div>
            </article>
            <div v-if="!spotlight.length" class="hd-map-empty"><Aim />当前暂无重点事项</div>
          </div>

          <div class="hd-column hd-column-left">
            <SafetyPanel title="巡检执行" class="hd-inspection-panel" @details="openDetail('inspection')">
              <div class="hd-stat-grid hd-stat-grid-three">
                <button class="hd-stat" type="button" @click="openDetail('inspection', 'generated')">
                  <span>本月巡检任务总数</span><strong>{{ inspection.generated.length }}<small>项</small></strong>
                </button>
                <button class="hd-stat is-amber" type="button" @click="openDetail('inspection', 'overdue')">
                  <span>逾期未完成</span><strong>{{ inspection.overdue.length }}<small>项</small></strong>
                </button>
                <button class="hd-stat" type="button" @click="openDetail('inspection', 'month')">
                  <span>{{ inspection.exampleMonth ? '到期完成率' : '本月到期完成率' }}</span>
                  <strong>{{ percent(inspection.done, inspection.due.length) }}</strong>
                  <em>{{ inspection.done }}/{{ inspection.due.length }} 项</em>
                </button>
              </div>
              <div ref="overdueList" class="hd-mini-list" :style="{ '--hd-overdue-page-size': OVERDUE_PAGE_SIZE }">
                <div class="hd-mini-head">
                  <span>逾期项目</span>
                  <span>任务数</span>
                </div>
                <div v-if="visibleOverdueProjects.length" :key="overduePage" class="hd-mini-rows">
                  <button v-for="(group, index) in visibleOverdueProjects" :key="group.id"
                    type="button" @click="openDetail('inspection', 'overdue', group.id)">
                    <span><i>{{ overdueStart + index + 1 }}</i>{{ group.name }}</span><b>{{ group.rows.length }} 项</b>
                  </button>
                </div>
                <div v-else class="hd-inline-empty">暂无逾期巡检任务</div>
                <div v-if="overduePageCount > 1" class="hd-mini-pager" role="group" aria-label="逾期项目分页">
                  <button type="button" aria-label="上一页逾期项目" @click="stepOverduePage(-1)"><ArrowLeft /></button>
                  <span>{{ overduePage + 1 }}/{{ overduePageCount }}</span>
                  <button type="button" aria-label="下一页逾期项目" @click="stepOverduePage(1)"><ArrowRight /></button>
                </div>
              </div>
            </SafetyPanel>

            <SafetyPanel title="巡检隐患闭环" @details="openDetail('hazards')">
              <div class="hd-stat-grid hd-stat-compact">
                <button class="hd-stat is-amber" type="button" @click="openDetail('hazards', 'overdue')">
                  <span>整改及验收逾期</span><strong>{{ hazards.overdue.length }}<small>条</small></strong>
                </button>
                <button class="hd-stat" type="button" @click="openDetail('hazards', 'new')">
                  <span>本月新增隐患</span><strong>{{ hazards.newest }}<small>条</small></strong>
                </button>
              </div>
              <div class="hd-ring-row">
                <button class="hd-ring" type="button" :style="{ '--ring-fill': hazards.fill }"
                  aria-label="查看本月下发整改单" @click="openDetail('hazards', 'month')">
                  <span><strong>{{ hazards.issued.length }}</strong><small>本月下发</small></span>
                </button>
                <div class="hd-legend">
                  <button v-for="state in hazards.byState" :key="state.label" type="button"
                    @click="openDetail('hazards', 'month', '', state.label)">
                    <i :style="{ '--legend-color': state.color }"></i><span>{{ state.label }}</span>
                    <b>{{ state.count }} 条</b><em>{{ percent(state.count, hazards.issued.length) }}</em>
                  </button>
                </div>
              </div>
            </SafetyPanel>

            <SafetyPanel v-if="SHOW_HAZARD_SAMPLING" title="抽检与全面复查" @details="openDetail('sampling')">
              <div class="hd-sampling-flow">
                <section class="hd-sampling-step" aria-label="指挥部抽查">
                  <h3>指挥部抽查</h3>
                  <button class="hd-stat hd-sampling-wide" type="button" @click="openDetail('sampling', 'coverage')">
                    <span>本月登记单据抽查覆盖率</span><strong>{{ percent(sampling.covered, sampling.covers) }}</strong>
                    <em>{{ sampling.covers ? `${sampling.covers} 张中已查 ${sampling.covered} 张` : '本月暂无可抽查单据' }}</em>
                  </button>
                </section>
                <section class="hd-sampling-step" aria-label="监理抽检">
                  <h3>监理抽检</h3>
                  <button class="hd-stat is-amber" type="button" @click="openDetail('sampling', 'results')">
                    <span>本月不合格率</span><strong>{{ percent(sampling.failed, sampling.samples) }}</strong>
                    <em>{{ sampling.samples ? `${sampling.samples} 张中 ${sampling.failed} 张不合格` : '本月暂无抽检结果' }}</em>
                  </button>
                  <button class="hd-stat" type="button" @click="openDetail('sampling', 'sampling')">
                    <span>未办结</span><strong>{{ sampling.monitor.length }}<small>批</small></strong><em>截至今日</em>
                  </button>
                </section>
                <section class="hd-sampling-step" aria-label="施工全面复查">
                  <h3>施工全面复查</h3>
                  <button class="hd-stat hd-sampling-wide is-amber" type="button" @click="openDetail('sampling', 'review')">
                    <span>未办结</span><strong>{{ sampling.review.length }}<small>批</small></strong><em>截至今日</em>
                  </button>
                </section>
              </div>
            </SafetyPanel>
          </div>

          <div class="hd-column hd-column-right">
            <SafetyPanel title="当日施工作业" @details="openDetail('work', workType)">
              <div class="hd-work-toolbar">
                <div class="hd-tabs hd-compact-tabs">
                  <button type="button" :aria-pressed="workType === 'danger'" @click="workType = 'danger'">危险作业</button>
                  <button type="button" :aria-pressed="workType === 'major'" @click="workType = 'major'">危大作业登记</button>
                </div>
                <input type="date" :value="workDate" :max="today" aria-label="大屏作业日期"
                  @change="updateWorkDate($event.target.value)">
              </div>
              <div class="hd-work-info">
                <strong>{{ workRows.length }}<small> 项</small></strong><span>涉及 {{ work.groups.length }} 个项目</span>
                <span v-if="displayedWork.exampleDate" class="hd-example" title="当天暂无登记，当前展示已有台账样例">示例 {{ displayedWork.exampleDate }}</span>
              </div>
              <div v-if="shownWork.length" class="hd-work-chart">
                <button v-for="group in shownWork" :key="group.id" type="button" @click="openDetail('work', workType, group.id)">
                  <span :title="group.name">{{ group.name }}</span>
                  <i class="hd-bar"><i v-for="(item, index) in group.counts" v-show="item.value" :key="item.label"
                    :title="item.label + ' ' + item.value + ' 项'"
                    :style="{ width: item.value / workMax * 100 + '%', background: workColor(index) }"></i></i>
                  <b>{{ group.total }}</b>
                </button>
              </div>
              <div v-else class="hd-work-empty"><i></i><span>当日暂无{{ workType === 'major' ? '危大作业登记' : '危险作业' }}</span></div>
              <div class="hd-work-legend" aria-label="作业类别图例">
                <span v-for="(name, index) in work.categories" :key="name"><i :style="{ background: workColor(index) }"></i>{{ name }}</span>
              </div>
            </SafetyPanel>

            <SafetyPanel title="危大工程管控" @details="openDetail('major')">
              <div class="hd-stat-grid hd-stat-four">
                <button class="hd-stat is-red" type="button" @click="openDetail('major', 'overdue')">
                  <span>超期未验收</span><strong>{{ major.overdue.length }}<small>项</small></strong>
                </button>
                <button class="hd-stat is-amber" type="button" @click="openDetail('major', 'alerts')">
                  <span>待处理异常</span><strong>{{ major.alerts.length }}<small>条</small></strong>
                </button>
                <button class="hd-stat" type="button" @click="openDetail('major', 'active')">
                  <span>在施危大</span><strong>{{ major.active.length }}<small>项</small></strong>
                </button>
                <button class="hd-stat" type="button" @click="openDetail('major', 'active', '', '超危工程')">
                  <span>在施超危</span><strong>{{ major.superMajor.length }}<small>项</small></strong>
                </button>
              </div>
            </SafetyPanel>

            <SafetyPanel title="月度巡检专项考核" @details="openDetail('assessment')">
              <div class="hd-assessment-banner">
                <Clock /><div><strong>{{ assessmentPeriod?.label || '—' }}</strong></div>
                <div class="hd-assessment-status"><span>平均分</span><strong>{{ assessmentAverage ?? '—' }}<small v-if="assessmentAverage !== null"> 分</small></strong></div>
              </div>
              <div class="hd-rank-heading">
                <div class="hd-tabs hd-compact-tabs" aria-label="排名分组">
                  <button type="button" :aria-pressed="assessmentGroup === 'top'" @click="selectAssessmentGroup('top')">前三</button>
                  <button type="button" :aria-pressed="assessmentGroup === 'bottom'" @click="selectAssessmentGroup('bottom')">倒三</button>
                </div>
                <span>按专项指标上限折算</span>
              </div>
              <div class="hd-assessment-rank">
                <button v-for="row in assessmentRank" :key="row.id" type="button" @click="openDetail('assessment', '', row.id)">
                  <i>{{ row.rank }}</i><span :title="row.name">{{ row.name }}</span><b>{{ row.points }} 分</b>
                </button>
                <p v-if="!assessmentRank.length" class="hd-inline-empty">暂无考核样例</p>
              </div>
            </SafetyPanel>
          </div>

          <div class="hd-map-toolbar">
            <span><Location />机场航拍 · 项目点位示意</span>
            <div class="hd-map-controls">
              <button type="button" aria-label="上一个重点项目" :disabled="spotlight.length < 2" @click="stepFocus(-1)"><ArrowLeft /></button>
              <button type="button" :aria-label="paused ? '播放项目轮播' : '暂停项目轮播'"
                :disabled="spotlight.length < 2 && overduePageCount <= 1 && assessmentRows.length <= 3"
                @click="paused = !paused"><component :is="paused ? VideoPlay : VideoPause" /></button>
              <button type="button" aria-label="下一个重点项目" :disabled="spotlight.length < 2" @click="stepFocus(1)"><ArrowRight /></button>
              <button type="button" aria-label="刷新台账" @click="reload"><Refresh /></button>
              <button type="button" aria-label="切换全屏" @click="toggleFullScreen"><FullScreen /></button>
            </div>
          </div>
        </section>

        <section v-for="section in developmentSections" v-show="activeSection === section.key"
          :id="'hd-view-' + section.key" :key="section.key" class="hd-development"
          role="tabpanel" :aria-labelledby="'hd-tab-' + section.key" tabindex="0">
          <div class="hd-development-card">
            <h2>{{ section.label }}</h2>
            <p>正在开发中</p>
          </div>
        </section>
      </div>
    </div>
    <SafetyDetailDialog v-if="detail" :request="detail" :data="data" :today="today" :work-date="workDate"
      @close="closeDetail" @update:work-date="updateWorkDate" />
  </main>
</template>
