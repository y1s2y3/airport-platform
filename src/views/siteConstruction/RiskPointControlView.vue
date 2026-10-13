<script setup>
/**
 * 风险点审批列表（项目级，F-RISK-02）
 * 顶部指标为纯审批状态口径；操作：详情 + 已驳回重新报审（生成新单）。
 * 关闭 / 重新激活已移至「风险点台账」（F-RISK-05），本页不再提供。
 */
import { computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  APPROVAL_STATUS_LABEL,
  SEVERITY_LEVELS,
  approvalStatusLabel,
  approvalStatusTagType,
  formatRiskCell,
  listConfigRiskTypes,
  listRiskControlMetrics,
  listRiskPointControls,
  riskPersonLabel,
  severityTagType,
} from '../../mock/riskManage.js'

const router = useRouter()
const { laborProjectId, isHqSelected } = useCurrentProject()

const filters = reactive({
  report_date: '',
  risk_type: '',
  severity: '',
  approval_status: '',
})

/** 点「搜索」后才生效的查询条件（工具栏内为待提交的条件） */
const query = reactive({
  report_date: '',
  risk_type: '',
  severity: '',
  approval_status: '',
})

const tableData = computed(() => {
  if (!laborProjectId.value) return []
  return listRiskPointControls(laborProjectId.value, { ...query })
})

const metrics = computed(() => {
  if (!laborProjectId.value) return null
  return listRiskControlMetrics(laborProjectId.value)
})

const typeOptions = computed(() => listConfigRiskTypes(laborProjectId.value))

function doSearch() {
  query.report_date = filters.report_date
  query.risk_type = filters.risk_type
  query.severity = filters.severity
  query.approval_status = filters.approval_status
}

watch(laborProjectId, () => {
  resetFilters()
})

function resetFilters() {
  filters.report_date = ''
  filters.risk_type = ''
  filters.severity = ''
  filters.approval_status = ''
  doSearch()
}

function goCreate() {
  if (!laborProjectId.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!typeOptions.value.length) {
    ElMessage.warning('请先在「风险类型配置」维护至少一条风险类型')
    return
  }
  router.push('/site-construction/risk-point-control/create')
}

function goDetail(row) {
  router.push(`/site-construction/risk-point-control/${row.id}`)
}

function goResubmit(row) {
  if (row.approval_status !== 'rejected') {
    ElMessage.warning('仅已驳回记录可重新报审')
    return
  }
  // 直接以路由对象跳转：`router.resolve().href` 在 hash 路由下带前导「#」，
  // 再 push 会被当成路径导致地址变成「#/…#/…」（双井号），故不使用 href。
  router.push({
    name: 'RiskPointControlEdit',
    params: { id: row.id },
    query: { from: row.id },
  })
}
</script>

<template>
  <div class="page page-card">
    <div class="page-head">
      <div>
        <div class="page-breadcrumb">风险管理 / 风险点审批</div>
        <h3 class="page-title">风险点审批</h3>
        <p class="page-tip">按日发起风险辨识并提交监理审批；审批通过后，管控措施推送给管控责任人和实施责任人。已通过的记录在「风险点台账」中跟踪激活状态。</p>
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
        <div class="metric-card"><b>{{ metrics.total }}</b><span>风险辨识总数（条）</span></div>
        <div class="metric-card"><b>{{ metrics.reviewing }}</b><span>审批中（条）</span></div>
        <div class="metric-card"><b>{{ metrics.approved }}</b><span>已通过（条）</span></div>
        <div class="metric-card"><b>{{ metrics.rejected }}</b><span>已驳回（条）</span></div>
      </div>

      <div class="toolbar">
        <el-date-picker
          v-model="filters.report_date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="填报日期"
          style="width: 160px"
          aria-label="填报日期"
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
          v-model="filters.approval_status"
          clearable
          placeholder="审批状态"
          style="width: 140px"
          aria-label="审批状态"
        >
          <el-option v-for="(label, key) in APPROVAL_STATUS_LABEL" :key="key" :label="label" :value="key" />
        </el-select>
        <el-button type="primary" @click="doSearch">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
        <div class="toolbar-spacer" />
        <el-button type="primary" @click="goCreate">+ 新增</el-button>
      </div>

      <el-table :data="tableData" border stripe class="ap-table" style="width: 100%" empty-text="暂无数据">
        <el-table-column prop="risk_source_no" label="风险源编号" width="150" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.risk_source_no) }}</template>
        </el-table-column>
        <el-table-column prop="risk_type" label="风险类型" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_type) }}</template>
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
        <el-table-column label="审批状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="approvalStatusTagType(row.approval_status)">
              {{ approvalStatusLabel(row.approval_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="report_date" label="填报日期" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.report_date) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goDetail(row)">详情</el-button>
            <el-button
              v-if="row.approval_status === 'rejected'"
              link
              type="primary"
              size="small"
              @click="goResubmit(row)"
            >重新报审</el-button>
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
.toolbar-spacer {
  flex: 1;
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
