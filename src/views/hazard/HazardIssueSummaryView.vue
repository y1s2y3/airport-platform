<script setup>
import { SHOW_HAZARD_SAMPLING } from '../../config/hazardSamplingVisibility.js'
import { computed, nextTick, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { hqSamplingStatus, SAMPLING_STATUS, ensureSamplingExamples } from '../../mock/hazardSampling.js'
import { Search, Download, Setting } from '@element-plus/icons-vue'
import { useFilterVisibility } from '../../composables/useFilterVisibility'
import { ElMessage } from 'element-plus'
import DispatchHazardDetailDialog from '../../components/hazard/DispatchHazardDetailDialog.vue'
import SupervisionHazardDetailDialog from '../../components/hazard/SupervisionHazardDetailDialog.vue'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  getHazardIssueRows,
  getHazardIssueProjectOptions,
  getCurrentHazardIssueProjectKey,
  HAZARD_ISSUE_SOURCES,
  isHazardIssueOverdue,
} from '../../utils/hazardIssueSummary.js'
import { buildHazardSummaryExportFile } from '../../utils/hazardSummaryExport.js'

const router = useRouter()
const route = useRoute()
const { isHqSelected, selectedProjectId } = useCurrentProject()
const rows = ref([])
const projectTreeRef = ref(null)
const projectSearch = ref('')
const selectedTreeProjectId = ref('all')
const filters = reactive({ keyword: '', source: [], category: '', status: '', samplingStatus: '', registrant: '', hazardLevel: '', hazardCategory: '' })
const dateRange = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const meetingHazardDialogs = {
  dispatch: DispatchHazardDetailDialog,
  supervision: SupervisionHazardDetailDialog,
}
const selectedMeetingHazard = ref(null)
const meetingHazardVisible = ref(false)

const projectOptions = computed(() => getHazardIssueProjectOptions())
/** 汇总始终展示全部原业务状态。 */
const treeRows = computed(() => rows.value)
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
  if (SHOW_HAZARD_SAMPLING) ensureSamplingExamples(rows.value)
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
  meetingHazardVisible.value = false
  filters.samplingStatus = ''
  selectedTreeProjectId.value = 'all'
  currentPage.value = 1
  loadRows()
  await nextTick()
  projectTreeRef.value?.setCurrentKey('all')
})
watch([() => filters.keyword, () => filters.source, () => filters.category, () => filters.status, () => filters.samplingStatus, () => filters.registrant, () => filters.hazardLevel, () => filters.hazardCategory, dateRange], () => {
  currentPage.value = 1
})
watch(selectedTreeProjectId, () => { currentPage.value = 1 })

onMounted(async () => {
  if (route.query.tab || route.query.taskView || route.query.task) router.replace({path:route.path,query:{}})
  loadRows()
  await nextTick()
  let saved = null
  try { saved = JSON.parse(sessionStorage.getItem('airport-hazard-summary-view') || 'null') } catch { /* 保留默认筛选 */ }
  if (saved?.projectId === selectedProjectId.value) {
    for (const key of Object.keys(filters)) {
      if (key !== 'source') filters[key] = typeof saved.filters?.[key] === 'string' ? saved.filters[key] : ''
    }
    const savedSources = Array.isArray(saved.filters?.source) ? saved.filters.source : [saved.filters?.source]
    filters.source = HAZARD_ISSUE_SOURCES.map(source => source.value).filter(value => savedSources.includes(value))
    dateRange.value = Array.isArray(saved.dateRange) ? saved.dateRange : []
    applySummaryFilterVisibility()
    pageSize.value = [10,20,50].includes(saved.pageSize) ? saved.pageSize : 10
    selectedTreeProjectId.value = saved.tree === 'all' || projectOptions.value.some(p => p.key === saved.tree) ? saved.tree : 'all'
    projectSearch.value = saved.search || ''
    await nextTick()
    currentPage.value = Math.min(Math.max(1, Number(saved.currentPage) || 1),Math.max(1, Math.ceil(filteredRows.value.length/pageSize.value)))
  }
  projectTreeRef.value?.setCurrentKey(selectedTreeProjectId.value)
})
onActivated(loadRows)

