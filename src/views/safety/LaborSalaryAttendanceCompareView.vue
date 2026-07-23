<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh, View } from '@element-plus/icons-vue'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import {
  projectTree,
  getProjectSalaryCompareRows,
  getPersonMonthlyAttendanceDetails,
  compareStatusOptions,
  compareStatusTagClass,
} from '../../mock/laborSalaryAttendanceCompare'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const queryMonth = ref('2026-06')
const keyword = ref('')
const statusFilter = ref('')
const detailVisible = ref(false)
const detailTitle = ref('')
const detailRows = ref([])

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: item.label.replace(/\(\d+\)$/, ''),
    })),
  })),
)

const personRows = computed(() => {
  const rows = getProjectSalaryCompareRows(scopeProjectId.value, queryMonth.value)
  const kw = keyword.value.trim()
  return rows.filter((row) => {
    if (statusFilter.value && row.compareStatus !== statusFilter.value) return false
    if (kw) {
      const hay = `${row.name}${row.personnelNo}${row.unitName}${row.workType}`
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const personSummary = computed(() => ({
  total: personRows.value.length,
  warning: personRows.value.filter((r) => r.compareStatus !== '正常').length,
}))

watch([scopeProjectId, queryMonth], () => {
  keyword.value = ''
  statusFilter.value = ''
})

function handleReset() {
  keyword.value = ''
  statusFilter.value = ''
}

function openAttendanceDetail(row) {
  detailTitle.value = `${row.name} · ${queryMonth.value} 考勤明细`
  detailRows.value = getPersonMonthlyAttendanceDetails(row.projectId, row.personnelId, queryMonth.value)
  detailVisible.value = true
}
</script>

<template>
  <div class="compare-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 工资考勤比对</div>
      <h1 class="page-title">工资考勤比对</h1>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">按月比对人员工资发放记录与考勤统计，识别有考勤无薪资、有薪资无考勤等异常并预警。</p>
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

      <section class="content-panel">
        <div class="panel-head">
          <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel || '请选择项目' }}</div>
          <span v-if="!isHqSelected || treeProjectId">
            人员 {{ personSummary.total }} 人 · 预警 {{ personSummary.warning }} 人
          </span>
        </div>

        <div v-if="!isHqSelected || treeProjectId" class="filter-bar">
          <div class="filter-item">
            <label>查询月份</label>
            <el-date-picker
              v-model="queryMonth"
              type="month"
              value-format="YYYY-MM"
              placeholder="选择月份"
              style="width: 160px"
            />
          </div>
          <el-input v-model="keyword" placeholder="姓名/编号/单位" clearable style="width: 180px" />
          <el-select v-model="statusFilter" placeholder="比对结果" clearable style="width: 150px">
            <el-option v-for="opt in compareStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table
          v-if="!isHqSelected || treeProjectId"
          :data="personRows"
          border
          stripe
          class="ap-table"
        >
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="personnelNo" label="人员编号" width="150" />
          <el-table-column prop="name" label="姓名" width="90" />
          <el-table-column prop="unitName" label="所属单位" min-width="160" show-overflow-tooltip />
          <el-table-column prop="workType" label="工种" width="90" />
          <el-table-column prop="attendanceDays" label="出勤天数" width="90" align="center" />
          <el-table-column prop="salaryAmount" label="发放金额(元)" width="120" align="center" />
          <el-table-column label="比对结果" width="130" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="compareStatusTagClass(row.compareStatus)">{{ row.compareStatus }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" :icon="View" @click="openAttendanceDetail(row)">当月考勤明细</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="请在左侧选择项目" />
      </section>
    </div>

    <el-dialog v-model="detailVisible" :title="detailTitle" width="920px" destroy-on-close>
      <el-table :data="detailRows" border stripe class="ap-table" max-height="420">
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column prop="clockIn" label="上班时间" width="160" />
        <el-table-column prop="clockOut" label="下班时间" width="160" />
        <el-table-column prop="gateIn" label="进场闸机" width="100" />
        <el-table-column prop="gateOut" label="出场闸机" width="100" />
        <el-table-column prop="onSiteStatus" label="在场状态" width="90" align="center" />
        <el-table-column prop="workHours" label="工时(h)" width="90" align="center" />
      </el-table>
      <el-empty v-if="!detailRows.length" description="该月暂无考勤明细" />
    </el-dialog>
  </div>
</template>

<style scoped>
.compare-page { padding: 20px 24px 32px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
.page-scope, .page-tip { font-size: 13px; color: var(--ap-text-secondary); margin: 0 0 8px; }
.page-layout.with-tree { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
.project-tree-panel, .content-panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
.panel-title { font-size: 14px; font-weight: 600; margin-bottom: 0; }
.panel-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; font-size: 13px; color: var(--ap-text-secondary); }
.filter-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 12px; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item label { font-size: 13px; color: var(--ap-text-secondary); white-space: nowrap; }
</style>
