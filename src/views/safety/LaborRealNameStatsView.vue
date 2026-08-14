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
  buildHqRealNameSupervisionStatsByProject,
  buildHqRealNameSupervisionSummary,
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
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 实名制统计</div>
      <h1 class="page-title">实名制统计</h1>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <span class="kpi-label">在岗人数</span>
        <span class="kpi-value">{{ summary.total }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">管理人员</span>
        <span class="kpi-value">{{ summary.manage }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">建筑工人</span>
        <span class="kpi-value">{{ summary.labor }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">特种作业人员</span>
        <span class="kpi-value">{{ summary.special }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">今日综合出勤率</span>
        <span class="kpi-value ok">{{ formatRate(summary.today_attendance_rate) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">今日管理人员出勤率</span>
        <span class="kpi-value ok">{{ formatRate(summary.today_manage_attendance_rate) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">今日实名制预警</span>
        <span class="kpi-value warn">{{ summary.today_warning_count }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">预警未处置</span>
        <span class="kpi-value warn">{{ summary.pending_warning_count }}</span>
      </div>
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
      <el-table-column label="在岗人数" width="88" align="center" prop="total" />
      <el-table-column label="管理人员数量" width="120" align="center" prop="manage" />
      <el-table-column label="建筑工人数量" width="120" align="center" prop="labor" />
      <el-table-column label="特种作业人员数量" width="140" align="center" prop="special" />
      <el-table-column label="今日出勤率" width="110" align="center">
        <template #default="{ row }">{{ formatRate(row.today_attendance_rate) }}</template>
      </el-table-column>
      <el-table-column label="今日管理人员出勤率" width="150" align="center">
        <template #default="{ row }">{{ formatRate(row.today_manage_attendance_rate) }}</template>
      </el-table-column>
      <el-table-column label="今日建筑工人出勤率" width="150" align="center">
        <template #default="{ row }">{{ formatRate(row.today_labor_attendance_rate) }}</template>
      </el-table-column>
      <el-table-column label="今日特种作业人员出勤率" width="170" align="center">
        <template #default="{ row }">{{ formatRate(row.today_special_attendance_rate) }}</template>
      </el-table-column>
      <el-table-column label="今日实名制预警次数" width="150" align="center" prop="today_warning_count" />
      <el-table-column label="预警未处置数量" width="130" align="center">
        <template #default="{ row }">
          <span :class="{ 'warn-num': row.pending_warning_count > 0 }">{{ row.pending_warning_count }}</span>
        </template>
      </el-table-column>
      <el-table-column label="累计预警次数" width="150" align="center" prop="total_warning_count" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="row.demo_empty" @click="viewProjectDetail(row)">
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
.kpi-label { font-size: 13px; color: var(--ap-text-muted, #909399); }
.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--ap-primary, #91003d);
  line-height: 1.2;
}
.kpi-value.ok { color: var(--ap-success, #67c23a); }
.kpi-value.warn { color: var(--ap-warning, #e6a23c); }

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