const optionPool = (field) => [...new Set(rows.value.map((row) => row[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
const registrantOptions = computed(() => optionPool('registrant'))
const hazardLevelOptions = computed(() => optionPool('hazardLevel'))
/** 隐患类别选项：与巡检隐患清单一致，展示为「分类 / 类别」。 */
const hazardCategoryOptions = computed(() => {
  const map = new Map()
  for (const row of rows.value) {
    const name = row.hazardCategory
    if (!name) continue
    const category = (row.categories || [])[0] || ''
    if (!category) continue
    map.set(`${category}::${name}`, `${category} / ${name}`)
  }
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'zh-CN')).map(([value, label]) => ({ value, label }))
})

const scopedRows = computed(() => {
  if (isHqSelected.value) {
    return selectedTreeProjectId.value === 'all'
      ? rows.value
      : rows.value.filter((row) => row.projectKey === selectedTreeProjectId.value)
  }
  const currentKey = getCurrentHazardIssueProjectKey(selectedProjectId.value)
  return rows.value.filter((row) => row.projectKey === currentKey)
})

const activeStat = ref('')
function selectStat(key) {
  activeStat.value = activeStat.value === key ? '' : key
}

const baseRows = computed(() => scopedRows.value.filter((row) => {
  if (filters.source.length && !filters.source.includes(row.source)) return false
  if (filters.category && !row.categories.includes(filters.category)) return false
  if (filters.registrant && row.registrant !== filters.registrant) return false
  if (filters.hazardLevel && row.hazardLevel !== filters.hazardLevel) return false
  if (filters.hazardCategory) {
    const [category, name] = String(filters.hazardCategory).split('::')
    if (!(row.hazardCategory === name && (row.categories || []).includes(category))) return false
  }
  if (dateRange.value?.length === 2) {
    const date = String(row.registeredAt).slice(0, 10)
    if (!date || date < dateRange.value[0] || date > dateRange.value[1]) return false
  }
  const keyword = filters.keyword.trim().toLowerCase()
  if (keyword) {
    const text = [row.title, row.originalNo, row.projectName, row.originalProjectName,
      row.raw.sectionName, row.rectifier, row.status, row.registrant, row.inspector, row.hazardLevel, row.hazardCategory].join(' ').toLowerCase()
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
const statusOptions = rawStatuses
/** 顶部统计卡片联动：open=未闭环，overdue=逾期未闭环，closed=已闭环 */

const filteredRows = computed(() => baseRows.value.filter((row) => {
  if (filters.status && row.status !== filters.status) return false
  if (SHOW_HAZARD_SAMPLING && isHqSelected.value && filters.samplingStatus && hqSamplingStatus(row) !== filters.samplingStatus) return false
  if (activeStat.value === 'closed') return row.closed
  if (activeStat.value === 'open') return !row.closed
  if (activeStat.value === 'overdue') return !row.closed && isHazardIssueOverdue(row)
  return true
}))
const pagedRows = computed(() => filteredRows.value.slice(
  (currentPage.value - 1) * pageSize.value,
  currentPage.value * pageSize.value,
))

const exporting = ref(false)

async function doExport() {
  if (exporting.value) return
  if (!filteredRows.value.length) return ElMessage.warning('当前筛选没有可导出的记录')
  exporting.value = true
  try {
    const { filename, blob } = await buildHazardSummaryExportFile({
      rows: filteredRows.value,
      range: dateRange.value,
      sources: filters.source,
      name: '隐患问题清单汇总',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}

const SUMMARY_FILTER_FIELDS = [
  { key: 'keyword', label: '搜索框' },
  { key: 'source', label: '全部来源' },
  { key: 'category', label: '问题类别' },
  { key: 'registrant', label: '登记人' },
  { key: 'hazardLevel', label: '隐患等级' },
  { key: 'hazardCategory', label: '隐患类别' },
  { key: 'status', label: '整改状态' },
  { key: 'dateRange', label: '登记日期' },
]
const { visible: summaryFilterVisible, isVisible: isSummaryFilterVisible, clearHidden: clearHiddenSummaryFilters } = useFilterVisibility('hazard-summary-filters', SUMMARY_FILTER_FIELDS)
function applySummaryFilterVisibility() {
  clearHiddenSummaryFilters(filters, { source: [] })
  if (!isSummaryFilterVisible('dateRange')) dateRange.value = []
}

function resetFilters() {
  Object.assign(filters, { keyword: '', source: [], category: '', status: '', samplingStatus: '', registrant: '', inspector: '', hazardLevel: '', hazardCategory: '' })
  dateRange.value = []
  activeStat.value = ''
  currentPage.value = 1
}

function openOriginal(row) {
  try { sessionStorage.setItem('airport-hazard-summary-view', JSON.stringify({projectId:selectedProjectId.value,filters:{...filters},dateRange:dateRange.value,currentPage:currentPage.value,pageSize:pageSize.value,tree:selectedTreeProjectId.value,search:projectSearch.value})) } catch { /* 不影响跳转 */ }
  if (row.source === 'dispatch') {
    router.push({ name: 'DispatchHazardDetail', params: { id: row.sourceId }, query: { from: 'summary' } })
    return
  }
  if (row.source === 'supervision') {
    selectedMeetingHazard.value = row
    meetingHazardVisible.value = true
    return
  }
  const target = row.source === 'inspection'
    ? { path: `/safety-inspection/hazard/${encodeURIComponent(row.sourceId)}`, query: { from: 'summary' } }
    : { path: `/hazard-issues/quality/${encodeURIComponent(row.sourceId)}`, query: { from: 'summary' } }
  router.push(target)
}

const samplingStatusTag = hqSamplingStatus
function samplingStatusType(row) { const status = hqSamplingStatus(row); return status === SAMPLING_STATUS.PASS ? 'success' : status === SAMPLING_STATUS.FAIL ? 'danger' : 'info' }

function statusTagType(row) {
  if (row.closed) return 'success'
  if (isHazardIssueOverdue(row)) return 'danger'
  return 'warning'
}

</script>

<template>
  <div class="hazard-summary-page">
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
          <div class="stat-card stat-card--clickable" :class="{ 'is-active': activeStat === '' }" @click="selectStat('')"><span class="stat-label">问题记录总数</span><strong>{{ stats.total }}</strong></div>
          <div class="stat-card stat-card--clickable" :class="{ 'is-active': activeStat === 'open' }" @click="selectStat('open')"><span class="stat-label">未闭环</span><strong class="stat-warn">{{ stats.open }}</strong></div>
          <div class="stat-card stat-card--clickable" :class="{ 'is-active': activeStat === 'overdue' }" @click="selectStat('overdue')"><span class="stat-label">逾期未闭环</span><strong class="stat-danger">{{ stats.overdue }}</strong></div>
          <div class="stat-card stat-card--clickable" :class="{ 'is-active': activeStat === 'closed' }" @click="selectStat('closed')"><span class="stat-label">已闭环</span><strong class="stat-success">{{ stats.closed }}</strong></div>
        </div>

        <div class="list-panel">
          <div class="list-heading">
            <div><h3>问题清单</h3><span>共 {{ filteredRows.length }} 条</span></div>
            <el-button type="primary" :icon="Download" :loading="exporting" @click="doExport">导出</el-button>
          </div>
          <div class="filter-bar">
            <el-input v-if="isSummaryFilterVisible('keyword')" v-model="filters.keyword" clearable :prefix-icon="Search" placeholder="搜索问题、编号、项目或整改人" class="keyword-input" />
            <el-select v-if="isSummaryFilterVisible('source')" v-model="filters.source" multiple filterable clearable collapse-tags collapse-tags-tooltip placeholder="全部来源" class="filter-select source-select">
              <el-option v-for="source in HAZARD_ISSUE_SOURCES" :key="source.value" :label="source.label" :value="source.value" />
            </el-select>
            <el-select v-if="isSummaryFilterVisible('category')" v-model="filters.category" clearable placeholder="问题类别" class="filter-select">
              <el-option label="安全" value="安全" /><el-option label="质量" value="质量" />
            </el-select>
            <el-select v-if="isSummaryFilterVisible('registrant')" v-model="filters.registrant" clearable filterable placeholder="登记人" class="filter-select">
            <el-option v-for="name in registrantOptions" :key="name" :label="name" :value="name" />
          </el-select>
          <el-select v-if="isSummaryFilterVisible('hazardLevel')" v-model="filters.hazardLevel" clearable placeholder="隐患等级" class="filter-select">
            <el-option v-for="level in hazardLevelOptions" :key="level" :label="level" :value="level" />
          </el-select>
          <el-select v-if="isSummaryFilterVisible('hazardCategory')" v-model="filters.hazardCategory" clearable filterable placeholder="隐患类别" class="filter-select">
            <el-option v-for="cat in hazardCategoryOptions" :key="cat.value" :label="cat.label" :value="cat.value" />
          </el-select>
          <el-select v-if="isSummaryFilterVisible('status')" v-model="filters.status" clearable placeholder="整改状态" class="filter-select">
              <el-option v-for="status in statusOptions" :key="status" :label="status" :value="status" />
            </el-select>
            <el-select v-if="SHOW_HAZARD_SAMPLING && isHqSelected" v-model="filters.samplingStatus" clearable placeholder="抽查结果" aria-label="抽查结果" class="filter-select sampling-status-filter">
              <el-option v-for="status in SAMPLING_STATUS" :key="status" :label="status" :value="status" />
            </el-select>
            <el-date-picker v-if="isSummaryFilterVisible('dateRange')" v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 230px" />
            <el-button @click="resetFilters">重置</el-button>
          <el-popover placement="bottom-end" :width="230" trigger="click">
            <template #reference>
              <el-button :icon="Setting" circle title="设置筛选条件" aria-label="设置筛选条件" />
            </template>
            <div class="filter-setting">
              <div class="filter-setting-title">汇总筛选设置</div>
              <el-checkbox v-for="field in SUMMARY_FILTER_FIELDS" :key="field.key" v-model="summaryFilterVisible[field.key]" @change="applySummaryFilterVisibility">{{ field.label }}</el-checkbox>
            </div>
          </el-popover>
          </div>

          <el-table :data="pagedRows" stripe border class="issue-table" empty-text="当前范围暂无问题记录">
            <el-table-column type="index" label="序号" width="50" align="center" :index="(index) => (currentPage - 1) * pageSize + index + 1" />
            <el-table-column label="来源" width="120">
              <template #default="{ row }"><el-tag size="small" effect="plain">{{ row.sourceLabel }}</el-tag></template>
            </el-table-column>
            <el-table-column v-if="isHqSelected" prop="projectName" label="项目" min-width="90" show-overflow-tooltip />
            <el-table-column prop="categoryLabel" label="类别" width="66" align="center" />
            <el-table-column prop="hazardCategory" label="隐患类别" min-width="110" show-overflow-tooltip>
              <template #default="{ row }">{{ row.hazardCategory || '--' }}</template>
            </el-table-column>
            <el-table-column prop="hazardLevel" label="隐患等级" width="96" align="center">
              <template #default="{ row }">{{ row.hazardLevel || '--' }}</template>
            </el-table-column>
            <el-table-column label="隐患／问题内容" min-width="220">
              <template #default="{ row }"><div class="issue-title" :title="row.title">{{ row.title || '--' }}</div><div class="issue-number" :title="row.originalNo">{{ row.originalNo }}</div></template>
            </el-table-column>
            <el-table-column label="整改状态" width="96" align="center">
              <template #default="{ row }"><el-tag :type="statusTagType(row)" size="small">{{ row.status || '--' }}</el-tag></template>
            </el-table-column>
            <el-table-column label="登记人" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.registrant || '--' }}</template>
            </el-table-column>
            <el-table-column v-if="SHOW_HAZARD_SAMPLING && isHqSelected" label="抽查结果" width="96" align="center">
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
            <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total="filteredRows.length" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next, jumper" background />
          </div>
        </div>
      </section>
    </div>

    <component
      :is="meetingHazardDialogs[selectedMeetingHazard.source]"
      v-if="selectedMeetingHazard"
      v-model="meetingHazardVisible"
      :record="selectedMeetingHazard.raw"
    />
  </div>
</template>

<style scoped>
.source-select { min-width: 190px; }
.stat-card--clickable { cursor: pointer; transition: box-shadow .15s, border-color .15s; }
.stat-card--clickable:hover { box-shadow: 0 2px 10px rgba(143, 0, 69, .12); }
.stat-card--clickable.is-active { border: 1px solid #8f0045; box-shadow: 0 0 0 2px rgba(143, 0, 69, .12); }
.filter-setting { display: flex; flex-direction: column; gap: 6px; }
.filter-setting-title { margin-bottom: 4px; font-size: 13px; font-weight: 600; color: #1f2329; }
.filter-setting :deep(.el-checkbox) { margin-right: 0; }
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
