<script setup>
/**
 * 实名制统计（指挥部）
 * 指标卡（全项目汇总）+ 按项目明细表
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { selectedProjectId } from '../../composables/useCurrentProject'
import {
  LABOR_HQ_STATS_TODAY,
  buildHqRealNameSupervisionStatsByProject,
  buildHqRealNameSupervisionSummary,
  pickProjectWithMostPendingWarnings,
} from '../../mock/laborManagement'

const router = useRouter()
const keyword = ref('')

const rows = computed(() => buildHqRealNameSupervisionStatsByProject())
const summary = computed(() => buildHqRealNameSupervisionSummary())

const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return rows.value
  return rows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

function reset() {
  keyword.value = ''
}

function handleSearch() {
  ElMessage.success(`已按条件查询，共 ${filtered.value.length} 个项目`)
}

function formatRate(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return `${Number(n).toFixed(1)}%`
}

async function viewProjectDetail(row) {
  if (!row?.project_id) return
  await router.push('/labor/realname')
  selectedProjectId.value = row.project_id
  ElMessage.success(`已切换至项目：${row.project_name}`)
}

/** 预警未处置下钻：进入未处置最多的项目 · 预警清单 */
async function drillPendingWarnings() {
  if (!summary.value.pendingWarningCount) {
    ElMessage.info('当前无未处置预警')
    return
  }
  const target = pickProjectWithMostPendingWarnings()
  if (!target) {
    ElMessage.info('当前无未处置预警')
    return
  }
  await router.push('/labor/warning-list')
  selectedProjectId.value = target.project_id
  ElMessage.success(
    `已进入「${target.project_name}」预警清单（未处置 ${target.pendingWarningCount}）`,
  )
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">安全看板 / 实名制统计</div>
      <h1 class="page-title">实名制统计</h1>
      <p class="page-tip">
        指挥部监管看板：顶部为全项目汇总指标；表格按项目明细。统计日（演示）：{{ LABOR_HQ_STATS_TODAY }}。
        点击「预警未处置」可下钻至未处置最多项目的预警清单。
      </p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <span class="kpi-label">在册总人数</span>
        <span class="kpi-value">{{ summary.total }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">管理人员</span>
        <span class="kpi-value">{{ summary.manage }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">劳务人员</span>
        <span class="kpi-value">{{ summary.labor }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">特种作业人员</span>
        <span class="kpi-value">{{ summary.special }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">今日综合出勤率</span>
        <span class="kpi-value ok">{{ formatRate(summary.todayAttendanceRate) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">今日管理人员出勤率</span>
        <span class="kpi-value ok">{{ formatRate(summary.todayManageRate) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">今日实名制预警</span>
        <span class="kpi-value warn">{{ summary.todayWarningCount }}</span>
      </div>
      <button
        type="button"
        class="kpi-card kpi-card--clickable"
        :class="{ 'has-pending': summary.pendingWarningCount > 0 }"
        @click="drillPendingWarnings"
      >
        <span class="kpi-label">预警未处置</span>
        <span class="kpi-value warn">{{ summary.pendingWarningCount }}</span>
        <span class="kpi-hint">点击下钻预警清单</span>
      </button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="项目名称"
        style="width: 260px"
        :prefix-icon="Search"
      />
      <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无项目实名制数据" class="stats-table">
      <el-table-column prop="project_name" label="项目名称" min-width="200" fixed show-overflow-tooltip />
      <el-table-column label="总人数" width="88" align="center" prop="total" />
      <el-table-column label="管理人员数量" width="120" align="center" prop="manage" />
      <el-table-column label="劳务人员数量" width="120" align="center" prop="labor" />
      <el-table-column label="特种作业人员数量" width="140" align="center" prop="special" />
      <el-table-column label="今日出勤率" width="110" align="center">
        <template #default="{ row }">{{ formatRate(row.todayAttendanceRate) }}</template>
      </el-table-column>
      <el-table-column label="今日管理人员出勤率" width="150" align="center">
        <template #default="{ row }">{{ formatRate(row.todayManageRate) }}</template>
      </el-table-column>
      <el-table-column label="今日劳务人员出勤率" width="150" align="center">
        <template #default="{ row }">{{ formatRate(row.todayLaborRate) }}</template>
      </el-table-column>
      <el-table-column label="今日特种作业人员出勤率" width="170" align="center">
        <template #default="{ row }">{{ formatRate(row.todaySpecialRate) }}</template>
      </el-table-column>
      <el-table-column label="今日实名制预警次数" width="150" align="center" prop="todayWarningCount" />
      <el-table-column label="预警未处置数量" width="130" align="center">
        <template #default="{ row }">
          <span :class="{ 'warn-num': row.pendingWarningCount > 0 }">{{ row.pendingWarningCount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="累计实名制预警次数" width="150" align="center" prop="totalWarningCount" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="row.demoEmpty" @click="viewProjectDetail(row)">
            查看项目详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 12px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; line-height: 1.5; }

.kpi-row {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 12px;
}
.kpi-card {
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  margin: 0;
  font: inherit;
  color: inherit;
}
.kpi-card--clickable {
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.kpi-card--clickable:hover {
  border-color: var(--ap-primary, #91003d);
  background: var(--ap-primary-light, #fbf5f6);
}
.kpi-card--clickable.has-pending {
  border-color: rgba(230, 162, 60, 0.55);
}
.kpi-label { font-size: 13px; color: var(--ap-text-muted, #909399); }
.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--ap-primary, #91003d);
  line-height: 1.2;
}
.kpi-value.ok { color: var(--ap-success, #67c23a); }
.kpi-value.warn { color: var(--ap-warning, #e6a23c); }
.kpi-hint {
  font-size: 11px;
  color: var(--ap-text-muted, #909399);
}

.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.warn-num { color: var(--ap-warning, #e6a23c); font-weight: 600; }
.stats-table { width: 100%; }

@media (max-width: 1400px) {
  .kpi-row { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
