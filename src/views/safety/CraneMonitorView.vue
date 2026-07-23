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
  router.push('/machine-supervise/crane')
}

function handleTreeNodeClick(data) {
  if (data.id === 'hq') { localProjectId.value = ''; treeProjectId.value = data.id }
  else { localProjectId.value = data.id; _treeClick(data) }
}

// 运行监测
const monitorData = ref([
{ id:'c-001', deviceName:'塔吊QTZ160（#1）', deviceSN:'SN-QTZ1601', load:'1.43', torque:'17.84', rotation:'265.39', height:'32.04', wind:'2.91', range:'29.17', pushTime:'2026-07-16 07:18:01', project:'飞行区跑道延长工程', projectId:'p-000' },
  { id:'c-002', deviceName:'塔吊QTZ160（#1）', deviceSN:'SN-QTZ1601', load:'0.18', torque:'2.79', rotation:'262.94', height:'36.02', wind:'4.12', range:'41.27', pushTime:'2026-07-16 07:15:01', project:'飞行区跑道延长工程', projectId:'p-000' },
  { id:'c-003', deviceName:'塔吊QTZ160（#1）', deviceSN:'SN-QTZ1601', load:'0.24', torque:'3.82', rotation:'262.94', height:'35.93', wind:'4.10', range:'41.01', pushTime:'2026-07-16 07:12:01', project:'飞行区跑道延长工程', projectId:'p-000' },
  { id:'c-004', deviceName:'塔吊QTZ80（#7）', deviceSN:'SN-QTZ807', load:'2.50', torque:'38.50', rotation:'180.20', height:'28.50', wind:'3.20', range:'35.00', pushTime:'2026-07-16 07:10:00', project:'新货运站建设工程', projectId:'p-003' },
  { id:'c-005', deviceName:'塔吊QTZ80（#7）', deviceSN:'SN-QTZ807', load:'3.20', torque:'45.60', rotation:'175.80', height:'26.30', wind:'2.80', range:'32.50', pushTime:'2026-07-16 07:05:00', project:'新货运站建设工程', projectId:'p-003' },
  { id:'c-006', deviceName:'塔吊QTZ160（#1）', deviceSN:'SN-QTZ1601', load:'0.00', torque:'0.00', rotation:'265.41', height:'30.33', wind:'4.07', range:'40.74', pushTime:'2026-07-16 07:33:01', project:'飞行区跑道延长工程', projectId:'p-000' },
])

const filterForm = reactive({ keyword: '' })
const treeDataWithCount = computed(() => {
  if (!isHqSelected.value) return []
  const root = projectTree[0]
  const children = root.children.map(node => {
    const count = monitorData.value.filter(d => d.projectId === node.id).length
    const label = treeSearch.value ? (node.label.includes(treeSearch.value) ? `${node.label}（${count}）` : '') : `${node.label}（${count}）`
    return { ...node, label, _visible: !treeSearch.value || node.label.includes(treeSearch.value) }
  }).filter(n => n._visible)
  return [{ ...root, label: treeSearch.value ? '搜索结果' : root.label, children }]
})
const filteredData = computed(() => {
  let list = monitorData.value
  if (isHqSelected.value && localProjectId.value) list = list.filter(d => d.projectId === localProjectId.value)
  return list.filter(d => { if (filterForm.keyword && !d.deviceName.includes(filterForm.keyword) && !d.deviceSN.includes(filterForm.keyword) && !d.project.includes(filterForm.keyword)) return false; return true })
})
function handleReset() { filterForm.keyword = '' }

// 指挥部看板数据
const hqProjectStats = ref([
{ projectName:'飞行区跑道延长工程', projectId:'p-000', deviceCount:2, onlineCount:2, alertCount:3, todayAlertCount:1, pendingAlertCount:1 },
    { projectName:'T3航站楼扩建工程', projectId:'p-001', deviceCount:0, onlineCount:0, alertCount:0, todayAlertCount:0, pendingAlertCount:0 },
    { projectName:'新货运站建设工程', projectId:'p-003', deviceCount:1, onlineCount:1, alertCount:1, todayAlertCount:0, pendingAlertCount:1 }
])
const hqProjectKeyword = ref('')
const filteredHQProjects = computed(() => {
  let list = hqProjectStats.value
  if (hqProjectKeyword.value) list = list.filter(d => d.projectName.includes(hqProjectKeyword.value))
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
  router.push({ path: '/machine-supervise/crane', query: { from: 'hq' } }).then(() => {
    selectedProjectId.value = row.projectId
  })
}
</script>

<template>
  <div class="eq-page">
    <div class="page-head"><h3 class="page-title">塔吊运行监管</h3></div>

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
          <el-input v-model="hqProjectKeyword" placeholder="搜索项目名称..." clearable style="width:220px" :prefix-icon="Search" />
        </div>
        <el-table :data="filteredHQProjects" border stripe class="ap-table" style="width:100%;margin-top:12px">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="projectName" label="项目名称" min-width="160" />
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
          <el-input v-model="filterForm.keyword" placeholder="搜索设备名称/SN..." clearable style="width:240px" :prefix-icon="Search" />
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>
      <el-table :data="filteredData" stripe border style="width:100%" class="data-table">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="deviceName" label="设备名称" align="center" />
            <el-table-column prop="deviceSN" label="设备SN" align="center" />
            <el-table-column prop="load" label="载重(t)" align="center" />
            <el-table-column prop="torque" label="力矩(tm)" align="center" />
            <el-table-column prop="rotation" label="回转(°)" align="center" />
            <el-table-column prop="height" label="高度(m)" align="center" />
            <el-table-column prop="wind" label="风力(m/s)" align="center" />
            <el-table-column prop="range" label="幅度(m)" align="center" />
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