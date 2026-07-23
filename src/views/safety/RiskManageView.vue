<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'

const router = useRouter()

const treeData = [
  { id: 'proj-1', label: 'T3航站楼扩建工程（3项）' },
  { id: 'proj-2', label: '飞行区跑道延长工程（2项）' },
  { id: 'proj-3', label: '新货运站建设工程（1项）' },
  { id: 'proj-4', label: '机场北片区路网工程（0项）' },
  { id: 'proj-5', label: '员工宿舍楼工程（1项）' },
]

const activeProject = ref('proj-1')
const activeProjectName = computed(() => {
  const p = treeData.find(t => t.id === activeProject.value)
  return p ? p.label.replace(/（\d+项）$/, '') : ''
})

const filterMonth = ref('')
const filterOverdue = ref('')
const filterStatus = ref('')

const monthOptions = computed(() => {
  const months = []; const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }
  return months
})

const allData = {
  'proj-1': [
    { month:'2026-07', planStart:'2026-07-01', planEnd:'2026-07-31', actualStart:'2026-07-01', actualEnd:'2026-07-30', overdue:'否', status:'本月管控完毕', reporter:'张工', reportTime:'2026-07-31 14:30' },
    { month:'2026-06', planStart:'2026-06-01', planEnd:'2026-06-30', actualStart:'2026-06-02', actualEnd:'2026-06-28', overdue:'否', status:'本月管控完毕', reporter:'李工', reportTime:'2026-06-30 10:00' },
    { month:'2026-08', planStart:'2026-08-01', planEnd:'2026-08-31', actualStart:'', actualEnd:'', overdue:'否', status:'待开始', reporter:'赵工', reportTime:'2026-07-28 16:00' },
  ],
  'proj-2': [
    { month:'2026-07', planStart:'2026-07-01', planEnd:'2026-07-31', actualStart:'2026-07-05', actualEnd:'', overdue:'否', status:'进行中', reporter:'王工', reportTime:'2026-07-05 09:00' },
    { month:'2026-05', planStart:'2026-05-01', planEnd:'2026-05-31', actualStart:'2026-05-01', actualEnd:'2026-06-05', overdue:'是', status:'本月管控完毕', reporter:'陈工', reportTime:'2026-06-05 11:20' },
  ],
  'proj-3': [
    { month:'2026-07', planStart:'2026-07-01', planEnd:'2026-07-31', actualStart:'2026-07-02', actualEnd:'2026-07-28', overdue:'否', status:'本月管控完毕', reporter:'刘工', reportTime:'2026-07-28 15:00' },
  ],
  'proj-4': [],
  'proj-5': [
    { month:'2026-06', planStart:'2026-06-01', planEnd:'2026-06-30', actualStart:'2026-06-01', actualEnd:'2026-06-30', overdue:'否', status:'本月管控完毕', reporter:'周工', reportTime:'2026-06-30 09:30' },
  ],
}

const filteredData = computed(() => {
  let data = allData[activeProject.value] || []
  if (filterMonth.value) data = data.filter(r => r.month === filterMonth.value)
  if (filterOverdue.value) data = data.filter(r => r.overdue === filterOverdue.value)
  if (filterStatus.value) data = data.filter(r => r.status === filterStatus.value)
  return data
})

function onTreeNodeClick(data) { activeProject.value = data.id }
function resetFilter() { filterMonth.value = ''; filterOverdue.value = ''; filterStatus.value = '' }
function goToCreate() { router.push('/safety-inspection/risk/create') }
function goToTypeConfig() { router.push('/safety-inspection/risk/type-config') }
function viewDetail(row) { router.push('/safety-inspection/risk/' + row.month) }
function editRecord(row) { router.push('/safety-inspection/risk/create') }
</script>

