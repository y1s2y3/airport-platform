<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import {
  projectTree,
  getPersonStats,
  getTeamStats,
  getProjectPersonCount,
  workTypes,
} from '../../mock/laborAttendanceStats'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const activeTab = ref('person')
const personFilters = ref({ name: '', company: '', workType: '' })

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

const allPersonList = computed(() => getPersonStats(scopeProjectId.value))
const allTeamList = computed(() => getTeamStats(scopeProjectId.value))

const filteredPersonList = computed(() => {
  return allPersonList.value.filter((row) => {
    if (personFilters.value.name && !row.name.includes(personFilters.value.name.trim())) return false
    if (personFilters.value.company && !row.company.includes(personFilters.value.company.trim())) return false
    if (personFilters.value.workType && row.workType !== personFilters.value.workType) return false
    return true
  })
})

const personSummary = computed(() => ({
  total: filteredPersonList.value.length,
  avgRate: filteredPersonList.value.length
    ? `${(filteredPersonList.value.reduce((sum, row) => sum + parseFloat(row.attendanceRate), 0) / filteredPersonList.value.length).toFixed(1)}%`
    : '-',
  overtime: filteredPersonList.value.reduce((sum, row) => sum + row.overtimeHours, 0),
}))

watch(scopeProjectId, () => {
  personFilters.value = { name: '', company: '', workType: '' }
})

function handleReset() {
  personFilters.value = { name: '', company: '', workType: '' }
}
</script>

<template>
  <div class="att-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 考勤统计</div>
      <h1 class="page-title">考勤统计</h1>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">在场人数统计口径：当日已打上班卡且未打下班卡。统计周期：2026年6月。</p>
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

      <section class="stats-panel">
        <div class="panel-head">
          <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel || '请选择项目' }}</div>
          <div v-if="activeTab === 'person'" class="panel-stats">
            <span>人员 {{ personSummary.total }} 人</span>
            <span>平均出勤率 {{ personSummary.avgRate }}</span>
            <span>加班合计 {{ personSummary.overtime }} h</span>
          </div>
          <div v-else class="panel-stats">
            <span>班组 {{ allTeamList.length }} 个</span>
          </div>
        </div>

        <el-tabs v-model="activeTab">
          <el-tab-pane label="按人员统计" name="person">
            <div class="filter-bar">
              <el-input v-model="personFilters.name" placeholder="姓名" clearable style="width: 120px" />
              <el-input v-model="personFilters.company" placeholder="施工单位" clearable style="width: 140px" />
              <el-select v-model="personFilters.workType" placeholder="工种" clearable style="width: 110px">
                <el-option v-for="t in workTypes" :key="t" :label="t" :value="t" />
              </el-select>
              <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
              <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            </div>

            <el-table :data="filteredPersonList" border stripe class="ap-table">
              <el-table-column type="index" label="序号" width="60" align="center" />
              <el-table-column prop="name" label="姓名" width="90" />
              <el-table-column prop="company" label="施工单位" min-width="120" />
              <el-table-column prop="workType" label="工种" width="90" />
              <el-table-column prop="attendanceDays" label="出勤天数" width="90" align="center" />
              <el-table-column prop="totalHours" label="总工时(h)" width="95" align="center" />
              <el-table-column prop="avgHours" label="日均(h)" width="85" align="center" />
              <el-table-column prop="lateCount" label="迟到" width="70" align="center" />
              <el-table-column prop="earlyLeaveCount" label="早退" width="70" align="center" />
              <el-table-column prop="absentCount" label="缺勤" width="70" align="center" />
              <el-table-column prop="overtimeHours" label="加班(h)" width="85" align="center" />
              <el-table-column prop="attendanceRate" label="出勤率" width="90" align="center" />
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="按班组统计" name="team">
            <el-table :data="allTeamList" border stripe class="ap-table">
              <el-table-column type="index" label="序号" width="60" align="center" />
              <el-table-column prop="team" label="班组" min-width="120" />
              <el-table-column prop="company" label="施工单位" min-width="120" />
              <el-table-column prop="headcount" label="人数" width="80" align="center" />
              <el-table-column prop="presentDays" label="出勤人天" width="100" align="center" />
              <el-table-column prop="avgRate" label="平均出勤率" width="110" align="center" />
              <el-table-column prop="absentTotal" label="缺勤合计" width="90" align="center" />
              <el-table-column prop="overtimeHours" label="加班(h)" width="90" align="center" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </section>
    </div>
  </div>
</template>

<style scoped>
.att-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; }
.page-scope { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--ap-text); }
.page-tip { margin-top: 0; font-size: 12px; color: var(--ap-text-muted); }
.page-layout.with-tree {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: 560px;
}
.project-tree-panel,
.stats-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}
.panel-title { font-size: 15px; font-weight: 600; color: var(--ap-text); margin-bottom: 12px; }
.panel-head { margin-bottom: 12px; }
.panel-head .panel-title { margin-bottom: 0; }
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
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
</style>
