<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, View, ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useLaborProjectScope, selectedProjectId } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import { projectTree } from '../../mock/laborRealName.js'

const router = useRouter()
const route = useRoute()
const { isHqSelected, treeProjectId, scopeProjectLabel, onTreeNodeClick: _treeClick } = useLaborProjectScope()
const treeSearch = ref('')
const localProjectId = ref('')

const fromHq = computed(() => route.query.from === 'hq')

function goBackToHQ() {
  selectedProjectId.value = HQ_PROJECT_OPTION.id
  router.push('/machine-supervise/composite')
}

function handleTreeNodeClick(data) {
  if (data.id === 'hq') { localProjectId.value = ''; treeProjectId.value = data.id }
  else { localProjectId.value = data.id; _treeClick(data) }
}

// 运行监测
const monitorData = ref([
{
      id:'cp-001',
      deviceName:'复合地基桩机#3',
      deviceSN:'SN-COMP03',
      pilePoint:'C-08',
      groundElev:'25.30',
      current:'95',
      material:'3.2',
      depth:'16.5',
      pressure:'1.8',
      rate:'0.85',
      pushTime:'2026-07-16 08:30:00',
      project:'T3航站楼扩建工程',
      project_id:'p-001'
    },
    {
      id:'cp-002',
      deviceName:'复合地基桩机#6',
      deviceSN:'SN-COMP06',
      pilePoint:'D-03',
      groundElev:'24.60',
      current:'110',
      material:'4.5',
      depth:'20.2',
      pressure:'2.2',
      rate:'0.75',
      pushTime:'2026-07-16 08:25:00',
      project:'飞行区跑道延长工程',
      project_id:'p-000'
    },
    {
      id:'cp-003',
      deviceName:'复合地基桩机#3',
      deviceSN:'SN-COMP03',
      pilePoint:'C-09',
      groundElev:'25.28',
      current:'88',
      material:'2.8',
      depth:'14.0',
      pressure:'1.6',
      rate:'0.90',
      pushTime:'2026-07-16 08:20:00',
      project:'T3航站楼扩建工程',
      project_id:'p-001'
    },
    {
      id:'cp-004',
      deviceName:'复合地基桩机#6',
      deviceSN:'SN-COMP06',
      pilePoint:'D-04',
      groundElev:'24.55',
      current:'105',
      material:'3.8',
      depth:'18.6',
      pressure:'2.0',
      rate:'0.80',
      pushTime:'2026-07-16 08:15:00',
      project:'飞行区跑道延长工程',
      project_id:'p-000'
    },
])

const filterForm = reactive({ keyword: '' })
const treeDataWithCount = computed(() => {
  if (!isHqSelected.value) return []
  const root = projectTree[0]
  const children = root.children.map(node => {
    const count = monitorData.value.filter(d => d.project_id === node.id).length
    const label = treeSearch.value ? (node.label.includes(treeSearch.value) ? `${node.label}（${count}）` : '') : `${node.label}（${count}）`
    return { ...node, label, _visible: !treeSearch.value || node.label.includes(treeSearch.value) }
  }).filter(n => n._visible)
  return [{ ...root, label: treeSearch.value ? '搜索结果' : root.label, children }]
})
const filteredData = computed(() => {
  let list = monitorData.value
  if (isHqSelected.value && localProjectId.value) list = list.filter(d => d.project_id === localProjectId.value)
  return list.filter(d => { if (filterForm.keyword && !d.deviceName.includes(filterForm.keyword) && !d.deviceSN.includes(filterForm.keyword) && !d.project.includes(filterForm.keyword)) return false; return true })
})
function handleReset() { filterForm.keyword = '' }

// 指挥部看板数据
const hqProjectStats = ref([
{ project_name:'T3航站楼扩建工程', project_id:'p-001', deviceCount:1, onlineCount:1, alertCount:2, todayAlertCount:1, pendingAlertCount:1 },
    { project_name:'飞行区跑道延长工程', project_id:'p-000', deviceCount:1, onlineCount:0, alertCount:1, todayAlertCount:0, pendingAlertCount:1 }
])
const hqProjectKeyword = ref('')
const filteredHQProjects = computed(() => {
  let list = hqProjectStats.value
  if (hqProjectKeyword.value) list = list.filter(d => d.project_name.includes(hqProjectKeyword.value))
  return list
})
const hqTotalStats = computed(() => {
  const list = filteredHQProjects.value
  return {
    deviceCount: list.reduce((s, d) => s + d.deviceCount, 0),
    onlineCount: list.reduce((s, d) => s + d.onlineCount, 0),
    alertCount: list.reduce((s, d) => s + d.alertCount, 0),
    pendingAlertCount: list.reduce((s, d) => s + d.pendingAlertCount, 0),
  }
})

function viewProjectDetail(row) {
  router.push({ path: '/machine-supervise/composite', query: { from: 'hq' } }).then(() => {
    selectedProjectId.value = row.project_id
  })
}
</script>

