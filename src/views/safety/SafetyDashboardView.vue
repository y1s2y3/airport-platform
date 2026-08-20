<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'

const router = useRouter()
const TODAY = new Date('2026-07-16')
const timePreset = ref('month')
const customDateRange = ref([])
const inspectionCategory = ref('')

const qualityIds = new Set(['rec-003', 'rec-004', 'rec-021', 'rec-041', 'rec-051', 'mt-004', 'mt-005', 'mt-011', 'mt-031', 'mt-041'])
function getInspectionCategory(item) {
  return item.inspectionCategory || (qualityIds.has(item.id) ? '质量' : '安全')
}

function startOfDay(date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfDay(date) {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const selectedTimeRange = computed(() => {
  const today = startOfDay(TODAY)
  let start
  let end

  if (timePreset.value === 'custom' && customDateRange.value?.length === 2) {
    return [startOfDay(customDateRange.value[0]), endOfDay(customDateRange.value[1])]
  }

  if (timePreset.value === 'week') {
    const weekday = today.getDay() || 7
    start = new Date(today)
    start.setDate(today.getDate() - weekday + 1)
    end = new Date(start)
    end.setDate(start.getDate() + 6)
  } else if (timePreset.value === 'quarter') {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3
    start = new Date(today.getFullYear(), quarterStartMonth, 1)
    end = new Date(today.getFullYear(), quarterStartMonth + 3, 0)
  } else if (timePreset.value === 'year') {
    start = new Date(today.getFullYear(), 0, 1)
    end = new Date(today.getFullYear(), 11, 31)
  } else {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  }

  return [startOfDay(start), endOfDay(end)]
})

const selectedTimeLabel = computed(() => {
  const [start, end] = selectedTimeRange.value
  return `${formatDate(start)} 至 ${formatDate(end)}`
})

function isWithinSelectedTime(dateValue) {
  if (!dateValue) return false
  const value = startOfDay(dateValue)
  const [start, end] = selectedTimeRange.value
  return value >= start && value <= end
}

function calcOverdue(d) {
  if (d.status === '已完成' || d.status === '已复查' || d.status === '已关闭') return { overdue: false, days: 0 }
  if (!d.deadline) return { overdue: false, days: 0 }
  const diff = Math.floor((TODAY - new Date(d.deadline)) / 86400000)
  return { overdue: diff > 0, days: diff > 0 ? diff : 0 }
}

const hazardData = [
  { id:'rec-001', project:'飞行区跑道延长工程', pid:'p-000', status:'待整改', issueDate:'2026-07-15', deadline:'2026-07-30', desc:'五芯电缆破损' },
  { id:'rec-006', project:'T3航站楼扩建工程', pid:'p-001', status:'待整改', issueDate:'2026-07-08', deadline:'2026-07-10', desc:'脚手架方案未报审' },
  { id:'rec-002', project:'飞行区跑道延长工程', pid:'p-000', status:'待复查', issueDate:'2026-07-12', deadline:'2026-07-28', desc:'五芯电缆破损' },
  { id:'rec-003', project:'T3航站楼扩建工程', pid:'p-001', status:'待复查', issueDate:'2026-07-14', deadline:'2026-07-28', desc:'脚手架方案未报审' },
  { id:'rec-007', project:'飞行区跑道延长工程', pid:'p-000', status:'已复查', issueDate:'2026-07-15', deadline:'2026-07-31', desc:'临边防护栏杆局部缺失' },
  { id:'rec-004', project:'飞行区跑道延长工程', pid:'p-000', status:'已关闭', issueDate:'2026-06-28', desc:'电缆破损' },
  { id:'rec-011', project:'T3航站楼扩建工程', pid:'p-001', status:'已关闭', issueDate:'2026-07-03', desc:'消防器材过期' },
  { id:'rec-020', project:'综合配套区工程', pid:'p-004', status:'待整改', issueDate:'2026-07-10', deadline:'2026-07-15', desc:'临边防护缺失' },
  { id:'rec-021', project:'综合配套区工程', pid:'p-004', status:'已关闭', issueDate:'2026-05-26', desc:'配电箱接地不良' },
  { id:'rec-030', project:'捷运系统工程', pid:'p-005', status:'待复查', issueDate:'2026-07-13', deadline:'2026-07-25', desc:'轨道区积水' },
  { id:'rec-031', project:'捷运系统工程', pid:'p-005', status:'已关闭', issueDate:'2026-04-18', desc:'安全标识缺失' },
  { id:'rec-040', project:'机坪扩建工程', pid:'p-006', status:'待整改', issueDate:'2026-07-01', deadline:'2026-07-12', desc:'灯具接地不可靠' },
  { id:'rec-041', project:'机坪扩建工程', pid:'p-006', status:'待复查', issueDate:'2026-07-09', deadline:'2026-07-26', desc:'电缆敷设不规范' },
  { id:'rec-050', project:'航站楼连接线工程', pid:'p-007', status:'待整改', issueDate:'2026-06-25', deadline:'2026-07-05', desc:'高处作业平台无护栏' },
  { id:'rec-051', project:'航站楼连接线工程', pid:'p-007', status:'已关闭', issueDate:'2026-03-16', desc:'焊接作业未设防火' },
]

const taskData = [
  { id:'mt-000', taskNo:'AQXJ20260730001', project:'飞行区跑道延长工程', pid:'p-000', status:'待执行', deadline:'2026-07-10', desc:'6月底安全巡检', hazardCount:0 },
  { id:'mt-001', taskNo:'AQXJ20260728001', project:'飞行区跑道延长工程', pid:'p-000', status:'待执行', deadline:'2026-07-28', desc:'7月第4周安全巡检', hazardCount:0 },
  { id:'mt-002', taskNo:'AQXJ20260720002', project:'T3航站楼扩建工程', pid:'p-001', status:'已完成', deadline:'2026-07-20', inspectionDate:'2026-07-20', desc:'临时用电专项检查', hazardCount:2 },
  { id:'mt-003', taskNo:'AQXJ20260721003', project:'T3航站楼扩建工程', pid:'p-001', status:'已完成', deadline:'2026-07-21', inspectionDate:'2026-07-21', desc:'7月第三周安全巡检', hazardCount:0 },
  { id:'mt-004', taskNo:'ZLXJ20260731004', project:'新货运站建设工程', pid:'p-003', status:'已完成', inspectionDate:'2026-07-31', desc:'月检巡检', hazardCount:0 },
  { id:'mt-005', taskNo:'ZLXJ20260728005', project:'飞行区跑道延长工程', pid:'p-000', status:'已完成', inspectionDate:'2026-07-28', desc:'专项巡检', hazardCount:1 },
  { id:'mt-010', taskNo:'AQXJ20260715006', project:'综合配套区工程', pid:'p-004', status:'待执行', deadline:'2026-07-08', desc:'综合配套区周检', hazardCount:0 },
  { id:'mt-011', taskNo:'ZLXJ20260722007', project:'综合配套区工程', pid:'p-004', status:'已完成', inspectionDate:'2026-07-22', desc:'综合配套区专项检查', hazardCount:1 },
  { id:'mt-020', taskNo:'AQXJ20260718008', project:'捷运系统工程', pid:'p-005', status:'待执行', deadline:'2026-07-25', desc:'捷运系统月检', hazardCount:0 },
  { id:'mt-021', taskNo:'AQXJ20260725009', project:'捷运系统工程', pid:'p-005', status:'已完成', deadline:'2026-07-25', inspectionDate:'2026-07-25', desc:'捷运系统专项巡检', hazardCount:0 },
  { id:'mt-030', taskNo:'AQXJ20260705010', project:'机坪扩建工程', pid:'p-006', status:'待执行', deadline:'2026-07-05', desc:'机坪扩建周检', hazardCount:0 },
  { id:'mt-031', taskNo:'ZLXJ20260728011', project:'机坪扩建工程', pid:'p-006', status:'已完成', inspectionDate:'2026-07-28', desc:'机坪扩建巡检', hazardCount:1 },
  { id:'mt-040', taskNo:'AQXJ20260712012', project:'航站楼连接线工程', pid:'p-007', status:'待执行', deadline:'2026-07-22', desc:'连接线工程周检', hazardCount:0 },
  { id:'mt-041', taskNo:'ZLXJ20260726013', project:'航站楼连接线工程', pid:'p-007', status:'已完成', deadline:'2026-07-26', inspectionDate:'2026-07-26', desc:'连接线工程月检', hazardCount:0 },
]

// ===== 统计 =====
const scopedHazardData = computed(() =>
  inspectionCategory.value ? hazardData.filter(item => getInspectionCategory(item) === inspectionCategory.value) : hazardData
)
const scopedTaskData = computed(() =>
  inspectionCategory.value ? taskData.filter(item => getInspectionCategory(item) === inspectionCategory.value) : taskData
)

const hazardStats = computed(() => {
  const data = scopedHazardData.value
  const total = data.length
  const pending = data.filter(d => d.status === '待整改').length
  const review = data.filter(d => d.status === '待复查').length
  const reviewed = data.filter(d => d.status === '已复查').length
  const closed = data.filter(d => d.status === '已关闭').length
  const overdue = data.filter(d => calcOverdue(d).overdue).length
  return { total, pending, review, reviewed, closed, overdue, rate: total ? Math.round(closed / total * 100) : 0 }
})

const taskStats = computed(() => {
  const data = scopedTaskData.value
  const total = data.length
  const exec = data.filter(d => d.status === '待执行').length
  const done = data.filter(d => d.status === '已完成').length
  const withHazard = data.filter(d => d.status === '已完成' && d.hazardCount > 0).length
  const overdue = data.filter(d => calcOverdue(d).overdue).length
  return { total, exec, done, withHazard, overdue, rate: total ? Math.round(done / total * 100) : 0 }
})

// ===== 图表数据 =====
const projectNames = ['飞行区跑道延长工程','T3航站楼扩建工程','新货运站建设工程','综合配套区工程','捷运系统工程','机坪扩建工程','航站楼连接线工程']
const projectShort = ['飞行区跑道','T3航站楼','新货运站','综合配套区','捷运系统','机坪扩建','连接线工程']

const filteredTaskChartItems = computed(() =>
  scopedTaskData.value.filter(item => isWithinSelectedTime(item.inspectionDate || item.deadline))
)

const filteredHazardChartItems = computed(() =>
  scopedHazardData.value.filter(item => isWithinSelectedTime(item.issueDate))
)

const taskChartData = computed(() => projectNames.map((name, i) => {
  const items = filteredTaskChartItems.value.filter(d => d.project === name)
  return { name: projectShort[i], exec: items.filter(d => d.status === '待执行').length, done: items.filter(d => d.status === '已完成').length, rate: items.length ? Math.round(items.filter(d=>d.status==='已完成').length / items.length * 100) : 0 }
}))

const hazardChartData = computed(() => projectNames.map((name, i) => {
  const items = filteredHazardChartItems.value.filter(d => d.project === name)
  return { name: projectShort[i], pending: items.filter(d => d.status === '待整改').length, review: items.filter(d => d.status === '待复查').length, reviewed: items.filter(d => d.status === '已复查').length, closed: items.filter(d => d.status === '已关闭').length, rate: items.length ? Math.round(items.filter(d=>d.status==='已关闭').length / items.length * 100) : 0 }
}))

// ===== 逾期清单 =====
const overdueItems = computed(() => {
  const all = [
    ...scopedTaskData.value.map(d => ({ ...d, inspectionCategory:getInspectionCategory(d), type:'task', ...calcOverdue(d) })),
    ...scopedHazardData.value.map(d => ({ ...d, inspectionCategory:getInspectionCategory(d), type:'hazard', ...calcOverdue(d) })),
  ].filter(d => d.overdue)
  return all.sort((a, b) => b.days - a.days)
})

const hazardNoMap = { 'rec-001':'ZG202607001','rec-006':'ZG202607006','rec-002':'ZG202607002','rec-003':'ZG202607003','rec-007':'ZG202607007','rec-004':'ZG202607004','rec-011':'ZG202607011','rec-020':'ZG202607020','rec-021':'ZG202607021','rec-030':'ZG202607030','rec-031':'ZG202607031','rec-040':'ZG202607040','rec-041':'ZG202607041','rec-050':'ZG202607050','rec-051':'ZG202607051' }
function getHazardNo(id) { return hazardNoMap[id] || id }

// ===== ECharts =====
const pieTaskRef = ref(null), pieHazardRef = ref(null)
const barTaskRef = ref(null), barHazardRef = ref(null)
let chPieTask, chPieHazard, chBarTask, chBarHazard

function initCharts() {
  nextTick(() => {
    // 环形图1：巡检任务状态
    if (pieTaskRef.value) {
      chPieTask = echarts.init(pieTaskRef.value)
      const s = taskStats.value
      chPieTask.setOption({
        tooltip: { trigger:'item', formatter:'{b}: {c} ({d}%)' },
        legend: { bottom:0, itemWidth:10, itemHeight:10, textStyle:{fontSize:11} },
        series: [{ type:'pie', radius:['40%','65%'],
          label: { show:true, formatter:'{d}%', fontSize:11 },
          data: [
            { value:s.exec, name:'待执行', itemStyle:{color:'#f5a623'} },
            { value:s.done, name:'已完成', itemStyle:{color:'#34a853'} },
          ],
        }],
      })
    }
    // 环形图2：隐患整改状态
    if (pieHazardRef.value) {
      chPieHazard = echarts.init(pieHazardRef.value)
      const s = hazardStats.value
      chPieHazard.setOption({
        tooltip: { trigger:'item', formatter:'{b}: {c} ({d}%)' },
        legend: { bottom:0, itemWidth:10, itemHeight:10, textStyle:{fontSize:11} },
        series: [{ type:'pie', radius:['40%','65%'],
          label: { show:true, formatter:'{d}%', fontSize:11 },
          data: [
            { value:s.pending, name:'待整改', itemStyle:{color:'#f5a623'} },
            { value:s.review, name:'待复查', itemStyle:{color:'#4285f4'} },
            { value:s.reviewed, name:'已复查', itemStyle:{color:'#8f0045'} },
            { value:s.closed, name:'已关闭', itemStyle:{color:'#34a853'} },
          ],
        }],
      })
    }
    // 柱状图1：巡检统计
    if (barTaskRef.value) {
      chBarTask = echarts.init(barTaskRef.value)
      const d = taskChartData.value
      chBarTask.setOption({
        tooltip: { trigger:'axis', axisPointer:{type:'shadow'} },
        legend: { data:['待执行','已完成','完成率'], bottom:0, itemWidth:10, itemHeight:10, textStyle:{fontSize:11} },
        grid: { left:40, right:40, top:20, bottom:40 },
        xAxis: { type:'category', data:d.map(v=>v.name), axisLabel:{fontSize:11} },
        yAxis: [
          { type:'value', name:'任务数', axisLabel:{fontSize:10}, splitLine:{lineStyle:{type:'dashed'}} },
          { type:'value', name:'完成率%', min:0, max:100, axisLabel:{fontSize:10,formatter:'{value}%'}, splitLine:{show:false} },
        ],
        series: [
          { name:'待执行', type:'bar', stack:'total', data:d.map(v=>v.exec), itemStyle:{color:'#f5a623'} },
          { name:'已完成', type:'bar', stack:'total', data:d.map(v=>v.done), itemStyle:{color:'#34a853'} },
          { name:'完成率', type:'line', yAxisIndex:1, data:d.map(v=>v.rate), itemStyle:{color:'#4285f4'}, lineStyle:{width:2}, symbol:'circle', symbolSize:6 },
        ],
      })
    }
    // 柱状图2：隐患整改统计
    if (barHazardRef.value) {
      chBarHazard = echarts.init(barHazardRef.value)
      const d = hazardChartData.value
      chBarHazard.setOption({
        tooltip: { trigger:'axis', axisPointer:{type:'shadow'} },
        legend: { data:['待整改','待复查','已复查','已关闭','整改率'], bottom:0, itemWidth:10, itemHeight:10, textStyle:{fontSize:11} },
        grid: { left:40, right:40, top:20, bottom:40 },
        xAxis: { type:'category', data:d.map(v=>v.name), axisLabel:{fontSize:11} },
        yAxis: [
          { type:'value', name:'隐患数', axisLabel:{fontSize:10}, splitLine:{lineStyle:{type:'dashed'}} },
          { type:'value', name:'整改率%', min:0, max:100, axisLabel:{fontSize:10,formatter:'{value}%'}, splitLine:{show:false} },
        ],
        series: [
          { name:'待整改', type:'bar', stack:'total', data:d.map(v=>v.pending), itemStyle:{color:'#f5a623'} },
          { name:'待复查', type:'bar', stack:'total', data:d.map(v=>v.review), itemStyle:{color:'#4285f4'} },
          { name:'已复查', type:'bar', stack:'total', data:d.map(v=>v.reviewed), itemStyle:{color:'#8f0045'} },
          { name:'已关闭', type:'bar', stack:'total', data:d.map(v=>v.closed), itemStyle:{color:'#34a853'} },
          { name:'整改率', type:'line', yAxisIndex:1, data:d.map(v=>v.rate), itemStyle:{color:'#e53935'}, lineStyle:{width:2}, symbol:'circle', symbolSize:6 },
        ],
      })
    }
  })
}

function updateTimeFilteredCharts() {
  nextTick(() => {
    const taskSummary = taskStats.value
    chPieTask?.setOption({
      series: [{ data: [
        { value:taskSummary.exec, name:'待执行', itemStyle:{color:'#f5a623'} },
        { value:taskSummary.done, name:'已完成', itemStyle:{color:'#34a853'} },
      ] }],
    })
    const hazardSummary = hazardStats.value
    chPieHazard?.setOption({
      series: [{ data: [
        { value:hazardSummary.pending, name:'待整改', itemStyle:{color:'#f5a623'} },
        { value:hazardSummary.review, name:'待复查', itemStyle:{color:'#4285f4'} },
        { value:hazardSummary.reviewed, name:'已复查', itemStyle:{color:'#8f0045'} },
        { value:hazardSummary.closed, name:'已关闭', itemStyle:{color:'#34a853'} },
      ] }],
    })

    const taskItems = taskChartData.value
    chBarTask?.setOption({
      xAxis: { data: taskItems.map(item => item.name) },
      series: [
        { name:'待执行', data:taskItems.map(item => item.exec) },
        { name:'已完成', data:taskItems.map(item => item.done) },
        { name:'完成率', data:taskItems.map(item => item.rate) },
      ],
    })

    const hazardItems = hazardChartData.value
    chBarHazard?.setOption({
      xAxis: { data: hazardItems.map(item => item.name) },
      series: [
        { name:'待整改', data:hazardItems.map(item => item.pending) },
        { name:'待复查', data:hazardItems.map(item => item.review) },
        { name:'已复查', data:hazardItems.map(item => item.reviewed) },
        { name:'已关闭', data:hazardItems.map(item => item.closed) },
        { name:'整改率', data:hazardItems.map(item => item.rate) },
      ],
    })
  })
}

watch([taskChartData, hazardChartData, taskStats, hazardStats], updateTimeFilteredCharts, { deep:true })

onMounted(initCharts)
function handleResize() { [chPieTask,chPieHazard,chBarTask,chBarHazard].forEach(c => c?.resize()) }
onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))

