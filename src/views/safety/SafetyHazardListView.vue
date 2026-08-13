<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, View, ArrowLeft } from '@element-plus/icons-vue'
import { useLaborProjectScope, selectedProjectId } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import { projectTree } from '../../mock/laborRealName.js'
import { getProjectRectifierLabel, getProjectReviewerLabel } from '../../composables/useInspectionPersonConfig'

const router = useRouter()
const route = useRoute()
const { isHqSelected, treeProjectId, scopeProjectId, onTreeNodeClick: _treeClick } = useLaborProjectScope()
const fromHq = computed(() => route.query.from === 'hq')

// 项目树搜索与选中
const treeSearch = ref('')
const localProjectId = ref('')

function handleTreeNodeClick(data) {
  if (data.id === 'hq') {
    localProjectId.value = ''
    treeProjectId.value = data.id
  } else {
    localProjectId.value = data.id
    _treeClick(data)
  }
}

const treeDataWithCount = computed(() => {
  const root = projectTree[0]
  const children = root.children
    .map(node => {
      const count = rectifyData.filter(d => d.project_id === node.id).length
      const label = treeSearch.value
        ? (node.label.includes(treeSearch.value) ? `${node.label}（${count}）` : '')
        : `${node.label}（${count}）`
      return { ...node, label, _visible: !treeSearch.value || node.label.includes(treeSearch.value) }
    })
    .filter(n => n._visible)
  return [{ ...root, label: treeSearch.value ? '搜索结果' : root.label, children }]
})

// 整改单状态：待整改 → 待复查 → 已复查（项目经理审批中）→ 已关闭
const rectifyData = [
  { id:'rec-001', rectifyNo:'ZG202607001', taskNo:'AQXJ20260728001', inspectionCategory:'安全', project:'飞行区跑道延长工程', project_id:'p-000', rectifier:getProjectRectifierLabel('p-000'), reviewer:getProjectReviewerLabel('p-000'), deadline:'2026-07-30', status:'待整改', rectDate:'', reviewDate:'' },
  { id:'rec-006', rectifyNo:'ZG202607006', taskNo:'AQXJ20260721003', inspectionCategory:'安全', project:'T3航站楼扩建工程', project_id:'p-001', rectifier:getProjectRectifierLabel('p-001'), reviewer:getProjectReviewerLabel('p-001'), deadline:'2026-07-22', status:'待整改', rectDate:'2026-07-20', reviewDate:'2026-07-22' },
  { id:'rec-002', rectifyNo:'ZG202607002', taskNo:'AQXJ20260728001', inspectionCategory:'安全', project:'飞行区跑道延长工程', project_id:'p-000', rectifier:getProjectRectifierLabel('p-000'), reviewer:getProjectReviewerLabel('p-000'), deadline:'2026-07-28', status:'待复查', rectDate:'2026-07-25', reviewDate:'' },
  { id:'rec-003', rectifyNo:'ZG202607003', taskNo:'ZLXJ20260721003', inspectionCategory:'质量', project:'T3航站楼扩建工程', project_id:'p-001', rectifier:getProjectRectifierLabel('p-001'), reviewer:getProjectReviewerLabel('p-001'), deadline:'2026-07-28', status:'待复查', rectDate:'2026-07-27', reviewDate:'2026-07-25' },
  { id:'rec-007', rectifyNo:'ZG202607007', taskNo:'AQXJ20260730001', inspectionCategory:'安全', project:'飞行区跑道延长工程', project_id:'p-000', rectifier:getProjectRectifierLabel('p-000'), reviewer:getProjectReviewerLabel('p-000'), deadline:'2026-07-31', status:'已复查', rectDate:'2026-07-29', reviewDate:'2026-07-30' },
  { id:'rec-004', rectifyNo:'ZG202607004', taskNo:'ZLXJ20260728005', inspectionCategory:'质量', project:'飞行区跑道延长工程', project_id:'p-000', rectifier:getProjectRectifierLabel('p-000'), reviewer:getProjectReviewerLabel('p-000'), deadline:'2026-07-20', status:'已关闭', rectDate:'2026-07-22', reviewDate:'2026-07-25' },
  { id:'rec-011', rectifyNo:'ZG202607011', taskNo:'AQXJ20260721003', inspectionCategory:'安全', project:'T3航站楼扩建工程', project_id:'p-001', rectifier:getProjectRectifierLabel('p-001'), reviewer:getProjectReviewerLabel('p-001'), deadline:'2026-07-25', status:'已关闭', rectDate:'2026-07-24', reviewDate:'2026-07-26' },
]

const filterForm = reactive({ keyword: '', category: '', status: '', overdue: '' })

