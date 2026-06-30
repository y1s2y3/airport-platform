<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import {
  projectTree,
  getAttendanceDetails,
  getDefaultProjectId,
  getProjectLabel,
} from '../../mock/laborAttendanceDetail'
import {
  ATTENDANCE_ENTRY_STATUS,
  ATTENDANCE_ENTRY_STATUS_OPTIONS,
  ATTENDANCE_ENTRY_LABEL,
  ONSITE_STATUS_OPTIONS,
  attendanceEntryStatusTagClass,
  onSiteStatusTagClass,
} from '../../constants/laborPersonStatus'
import { workTypeOptions } from '../../mock/laborRealName'

const selectedProjectId = ref(getDefaultProjectId())
const keyword = ref('')
const filters = ref({
  date: '2026-06-29',
  entryStatus: '',
  onSiteStatus: '',
  workType: '',
})

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: `${item.label}(${item.count})`,
    })),
  })),
)

const selectedProjectLabel = computed(() => getProjectLabel(selectedProjectId.value))
const allRecords = computed(() => getAttendanceDetails(selectedProjectId.value))

const filteredRecords = computed(() => {
  const kw = keyword.value.trim()
  return allRecords.value.filter((row) => {
    if (filters.value.date && row.date !== filters.value.date) return false
    if (filters.value.entryStatus && row.entryStatus !== filters.value.entryStatus) return false
    if (filters.value.onSiteStatus && row.onSiteStatus !== filters.value.onSiteStatus) return false
    if (filters.value.workType && row.workType !== filters.value.workType) return false
    if (kw) {
      const hay = `${row.name}${row.idCard}${row.team}${row.subcontractor}${row.gateIn}`
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const stats = computed(() => ({
  total: filteredRecords.value.length,
  entered: filteredRecords.value.filter((r) => r.entryStatus === ATTENDANCE_ENTRY_STATUS.ENTERED).length,
  exited: filteredRecords.value.filter((r) => r.entryStatus === ATTENDANCE_ENTRY_STATUS.EXITED).length,
  onSite: filteredRecords.value.filter((r) => r.onSiteStatus === '在场').length,
  offSite: filteredRecords.value.filter((r) => r.onSiteStatus === '不在场').length,
}))

watch(selectedProjectId, () => {
  keyword.value = ''
  filters.value = { date: '2026-06-29', entryStatus: '', onSiteStatus: '', workType: '' }
})

function handleNodeClick(data) {
  if (data.id === 'hq') return
  selectedProjectId.value = data.id
}

function handleReset() {
  keyword.value = ''
  filters.value = { date: '2026-06-29', entryStatus: '', onSiteStatus: '', workType: '' }
}
</script>

<template>
  <div class="attendance-detail-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">劳务管理 / 考勤明细</div>
      <div class="page-heading">
        <h1 class="page-title">考勤明细</h1>
        <div class="page-actions">
          <el-button :icon="Download">导出</el-button>
        </div>
      </div>
      <p class="page-tip">
        进出场：当日进入工地为「已进场」，离开工地为「已出场」；在场：当日已打上班卡且未打下班卡视为「在场」。
      </p>
    </div>

    <div class="detail-layout">
      <aside class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree
          :data="treeData"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="selectedProjectId"
          :expand-on-click-node="false"
          class="project-tree"
          @node-click="handleNodeClick"
        />
      </aside>

      <section class="detail-panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">{{ selectedProjectLabel || '请选择项目' }}</div>
            <div class="panel-stats">
              <span>记录 {{ stats.total }} 条</span>
              <span>已进场 {{ stats.entered }}</span>
              <span>已出场 {{ stats.exited }}</span>
              <span>在场 {{ stats.onSite }}</span>
              <span>不在场 {{ stats.offSite }}</span>
            </div>
          </div>
        </div>

        <div class="filter-bar">
          <el-date-picker
            v-model="filters.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="考勤日期"
            style="width: 150px"
          />
          <el-input
            v-model="keyword"
            placeholder="姓名 / 身份证 / 班组 / 闸机"
            clearable
            :prefix-icon="Search"
            class="search-input"
          />
          <el-select v-model="filters.entryStatus" :placeholder="ATTENDANCE_ENTRY_LABEL" clearable style="width: 110px">
            <el-option v-for="opt in ATTENDANCE_ENTRY_STATUS_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.onSiteStatus" placeholder="在场状态" clearable style="width: 110px">
            <el-option v-for="opt in ONSITE_STATUS_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.workType" placeholder="工种" clearable style="width: 110px">
            <el-option v-for="opt in workTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredRecords" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="date" label="考勤日期" width="110" />
          <el-table-column prop="name" label="姓名" width="90" />
          <el-table-column prop="idCard" label="身份证号" min-width="170" />
          <el-table-column prop="workType" label="工种" width="90" />
          <el-table-column prop="team" label="班组" min-width="110" show-overflow-tooltip />
          <el-table-column prop="subcontractor" label="分包单位" min-width="120" show-overflow-tooltip />
          <el-table-column :label="ATTENDANCE_ENTRY_LABEL" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="attendanceEntryStatusTagClass(row.entryStatus)">{{ row.entryStatus }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="clockIn" label="上班打卡" width="160" />
          <el-table-column prop="gateIn" label="进场闸机" width="100" />
          <el-table-column prop="clockOut" label="下班打卡" width="160" />
          <el-table-column prop="gateOut" label="出场闸机" width="100" />
          <el-table-column prop="workHours" label="工时(h)" width="80" align="center" />
          <el-table-column label="在场状态" width="90" align="center">
            <template #default="{ row }">
              <span
                v-if="row.onSiteStatus !== '—'"
                class="ap-status-tag"
                :class="onSiteStatusTagClass(row.onSiteStatus)"
              >{{ row.onSiteStatus }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>
  </div>
</template>

<style scoped>
.attendance-detail-page {
  padding: 20px 24px 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ap-text-muted);
  line-height: 1.5;
}

.detail-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: 560px;
}

.project-tree-panel,
.detail-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 12px;
}

.panel-head {
  margin-bottom: 12px;
}

.panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.project-tree :deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 4px;
}

.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--ap-primary-light);
  color: var(--ap-primary);
  font-weight: 600;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input {
  width: 240px;
}

.text-muted {
  color: var(--ap-text-muted);
}
</style>
