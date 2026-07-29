<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'

const router = useRouter()
const TODAY = new Date('2026-07-16')

function calcOverdue(d) {
  if (d.status === '已完成' || d.status === '已关闭') return { overdue: false, days: 0 }
  if (!d.deadline) return { overdue: false, days: 0 }
  const diff = Math.floor((TODAY - new Date(d.deadline)) / 86400000)
  return { overdue: diff > 0, days: diff > 0 ? diff : 0 }
}

const hazardData = [
  { id:'rec-001', project:'飞行区跑道延长工程', pid:'p-000', status:'待整改', deadline:'2026-07-30', desc:'五芯电缆破损' },
  { id:'rec-006', project:'T3航站楼扩建工程', pid:'p-001', status:'待整改', deadline:'2026-07-10', desc:'脚手架方案未报审' },
  { id:'rec-002', project:'飞行区跑道延长工程', pid:'p-000', status:'待复查', deadline:'2026-07-28', desc:'五芯电缆破损' },
  { id:'rec-003', project:'T3航站楼扩建工程', pid:'p-001', status:'待复查', deadline:'2026-07-28', desc:'脚手架方案未报审' },
  { id:'rec-004', project:'飞行区跑道延长工程', pid:'p-000', status:'已关闭', desc:'电缆破损' },
  { id:'rec-011', project:'T3航站楼扩建工程', pid:'p-001', status:'已关闭', desc:'消防器材过期' },
  { id:'rec-020', project:'综合配套区工程', pid:'p-004', status:'待整改', deadline:'2026-07-15', desc:'临边防护缺失' },
  { id:'rec-021', project:'综合配套区工程', pid:'p-004', status:'已关闭', desc:'配电箱接地不良' },
  { id:'rec-030', project:'捷运系统工程', pid:'p-005', status:'待复查', deadline:'2026-07-25', desc:'轨道区积水' },
  { id:'rec-031', project:'捷运系统工程', pid:'p-005', status:'已关闭', desc:'安全标识缺失' },
  { id:'rec-040', project:'机坪扩建工程', pid:'p-006', status:'待整改', deadline:'2026-07-12', desc:'灯具接地不可靠' },
  { id:'rec-041', project:'机坪扩建工程', pid:'p-006', status:'待复查', deadline:'2026-07-26', desc:'电缆敷设不规范' },
  { id:'rec-050', project:'航站楼连接线工程', pid:'p-007', status:'待整改', deadline:'2026-07-05', desc:'高处作业平台无护栏' },
  { id:'rec-051', project:'航站楼连接线工程', pid:'p-007', status:'已关闭', desc:'焊接作业未设防火' },
]

const taskData = [
  { id:'mt-000', taskNo:'XJ20260730001', project:'飞行区跑道延长工程', pid:'p-000', status:'待执行', deadline:'2026-07-10', desc:'6月底安全巡检', hazardCount:0 },
  { id:'mt-001', taskNo:'XJ20260728001', project:'飞行区跑道延长工程', pid:'p-000', status:'待执行', deadline:'2026-07-28', desc:'7月第4周安全巡检', hazardCount:0 },
  { id:'mt-002', taskNo:'XJ20260720002', project:'T3航站楼扩建工程', pid:'p-001', status:'已完成', deadline:'2026-07-20', desc:'临时用电专项检查', hazardCount:2 },
  { id:'mt-003', taskNo:'XJ20260721003', project:'T3航站楼扩建工程', pid:'p-001', status:'已完成', deadline:'2026-07-21', desc:'7月第三周安全巡检', hazardCount:0 },
  { id:'mt-004', taskNo:'XJ20260731004', project:'新货运站建设工程', pid:'p-003', status:'已完成', desc:'【自建】月检巡检', hazardCount:0 },
  { id:'mt-005', taskNo:'XJ20260728005', project:'飞行区跑道延长工程', pid:'p-000', status:'已完成', desc:'【自建】专项巡检', hazardCount:1 },
  { id:'mt-010', taskNo:'XJ20260715006', project:'综合配套区工程', pid:'p-004', status:'待执行', deadline:'2026-07-08', desc:'综合配套区周检', hazardCount:0 },
  { id:'mt-011', taskNo:'XJ20260722007', project:'综合配套区工程', pid:'p-004', status:'已完成', desc:'综合配套区专项检查', hazardCount:1 },
  { id:'mt-020', taskNo:'XJ20260718008', project:'捷运系统工程', pid:'p-005', status:'待执行', deadline:'2026-07-25', desc:'捷运系统月检', hazardCount:0 },
  { id:'mt-021', taskNo:'XJ20260725009', project:'捷运系统工程', pid:'p-005', status:'已完成', deadline:'2026-07-25', desc:'捷运系统专项巡检', hazardCount:0 },
  { id:'mt-030', taskNo:'XJ20260705010', project:'机坪扩建工程', pid:'p-006', status:'待执行', deadline:'2026-07-05', desc:'机坪扩建周检', hazardCount:0 },
  { id:'mt-031', taskNo:'XJ20260728011', project:'机坪扩建工程', pid:'p-006', status:'已完成', desc:'机坪扩建巡检', hazardCount:1 },
  { id:'mt-040', taskNo:'XJ20260712012', project:'航站楼连接线工程', pid:'p-007', status:'待执行', deadline:'2026-07-22', desc:'连接线工程周检', hazardCount:0 },
  { id:'mt-041', taskNo:'XJ20260726013', project:'航站楼连接线工程', pid:'p-007', status:'已完成', deadline:'2026-07-26', desc:'连接线工程月检', hazardCount:0 },
]

