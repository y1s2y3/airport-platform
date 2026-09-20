<script setup>
/**
 * 中心风险台账（项目级）
 * 只展示审批通过的风险。累计巡检次数可点开查看关联巡检任务。
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { listMobileInspectionTasks } from '../../mock/mobileInspectionTasks.js'
import {
  RISK_RUN_STATUS_LABEL,
  formatRiskCell,
  listConfigRiskTypes,
  listRiskPointControls,
  riskRunStatus,
  riskRunStatusLabel,
  riskRunStatusTagType,
} from '../../mock/riskManage.js'

const router = useRouter()
const { laborProjectId, isHqSelected } = useCurrentProject()

const filters = reactive({
  risk_type: '',
  risk_status: '',
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogTasks = ref([])

function listLinkedInspections(riskId) {
  return listMobileInspectionTasks().filter((task) => {
    if (task.riskControlId !== riskId) return false
    const projectId = task.project_id || task.projectId
    return !laborProjectId.value || projectId === laborProjectId.value
  })
}

function inspectionCount(riskId) {
  return listLinkedInspections(riskId).length
}

const tableData = computed(() => {
  if (!laborProjectId.value) return []
  return listRiskPointControls(laborProjectId.value)
    .filter((row) => row.approval_status === 'approved')
    .filter((row) => !filters.risk_type || row.risk_type === filters.risk_type)
    .filter((row) => !filters.risk_status || riskRunStatus(row) === filters.risk_status)
    .map((row) => ({
      ...row,
      inspection_count: inspectionCount(row.id),
    }))
})

const typeOptions = computed(() => listConfigRiskTypes(laborProjectId.value))

watch(laborProjectId, () => {
  filters.risk_type = ''
  filters.risk_status = ''
})

function resetFilters() {
  filters.risk_type = ''
  filters.risk_status = ''
}

function goDetail(row) {
  router.push(`/site-construction/risk-point-control/${row.id}`)
}

function openInspectionDetail(row) {
  dialogTitle.value = `巡检明细 · ${row.risk_source_no || row.risk_point || ''}`
  dialogTasks.value = listLinkedInspections(row.id)
  dialogVisible.value = true
}

function goTaskDetail(task) {
  if (!task?.id) return
  router.push(`/safety-inspection/task/${task.id}`)
}

function taskStatusTagType(status) {
  if (status === '已完成') return 'success'
  if (status === '待执行') return 'warning'
  return 'info'
}
</script>

<template>
  <div class="page page-card">
    <div class="page-head">
      <div>
        <div class="page-breadcrumb">风险管理 / 中心风险台账</div>
        <h3 class="page-title">中心风险台账</h3>
        <p class="page-tip">只展示审批通过的风险。点击累计巡检次数可查看已关联的巡检任务。</p>
      </div>
      <span class="total-count">共 {{ tableData.length }} 条</span>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="info"
      :closable="false"
      show-icon
      title="本功能仅项目级可用，请先在顶部切换到具体项目。"
      class="mb-16"
    />

    <template v-else>
      <div class="toolbar">
        <el-select
          v-model="filters.risk_type"
          clearable
          filterable
          placeholder="风险类型"
          style="width: 160px"
          aria-label="风险类型"
        >
          <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select
          v-model="filters.risk_status"
          clearable
          placeholder="风险状态"
          style="width: 140px"
          aria-label="风险状态"
        >
          <el-option v-for="(label, key) in RISK_RUN_STATUS_LABEL" :key="key" :label="label" :value="key" />
        </el-select>
        <el-button type="primary" @click="() => {}">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <el-table :data="tableData" border stripe class="ap-table" style="width: 100%" empty-text="暂无数据">
        <el-table-column prop="risk_source_no" label="风险源编号" width="160" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.risk_source_no) }}</template>
        </el-table-column>
        <el-table-column prop="report_date" label="填报日期" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.report_date) }}</template>
        </el-table-column>
        <el-table-column prop="risk_type" label="风险类型" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_type) }}</template>
        </el-table-column>
        <el-table-column prop="risk_point" label="风险点" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_point) }}</template>
        </el-table-column>
        <el-table-column label="审批状态" width="110" align="center">
          <template #default>
            <el-tag size="small" type="success">已通过</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="风险状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="riskRunStatusTagType(row)">
              {{ riskRunStatusLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="累计巡检次数" width="130" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.inspection_count > 0"
              link
              type="primary"
              @click="openInspectionDetail(row)"
            >{{ row.inspection_count }} 次</el-button>
            <span v-else>0 次</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="760px"
      destroy-on-close
    >
      <el-table :data="dialogTasks" border stripe empty-text="暂无关联巡检任务" style="width: 100%">
        <el-table-column prop="taskNo" label="任务单号" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.taskNo) }}</template>
        </el-table-column>
        <el-table-column prop="taskName" label="任务名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.taskName) }}</template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="100" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.source) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="taskStatusTagType(row.status)">
              {{ formatRiskCell(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止日期" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.deadline) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goTaskDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
}
.page-breadcrumb {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}
.page-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
}
.page-tip {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
.total-count {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  padding-top: 8px;
}
.mb-16 {
  margin-bottom: 16px;
}
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
</style>
