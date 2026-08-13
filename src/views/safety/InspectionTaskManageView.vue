<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, View, ArrowLeft } from '@element-plus/icons-vue'
import { useLaborProjectScope, selectedProjectId } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import { getProjectInspectorLabel } from '../../composables/useInspectionPersonConfig'
import { DEFAULT_INSPECTOR_LABEL } from '../../config/inspectionManagement'
import { projectTree } from '../../mock/laborRealName.js'
import { listMobileInspectionTasks } from '../../mock/mobileInspectionTasks'

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
      const count = taskData.value.filter(t => t.projectId === node.id).length
      const label = treeSearch.value
        ? (node.label.includes(treeSearch.value) ? `${node.label}（${count}）` : '')
        : `${node.label}（${count}）`
      return { ...node, label, _visible: !treeSearch.value || node.label.includes(treeSearch.value) }
    })
    .filter(n => n._visible)
  return [{ ...root, label: treeSearch.value ? '搜索结果' : root.label, children }]
})

// 与移动端共用任务数据，下发后立即出现在 Web 台账和移动端待办中。
const taskData = computed(() => listMobileInspectionTasks().map(task => ({
  ...task,
  inspector: task.inspector || task.executor || getProjectInspectorLabel(task.projectId) || DEFAULT_INSPECTOR_LABEL,
  inspectionDate: task.inspectionDate || task.inspDate || '',
  hazardItems: task.hazardItems || [],
})))

// ===== 项目树数据 =====
const treeData = computed(() => projectTree)

// ===== 筛选 =====
const filterForm = reactive({ keyword: '', category: '', status: '', source: '', result: '', overdue: '' })

const hqProjectKeyword = ref('')
const hqProjectStats = computed(() => projectTree[0].children.map(project => {
  const rows = taskData.value.filter(item => item.projectId === project.id)
  return {
    projectId: project.id,
    projectName: project.label,
    totalCount: rows.length,
    pendingCount: rows.filter(item => item.status === '待执行').length,
    completedCount: rows.filter(item => item.status === '已完成').length,
    overdueCount: rows.filter(item => isOverdue(item)).length,
    hazardCount: rows.reduce((sum, item) => sum + (item.hazardCount || 0), 0),
  }
}))
const filteredHQProjects = computed(() => hqProjectStats.value.filter(item =>
  !hqProjectKeyword.value || item.projectName.includes(hqProjectKeyword.value),
))
const hqTotalStats = computed(() => ({
  totalCount: filteredHQProjects.value.reduce((sum, item) => sum + item.totalCount, 0),
  pendingCount: filteredHQProjects.value.reduce((sum, item) => sum + item.pendingCount, 0),
  completedCount: filteredHQProjects.value.reduce((sum, item) => sum + item.completedCount, 0),
  overdueCount: filteredHQProjects.value.reduce((sum, item) => sum + item.overdueCount, 0),
  hazardCount: filteredHQProjects.value.reduce((sum, item) => sum + item.hazardCount, 0),
}))

const filteredTasks = computed(() => {
  let list = taskData.value
  if (!isHqSelected.value && scopeProjectId.value) list = list.filter(t => t.projectId === scopeProjectId.value)
  return list.filter(t => {
    if (filterForm.category && t.inspectionCategory !== filterForm.category) return false
    if (filterForm.status && t.status !== filterForm.status) return false
    if (filterForm.source && t.source !== filterForm.source) return false
    if (filterForm.result === '正常' && (t.status !== '已完成' || t.hazardCount > 0)) return false
    if (filterForm.result === '有隐患' && (t.status !== '已完成' || t.hazardCount === 0)) return false
    if (filterForm.overdue === '是') {
      if (!t.deadline) return false
      if (t.status === '已完成') return false
      if (new Date(t.deadline) >= new Date('2026-07-16')) return false
    }
    if (filterForm.overdue === '否') {
      if (!t.deadline) return true
      if (t.status === '已完成') return true
      if (new Date(t.deadline) >= new Date('2026-07-16')) return true
    }
    if (filterForm.keyword) {
      const kw = filterForm.keyword
      if (!t.taskNo.includes(kw) && !(t.taskName || '').includes(kw) && !t.project.includes(kw)) return false
    }
    return true
  })
})

