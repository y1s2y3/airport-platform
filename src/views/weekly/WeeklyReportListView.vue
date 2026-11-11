<script setup>
/**
 * 数字周报 · 列表（周报档案）
 * 能力：历史周报查询、生成、详情、导出 Word。
 * 生成规则：自然周（周一～周日），生成后冻结；同一周只生成一份，不支持重新生成。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, Refresh, Search, Setting, View } from '@element-plus/icons-vue'
import {
  listWeeklyReports,
  ensureLatestWeekGenerated,
  getWeeklyReport,
  getWeeklyTargets,
  saveWeeklyTargets,
  resetWeeklyTargets,
  WEEKLY_TARGET_FIELDS,
  WEEKLY_REPORT_TODAY,
} from '../../utils/weeklyReportStorage'
import { exportWeeklyReportDocx } from '../../utils/weeklyReportDocx'
import { ensureReportRichData } from '../../utils/weeklyReportCompat'

const router = useRouter()
const reports = ref([])
const loading = ref(false)
const keyword = ref('')
const yearFilter = ref('')
const groupFilter = ref('all')
const exportingId = ref('')
const openingId = ref('')
const settingsVisible = ref(false)
const targetDraft = ref({})
const targetFields = WEEKLY_TARGET_FIELDS

const yearOptions = computed(() => {
  const years = new Set(reports.value.map((item) => String(item.weekStart).slice(0, 4)))
  return [...years].sort((a, b) => b.localeCompare(a))
})

const filtered = computed(() => {
  const text = keyword.value.trim()
  return reports.value.filter((item) => {
    if (text && !`${item.weekLabel} ${item.weekKey} ${item.rangeLabel}`.includes(text)) return false
    if (yearFilter.value && String(item.weekStart).slice(0, 4) !== yearFilter.value) return false
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
    dutyRate: metric('dutyRate'),
    closeRate: metric('closeRate'),
    overdue: metric('overdueHazard'),
    meetingReportRate: metric('meetingReportRate'),
  }
})

/** 指标卡按三组展示（COC 调度 / 安质巡检 / 质量） */
const metricGroups = computed(() => [
  {
    key: 'coc',
    title: 'COC 调度',
    metrics: [
      { key: 'meetings', label: '调度场次', unit: '次' },
      { key: 'coverage', label: '调度覆盖项目', unit: '个' },
      { key: 'dutyRate', label: '值班表登记完整率', unit: '%' },
      { key: 'meetingReportRate', label: '监理例会上报率', unit: '%' },
      { key: 'reportRate', label: '危险作业上报率', unit: '%' },
    ],
  },
  {
    key: 'anzi',
    title: '安质巡检',
    metrics: [
      { key: 'taskRate', label: '巡检任务完成率', unit: '%' },
      { key: 'selfTaskCount', label: '自行登记任务', unit: '个' },
      { key: 'newHazard', label: '新增隐患', unit: '条' },
      { key: 'closeRate', label: '隐患整改率', unit: '%' },
      { key: 'overdueHazard', label: '逾期未闭环', unit: '条' },
    ],
  },
  {
    key: 'quality',
    title: '质量',
    metrics: [
      { key: 'qmInspectTasks', label: '验收任务', unit: '个' },
      { key: 'qmPassRate', label: '验收通过率', unit: '%' },
      { key: 'qmBrandCount', label: '品牌报审', unit: '项' },
      { key: 'qmMatCount', label: '材料设备进场', unit: '批' },
    ],
  },
])

function refresh() {
  reports.value = listWeeklyReports()
}

function metricValue(row, key, unit) {
  const metric = row.metrics?.find((item) => item.key === key)
  if (!metric) return '--'
  if (metric.value === null || metric.value === undefined) return '--'
  if (unit === '%' || metric.unit === '%') return `${metric.value}%`
  return metric.unit ? `${metric.value} ${metric.unit}` : metric.value
}

function latestMetric(key, unit) {
  const latest = reports.value[0]
  if (!latest) return '--'
  return metricValue(latest, key, unit)
}

async function goDetail(row) {
  if (!row?.id) return
  const target = `/weekly-report/${row.id}`
  openingId.value = row.id
  try {
    await router.push(target)
    return
  } catch (error) {
    // 首次导航失败（多为详情页模块懒加载失败）：自动重试一次
    try {
      await router.push(target)
      return
    } catch (retryError) {
      // 仍失败则整页重新加载（保留目标路由），让浏览器重新拉取模块，而不是让用户手动刷新
      window.location.hash = target
      window.location.reload()
    }
  }
}

async function handleExport(row) {
  exportingId.value = row.id
  const report = ensureReportRichData(getWeeklyReport(row.id))
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
}

function openSettings() {
  targetDraft.value = { ...getWeeklyTargets() }
  settingsVisible.value = true
}

