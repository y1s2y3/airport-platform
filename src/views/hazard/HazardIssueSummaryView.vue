<script setup>
import { computed, nextTick, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import HazardSamplingControls from '../../components/HazardSamplingControls.vue'
import { eligible, hqSamplingStatus, SAMPLING_STATUS, sampling, useSamplingRole, visibleHistory, visibleTasks } from '../../mock/hazardSampling.js'
import { Search } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  getHazardIssueRows,
  getHazardIssueProjectOptions,
  getCurrentHazardIssueProjectKey,
  HAZARD_ISSUE_SOURCES,
  isHazardIssueOverdue,
} from '../../utils/hazardIssueSummary.js'

const router = useRouter()
const route = useRoute()
const activeTab = ref(route.query.tab || sessionStorage.getItem('hazard-summary-tab') || 'all')
const samplingTask = ref(route.query.task || '')
const samplingRole = useSamplingRole()
watch(activeTab, value => { sessionStorage.setItem('hazard-summary-tab', value); filters.status = ''; currentPage.value = 1 })
watch(() => route.query, value => { if (value.tab) activeTab.value = value.tab; samplingTask.value = value.task || '' })
const selectedSamplingTask = computed(() => visibleTasks(samplingRole.value, selectedProjectId.value).find(t => t.id === samplingTask.value))
const { isHqSelected, selectedProjectId } = useCurrentProject()
const rows = ref([])
const projectTreeRef = ref(null)
const projectSearch = ref('')
const selectedTreeProjectId = ref('all')
const filters = reactive({ keyword: '', source: '', category: '', status: '' })
const dateRange = ref([])
const currentPage = ref(1)
const pageSize = ref(20)

const projectOptions = computed(() => getHazardIssueProjectOptions())
/** 抽检页：可抽检单据 + 待验收单据（仅可查看，不可抽检判定）。 */
const inSamplingScope = (row) => eligible(row) || row.status === '待验收'
const treeRows = computed(() => activeTab.value === 'sampling' ? rows.value.filter(inSamplingScope) : rows.value)
const projectTreeData = computed(() => [{
  id: 'all',
  label: '全部项目',
  count: treeRows.value.length,
  children: projectOptions.value.map((project) => ({
    id: project.key,
    label: project.label,
    count: treeRows.value.filter((row) => row.projectKey === project.key).length,
  })),
}])

function loadRows() {
  rows.value = getHazardIssueRows()
}

function selectProject(node) {
  selectedTreeProjectId.value = node.id
  currentPage.value = 1
}

function filterProjectNode(value, node) {
  return !value || node.id === 'all' || node.label.includes(value)
}

watch(projectSearch, (value) => projectTreeRef.value?.filter(value))
watch([selectedProjectId, isHqSelected], async () => {
  selectedTreeProjectId.value = 'all'
  currentPage.value = 1
  loadRows()
  await nextTick()
  projectTreeRef.value?.setCurrentKey('all')
})
watch([() => filters.keyword, () => filters.source, () => filters.category, () => filters.status, dateRange], () => {
  currentPage.value = 1
})
onMounted(async () => {
  loadRows()
  await nextTick()
  projectTreeRef.value?.setCurrentKey('all')
})
onActivated(loadRows)

const scopedRows = computed(() => {
  if (isHqSelected.value) {
    return selectedTreeProjectId.value === 'all'
      ? rows.value
      : rows.value.filter((row) => row.projectKey === selectedTreeProjectId.value)
  }
  const currentKey = getCurrentHazardIssueProjectKey(selectedProjectId.value)
  return rows.value.filter((row) => row.projectKey === currentKey)
})

