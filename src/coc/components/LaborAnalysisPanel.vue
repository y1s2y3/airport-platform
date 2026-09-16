<script setup>
import { computed, ref, watch } from 'vue'
import HqLaborKpiCard from './hq/HqLaborKpiCard.vue'
import DispatchDraggablePanel from './safety/dispatch/DispatchDraggablePanel.vue'
import {
  getCocLaborPanelStats,
  buildHqRealNameSupervisionStatsByProject,
  buildHqLaborWarningStatsByProject,
} from '../../mock/laborManagement.js'

defineProps({
  projects: { type: Array, required: true },
  darkTheme: { type: Boolean, default: false },
})

const stats = computed(() => getCocLaborPanelStats('hq'))

const kpis = computed(() => [
  { key: 'dashboard', label: '总人数', value: stats.value.total.toLocaleString(), cls: '', unit: '人' },
  { key: 'dashboard', label: '今日出勤', value: stats.value.allToday.toLocaleString(), cls: '', unit: '人' },
  { key: 'dashboard', label: '出勤率', value: stats.value.rate, cls: 'ok', unit: '' },
  {
    key: 'warning',
    label: '待处置预警',
    value: stats.value.pendingWarning.toLocaleString(),
    cls: 'warn',
    unit: '条',
  },
])

const dashboardVisible = ref(false)
const warningVisible = ref(false)
const dashboardKeyword = ref('')
const warningKeyword = ref('')
const dashboardPage = ref(1)
const warningPage = ref(1)
const pageSize = 10

watch(dashboardVisible, (open) => {
  if (open) {
    dashboardKeyword.value = ''
    dashboardPage.value = 1
  }
})
watch(warningVisible, (open) => {
  if (open) {
    warningKeyword.value = ''
    warningPage.value = 1
  }
})
watch(dashboardKeyword, () => {
  dashboardPage.value = 1
})
watch(warningKeyword, () => {
  warningPage.value = 1
})

const projectLaborRows = computed(() =>
  buildHqRealNameSupervisionStatsByProject().filter((row) => !row.demo_empty),
)

const filteredLaborRows = computed(() => {
  const q = dashboardKeyword.value.trim().toLowerCase()
  if (!q) return projectLaborRows.value
  return projectLaborRows.value.filter((row) =>
    String(row.project_name || '').toLowerCase().includes(q),
  )
})

const pagedLaborRows = computed(() => {
  const start = (dashboardPage.value - 1) * pageSize
  return filteredLaborRows.value.slice(start, start + pageSize)
})

const warningProjectRows = computed(() => buildHqLaborWarningStatsByProject())

const filteredWarningRows = computed(() => {
  const q = warningKeyword.value.trim().toLowerCase()
  if (!q) return warningProjectRows.value
  return warningProjectRows.value.filter((row) =>
    String(row.projectName || '').toLowerCase().includes(q),
  )
})

const pagedWarningRows = computed(() => {
  const start = (warningPage.value - 1) * pageSize
  return filteredWarningRows.value.slice(start, start + pageSize)
})

function openKpi(item) {
  if (item.key === 'warning') {
    warningVisible.value = true
    return
  }
  dashboardVisible.value = true
}

function formatRate(value) {
  if (value == null || value === '') return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return `${num}%`
}

function display(value) {
  if (value == null || value === '') return '—'
  return value
}
</script>