function isOverdue(row) {
  if (row.status === '已完成') return false
  if (!row.deadline) return false
  return new Date(row.deadline) < new Date('2026-07-16')
}

function getTaskExecutor(row) {
  return row.executor || row.inspector || '-'
}

function getTaskCompanions(row) {
  return row.companions || []
}

function viewDetail(row) { router.push(`/safety-inspection/task/${row.id}`) }
function goRectify(id) { router.push(`/safety-inspection/hazard/${id}`) }
function handleReset() { Object.keys(filterForm).forEach(k => filterForm[k] = '') }
function viewProjectDetail(row) {
  router.push({ path:'/safety-inspection/task', query:{ from:'hq' } }).then(() => {
    selectedProjectId.value = row.projectId
  })
}
function goBackToHQ() {
  selectedProjectId.value = HQ_PROJECT_OPTION.id
  router.push('/safety-inspection/task')
}
</script>

<template>
  <div class="task-page">
    <div class="page-head">
      <h3 class="page-title">巡检任务管理</h3>
      <div class="page-actions" v-if="isHqSelected">
      </div>
    </div>

    <template v-if="isHqSelected">
      <div class="hq-dashboard">
        <div class="stat-cards">
          <div class="stat-card"><div class="sc-value">{{ hqTotalStats.totalCount }}</div><div class="sc-label">任务总数</div></div>
          <div class="stat-card"><div class="sc-value text-warn">{{ hqTotalStats.pendingCount }}</div><div class="sc-label">待执行</div></div>
          <div class="stat-card"><div class="sc-value text-success">{{ hqTotalStats.completedCount }}</div><div class="sc-label">已完成</div></div>
          <div class="stat-card"><div class="sc-value text-danger">{{ hqTotalStats.overdueCount }}</div><div class="sc-label">逾期任务</div></div>
          <div class="stat-card"><div class="sc-value text-danger">{{ hqTotalStats.hazardCount }}</div><div class="sc-label">隐患总数</div></div>
        </div>
        <div class="hq-filter-bar">
          <el-input v-model="hqProjectKeyword" placeholder="搜索项目名称..." clearable style="width:240px" :prefix-icon="Search" />
        </div>
        <el-table :data="filteredHQProjects" border stripe style="width:100%;margin-top:12px" class="hq-table">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="projectName" label="项目名称" min-width="180" />
          <el-table-column prop="totalCount" label="任务数量" align="center" />
          <el-table-column prop="pendingCount" label="待执行数量" align="center" />
          <el-table-column prop="completedCount" label="已完成数量" align="center" />
          <el-table-column prop="overdueCount" label="逾期数量" align="center" />
          <el-table-column prop="hazardCount" label="隐患数量" align="center" />
          <el-table-column label="操作" width="110" align="center">
            <template #default="{ row }"><el-button link type="primary" :icon="View" @click="viewProjectDetail(row)">查看详情</el-button></template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <template v-else>
      <div v-if="fromHq" class="back-bar">
        <el-button link type="primary" :icon="ArrowLeft" @click="goBackToHQ">返回</el-button>
        <span>当前项目巡检任务台账</span>
      </div>
      <div class="page-panel">
        <!-- 筛选栏 -->
        <div class="filter-bar">
          <el-input v-model="filterForm.keyword" placeholder="搜索编号/名称/整改单..." clearable style="width:240px" :prefix-icon="Search" />
          <el-select v-model="filterForm.category" placeholder="巡检分类" clearable style="width:100px">
            <el-option label="安全" value="安全" /><el-option label="质量" value="质量" />
          </el-select>
          <el-select v-model="filterForm.status" placeholder="任务状态" clearable style="width:100px">
            <el-option label="待执行" value="待执行" /><el-option label="已完成" value="已完成" />
          </el-select>
          <el-select v-model="filterForm.source" placeholder="任务来源" clearable style="width:110px">
            <el-option label="任务下发" value="任务下发" /><el-option label="系统自建" value="系统自建" />
          </el-select>
          <el-select v-model="filterForm.result" placeholder="巡检结果" clearable style="width:100px">
            <el-option label="正常" value="正常" /><el-option label="有隐患" value="有隐患" />
          </el-select>
          <el-select v-model="filterForm.overdue" placeholder="是否逾期" clearable style="width:100px">
            <el-option label="是" value="是" /><el-option label="否" value="否" />
          </el-select>
          <el-button @click="handleReset">重置</el-button>
        </div>

        <!-- 台账表格 -->
        <el-table :data="filteredTasks" stripe border style="width:100%" v-if="filteredTasks.length" class="task-table">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="taskNo" label="任务单编号" min- />
          <el-table-column prop="project" label="所属项目" min- show-overflow-tooltip />
          <el-table-column prop="inspectionCategory" label="巡检分类" min- align="center">
            <template #default="{ row }"><el-tag size="small" :type="row.inspectionCategory === '质量' ? 'warning' : 'success'">{{ row.inspectionCategory }}</el-tag></template>
          </el-table-column>
          <el-table-column label="任务名称" min-width="160">
            <template #default="{ row }">
              <span v-if="row.taskName">{{ row.taskName }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="执行人" min- align="center">
            <template #default="{ row }">{{ getTaskExecutor(row) }}</template>
          </el-table-column>
          <el-table-column label="同行人" min- align="center">
            <template #default="{ row }">
              <span v-if="getTaskCompanions(row).length">{{ getTaskCompanions(row).join('、') }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="巡检日期" min- align="center">
            <template #default="{ row }">
              <span v-if="row.status === '待执行'" style="color:#999">--</span>
              <span v-else-if="row.inspectionDate">{{ row.inspectionDate }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" min- align="center" />
          <el-table-column label="结果" min- align="center">
            <template #default="{ row }">
              <span v-if="row.status === '已完成'">
                <span v-if="row.hazardCount > 0">有隐患</span>
                <span v-else>正常</span>
              </span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="隐患数量" min- align="center">
            <template #default="{ row }">
              <span v-if="row.hazardCount > 0">{{ row.hazardCount }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="是否逾期" min- align="center">
            <template #default="{ row }">
              <span v-if="isOverdue(row)" style="color:#e53935;font-weight:600">是</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="整改单" min- align="center">
            <template #default="{ row }">
              <template v-if="row.hazardItems?.some(h => h.hasRectify)">
                <div style="display:flex;flex-direction:column;gap:2px">
                  <el-button
                    v-for="hi in row.hazardItems.filter(h => h.hasRectify)"
                    :key="hi.rectifyId"
                    link type="primary" size="small"
                    @click="goRectify(hi.rectifyId)"
                  >{{ hi.rectifyNo }}</el-button>
                </div>
              </template>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewDetail(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-else class="empty-state">暂无数据</div>
      </div>
    </template>
  </div>

</template>

<style scoped>
.task-page { padding:0; }
.page-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.empty-state { text-align:center; padding:60px 0; color:#999; font-size:14px; }
.el-table { font-size:13px; }
.hq-dashboard { background:#f5f7fa; border-radius:10px; padding:20px; }
.stat-cards { display:flex; gap:14px; margin-bottom:16px; }
.stat-card { flex:1; background:#fff; border-radius:8px; padding:16px 20px; box-shadow:0 1px 4px rgba(0,0,0,.06); text-align:center; }
.sc-value { font-size:26px; font-weight:700; color:#1f2329; }
.sc-label { margin-top:4px; font-size:12px; color:#999; }
.text-warn { color:#f5a623; }
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

.el-table { width:100% !important; }
.el-table__header-wrapper table, .el-table__body-wrapper table { table-layout:fixed; width:100% !important; }
</style>