const baseRows = computed(() => scopedRows.value.filter((row) => {
  if (activeTab.value === 'sampling' && !inSamplingScope(row)) return false
  if (activeTab.value === 'sampling' && samplingTask.value && !selectedSamplingTask.value?.ids.includes(row.id)) return false
  if (filters.source && row.source !== filters.source) return false
  if (filters.category && !row.categories.includes(filters.category)) return false
  if (dateRange.value?.length === 2) {
    const date = String(row.registeredAt).slice(0, 10)
    if (!date || date < dateRange.value[0] || date > dateRange.value[1]) return false
  }
  const keyword = filters.keyword.trim().toLowerCase()
  if (keyword) {
    const text = [row.title, row.originalNo, row.projectName, row.originalProjectName,
      row.raw.sectionName, row.rectifier, row.status].join(' ').toLowerCase()
    if (!text.includes(keyword)) return false
  }
  return true
}))

const stats = computed(() => ({
  total: baseRows.value.length,
  open: baseRows.value.filter((row) => !row.closed).length,
  overdue: baseRows.value.filter((row) => isHazardIssueOverdue(row) === true).length,
  closed: baseRows.value.filter((row) => row.closed).length,
}))

const rawStatuses = computed(() => [...new Set(rows.value.map((row) => row.status).filter(Boolean))])
/** 抽检页处理状态固定三项；「全部」页签仍按数据现有状态生成。 */
const SAMPLING_STATUS_OPTIONS = ['已复查', '已关闭', '待验收']
const statusOptions = computed(() => activeTab.value === 'sampling' ? SAMPLING_STATUS_OPTIONS : rawStatuses.value)
const filteredRows = computed(() => baseRows.value.filter((row) => {
  if (!filters.status) return true
  return row.status === filters.status
}))
const pagedRows = computed(() => filteredRows.value.slice(
  (currentPage.value - 1) * pageSize.value,
  currentPage.value * pageSize.value,
))

function resetFilters() {
  Object.assign(filters, { keyword: '', source: '', category: '', status: '' })
  dateRange.value = []
  currentPage.value = 1
}

function openOriginal(row) {
  const target = row.source === 'inspection'
    ? { path: `/safety-inspection/hazard/${encodeURIComponent(row.sourceId)}`, query: { from: 'summary' } }
    : row.source === 'supervision'
      ? { path: '/coc-admin/supervision-meeting', query: { from: 'summary', hazardId: row.sourceId } }
      : row.source === 'dispatch'
        ? { path: '/coc-admin/dispatch-hazard', query: { from: 'summary', hazardId: row.sourceId } }
        : { path: `/hazard-issues/quality/${encodeURIComponent(row.sourceId)}`, query: { from: 'summary' } }
  target.query.samplingTask = activeTab.value === 'sampling' ? samplingTask.value : ''
  router.push(target)
}

function samplingTags(row) { return [...new Set(visibleHistory(row.id, samplingRole.value).filter(h => h.stage !== 'hq').map(h => h.stage === 'supervisor' ? `监理复查${h.result}` : '已完成复查 · 合格'))] }
function samplingStatusTag(row) { return hqSamplingStatus(row) }
function samplingStatusType(row) { const status = hqSamplingStatus(row); return status === SAMPLING_STATUS.PASS ? 'success' : status === SAMPLING_STATUS.FAIL ? 'danger' : 'info' }

function statusTagType(row) {
  if (row.closed) return 'success'
  if (isHazardIssueOverdue(row)) return 'danger'
  return 'warning'
}

</script>