<template>
  <div class="panel-card labor-analysis-panel">
    <div class="panel-title compact title-left">
      <span>劳务分析</span>
      <span class="panel-v2-tip">V2版本上线</span>
    </div>
    <div class="panel-body analysis-body">
      <div class="kpi-grid" :class="{ 'kpi-grid--hq': darkTheme }">
        <template v-if="darkTheme">
          <HqLaborKpiCard
            v-for="item in kpis"
            :key="item.label"
            :label="item.label"
            :value="item.value"
            :unit="item.unit"
            :tone="item.cls"
            clickable
            @click="openKpi(item)"
          />
        </template>
        <template v-else>
          <div
            v-for="item in kpis"
            :key="item.label"
            class="kpi-item is-clickable"
            role="button"
            tabindex="0"
            @click="openKpi(item)"
            @keydown.enter="openKpi(item)"
          >
            <div class="kpi-val" :class="item.cls">{{ item.value }}</div>
            <div class="kpi-lbl">{{ item.label }}</div>
          </div>
        </template>
      </div>
    </div>

    <!-- 总人数 / 今日出勤 / 出勤率 → 项目实名制列表 -->
    <DispatchDraggablePanel
      v-if="dashboardVisible"
      title="指挥部 · 人员实名制看板"
      :width="920"
      :z-index="120020"
      placement="right"
      right-backdrop
      @close="dashboardVisible = false"
    >
      <div class="src-more-toolbar">
        <span class="src-more-count">共 {{ filteredLaborRows.length }} 条</span>
        <div class="src-more-filters">
          <el-input
            v-model="dashboardKeyword"
            clearable
            size="small"
            class="src-search"
            placeholder="搜索项目名称"
          />
        </div>
      </div>
      <div class="src-table-wrap">
        <table class="src-table">
          <thead>
            <tr>
              <th>项目名称</th>
              <th>在岗人数</th>
              <th>管理人员</th>
              <th>建筑工人</th>
              <th>特种作业</th>
              <th>今日出勤率</th>
              <th>未处置预警</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pagedLaborRows" :key="row.project_id">
              <td>{{ display(row.project_name) }}</td>
              <td>{{ display(row.total) }}</td>
              <td>{{ display(row.manage) }}</td>
              <td>{{ display(row.labor) }}</td>
              <td>{{ display(row.special) }}</td>
              <td>{{ formatRate(row.today_attendance_rate) }}</td>
              <td>{{ display(row.pending_warning_count) }}</td>
            </tr>
            <tr v-if="!pagedLaborRows.length">
              <td colspan="7" class="empty">暂无项目数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="src-pager">
        <el-pagination
          v-model:current-page="dashboardPage"
          :page-size="pageSize"
          :total="filteredLaborRows.length"
          layout="total, prev, pager, next"
          background
          small
        />
      </div>
    </DispatchDraggablePanel>

    <!-- 待处置预警 → 各项目预警统计 -->
    <DispatchDraggablePanel
      v-if="warningVisible"
      title="各项目实名制预警统计"
      :width="820"
      :z-index="120020"
      placement="right"
      right-backdrop
      @close="warningVisible = false"
    >
      <div class="src-more-toolbar">
        <span class="src-more-count">共 {{ filteredWarningRows.length }} 条</span>
        <div class="src-more-filters">
          <el-input
            v-model="warningKeyword"
            clearable
            size="small"
            class="src-search"
            placeholder="搜索项目名称"
          />
        </div>
      </div>
      <div class="src-table-wrap">
        <table class="src-table">
          <thead>
            <tr>
              <th>项目名称</th>
              <th>预警总数</th>
              <th>已处置数量</th>
              <th>待处置数量</th>
              <th>处置比例</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pagedWarningRows" :key="row.projectId">
              <td>{{ display(row.projectName) }}</td>
              <td>{{ display(row.total) }}</td>
              <td>{{ display(row.disposed) }}</td>
              <td>{{ display(row.pending) }}</td>
              <td>{{ display(row.disposalRate) }}</td>
            </tr>
            <tr v-if="!pagedWarningRows.length">
              <td colspan="5" class="empty">暂无预警统计</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="src-pager">
        <el-pagination
          v-model:current-page="warningPage"
          :page-size="pageSize"
          :total="filteredWarningRows.length"
          layout="total, prev, pager, next"
          background
          small
        />
      </div>
    </DispatchDraggablePanel>
  </div>
</template>

<style scoped>
.labor-analysis-panel {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-title.compact.title-left {
  font-size: calc(18px + var(--coc-font-boost));
  justify-content: flex-start;
}

.analysis-body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px 10px !important;
  display: flex;
  flex-direction: column;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.kpi-grid--hq {
  gap: 6px;
}

.kpi-item {
  text-align: center;
  padding: 10px 6px;
  border-radius: 8px;
  background: #faf8f6;
  border: 1px solid var(--coc-border);
}

.kpi-item.is-clickable {
  cursor: pointer;
}

.kpi-item.is-clickable:hover {
  border-color: var(--coc-accent, #409eff);
  background: #fff;
}

.kpi-val {
  font-size: calc(20px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
  line-height: 1.2;
}

.kpi-val.ok {
  color: var(--coc-success);
}

.kpi-val.warn {
  color: #e6a23c;
}

.kpi-lbl {
  margin-top: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
}

.src-more-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.src-more-count {
  font-size: calc(13px + var(--coc-font-boost));
  color: var(--coc-text-secondary, #909399);
  flex-shrink: 0;
}

.src-more-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

.src-search {
  width: 220px;
}

.src-table-wrap {
  max-height: min(70vh, 720px);
  overflow: auto;
}

.src-table {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(13px + var(--coc-font-boost));
}

.src-table th,
.src-table td {
  padding: 8px 8px;
  border-bottom: 1px solid var(--coc-border, rgba(255, 255, 255, 0.08));
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.src-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--coc-drag-panel-table-head-bg, rgba(16, 29, 55, 0.96));
  color: var(--coc-text-secondary, #a8abb2);
  font-weight: 600;
}

.src-table .empty {
  text-align: center;
  color: var(--coc-text-muted, #909399);
  padding: 24px 8px;
}

.src-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