// ===== 统计 =====
const hazardStats = computed(() => {
  const total = hazardData.length
  const pending = hazardData.filter(d => d.status === '待整改').length
  const review = hazardData.filter(d => d.status === '待复查').length
  const closed = hazardData.filter(d => d.status === '已关闭').length
  const overdue = hazardData.filter(d => calcOverdue(d).overdue).length
  return { total, pending, review, closed, overdue, rate: total ? Math.round(closed / total * 100) : 0 }
})

const taskStats = computed(() => {
  const total = taskData.length
  const exec = taskData.filter(d => d.status === '待执行').length
  const done = taskData.filter(d => d.status === '已完成').length
  const withHazard = taskData.filter(d => d.status === '已完成' && d.hazardCount > 0).length
  const overdue = taskData.filter(d => calcOverdue(d).overdue).length
  return { total, exec, done, withHazard, overdue, rate: total ? Math.round(done / total * 100) : 0 }
})

// ===== 图表数据 =====
const projectNames = ['飞行区跑道延长工程','T3航站楼扩建工程','新货运站建设工程','综合配套区工程','捷运系统工程','机坪扩建工程','航站楼连接线工程']
const projectShort = ['飞行区跑道','T3航站楼','新货运站','综合配套区','捷运系统','机坪扩建','连接线工程']

const taskChartData = computed(() => projectNames.map((name, i) => {
  const items = taskData.filter(d => d.project === name)
  return { name: projectShort[i], exec: items.filter(d => d.status === '待执行').length, done: items.filter(d => d.status === '已完成').length, rate: items.length ? Math.round(items.filter(d=>d.status==='已完成').length / items.length * 100) : 0 }
}))

const hazardChartData = computed(() => projectNames.map((name, i) => {
  const items = hazardData.filter(d => d.project === name)
  return { name: projectShort[i], pending: items.filter(d => d.status === '待整改').length, review: items.filter(d => d.status === '待复查').length, closed: items.filter(d => d.status === '已关闭').length, rate: items.length ? Math.round(items.filter(d=>d.status==='已关闭').length / items.length * 100) : 0 }
}))

// ===== 逾期清单 =====
const overdueItems = computed(() => {
  const all = [
    ...taskData.map(d => ({ ...d, type:'task', ...calcOverdue(d) })),
    ...hazardData.map(d => ({ ...d, type:'hazard', ...calcOverdue(d) })),
  ].filter(d => d.overdue)
  return all.sort((a, b) => b.days - a.days)
})