<template>
  <div class="hazard-summary-page">
    <el-tabs v-model="activeTab"><el-tab-pane label="全部" name="all"/><el-tab-pane label="抽检" name="sampling"/></el-tabs>
    <HazardSamplingControls v-if="activeTab === 'sampling'" v-model="samplingTask" />
    <div class="summary-layout" :class="{ 'project-only': !isHqSelected }">
      <aside v-if="isHqSelected" class="project-panel">
        <div class="panel-heading">项目范围</div>
        <el-input v-model="projectSearch" :prefix-icon="Search" clearable placeholder="搜索项目" class="project-search" />
        <el-tree
          ref="projectTreeRef"
          :data="projectTreeData"
          node-key="id"
          :props="{ label: 'label', children: 'children' }"
          :default-expanded-keys="['all']"
          :filter-node-method="filterProjectNode"
          highlight-current
          class="project-tree"
          @node-click="selectProject"
        >
          <template #default="{ data }">
            <span class="tree-row"><span class="tree-name" :title="data.label">{{ data.label }}</span><span class="tree-count">{{ data.count }}</span></span>
          </template>
        </el-tree>
      </aside>

      <section class="main-panel">
        <div class="stats-grid">
          <div class="stat-card"><span class="stat-label">问题记录总数</span><strong>{{ stats.total }}</strong></div>
          <div class="stat-card"><span class="stat-label">未闭环</span><strong class="stat-warn">{{ stats.open }}</strong></div>
          <div class="stat-card"><span class="stat-label">逾期未闭环</span><strong class="stat-danger">{{ stats.overdue }}</strong></div>
          <div class="stat-card"><span class="stat-label">已闭环</span><strong class="stat-success">{{ stats.closed }}</strong></div>
        </div>

        <div class="list-panel">
          <div class="list-heading">
            <div><h3>问题清单</h3><span>共 {{ filteredRows.length }} 条</span></div>
            <span class="demo-note">施工质量问题为原型示例数据</span>
          </div>
          <div class="filter-bar">
            <el-input v-model="filters.keyword" clearable :prefix-icon="Search" placeholder="搜索问题、编号、项目或整改人" class="keyword-input" />
            <el-select v-model="filters.source" clearable placeholder="全部来源" class="filter-select">
              <el-option v-for="source in HAZARD_ISSUE_SOURCES" :key="source.value" :label="source.label" :value="source.value" />
            </el-select>
            <el-select v-model="filters.category" clearable placeholder="问题类别" class="filter-select">
              <el-option label="安全" value="安全" /><el-option label="质量" value="质量" />
            </el-select>
            <el-select v-model="filters.status" clearable placeholder="处理状态" class="filter-select">
              <el-option v-for="status in statusOptions" :key="status" :label="status" :value="status" />
            </el-select>
            <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 230px" />
            <el-button @click="resetFilters">重置</el-button>
          </div>

          <el-table :data="pagedRows" stripe border class="issue-table" empty-text="当前范围暂无问题记录">
            <el-table-column type="index" label="序号" width="50" align="center" :index="(index) => (currentPage - 1) * pageSize + index + 1" />
            <el-table-column label="来源" width="120">
              <template #default="{ row }"><el-tag size="small" effect="plain">{{ row.sourceLabel }}</el-tag></template>
            </el-table-column>
            <el-table-column v-if="isHqSelected" prop="projectName" label="项目" min-width="90" show-overflow-tooltip />
            <el-table-column prop="categoryLabel" label="类别" width="66" align="center" />
            <el-table-column label="隐患／问题内容" min-width="220">
              <template #default="{ row }"><div class="issue-title" :title="row.title">{{ row.title || '--' }}</div><div class="issue-number" :title="row.originalNo">{{ row.originalNo }}</div><el-tag v-for="tag in samplingTags(row)" :key="tag" size="small" :type="tag.includes('不合格') ? 'danger' : 'success'">{{ tag }}</el-tag></template>
            </el-table-column>
            <el-table-column label="原业务状态" width="96" align="center">
              <template #default="{ row }"><el-tag :type="statusTagType(row)" size="small">{{ row.status || '--' }}</el-tag></template>
            </el-table-column>
            <el-table-column v-if="activeTab === 'sampling'" label="抽检状态" width="96" align="center">
              <template #default="{ row }"><el-tag :type="samplingStatusType(row)" size="small" effect="plain">{{ samplingStatusTag(row) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="整改人" min-width="88" show-overflow-tooltip>
              <template #default="{ row }">{{ row.rectifier || '--' }}</template>
            </el-table-column>
            <el-table-column label="登记日期" width="100">
              <template #default="{ row }"><span :title="row.registeredAt">{{ row.registeredAt?.slice(0, 10) || '--' }}</span></template>
            </el-table-column>
            <el-table-column label="完成期限" width="100">
              <template #default="{ row }"><span :title="row.deadline">{{ row.deadline?.slice(0, 10) || '--' }}</span></template>
            </el-table-column>
            <el-table-column label="逾期" width="66" align="center">
              <template #default="{ row }"><span :class="{ overdue: isHazardIssueOverdue(row) === true }">{{ isHazardIssueOverdue(row) === null ? '--' : isHazardIssueOverdue(row) ? '是' : '否' }}</span></template>
            </el-table-column>
            <el-table-column label="操作" width="84" fixed="right" align="center">
              <template #default="{ row }"><el-button link type="primary" @click="openOriginal(row)">详情</el-button></template>
            </el-table-column>
          </el-table>
          <div class="pagination-row">
            <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total="filteredRows.length" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" />
          </div>
        </div>
      </section>
    </div>


  </div>
