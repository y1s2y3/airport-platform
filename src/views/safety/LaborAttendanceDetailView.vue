<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { projectTree, getProjectPersonCount } from '../../mock/laborAttendanceStats'
import { getAttendanceDetails, getPersonAccessEvents, logAttendanceIdCardView } from '../../mock/laborAttendanceDetail'
import {
  ATTENDANCE_ENTRY_STATUS,
  ATTENDANCE_ENTRY_STATUS_OPTIONS,
  ATTENDANCE_ENTRY_LABEL,
  ATTENDANCE_CLOCK_IN_LABEL,
  ATTENDANCE_CLOCK_OUT_LABEL,
  ONSITE_STATUS_OPTIONS,
  REALNAME_ENTRY_STATUS,
  attendanceEntryStatusTagClass,
  realNameEntryStatusTagClass,
  onSiteStatusTagClass,
} from '../../constants/laborPersonStatus'
import { workTypeOptions } from '../../mock/laborRealName'
import { useIdCardReveal } from '../../composables/useIdCardReveal'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const keyword = ref('')
const {
  isVisible: isIdCardVisible,
  display: displayIdCard,
  reveal: viewIdCard,
  reset: resetIdCardReveal,
} = useIdCardReveal({
  getRaw: (row) => row.id_card_raw || row.id_card,
  onReveal: (row) =>
    logAttendanceIdCardView({
      id: row.id,
      name: row.name,
      id_card_raw: row.id_card_raw,
    }),
})
const filters = ref({
  date: '2026-06-29',
  entry_status: '',
  on_site_status: '',
  work_type: '',
})

const accessDialogVisible = ref(false)
const accessPerson = ref(null)
const accessFilters = ref({ date: '', direction: '' })
const ACCESS_DIRECTION_OPTIONS = ['进场', '出场']

const accessEvents = computed(() => {
  if (!accessPerson.value || !accessFilters.value.date) return []
  return getPersonAccessEvents({
    project_id: scopeProjectId.value,
    name: accessPerson.value.name,
    id_card_raw: accessPerson.value.id_card_raw || '',
    date: accessFilters.value.date,
  })
})

const filteredAccessEvents = computed(() => {
  const dir = accessFilters.value.direction
  if (!dir) return accessEvents.value
  return accessEvents.value.filter((row) => row.direction === dir)
})

function openAccessDialog(row) {
  accessPerson.value = row
  accessFilters.value = {
    date: row.date || filters.value.date || '2026-06-29',
    direction: '',
  }
  accessDialogVisible.value = true
}

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: `${item.label.replace(/\(\d+\)$/, '')}(${getProjectPersonCount(item.id)})`,
    })),
  })),
)

const allRecords = computed(() => getAttendanceDetails(scopeProjectId.value))

