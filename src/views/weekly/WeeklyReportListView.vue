<script setup>
/**
 * 数字周报 · 列表（周报档案）
 * 能力：历史周报查询、生成/重新生成、详情、导出 Word。
 * 生成规则：自然周（周一～周日），生成后冻结；重新生成升版本并保留旧版本。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Plus, Refresh, Search, View } from '@element-plus/icons-vue'
import {
  listWeeklyReports,
  ensureLatestWeekGenerated,
  listWeekOptions,
  generateWeeklyReport,
  regenerateWeeklyReport,
  getWeeklyReport,
  WEEKLY_REPORT_TODAY,
} from '../../utils/weeklyReportStorage'
import { exportWeeklyReportDocx } from '../../utils/weeklyReportDocx'

const router = useRouter()
const reports = ref([])
const loading = ref(false)
const keyword = ref('')
const yearFilter = ref('')
const statusFilter = ref('')
const generateVisible = ref(false)
const generateLoading = ref(false)
const selectedWeekKey = ref('')
const exportingId = ref('')

const weekOptions = computed(() => listWeekOptions(8))

const yearOptions = computed(() => {
  const years = new Set(reports.value.map((item) => String(item.weekStart).slice(0, 4)))
  return [...years].sort((a, b) => b.localeCompare(a))
})

const filtered = computed(() => {
  const text = keyword.value.trim()
  return reports.value.filter((item) => {
    if (text && !`${item.weekLabel} ${item.weekKey} ${item.rangeLabel}`.includes(text)) return false
    if (yearFilter.value && String(item.weekStart).slice(0, 4) !== yearFilter.value) return false
    if (statusFilter.value && item.status !== statusFilter.value) return false
    return true
  })
})

const summary = computed(() => {
  const latest = reports.value[0]
  const metric = (key) => latest?.metrics?.find((item) => item.key === key)?.value ?? null
  return {
    total: reports.value.length,
    latestWeek: latest?.weekLabel || '--',
    latestRange: latest?.rangeLabel || '--',
    closeRate: metric('closeRate'),
    overdue: metric('overdueHazard'),
    gap: metric('gapProjects'),
  }
})

function refresh() {
  reports.value = listWeeklyReports()
}

function metricValue(row, key) {
  const metric = row.metrics?.find((item) => item.key === key)
  if (!metric) return '--'
  if (metric.value === null || metric.value === undefined) return '--'
  if (metric.unit === '%') return `${metric.value}%`
  return metric.unit ? `${metric.value} ${metric.unit}` : metric.value
}

function deltaText(row, key) {
  const metric = row.metrics?.find((item) => item.key === key)
  if (!metric || metric.delta === null || metric.delta === undefined) return ''
  if (metric.delta === 0) return '持平'
  const sign = metric.delta > 0 ? '+' : ''
  return `${sign}${metric.delta}`
}

function deltaClass(row, key) {
  const metric = row.metrics?.find((item) => item.key === key)
  if (!metric || metric.delta === null || metric.delta === undefined || metric.delta === 0) return ''
  return metric.delta > 0 ? 'is-up' : 'is-down'
}

function goDetail(row) {
  router.push(`/weekly-report/${row.id}`)
}

function openGenerate() {
  selectedWeekKey.value = weekOptions.value.find((item) => !item.exists)?.weekKey || weekOptions.value[0]?.weekKey || ''
  generateVisible.value = true
}

async function submitGenerate() {
  if (!selectedWeekKey.value) {
    ElMessage.warning('请选择要生成的周次')
    return
  }
  generateLoading.value = true
  const option = weekOptions.value.find((item) => item.weekKey === selectedWeekKey.value)
  const result = option?.exists
    ? regenerateWeeklyReport(`wkr-${selectedWeekKey.value}`)
    : generateWeeklyReport({ weekKey: selectedWeekKey.value, manual: true })
  generateLoading.value = false
  if (!result.ok) {
    ElMessage.warning(result.msg || '生成失败')
    return
  }
  generateVisible.value = false
  refresh()
  ElMessage.success(result.msg || '周报已生成')
}

async function handleRegenerate(row) {
  try {
    await ElMessageBox.confirm(
      `重新生成 ${row.weekLabel} 周报会重新取数并冻结为新版本（v${Number(row.version) + 1}），旧版本 v${row.version} 保留可查。是否继续？`,
      '重新生成周报',
      { confirmButtonText: '重新生成', cancelButtonText: '取消', type: 'warning' },
    )
  } catch (error) {
    return
  }
  const result = regenerateWeeklyReport(row.id)
  if (!result.ok) {
    ElMessage.warning(result.msg || '重新生成失败')
    return
  }
  refresh()
  ElMessage.success(result.msg || '已重新生成')
}

async function handleExport(row) {
  exportingId.value = row.id
  const report = getWeeklyReport(row.id)
  const result = await exportWeeklyReportDocx(report)
  exportingId.value = ''
  if (!result.ok) {
    ElMessage.error(result.msg || '导出失败')
    return
  }
  ElMessage.success(`已导出 ${result.fileName}`)
}

function resetFilters() {
  keyword.value = ''
  yearFilter.value = ''
  statusFilter.value = ''
}

onMounted(() => {
  const auto = ensureLatestWeekGenerated()
  refresh()
  if (auto?.auto && auto.msg) {
    ElMessage.success(`已自动生成上周周报：${auto.msg}`)
  }
})
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">数据看板 / 数字周报</div>
      <div class="title-row">
        <h1 class="page-title">数字周报</h1>
        <el-button type="primary" :icon="Plus" @click="openGenerate">生成周报</el-button>
      </div>
      <p class="page-tip">
        按自然周（周一 00:00 ~ 周日 24:00）汇总 COC 调度、安全管理、质量管理运行数据，生成后冻结存档；
        每章采用「总体说明 + 分项目统计」两层结构，支持导出 Word。当前演示基准日：{{ WEEKLY_REPORT_TODAY }}。
      </p>
    </div>

    <div class="stat-row">
      <div class="stat-card">
        <span class="stat-label">已生成周报</span>
        <span class="stat-value">{{ summary.total }} 份</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">最新周报</span>
        <span class="stat-value is-text">{{ summary.latestWeek }}</span>
        <span class="stat-sub">{{ summary.latestRange }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">最新隐患闭环率</span>
        <span class="stat-value">{{ summary.closeRate === null ? '--' : `${summary.closeRate}%` }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">最新逾期未闭环隐患</span>
        <span class="stat-value">{{ summary.overdue === null ? '--' : `${summary.overdue} 条` }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">最新应报未报项目</span>
        <span class="stat-value">{{ summary.gap === null ? '--' : `${summary.gap} 个` }}</span>
      </div>
    </div>

    <div class="filter-bar">
      <el-select v-model="yearFilter" clearable placeholder="年份" style="width: 140px" aria-label="年份">
        <el-option v-for="year in yearOptions" :key="year" :label="`${year} 年`" :value="year" />
      </el-select>
      <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px" aria-label="状态">
        <el-option label="已冻结" value="frozen" />
      </el-select>
      <el-input v-model="keyword" clearable placeholder="周次 / 周期" style="width: 220px" :prefix-icon="Search" aria-label="周次" />
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="filtered" stripe border empty-text="暂无周报，请点击右上角「生成周报」">
      <el-table-column prop="weekLabel" label="周次" min-width="126">
        <template #default="{ row }">
          <span>{{ row.weekLabel }}</span>
          <el-tag v-if="row.isDemo" size="small" type="info" effect="plain" class="demo-tag">演示</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="rangeLabel" label="统计周期" min-width="150" show-overflow-tooltip />
      <el-table-column label="状态" width="104" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="success" effect="plain">{{ row.status === 'frozen' ? '已冻结' : '草稿' }}</el-tag>
          <span class="version-text">v{{ row.version }}</span>
        </template>
      </el-table-column>
      <el-table-column label="调度场次" width="90" align="center">
        <template #default="{ row }">{{ metricValue(row, 'meetings') }}</template>
      </el-table-column>
      <el-table-column label="新增隐患" width="90" align="center">
        <template #default="{ row }">{{ metricValue(row, 'newHazard') }}</template>
      </el-table-column>
      <el-table-column label="隐患闭环率" width="108" align="center">
        <template #default="{ row }">
          <span>{{ metricValue(row, 'closeRate') }}</span>
          <span v-if="deltaText(row, 'closeRate')" class="delta" :class="deltaClass(row, 'closeRate')">{{ deltaText(row, 'closeRate') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="逾期隐患" width="90" align="center">
        <template #default="{ row }">{{ metricValue(row, 'overdueHazard') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="196" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="goDetail(row)">详情</el-button>
          <el-button link type="primary" :icon="Download" :loading="exportingId === row.id" @click="handleExport(row)">导出 Word</el-button>
          <el-button link type="warning" @click="handleRegenerate(row)">重新生成</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="generateVisible" title="生成周报" width="560px" destroy-on-close>
      <p class="dialog-tip">选择统计周次后生成。已存在的周次将重新取数并升版本（旧版本保留可查）。</p>
      <el-radio-group v-model="selectedWeekKey" class="week-options">
        <el-radio v-for="option in weekOptions" :key="option.weekKey" :value="option.weekKey" border class="week-option">
          {{ option.label }}（{{ option.rangeLabel }}）
          <el-tag v-if="option.exists" size="small" type="success" effect="plain">已生成</el-tag>
          <el-tag v-else-if="option.isDemo" size="small" type="info" effect="plain">演示数据</el-tag>
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="generateVisible = false">取消</el-button>
        <el-button type="primary" :loading="generateLoading" @click="submitGenerate">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-label {
  font-size: 13px;
  color: var(--ap-text-muted, #909399);
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--ap-primary, #91003d);
  line-height: 1.2;
}
.stat-value.is-text {
  font-size: 18px;
}
.stat-sub {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.demo-tag {
  margin-left: 6px;
}
.version-text {
  margin-left: 6px;
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.delta {
  margin-left: 4px;
  font-size: 12px;
}
.delta.is-up {
  color: #67c23a;
}
.delta.is-down {
  color: #f56c6c;
}
.dialog-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--ap-text-muted, #909399);
}
.week-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.week-option {
  margin-right: 0;
  width: 100%;
}
</style>
