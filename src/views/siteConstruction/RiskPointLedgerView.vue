<script setup>
/**
 * 风险点台账（项目级，F-RISK-05）
 * 只读台账：仅展示审批状态为「已通过」的风险辨识记录。
 * 顶部指标为纯激活状态口径（已激活 / 未开始 / 已关闭，按派生激活状态统计）。
 * 操作：详情；手工三态流转——未开始可「激活」或「关闭」，已激活可「关闭」，已关闭可「重新激活」（均二次确认）。
 * 无新增 / 编辑 / 删除。
 */
import { computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  RISK_RUN_STATUS_LABEL,
  SEVERITY_LEVELS,
  activateRiskPointControl,
  activationStatusTagType,
  closeRiskPointControl,
  formatRiskCell,
  formatRiskReportTime,
  listConfigRiskTypes,
  listRiskPointLedger,
  listRiskPointLedgerMetrics,
  reactivateRiskPointControl,
  riskPersonLabel,
  riskRunStatus,
  riskRunStatusLabel,
  riskTypeName,
  severityTagType,
} from '../../mock/riskManage.js'

const router = useRouter()
const { laborProjectId, isHqSelected } = useCurrentProject()

const filters = reactive({
  report_time: '',
  risk_type: '',
  severity: '',
  risk_status: '',
})

/** 点「搜索」后才生效的查询条件（工具栏内为待提交的条件） */
const query = reactive({
  report_time: '',
  risk_type: '',
  severity: '',
  risk_status: '',
})

const tableData = computed(() => {
  if (!laborProjectId.value) return []
  return listRiskPointLedger(laborProjectId.value, { ...query })
})

const metrics = computed(() => {
  if (!laborProjectId.value) return null
  return listRiskPointLedgerMetrics(laborProjectId.value)
})

const typeOptions = computed(() => listConfigRiskTypes(laborProjectId.value))

function doSearch() {
  query.report_time = filters.report_time
  query.risk_type = filters.risk_type
  query.severity = filters.severity
  query.risk_status = filters.risk_status
}

watch(laborProjectId, () => {
  resetFilters()
})

function resetFilters() {
  filters.report_time = ''
  filters.risk_type = ''
  filters.severity = ''
  filters.risk_status = ''
  doSearch()
}

function goDetail(row) {
  router.push(`/site-construction/risk-point-ledger/${row.id}`)
}

/** 激活：仅「未开始」，二次确认 */
function handleActivate(row) {
  if (!laborProjectId.value || riskRunStatus(row) !== 'not_started') return
  ElMessageBox.confirm(`确认激活风险点「${row.risk_point}」？激活后纳入跟踪。`, '提示', { type: 'warning' })
    .then(() => {
      const r = activateRiskPointControl(laborProjectId.value, row.id)
      if (!r.ok) {
        ElMessage.warning(r.msg)
        return
      }
      ElMessage.success('已激活')
    })
    .catch(() => {})
}

/** 关闭：未开始或已激活均可关闭（已关闭不可再关闭），二次确认 */
function handleClose(row) {
  if (!laborProjectId.value || row.approval_status !== 'approved') return
  if (riskRunStatus(row) === 'closed') return
  ElMessageBox.confirm(`确认关闭风险点「${row.risk_point}」？关闭后不再跟踪。`, '提示', { type: 'warning' })
    .then(() => {
      const r = closeRiskPointControl(laborProjectId.value, row.id)
      if (!r.ok) {
        ElMessage.warning(r.msg)
        return
      }
      ElMessage.success('已关闭')
    })
    .catch(() => {})
}

/** 重新激活：仅「已关闭」，二次确认 */
function handleReactivate(row) {
  if (!laborProjectId.value) return
  if (row.approval_status !== 'approved' || riskRunStatus(row) !== 'closed') return
  ElMessageBox.confirm(`确认重新激活风险点「${row.risk_point}」？激活后恢复跟踪。`, '提示', { type: 'warning' })
    .then(() => {
      const r = reactivateRiskPointControl(laborProjectId.value, row.id)
      if (!r.ok) {
        ElMessage.warning(r.msg)
        return
      }
      ElMessage.success('已重新激活')
    })
    .catch(() => {})
}
</script>