const hqProjectKeyword = ref('')
const hqProjectStats = computed(() => projectTree[0].children.map(project => {
  const rows = rectifyData.filter(item => item.project_id === project.id)
  return {
    project_id: project.id,
    project_name: project.label,
    totalCount: rows.length,
    pendingCount: rows.filter(item => item.status === '待整改').length,
    reviewCount: rows.filter(item => item.status === '待复查').length,
    reviewedCount: rows.filter(item => item.status === '已复查').length,
    closedCount: rows.filter(item => item.status === '已关闭').length,
    overdueCount: rows.filter(item => isOverdue(item)).length,
  }
}))
const filteredHQProjects = computed(() => hqProjectStats.value.filter(item =>
  !hqProjectKeyword.value || item.project_name.includes(hqProjectKeyword.value),
))
const hqTotalStats = computed(() => ({
  totalCount: filteredHQProjects.value.reduce((sum, item) => sum + item.totalCount, 0),
  pendingCount: filteredHQProjects.value.reduce((sum, item) => sum + item.pendingCount, 0),
  reviewCount: filteredHQProjects.value.reduce((sum, item) => sum + item.reviewCount, 0),
  reviewedCount: filteredHQProjects.value.reduce((sum, item) => sum + item.reviewedCount, 0),
  closedCount: filteredHQProjects.value.reduce((sum, item) => sum + item.closedCount, 0),
  overdueCount: filteredHQProjects.value.reduce((sum, item) => sum + item.overdueCount, 0),
}))

const treeData = computed(() => projectTree)

const filteredData = computed(() => {
  let list = rectifyData
  if (!isHqSelected.value && scopeProjectId.value) list = list.filter(d => d.project_id === scopeProjectId.value)
  return list.filter(d => {
    if (filterForm.category && d.inspectionCategory !== filterForm.category) return false
    if (filterForm.status && d.status !== filterForm.status) return false
    if (filterForm.overdue === '是') {
      if (!d.deadline) return false
      if (['已复查', '已关闭'].includes(d.status)) return false
      if (new Date(d.deadline) >= new Date('2026-07-16')) return false
    }
    if (filterForm.overdue === '否') {
      if (!d.deadline) return true
      if (['已复查', '已关闭'].includes(d.status)) return true
      if (new Date(d.deadline) >= new Date('2026-07-16')) return true
    }
    if (filterForm.keyword) {
      const kw = filterForm.keyword
      if (!d.rectifyNo.includes(kw) && !d.taskNo.includes(kw) && !d.project.includes(kw)) return false
    }
    return true
  })
})

function isOverdue(row) {
  if (['已复查', '已关闭'].includes(row.status)) return false
  if (!row.deadline) return false
  return new Date(row.deadline) < new Date('2026-07-16')
}

function viewDetail(row) { router.push(`/safety-inspection/hazard/${row.id}`) }
function handleReset() { Object.keys(filterForm).forEach(k => filterForm[k] = '') }
function viewProjectDetail(row) {
  router.push({ path:'/safety-inspection/hazard', query:{ from:'hq' } }).then(() => {
    selectedProjectId.value = row.project_id
  })
}
function goBackToHQ() {
  selectedProjectId.value = HQ_PROJECT_OPTION.id
  router.push('/safety-inspection/hazard')
}
</script>

