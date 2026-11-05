<script setup>
import { computed, onMounted, onBeforeUnmount, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../../composables/useCurrentProject.js'
import { dailyDispatchRepository as repo, DAILY_BASE } from '../../../composables/useDailyDispatchCheck.js'
import { DAILY_CHANGE_EVENT } from '../../../mock/dailyDispatchCheck.js'
import { SUMMARY_COLUMNS, summaryColumns, viewDefaultRange } from '../../../utils/dailyDispatchCheckRules.js'
import { dailyLedgerColumns } from '../../../utils/dailyDispatchLedgerStatus.js'
import { filterLedgerSummaries, normalizeLedgerRange } from '../../../utils/dailyDispatchLedgerQuery.js'
import { useDailyDispatchLedger } from '../../../composables/useDailyDispatchLedger.js'
import { readLedgerRouteState, ledgerRouteQuery } from '../../../composables/dailyDispatchLedgerNavigation.js'
import DailyDispatchRecordsTable from './DailyDispatchRecordsTable.vue'
import DailyDispatchSummaryView from './DailyDispatchSummaryView.vue'
import DailyPrototypeNote from './DailyPrototypeNote.vue'
import DailyCheckDialog from './DailyCheckDialog.vue'
import './daily-dispatch-theme.css'
const route = useRoute(), router = useRouter(), { isHqSelected } = useCurrentProject()
const restored = ref(readLedgerRouteState(route.query))
const activeTab = ref(restored.value?.activeTab || (route.query.tab === 'summary' ? 'summary' : 'daily'))
const range = ref(restored.value ? restored.value.range : viewDefaultRange('list')), applied = ref(restored.value ? restored.value.applied : [...range.value])
const { summaries, loading, error, load: readSummaries } = useDailyDispatchLedger(repo)
const recordsTable = ref(null), summaryView = ref(null)
let paginationToRestore = restored.value?.pagination, recordingOrigin = false
const querySession = ref(0)
async function load() {
  await readSummaries()
  if (paginationToRestore && !loading.value && !error.value) {
    await nextTick()
    recordsTable.value?.restorePagination(paginationToRestore)
    summaryView.value?.restorePagination(restored.value?.summary?.pagination)
    paginationToRestore = null
  }
}
watch(() => route.query, async query => {
  if (recordingOrigin || route.path !== DAILY_BASE) return
  restored.value = readLedgerRouteState(query)
  range.value = restored.value ? restored.value.range : viewDefaultRange('list')
  applied.value = restored.value ? restored.value.applied : [...range.value]
  activeTab.value = restored.value?.activeTab || (query.tab === 'summary' ? 'summary' : 'daily')
  paginationToRestore = restored.value?.pagination || { page: 1, pageSize: 10 }
  querySession.value++
  await load()
})
const settingsOpen = ref(false)
// Column settings apply only to the summary and are session-local. Each entry starts with all columns.
const selectedKeys = ref(SUMMARY_COLUMNS.map(column => column.key))
const columns = dailyLedgerColumns(), summaryDisplayColumns = computed(() => summaryColumns(selectedKeys.value))
const data = computed(() => filterLedgerSummaries(summaries.value, applied.value).map(({ results, ...row }) => ({ ...row, ...results })))
function resetSummaryColumns() { selectedKeys.value = SUMMARY_COLUMNS.map(column => column.key) }
function changeColumns(keys) { selectedKeys.value = summaryColumns(keys).map(column => column.key) }
function refreshSummary() { resetSummaryColumns(); load() }
function query() {
  try { applied.value = normalizeLedgerRange(range.value) } catch (e) { ElMessage.warning(e.message) }
}
function reset() { range.value = viewDefaultRange('list'); query() }
async function open(row, entry) {
  const origin = { path: DAILY_BASE, query: ledgerRouteQuery({
    activeTab: activeTab.value, range: range.value, applied: applied.value,
    pagination: recordsTable.value?.getPagination(), summary: summaryView.value?.getQueryState() || restored.value?.summary,
  }) }
  recordingOrigin = true
  try {
    // Replace this history entry first, so browser Back and the page button restore the same state.
    await router.replace(origin)
    await router.push({ path: `${DAILY_BASE}/records/${row.date}`, query: { ...(entry === 'detail' ? {} : { entry }), returnTo: router.resolve(origin).fullPath } })
  } finally { recordingOrigin = false }
}
watch(() => route.query.tab, next => { activeTab.value = next === 'summary' ? 'summary' : 'daily' })
watch(activeTab, tab => { settingsOpen.value = false; if (tab === 'summary') resetSummaryColumns() })
watch(isHqSelected, hq => { if (!hq) router.replace('/workbench') })
onMounted(async () => {
  if (!isHqSelected.value) return router.replace('/workbench')
  window.addEventListener(DAILY_CHANGE_EVENT, load)
  loading.value = true
  if (restored.value) {
    // Consume the return URL after hydrating it: a later full reload uses module defaults.
    recordingOrigin = true
    try { await router.replace({ path: DAILY_BASE, query: activeTab.value === 'summary' ? { tab: 'summary' } : {} }) }
    finally { recordingOrigin = false }
  }
  await load()
})
onBeforeUnmount(() => window.removeEventListener(DAILY_CHANGE_EVENT, load))
</script>
<template>
  <div v-if="isHqSelected" class="qm-page page-card daily-dispatch-ledger is-list">
    <div class="page-header"><div class="page-breadcrumb">调度中心 / 每日调度检查</div><div class="title-row"><h1 class="page-title">每日调度检查</h1><DailyPrototypeNote /></div></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-tabs v-model="activeTab" class="daily-ledger-tabs">
      <el-tab-pane label="每日检查" name="daily"><div class="daily-ledger-pane">
        <el-form inline class="daily-ledger-filter" @submit.prevent="query"><el-form-item label="检查日期"><el-date-picker v-model="range" type="daterange" clearable value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" aria-label="检查日期范围" /></el-form-item><el-form-item><el-button type="primary" :icon="Search" @click="query">查询</el-button><el-button :icon="Refresh" @click="reset">重置</el-button></el-form-item></el-form>
        <div class="daily-ledger-toolbar"><span v-if="error" class="page-tip">记录加载失败</span><div v-else class="daily-totals" aria-label="筛选范围记录总数"><span>共 <strong>{{ data.length }}</strong> 条记录</span></div><div><el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button></div></div>
        <DailyDispatchRecordsTable ref="recordsTable" :data="data" :columns="columns" :loading="loading" :error="error" actions @open="open" />
      </div></el-tab-pane>
      <el-tab-pane label="检查统计" name="summary" lazy><DailyDispatchSummaryView ref="summaryView" :key="querySession" :initial-state="restored?.summary" embedded :summaries="summaries" :error="error" :columns="summaryDisplayColumns" :loading="loading" @settings="settingsOpen = true" @refresh="refreshSummary" @open="open" /></el-tab-pane>
    </el-tabs>
    <DailyCheckDialog v-model="settingsOpen" title="列设置" width="480px"><el-checkbox-group :model-value="selectedKeys" class="daily-column-options" aria-label="列表显示列" @update:model-value="changeColumns"><el-checkbox v-for="column in SUMMARY_COLUMNS" :key="column.key" :value="column.key" :disabled="column.key === 'date'">{{ column.label }}</el-checkbox></el-checkbox-group><template #footer><el-button @click="resetSummaryColumns">恢复默认</el-button><el-button type="primary" @click="settingsOpen = false">关闭</el-button></template></DailyCheckDialog>
  </div>
</template>
<style scoped>
.daily-dispatch-ledger { flex: 1; min-height: 0; overflow: hidden; }
.daily-ledger-filter { border-bottom: 1px solid var(--ap-border); padding: 10px 0 2px; }
.daily-ledger-filter :deep(.el-form-item) { margin-bottom: 14px; margin-right: 22px; }
.daily-ledger-filter :deep(.el-date-editor) { width: 330px; max-width: 100%; }
.daily-ledger-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.daily-ledger-tabs { display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0; }
.daily-ledger-tabs :deep(.el-tabs__header) { margin-bottom: 16px; flex-shrink: 0; }
.daily-ledger-tabs :deep(.el-tabs__content) { flex: 1; min-height: 0; overflow: hidden; }
.daily-ledger-tabs :deep(.el-tab-pane) { height: 100%; min-height: 0; }
.daily-ledger-pane { display: flex; flex-direction: column; gap: 16px; height: 100%; min-height: 0; min-width: 0; }
.page-header, .daily-ledger-filter, .daily-ledger-toolbar { flex-shrink: 0; }
.daily-column-options { display: flex; flex-direction: column; gap: 4px; }
</style>
<style>
.page-viewport:has(.daily-dispatch-ledger.is-list) { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.page-viewport:has(.daily-dispatch-ledger.is-list) > .coc-admin-page { flex: 1; min-height: 0; }
.coc-admin-page:has(> .daily-dispatch-ledger.is-list) > .role-bar { flex-shrink: 0; }
</style>