const hazardNoMap = { 'rec-001':'ZG202607001','rec-006':'ZG202607006','rec-002':'ZG202607002','rec-003':'ZG202607003','rec-004':'ZG202607004','rec-011':'ZG202607011','rec-020':'ZG202607020','rec-021':'ZG202607021','rec-030':'ZG202607030','rec-031':'ZG202607031','rec-040':'ZG202607040','rec-041':'ZG202607041','rec-050':'ZG202607050','rec-051':'ZG202607051' }
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
        legend: { data:['待整改','待复查','已关闭','整改率'], bottom:0, itemWidth:10, itemHeight:10, textStyle:{fontSize:11} },
        grid: { left:40, right:40, top:20, bottom:40 },
        xAxis: { type:'category', data:d.map(v=>v.name), axisLabel:{fontSize:11} },
        yAxis: [
          { type:'value', name:'隐患数', axisLabel:{fontSize:10}, splitLine:{lineStyle:{type:'dashed'}} },
          { type:'value', name:'整改率%', min:0, max:100, axisLabel:{fontSize:10,formatter:'{value}%'}, splitLine:{show:false} },
        ],
        series: [
          { name:'待整改', type:'bar', stack:'total', data:d.map(v=>v.pending), itemStyle:{color:'#f5a623'} },
          { name:'待复查', type:'bar', stack:'total', data:d.map(v=>v.review), itemStyle:{color:'#4285f4'} },
          { name:'已关闭', type:'bar', stack:'total', data:d.map(v=>v.closed), itemStyle:{color:'#34a853'} },
          { name:'整改率', type:'line', yAxisIndex:1, data:d.map(v=>v.rate), itemStyle:{color:'#e53935'}, lineStyle:{width:2}, symbol:'circle', symbolSize:6 },
        ],
      })
    }
  })
}

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
      <h3 class="page-title">安全巡检看板</h3>
      <span class="page-subtitle">工程指挥部 · 全项目统计</span>
    </div>

    <!-- 统计卡片 第一行：隐患 -->
    <el-row :gutter="12" class="stat-row">
      <el-col :span="4" v-for="s in [
        { val:hazardStats.total, lbl:'总隐患', cls:'' },
        { val:hazardStats.pending, lbl:'待整改', cls:'warn' },
        { val:hazardStats.review, lbl:'待复查', cls:'info' },
        { val:hazardStats.closed, lbl:'已关闭', cls:'success' },
        { val:hazardStats.rate+'%', lbl:'整改率', cls:'success' },
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
    <el-row :gutter="16" class="chart-row">
      <el-col :span="8">
        <div class="chart-card h-full">
          <div class="chart-title">巡检任务状态</div>
          <div ref="pieTaskRef" class="chart-box-pie"></div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="chart-card h-full">
          <div class="chart-title">隐患整改状态</div>
          <div ref="pieHazardRef" class="chart-box-pie"></div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="overdue-section">
          <div class="overdue-title">⚠ 逾期清单</div>
          <el-table :data="overdueItems" stripe border size="small" style="width:100%" class="overdue-table" @row-click="r => goDetail(r.type, r.id)">
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
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">安全巡检统计</div>
          <div ref="barTaskRef" class="chart-box"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">安全隐患整改复查统计</div>
          <div ref="barHazardRef" class="chart-box"></div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dash-page { padding:0; }
.page-head { display:flex; align-items:baseline; gap:12px; margin-bottom:16px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.page-subtitle { font-size:12px; color:#999; }
.stat-row { margin-bottom:10px !important; cursor:pointer; }
.stat-card { background:#fff; border-radius:8px; padding:14px 0; text-align:center; border:1px solid #eee; transition:box-shadow 0.2s; }
.stat-card:hover { box-shadow:0 2px 8px rgba(0,0,0,0.08); }
.stat-val { font-size:28px; font-weight:700; color:#1f2329; line-height:1.2; }
.stat-lbl { font-size:12px; color:#999; margin-top:2px; }
.stat-warn .stat-val { color:#f5a623; }
.stat-info .stat-val { color:#4285f4; }
.stat-success .stat-val { color:#34a853; }
.stat-danger .stat-val { color:#e53935; }
.stat-muted .stat-val { color:#999; }
.chart-row { margin-bottom:16px !important; }
.chart-card { background:#fff; border-radius:8px; padding:16px; border:1px solid #eee; }
.chart-card.h-full { height:100%; }
.chart-title { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:10px; border-left:3px solid #8f0045; }
.chart-box { width:100%; height:280px; }
.chart-box-pie { width:100%; height:210px; }
.overdue-section { background:#fff; border-radius:8px; padding:16px; border:1px solid #eee; height:100%; }
.overdue-title { font-size:14px; font-weight:600; color:#e53935; margin-bottom:12px; padding-left:10px; border-left:3px solid #e53935; }
.overdue-table { font-size:12px; }
.overdue-table :deep(.el-table__row) { cursor:pointer; }
.table-empty { text-align:center; padding:20px 0; color:#999; font-size:13px; }

.el-table { width:100% !important; }
.el-table__header-wrapper table, .el-table__body-wrapper table { table-layout:fixed; width:100% !important; }
</style>