<template>
  <div class="page page-card">
    <div class="page-head">
      <div>
        <div class="page-breadcrumb">风险管理 / 风险点台账</div>
        <h3 class="page-title">风险点台账</h3>
        <p class="page-tip">只读台账，仅收录审批状态为「已通过」的风险辨识记录。激活状态为手工驱动：未开始的记录需手工「激活」，已激活可「关闭」，已关闭可「重新激活」；状态取「已关闭 &gt; 已激活 &gt; 未开始」。</p>
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
      <div v-if="metrics" class="metric-row">
        <div class="metric-card"><b>{{ metrics.total }}</b><span>风险点总数（条）</span></div>
        <div class="metric-card"><b>{{ metrics.activated }}</b><span>已激活（条）</span></div>
        <div class="metric-card"><b>{{ metrics.not_started }}</b><span>未开始（条）</span></div>
        <div class="metric-card"><b>{{ metrics.closed }}</b><span>已关闭（条）</span></div>
      </div>

      <div class="toolbar">
        <el-date-picker
          v-model="filters.report_time"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="填报时间"
          style="width: 160px"
          aria-label="填报时间"
        />
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
          v-model="filters.severity"
          clearable
          placeholder="严重程度"
          style="width: 140px"
          aria-label="严重程度"
        >
          <el-option v-for="lv in SEVERITY_LEVELS" :key="lv" :label="lv" :value="lv" />
        </el-select>
        <el-select
          v-model="filters.risk_status"
          clearable
          placeholder="激活状态"
          style="width: 140px"
          aria-label="激活状态"
        >
          <el-option v-for="(label, key) in RISK_RUN_STATUS_LABEL" :key="key" :label="label" :value="key" />
        </el-select>
        <el-button type="primary" @click="doSearch">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <el-table :data="tableData" border stripe class="ap-table" style="width: 100%" empty-text="暂无数据">
        <el-table-column prop="risk_source_no" label="风险源编号" width="150" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.risk_source_no) }}</template>
        </el-table-column>
        <el-table-column prop="risk_type" label="风险类型" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ riskTypeName(row) }}</template>
        </el-table-column>
        <el-table-column prop="risk_point" label="风险点" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_point) }}</template>
        </el-table-column>
        <el-table-column prop="severity" label="严重程度" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="severityTagType(row.severity)">{{ formatRiskCell(row.severity) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="管控责任人" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ riskPersonLabel(row.control_person_id) }}</template>
        </el-table-column>
        <el-table-column label="计划开始时间" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.plan_start) }}</template>
        </el-table-column>
        <el-table-column label="计划结束时间" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.plan_end) }}</template>
        </el-table-column>
        <el-table-column label="激活状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="activationStatusTagType(row)">{{ riskRunStatusLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="report_time" label="填报时间" width="160" align="center">
          <template #default="{ row }">{{ formatRiskReportTime(row.report_time) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goDetail(row)">详情</el-button>
            <el-button
              v-if="row.approval_status === 'approved' && riskRunStatus(row) === 'not_started'"
              link
              type="primary"
              size="small"
              @click="handleActivate(row)"
            >激活</el-button>
            <el-button
              v-if="row.approval_status === 'approved' && riskRunStatus(row) !== 'closed'"
              link
              type="primary"
              size="small"
              @click="handleClose(row)"
            >关闭</el-button>
            <el-button
              v-if="row.approval_status === 'approved' && riskRunStatus(row) === 'closed'"
              link
              type="primary"
              size="small"
              @click="handleReactivate(row)"
            >重新激活</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.page-breadcrumb {
  font-size: 12px;
  color: #909399;
}
.page-title {
  margin: 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
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
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.metric-card {
  min-width: 140px;
  padding: 8px 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafafa;
}
.metric-card b {
  display: block;
  font-size: 18px;
  color: #1f2329;
}
.metric-card span {
  font-size: 12px;
  color: #606266;
}
.mb-16 {
  margin-bottom: 16px;
}
.ap-table {
  font-size: 13px;
}
</style>