function goDetail(type, id) {
  if (type === 'hazard') router.push(`/safety-inspection/hazard/${id}`)
  else router.push(`/safety-inspection/task/${id}`)
}
function goTaskList() { router.push('/safety-inspection/task') }
function goHazardList() { router.push('/safety-inspection/hazard') }
</script>

<template>
  <div class="dash-page">
    <div class="page-head">
      <div class="page-title-row">
        <h3 class="page-title">巡检看板</h3>
        <span class="page-subtitle">工程指挥部 · 全项目统计</span>
      </div>
      <el-radio-group v-model="inspectionCategory" size="large" class="category-tabs">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="安全">安全</el-radio-button>
        <el-radio-button value="质量">质量</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 统计卡片 第一行：隐患 -->
    <el-row :gutter="12" class="stat-row">
      <el-col :span="4" v-for="s in [
        { val:hazardStats.total, lbl:'总隐患', cls:'' },
        { val:hazardStats.pending, lbl:'待整改', cls:'warn' },
        { val:hazardStats.review, lbl:'待复查', cls:'info' },
        { val:hazardStats.reviewed, lbl:'已复查', cls:'reviewed' },
        { val:hazardStats.closed, lbl:'已关闭', cls:'success' },
        { val:hazardStats.overdue, lbl:'逾期隐患', cls:'danger' },
      ]" :key="s.lbl" @click="goHazardList">
        <div class="stat-card" :class="s.cls ? 'stat-'+s.cls : ''">
          <div class="stat-val">{{ s.val }}</div>
          <div class="stat-lbl">{{ s.lbl }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 统计卡片 第二行：任务 -->
    <el-row :gutter="12" class="stat-row">
      <el-col :span="4" v-for="s in [
        { val:taskStats.total, lbl:'总任务', cls:'' },
        { val:taskStats.exec, lbl:'待执行', cls:'warn' },
        { val:taskStats.done, lbl:'已完成', cls:'success' },
        { val:taskStats.rate+'%', lbl:'完成率', cls:'success' },
        { val:taskStats.overdue, lbl:'逾期任务', cls:'danger' },
        { val:taskStats.withHazard, lbl:'有隐患任务', cls:'danger' },
      ]" :key="s.lbl" @click="goTaskList">
        <div class="stat-card" :class="s.cls ? 'stat-'+s.cls : ''">
          <div class="stat-val">{{ s.val }}</div>
          <div class="stat-lbl">{{ s.lbl }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 环形图 + 逾期清单（等宽三栏） -->
    <el-row :gutter="16" class="chart-row status-chart-row">
      <el-col :span="8">
        <div class="chart-card status-chart-card">
          <div class="chart-title">巡检任务状态</div>
          <div ref="pieTaskRef" class="chart-box-pie"></div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="chart-card status-chart-card">
          <div class="chart-title">隐患整改状态</div>
          <div ref="pieHazardRef" class="chart-box-pie"></div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="overdue-section">
          <div class="overdue-title">⚠ 逾期清单</div>
          <el-table :data="overdueItems" stripe border size="small" max-height="210" style="width:100%" class="overdue-table" @row-click="r => goDetail(r.type, r.id)">
            <el-table-column label="类型" width="70" align="center">
              <template #default="{ row }">{{ row.type === 'task' ? '巡检' : '整改' }}</template>
            </el-table-column>
            <el-table-column label="编号" >
              <template #default="{ row }">
                {{ row.type === 'task' ? row.taskNo : getHazardNo(row.id) }}
              </template>
            </el-table-column>
            <el-table-column prop="project" label="项目" min- show-overflow-tooltip />
            <el-table-column label="逾期天数"  align="center">
              <template #default="{ row }">
                <span style="color:#e53935;font-weight:600">{{ row.days }}天</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="70" align="center">
              <template #default="{ row }">{{ row.status }}</template>
            </el-table-column>
            <el-table-column label="截止日期"  align="center">
              <template #default="{ row }"><span style="color:#e53935">{{ row.deadline }}</span></template>
            </el-table-column>
          </el-table>
          <div v-if="!overdueItems.length" class="table-empty">暂无逾期项</div>
        </div>
      </el-col>
    </el-row>

    <!-- 堆叠柱状图 + 折线（同一排） -->
    <div class="chart-filter-bar">
      <div>
        <div class="chart-filter-title">项目统计</div>
        <div class="chart-filter-range">当前统计周期：{{ selectedTimeLabel }}</div>
      </div>
      <div class="time-filter">
        <span class="time-filter-label">时间范围</span>
        <el-radio-group v-model="timePreset" size="small">
          <el-radio-button value="week">本周</el-radio-button>
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="quarter">本季度</el-radio-button>
          <el-radio-button value="year">本年度</el-radio-button>
          <el-radio-button value="custom">自定义</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="timePreset === 'custom'"
          v-model="customDateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :clearable="false"
          size="small"
          class="custom-date-picker" aria-label="开始日期"/>
      </div>
    </div>
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title-wrap">
            <div class="chart-title">巡检统计</div>
            <span class="chart-date-basis">按计划巡检日期/巡检日期</span>
          </div>
          <div ref="barTaskRef" class="chart-box"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title-wrap">
            <div class="chart-title">隐患整改复查统计</div>
            <span class="chart-date-basis">按整改单下发日期</span>
          </div>
          <div ref="barHazardRef" class="chart-box"></div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dash-page { padding:0; }
.page-head { display:flex; flex-direction:column; align-items:flex-start; gap:5px; margin-bottom:16px; }
.page-title-row { display:flex; align-items:baseline; gap:12px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.page-subtitle { font-size:12px; color:#999; }
.category-tabs { margin-top:8px; }
.category-tabs :deep(.el-radio-button__inner) { min-width:96px; padding:11px 28px; font-size:15px; font-weight:600; }
.stat-row { margin-bottom:10px !important; cursor:pointer; }
.stat-card { background:#fff; border-radius:8px; padding:14px 0; text-align:center; border:1px solid #eee; transition:box-shadow 0.2s; }
.stat-card:hover { box-shadow:0 2px 8px rgba(0,0,0,0.08); }
.stat-val { font-size:28px; font-weight:700; color:#1f2329; line-height:1.2; }
.stat-lbl { font-size:12px; color:#999; margin-top:2px; }
.stat-warn .stat-val { color:#f5a623; }
.stat-info .stat-val { color:#4285f4; }
.stat-reviewed .stat-val { color:#8f0045; }
.stat-success .stat-val { color:#34a853; }
.stat-danger .stat-val { color:#e53935; }
.stat-muted .stat-val { color:#999; }
.chart-row { margin-bottom:16px !important; }
.chart-card { background:#fff; border-radius:8px; padding:16px; border:1px solid #eee; }
.status-chart-row { align-items:flex-start; }
.status-chart-card { height:270px; box-sizing:border-box; }
.chart-title { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:10px; border-left:3px solid #8f0045; }
.chart-title-wrap { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.chart-date-basis { color:#999; font-size:12px; line-height:22px; white-space:nowrap; }
.chart-filter-bar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; padding:12px 16px; background:#fff; border:1px solid #eee; border-radius:8px; }
.chart-filter-title { color:#1f2329; font-size:14px; font-weight:600; }
.chart-filter-range { margin-top:3px; color:#999; font-size:12px; }
.time-filter { display:flex; align-items:center; justify-content:flex-end; gap:10px; flex-wrap:wrap; }
.time-filter-label { color:#666; font-size:12px; white-space:nowrap; }
.custom-date-picker { width:240px !important; }
.chart-box { width:100%; height:280px; }
.chart-box-pie { width:100%; height:210px; }
.overdue-section { background:#fff; border-radius:8px; padding:16px; border:1px solid #eee; height:270px; box-sizing:border-box; overflow:hidden; }
.overdue-title { font-size:14px; font-weight:600; color:#e53935; margin-bottom:12px; padding-left:10px; border-left:3px solid #e53935; }
.overdue-table { font-size:12px; }
.overdue-table :deep(.el-table__row) { cursor:pointer; }
.table-empty { text-align:center; padding:20px 0; color:#999; font-size:13px; }

.el-table { width:100% !important; }
.el-table__header-wrapper table, .el-table__body-wrapper table { table-layout:fixed; width:100% !important; }
</style>