<template>
  <div class="risk-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">安全巡检 / 风险管理</div>
      <div class="page-heading">
        <h1 class="page-title">风险管理台账</h1>
        <div style="display:flex;gap:8px">
          <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="goToCreate">新增风险辨识</el-button>
          <el-button class="ap-btn-outline" @click="goToTypeConfig">风险类型配置</el-button>
        </div>
      </div>
    </div>

    <div class="page-layout with-tree">
      <aside class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree
          :data="treeData"
          node-key="id"
          highlight-current
          :current-node-key="activeProject"
          :expand-on-click-node="false"
          class="project-tree"
          @node-click="onTreeNodeClick"
        />
      </aside>

      <section class="risk-panel page-panel">
        <div class="panel-head">
          <div class="panel-title">{{ activeProjectName || '请选择项目' }}</div>
          <div class="panel-stats">共 {{ filteredData.length }} 条</div>
        </div>

        <div class="filter-bar">
          <el-select v-model="filterMonth" placeholder="计划月份" clearable size="small" style="width:120px">
            <el-option v-for="m in monthOptions" :key="m" :label="m" :value="m" />
          </el-select>
          <el-select v-model="filterOverdue" placeholder="是否逾期" clearable size="small" style="width:110px">
            <el-option label="是" value="是" /><el-option label="否" value="否" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="单据状态" clearable size="small" style="width:130px">
            <el-option label="待开始" value="待开始" /><el-option label="本月管控完毕" value="本月管控完毕" /><el-option label="进行中" value="进行中" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" size="small">搜索</el-button>
          <el-button size="small" @click="resetFilter">重置</el-button>
        </div>

        <el-table :data="filteredData" border stripe class="ap-table" style="width:100%" size="small">
          <el-table-column prop="month" label="计划月份" width="95" />
          <el-table-column prop="planStart" label="计划开始" width="100" />
          <el-table-column prop="planEnd" label="计划结束" width="100" />
          <el-table-column prop="actualStart" label="实际开始" width="100">
            <template #default="{ row }">{{ row.actualStart || '-' }}</template>
          </el-table-column>
          <el-table-column prop="actualEnd" label="实际结束" width="100">
            <template #default="{ row }">{{ row.actualEnd || '-' }}</template>
          </el-table-column>
          <el-table-column label="逾期" width="70" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="row.overdue==='是'?'ap-tag-disabled':'ap-tag-enabled'">{{ row.overdue }}</span>
            </template>
          </el-table-column>
          <el-table-column label="单据状态" min-width="110" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="row.status==='待开始'?'ap-tag-warn':row.status==='进行中'?'ap-tag-warn':'ap-tag-enabled'">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="reporter" label="填报人" width="75" />
          <el-table-column prop="reportTime" label="填报时间" width="155" />
          <el-table-column label="操作" width="105" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewDetail(row)">查看</el-button>
              <el-button v-if="row.status==='待开始'" link type="primary" size="small" @click="editRecord(row)" style="margin-left:6px">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!filteredData.length" style="text-align:center;padding:30px 0;color:#909399;font-size:13px">暂无数据</div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.risk-page { padding:20px 24px 24px; }
.page-header { margin-bottom:16px; }
.page-breadcrumb { font-size:13px; color:var(--ap-text-muted,#868e96); margin-bottom:4px; }
.page-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.page-title { font-size:20px; font-weight:600; margin:0; color:var(--ap-text,#1f2329); }
.ap-btn-outline { border-color:#8f0045; color:#8f0045; }
.ap-btn-outline:hover { background:#fceef4; border-color:#8f0045; color:#8f0045; }
.ap-tag-warn { background:#fff8e6; color:#f5a623; }

.page-layout.with-tree { display:grid; grid-template-columns:280px minmax(0,1fr); gap:16px; min-height:560px; }
.project-tree-panel { border:1px solid var(--ap-border,#e8e8e8); border-radius:8px; background:#fff; padding:16px; }
.panel-title { font-size:15px; font-weight:600; color:var(--ap-text,#1f2329); margin-bottom:12px; }
.project-tree :deep(.el-tree-node__content) { height:34px; border-radius:4px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background:var(--ap-primary-light,#fceef4); color:var(--ap-primary,#8f0045); font-weight:600; }

.risk-panel { }
.page-panel { border:1px solid var(--ap-border,#e8e8e8); border-radius:8px; background:#fff; padding:16px; }
.panel-head { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; margin-bottom:12px; }
.panel-stats { display:flex; flex-wrap:wrap; gap:12px; font-size:13px; color:var(--ap-text-secondary,#666); }
.filter-bar { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:12px; }
</style>