function restoreTargets() {
  targetDraft.value = resetWeeklyTargets()
}

function saveTargets() {
  const result = saveWeeklyTargets(targetDraft.value)
  if (!result.ok) {
    ElMessage.warning(result.msg)
    return
  }
  settingsVisible.value = false
  ElMessage.success('关注线设置已保存')
}

onMounted(() => {
  openingId.value = ''
  // 预加载详情页模块：进入列表即加载，避免首次点击详情时才懒加载（失败时表现为“点了没反应”）
  import('./WeeklyReportDetailView.vue').catch(() => {})
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
        <div class="title-actions">
          <el-button :icon="Setting" @click="openSettings">设置</el-button>
        </div>
      </div>
      <p class="page-tip">
        按自然周（周一 00:00 ~ 周日 24:00）汇总 COC 调度、安质巡检、质量运行数据，系统每周一自动生成上周周报并冻结存档；
        每章采用「总体说明 + 分项目统计 + 明细数据 + 图表」结构，支持导出 Word。当前演示基准日：{{ WEEKLY_REPORT_TODAY }}。
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
        <span class="stat-label">最新值班表完整率</span>
        <span class="stat-value">{{ latestMetric('dutyRate', '%') }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">最新隐患整改率</span>
        <span class="stat-value">{{ latestMetric('closeRate', '%') }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">最新逾期未闭环隐患</span>
        <span class="stat-value">{{ latestMetric('overdueHazard', '条') }}</span>
      </div>
    </div>

    <div class="filter-bar">
      <el-select v-model="yearFilter" clearable placeholder="年份" style="width: 140px" aria-label="年份">
        <el-option v-for="year in yearOptions" :key="year" :label="`${year} 年`" :value="year" />
      </el-select>
      <el-input v-model="keyword" clearable placeholder="周次 / 周期" style="width: 220px" :prefix-icon="Search" aria-label="周次" />
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="filtered"
      stripe
      border
      empty-text="暂无周报记录"
      row-class-name="is-clickable-row"
      @row-click="goDetail"
    >
      <el-table-column label="周次" min-width="190">
        <template #default="{ row }">
          <div class="week-cell">
            <span class="week-label">{{ row.weekLabel }}</span>
            <el-tag v-if="row.isDemo" size="small" type="info" effect="plain" class="demo-tag">演示</el-tag>
          </div>
          <div class="week-range">{{ row.rangeLabel }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="96" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="success" effect="plain">{{ row.status === 'frozen' ? '已冻结' : '草稿' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="调度场次" width="88" align="center">
        <template #default="{ row }">{{ metricValue(row, 'meetings', '次') }}</template>
      </el-table-column>
      <el-table-column label="值班表完整率" width="118" align="center">
        <template #default="{ row }">{{ metricValue(row, 'dutyRate', '%') }}</template>
      </el-table-column>
      <el-table-column label="新增隐患" width="92" align="center">
        <template #default="{ row }">{{ metricValue(row, 'newHazard', '条') }}</template>
      </el-table-column>
      <el-table-column label="隐患整改率" width="112" align="center">
        <template #default="{ row }">{{ metricValue(row, 'closeRate', '%') }}</template>
      </el-table-column>
      <el-table-column label="逾期隐患" width="88" align="center">
        <template #default="{ row }">{{ metricValue(row, 'overdueHazard', '条') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" :loading="openingId === row.id" @click.stop="goDetail(row)">详情</el-button>
          <el-button link type="primary" :icon="Download" :loading="exportingId === row.id" @click.stop="handleExport(row)">导出 Word</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="settingsVisible" title="关注线设置" width="560px" destroy-on-close>
      <p class="dialog-tip">
        低于关注线的指标会在周报「本周结论」中列入重点关注。系统默认值已按初始口径统一下调 10 个百分点，可按管理要求调整。
      </p>
      <div class="target-grid">
        <div v-for="field in targetFields" :key="field.key" class="target-row">
          <span class="target-label">{{ field.label }}</span>
          <el-input-number
            v-model="targetDraft[field.key]"
            :min="0"
            :max="100"
            :step="1"
            :precision="1"
            size="small"
            controls-position="right"
            style="width: 130px"
          />
          <span class="target-unit">%</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="restoreTargets">恢复默认</el-button>
        <el-button @click="settingsVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTargets">保存</el-button>
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
.title-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dialog-tip {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ap-text-muted, #909399);
}
.target-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
}
.target-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.target-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--ap-text, #303133);
}
.target-unit {
  font-size: 13px;
  color: var(--ap-text-muted, #909399);
}
:deep(.is-clickable-row) {
  cursor: pointer;
}
:deep(.is-clickable-row:hover > td) {
  background: #fdf7fa !important;
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
.week-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}
.week-label {
  font-weight: 600;
}
.week-range {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
  margin-top: 2px;
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
