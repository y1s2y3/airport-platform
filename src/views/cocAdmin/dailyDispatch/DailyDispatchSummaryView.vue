<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Setting } from '@element-plus/icons-vue'
import { DAILY_BASE } from '../../../composables/useDailyDispatchCheck.js'
import { summaryColumns, totalMetric, viewDefaultRange } from '../../../utils/dailyDispatchCheckRules.js'
import DailyDispatchRecordsTable from './DailyDispatchRecordsTable.vue'
import { filterLedgerSummaries, normalizeLedgerRange } from '../../../utils/dailyDispatchLedgerQuery.js'
const props = defineProps({ embedded: Boolean, initialState: { type: Object, default: null }, summaries: { type: Array, default: () => [] }, error: { type: String, default: '' }, columns: { type: Array, default: () => summaryColumns() }, loading: Boolean })
defineEmits(['settings', 'refresh', 'open'])
const router = useRouter(), range = ref(props.initialState ? props.initialState.range : viewDefaultRange('summary')), applied = ref(props.initialState ? props.initialState.applied : [...range.value]), recordsTable = ref(null)
defineExpose({ restorePagination: value => recordsTable.value?.restorePagination(value), getQueryState: () => ({ range: range.value ? [...range.value] : null, applied: [...applied.value], pagination: recordsTable.value?.getPagination() }) })
const data = computed(() => filterLedgerSummaries(props.summaries, applied.value))
function query() {
  try { applied.value = normalizeLedgerRange(range.value) } catch (e) { ElMessage.warning(e.message) }
}
function reset() { range.value = viewDefaultRange('summary'); query() }
// Keep historical bookmarks inside the same module and its readonly summary tab.
onMounted(async () => {
  if (!props.embedded) return router.replace({ path: DAILY_BASE, query: { tab: 'summary' } })
  await nextTick(); recordsTable.value?.restorePagination(props.initialState?.pagination)
})
</script>
<template>
  <div v-if="embedded" class="daily-summary-pane">
    <el-form inline class="daily-ledger-filter" @submit.prevent="query"><el-form-item label="检查日期"><el-date-picker v-model="range" type="daterange" clearable value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" aria-label="检查日期范围" /></el-form-item><el-form-item><el-button type="primary" :icon="Search" @click="query">查询</el-button><el-button :icon="Refresh" @click="reset">重置</el-button></el-form-item></el-form>
    <div class="daily-ledger-toolbar"><span v-if="error" class="page-tip">记录加载失败</span><div v-else class="daily-totals" aria-label="筛选范围问题合计"><span>安全质量问题合计：<strong>{{ totalMetric(data, 'safetyQuality') ?? '--' }}</strong></span><span>摄像头问题合计：<strong>{{ totalMetric(data, 'camera') ?? '--' }}</strong></span></div><div><el-button :icon="Setting" @click="$emit('settings')">列设置</el-button><el-button :icon="Refresh" :loading="loading" @click="$emit('refresh')">刷新</el-button></div></div>
    <DailyDispatchRecordsTable ref="recordsTable" :data="data" :columns="columns" :loading="loading" :error="error" detail-only @open="(row, entry) => $emit('open', row, entry)" />
  </div>
</template>
<style scoped>
.daily-summary-pane { display: flex; flex-direction: column; gap: 16px; height: 100%; min-height: 0; min-width: 0; }
.daily-ledger-filter, .daily-ledger-toolbar { flex-shrink: 0; }
.daily-ledger-filter { border-bottom: 1px solid var(--ap-border); padding: 10px 0 2px; }
.daily-ledger-filter :deep(.el-form-item) { margin-bottom: 14px; margin-right: 22px; }
.daily-ledger-filter :deep(.el-date-editor) { width: 330px; max-width: 100%; }
.daily-ledger-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
</style>