<template>
  <div class="hazard-page">
    <div class="page-head">
      <h3 class="page-title">隐患清单</h3>
      <span class="total-count">共 {{ filteredData.length }} 条</span>
    </div>

    <template v-if="isHqSelected">
      <div class="hq-dashboard">
        <div class="stat-cards">
          <div class="stat-card"><div class="sc-value">{{ hqTotalStats.totalCount }}</div><div class="sc-label">隐患总数</div></div>
          <div class="stat-card"><div class="sc-value text-warn">{{ hqTotalStats.pendingCount }}</div><div class="sc-label">待整改</div></div>
          <div class="stat-card"><div class="sc-value text-info">{{ hqTotalStats.reviewCount }}</div><div class="sc-label">待复查</div></div>
          <div class="stat-card"><div class="sc-value text-reviewed">{{ hqTotalStats.reviewedCount }}</div><div class="sc-label">已复查</div></div>
          <div class="stat-card"><div class="sc-value text-success">{{ hqTotalStats.closedCount }}</div><div class="sc-label">已关闭</div></div>
          <div class="stat-card"><div class="sc-value text-danger">{{ hqTotalStats.overdueCount }}</div><div class="sc-label">逾期隐患</div></div>
        </div>
        <div class="hq-filter-bar">
          <el-input v-model="hqProjectKeyword" placeholder="搜索项目名称..." clearable style="width:240px" :prefix-icon="Search" />
        </div>
        <el-table :data="filteredHQProjects" border stripe style="width:100%;margin-top:12px" class="hq-table">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="project_name" label="项目名称" min-width="180" />
          <el-table-column prop="totalCount" label="隐患数量" align="center" />
          <el-table-column prop="pendingCount" label="待整改数量" align="center" />
          <el-table-column prop="reviewCount" label="待复查数量" align="center" />
          <el-table-column prop="reviewedCount" label="已复查数量" align="center" />
          <el-table-column prop="closedCount" label="已关闭数量" align="center" />
          <el-table-column prop="overdueCount" label="逾期数量" align="center" />
          <el-table-column label="操作" width="110" align="center">
            <template #default="{ row }"><el-button link type="primary" :icon="View" @click="viewProjectDetail(row)">查看详情</el-button></template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <template v-else>
      <div v-if="fromHq" class="back-bar">
        <el-button link type="primary" :icon="ArrowLeft" @click="goBackToHQ">返回</el-button>
        <span>当前项目隐患台账</span>
      </div>
      <div class="page-panel">
        <div class="filter-bar">
          <el-input v-model="filterForm.keyword" placeholder="搜索整改单编号/巡检任务单编号..." clearable style="width:280px" :prefix-icon="Search" />
          <el-select v-model="filterForm.category" placeholder="巡检分类" clearable style="width:100px">
            <el-option label="安全" value="安全" /><el-option label="质量" value="质量" />
          </el-select>
          <el-select v-model="filterForm.status" placeholder="整改状态" clearable style="width:110px">
            <el-option label="待整改" value="待整改" /><el-option label="待复查" value="待复查" /><el-option label="已复查" value="已复查" /><el-option label="已关闭" value="已关闭" />
          </el-select>
          <el-select v-model="filterForm.overdue" placeholder="是否逾期" clearable style="width:100px">
            <el-option label="是" value="是" /><el-option label="否" value="否" />
          </el-select>
          <el-button @click="handleReset">重置</el-button>
        </div>
        <el-table :data="filteredData" stripe border style="width:100%" class="hazard-table">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="rectifyNo" label="整改单编号" min-width="120" />
          <el-table-column prop="taskNo" label="巡检任务单编号" min-width="120" />
          <el-table-column prop="project" label="项目" min-width="110" show-overflow-tooltip />
          <el-table-column prop="inspectionCategory" label="巡检分类" min-width="72" align="center" />
          <el-table-column prop="rectifier" label="整改人" min-width="55" align="center" />
          <el-table-column prop="reviewer" label="复查人" min-width="55" align="center" />
          <el-table-column label="整改日期" min-width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.rectDate">{{ row.rectDate }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="复查日期" min-width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.reviewDate">{{ row.reviewDate }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="整改截止日期" min-width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.deadline">{{ row.deadline }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="是否逾期" min-width="65" align="center">
            <template #default="{ row }">
              <span v-if="isOverdue(row)" style="color:#e53935;font-weight:600">是</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" min-width="55" align="center" />
          <el-table-column label="操作" width="60" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewDetail(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hazard-page { padding:0; }
.page-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.total-count { font-size:12px; color:#999; }
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.el-table { font-size:13px; }
.hq-dashboard { background:#f5f7fa; border-radius:10px; padding:20px; }
.stat-cards { display:flex; gap:14px; margin-bottom:16px; }
.stat-card { flex:1; background:#fff; border-radius:8px; padding:16px 20px; box-shadow:0 1px 4px rgba(0,0,0,.06); text-align:center; }
.sc-value { font-size:26px; font-weight:700; color:#1f2329; }
.sc-label { margin-top:4px; font-size:12px; color:#999; }
.text-warn { color:#f5a623; }
.text-info { color:#4285f4; }
.text-reviewed { color:#8f0045; }
.text-success { color:#34a853; }
.text-danger { color:#e53935; }
.hq-filter-bar { display:flex; justify-content:flex-end; }
.back-bar { display:flex; align-items:center; gap:10px; margin-bottom:12px; padding:8px 12px; background:#f5f7fa; border-radius:6px; font-size:14px; font-weight:600; }

/* 左树右表布局 */
.page-layout { display:flex; gap:0; width:100%; }
.page-panel { flex:1; min-width:0; }
.project-tree-panel { width:220px; flex-shrink:0; margin-right:20px; }
.panel-title { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.project-tree { font-size:13px; }
.project-tree :deep(.el-tree-node__content) { height:36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background:#fceef4; color:#8f0045; font-weight:600; }
</style>