const filteredRecords = computed(() => {
  const kw = keyword.value.trim()
  return allRecords.value.filter((row) => {
    if (filters.value.date && row.date !== filters.value.date) return false
    if (filters.value.entry_status && row.entry_status !== filters.value.entry_status) return false
    if (filters.value.on_site_status && row.on_site_status !== filters.value.on_site_status) return false
    if (filters.value.work_type && row.work_type !== filters.value.work_type) return false
    if (kw) {
      const hay = `${row.name}${row.id_card_raw || row.id_card}${row.unit_name}${row.gate_in}`
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const stats = computed(() => ({
  total: filteredRecords.value.length,
  entered: filteredRecords.value.filter((r) => r.entry_status === ATTENDANCE_ENTRY_STATUS.ENTERED).length,
  exited: filteredRecords.value.filter((r) => r.entry_status === ATTENDANCE_ENTRY_STATUS.EXITED).length,
  on_site_count: filteredRecords.value.filter((r) => r.on_site_status === '在场').length,
  offSite: filteredRecords.value.filter((r) => r.on_site_status === '不在场').length,
}))

watch(scopeProjectId, () => {
  keyword.value = ''
  resetIdCardReveal()
  filters.value = { date: '2026-06-29', entry_status: '', on_site_status: '', work_type: '' }
  accessDialogVisible.value = false
})

function handleReset() {
  keyword.value = ''
  filters.value = { date: '2026-06-29', entry_status: '', on_site_status: '', work_type: '' }
}
</script>

<template>
  <div class="attendance-detail-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 考勤明细</div>
      <div class="page-heading">
        <h1 class="page-title">考勤明细</h1>
        <div class="page-actions">
          <el-button :icon="Download">导出</el-button>
        </div>
      </div>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree
          :data="treeData"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="treeProjectId"
          :expand-on-click-node="false"
          class="project-tree"
          @node-click="onTreeNodeClick"
        />
      </aside>

      <section class="detail-panel">
        <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel }}</div>
        <div class="panel-stats">
          <span>记录 {{ stats.total }} 条</span>
          <span>已进场 {{ stats.entered }}</span>
          <span>已出场 {{ stats.exited }}</span>
          <span>在场 {{ stats.on_site_count }}</span>
          <span>不在场 {{ stats.offSite }}</span>
        </div>

        <div class="filter-bar">
          <el-date-picker
            v-model="filters.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="考勤日期"
            aria-label="考勤日期"
            style="width: 150px"
          />
          <el-input
            v-model="keyword"
            placeholder="姓名 / 身份证 / 闸机"
            aria-label="姓名 / 身份证 / 闸机"
            clearable
            :prefix-icon="Search"
            class="search-input"
          />
          <el-select
            v-model="filters.entry_status"
            :placeholder="ATTENDANCE_ENTRY_LABEL"
            :aria-label="ATTENDANCE_ENTRY_LABEL"
            clearable
            style="width: 110px"
          >
            <el-option v-for="opt in ATTENDANCE_ENTRY_STATUS_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select
            v-model="filters.on_site_status"
            placeholder="在场状态"
            aria-label="在场状态"
            clearable
            style="width: 110px"
          >
            <el-option v-for="opt in ONSITE_STATUS_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select
            v-model="filters.work_type"
            placeholder="工种"
            aria-label="工种"
            clearable
            style="width: 110px"
          >
            <el-option v-for="opt in workTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredRecords" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="date" label="考勤日期" width="110" />
          <el-table-column prop="name" label="姓名" width="90" />
          <el-table-column label="身份证号" min-width="200">
            <template #default="{ row }">
              <div class="id-card-cell">
                <span>{{ displayIdCard(row) }}</span>
                <el-button
                  v-if="!isIdCardVisible(row.id)"
                  link
                  type="primary"
                  size="small"
                  @click="viewIdCard(row)"
                >
                  查看
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="work_type" label="工种" width="90" />
          <el-table-column prop="unit_name" label="分包单位" min-width="120" show-overflow-tooltip />
          <el-table-column :label="ATTENDANCE_ENTRY_LABEL" width="90" align="center">
            <template #default="{ row }">
              <span
                class="ap-status-tag"
                :class="
                  row.entry_status === REALNAME_ENTRY_STATUS.EXITED
                    ? realNameEntryStatusTagClass(row.entry_status)
                    : attendanceEntryStatusTagClass(row.entry_status)
                "
              >{{ row.entry_status }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="clock_in" :label="ATTENDANCE_CLOCK_IN_LABEL" width="160" />
          <el-table-column prop="gate_in" label="进场闸机" width="100" />
          <el-table-column prop="clock_out" :label="ATTENDANCE_CLOCK_OUT_LABEL" width="160" />
          <el-table-column prop="gate_out" label="出场闸机" width="100" />
          <el-table-column prop="work_hours" label="工时(h)" width="80" align="center" />
          <el-table-column label="在场状态" width="90" align="center">
            <template #default="{ row }">
              <span
                v-if="row.on_site_status !== '—'"
                class="ap-status-tag"
                :class="onSiteStatusTagClass(row.on_site_status)"
              >{{ row.on_site_status }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openAccessDialog(row)">
                查看进出场记录
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog
      v-model="accessDialogVisible"
      :title="accessPerson ? `进出场记录 · ${accessPerson.name}` : '进出场记录'"
      width="780px"
      destroy-on-close
    >
      <div class="access-filter-bar">
        <el-date-picker
          v-model="accessFilters.date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="考勤日期"
          aria-label="考勤日期"
          style="width: 160px"
        />
        <el-select
          v-model="accessFilters.direction"
          placeholder="进出场方向"
          aria-label="进出场方向"
          clearable
          style="width: 130px"
        >
          <el-option
            v-for="opt in ACCESS_DIRECTION_OPTIONS"
            :key="opt"
            :label="opt"
            :value="opt"
          />
        </el-select>
      </div>
      <el-table :data="filteredAccessEvents" border stripe class="ap-table" max-height="420">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="姓名" width="90" />
        <el-table-column prop="direction" label="进出场方向" width="110" align="center" />
        <el-table-column prop="record_time" label="时间" min-width="170" />
        <el-table-column prop="gate_name" label="闸机" min-width="120" />
        <el-table-column label="考勤照片" width="100" align="center">
          <template #default="{ row }">
            <el-avatar :size="36" class="access-photo">{{ row.photo || row.name?.slice(0, 1) || '—' }}</el-avatar>
          </template>
        </el-table-column>
        <template #empty>暂无进出场记录</template>
      </el-table>
      <template #footer>
        <el-button type="primary" @click="accessDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
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

.page-layout.with-tree {
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

.panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-top: 6px;
  margin-bottom: 12px;
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

.id-card-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.access-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.access-photo {
  background: var(--ap-primary-light, #e8f0fe);
  color: var(--ap-primary, #1a56db);
  font-size: 14px;
}
</style>