<template>
  <div class="eq-page">
    <div class="page-head"><h3 class="page-title">复合地基运行监管</h3></div>

    <!-- 指挥部看板 -->
    <template v-if="isHqSelected">
      <div class="hq-dashboard">
        <div class="stat-cards">
          <div class="stat-card"><div class="sc-value">{{ hqTotalStats.deviceCount }}</div><div class="sc-label">设备总数</div></div>
          <div class="stat-card"><div class="sc-value">{{ hqTotalStats.onlineCount }}</div><div class="sc-label">在线总数</div></div>
          <div class="stat-card"><div class="sc-value text-theme-red">{{ hqTotalStats.alertCount }}</div><div class="sc-label">告警总数</div></div>
          <div class="stat-card"><div class="sc-value text-theme-red">{{ hqTotalStats.pendingAlertCount }}</div><div class="sc-label">待处理告警数</div></div>
        </div>
        <div class="hq-filter-bar">
          <el-input v-model="hqProjectKeyword" placeholder="搜索项目名称..." clearable style="width:220px" :prefix-icon="Search" aria-label="搜索项目名称..."/>
        </div>
        <el-table :data="filteredHQProjects" border stripe class="ap-table" style="width:100%;margin-top:12px">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="project_name" label="项目名称" min-width="160" />
          <el-table-column prop="deviceCount" label="设备数量" align="center" />
          <el-table-column prop="onlineCount" label="在线设备数量" align="center" />
          <el-table-column prop="alertCount" label="告警数量" align="center"><template #default="{ row }"><span :class="row.alertCount > 0 ? 'text-alert' : ''">{{ row.alertCount }}</span></template></el-table-column>
          <el-table-column prop="todayAlertCount" label="今日告警数" align="center"><template #default="{ row }"><span :class="row.todayAlertCount > 0 ? 'text-alert' : ''">{{ row.todayAlertCount }}</span></template></el-table-column>
          <el-table-column prop="pendingAlertCount" label="待处理告警数" align="center"><template #default="{ row }"><span :class="row.pendingAlertCount > 0 ? 'text-alert' : ''">{{ row.pendingAlertCount }}</span></template></el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" :icon="View" @click="viewProjectDetail(row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- 项目级监测台账 -->
    <template v-if="!isHqSelected">
      <div v-if="fromHq" class="back-bar">
        <el-button link type="primary" :icon="ArrowLeft" @click="goBackToHQ" style="font-size:14px">返回</el-button>
        <span class="back-project-name">{{ scopeProjectLabel || selectedProjectId }}</span>
      </div>
      <div class="section-header">
        <span class="total-count">共 {{ filteredData.length }} 条监测记录</span>
        <div class="filter-bar">
          <el-input v-model="filterForm.keyword" placeholder="搜索设备名称/SN..." clearable style="width:240px" :prefix-icon="Search" aria-label="搜索设备名称/SN..."/>
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>
      <el-table :data="filteredData" stripe border style="width:100%" class="data-table">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="deviceName" label="设备名称" align="center" />
            <el-table-column prop="deviceSN" label="设备SN" align="center" />
            <el-table-column prop="pilePoint" label="桩点位置" align="center" />
            <el-table-column prop="groundElev" label="地面高程(m)" align="center" />
            <el-table-column prop="current" label="施工电流(A)" align="center" />
            <el-table-column prop="material" label="材料用量(m³)" align="center" />
            <el-table-column prop="depth" label="深度(m)" align="center" />
            <el-table-column prop="pressure" label="压力(MPa)" align="center" />
            <el-table-column prop="rate" label="速率(m/min)" align="center" />
            <el-table-column prop="pushTime" label="推送时间" align="center" />
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.eq-page { padding:0; }
.page-head { display:flex; align-items:center; margin-bottom:16px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.back-bar { display:flex; align-items:center; gap:8px; margin-bottom:12px; padding:8px 12px; background:#f5f7fa; border-radius:6px; }
.back-project-name { font-size:14px; font-weight:600; color:#1f2329; }
.section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.total-count { font-size:13px; color:#666; }
.filter-bar { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
.data-table { font-size:13px; width:100%; }
.hq-filter-bar { margin-top:12px; }
.stat-cards { display:flex; gap:16px; margin-bottom:16px; }
.stat-card { flex:1; background:#fff; border-radius:8px; padding:16px 20px; box-shadow:0 1px 4px rgba(0,0,0,0.06); text-align:center; }
.sc-value { font-size:24px; font-weight:700; color:#1f2329; }
.sc-value.text-theme-red { color:#8F0045; }
.sc-label { font-size:12px; color:#999; margin-top:4px; }
.text-alert { color:#e63946; font-weight:600; }
.hq-dashboard { background:#f5f7fa; border-radius:10px; padding:20px; }
.ap-table { font-size:13px; width:100%; }
</style>