</template>

<style scoped>
.hazard-summary-page { padding: 4px 0 24px; color: #303133; }
.summary-layout { display:grid; grid-template-columns:220px minmax(0, 1fr); align-items:start; gap:16px; }
.summary-layout.project-only { grid-template-columns:minmax(0, 1fr); }
.project-panel, .list-panel { background:#fff; border:1px solid #e5e9ef; border-radius:8px; box-shadow:0 2px 10px rgba(25,41,64,.035); }
.project-panel { padding:16px 12px 16px; min-height:480px; }
.panel-heading { font-size:15px; font-weight:600; padding:0 5px 12px; }
.project-search { margin-bottom:12px; }
.project-tree { max-height:620px; overflow:auto; font-size:13px; }
.project-tree :deep(.el-tree-node__content) { height:34px; padding-right:6px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { color:#8f0045; background:#fcecf3; font-weight:600; }
.tree-row { display:flex; justify-content:space-between; align-items:center; width:100%; min-width:0; gap:5px; }
.tree-name { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.tree-count { flex-shrink:0; color:#8b929b; font-size:11px; }
.main-panel { min-width:0; }
.stats-grid { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:12px; margin-bottom:16px; }
.stat-card { display:flex; flex-direction:column; gap:8px; min-height:94px; padding:16px 18px; background:#fff; border:1px solid #e5e9ef; border-radius:8px; }
.stat-label { color:#737c89; font-size:13px; }
.stat-card strong { font-size:26px; line-height:30px; color:#242933; }
.stat-card .stat-warn { color:#d88714; }
.stat-card .stat-danger { color:#d84949; }
.stat-card .stat-success { color:#2a9d65; }
.list-panel { padding:18px; }
.list-heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap:12px; }
.list-heading > div { display:flex; align-items:baseline; gap:10px; }
.list-heading h3 { margin:0; font-size:16px; }
.list-heading span { color:#8b929b; font-size:12px; }
.demo-note { white-space:nowrap; }
.filter-bar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
.keyword-input { width:246px; }
.filter-select { width:132px; }
.issue-table { font-size:13px; }
.issue-table :deep(.el-table__cell) { padding:9px 0; }
.issue-title { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color:#303133; }
.issue-number { margin-top:3px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color:#9aa1aa; font-size:11px; }
.overdue { color:#d84949; font-weight:600; }
.pagination-row { display:flex; justify-content:flex-end; padding-top:14px; }
@media (max-width:1200px) { .stats-grid { grid-template-columns:repeat(2, minmax(0,1fr)); } .summary-layout { grid-template-columns:190px minmax(0,1fr); } }
@media (max-width:800px) { .summary-layout { grid-template-columns:minmax(0,1fr); } .project-panel { min-height:auto; } .project-tree { max-height:220px; } .stats-grid { grid-template-columns:repeat(2, minmax(0,1fr)); } .demo-note { white-space:normal; } }
</style>
