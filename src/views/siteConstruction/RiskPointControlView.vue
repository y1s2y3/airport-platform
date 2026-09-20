<script setup>
/**
 * 风险点管控列表（项目级）
 * 审批状态 / 操作对齐质量管理：el-tag；详情 + 已驳回重新申报
 */
import { computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  APPROVAL_STATUS_LABEL,
  RISK_RUN_STATUS_LABEL,
  approvalStatusLabel,
  approvalStatusTagType,
  constructionProgressLabel,
  formatRiskCell,
  formatRiskFrequency,
  listConfigRiskTypes,
  listRiskControlMetrics,
  listRiskPointControls,
  riskLocationLabel,
  riskPersonLabel,
  riskRunStatusLabel,
} from '../../mock/riskManage.js'

const router = useRouter()
const { laborProjectId, isHqSelected } = useCurrentProject()

const filters = reactive({
  report_date: '',
  risk_type: '',
  approval_status: '',
  risk_status: '',
})

const tableData = computed(() => {
  if (!laborProjectId.value) return []
  return listRiskPointControls(laborProjectId.value, { ...filters })
})

const metrics = computed(() => {
  if (!laborProjectId.value) return null
  return listRiskControlMetrics(laborProjectId.value)
})

const typeOptions = computed(() => listConfigRiskTypes(laborProjectId.value))

watch(laborProjectId, () => {
  filters.report_date = ''
  filters.risk_type = ''
  filters.approval_status = ''
  filters.risk_status = ''
})

function resetFilters() {
  filters.report_date = ''
  filters.risk_type = ''
  filters.approval_status = ''
  filters.risk_status = ''
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
    ElMessage.warning('仅已驳回记录可重新申报')
    return
  }
  router.push(`/site-construction/risk-point-control/${row.id}/edit`)
}
</script>

<template>
  <div class="page page-card">
    <div class="page-head">
      <div>
        <div class="page-breadcrumb">风险管理 / 风险点管控</div>
        <h3 class="page-title">风险点管控</h3>
        <p class="page-tip">按日登记。审批通过后，管控措施推送给管控责任人和实施责任人。关联的施工进度为「进行中」时风险状态为已激活，关闭后为已关闭，其余为未激活。</p>
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
        <div class="metric-card"><b>{{ metrics.inactive }}</b><span>未激活（条）</span></div>
        <div class="metric-card"><b>{{ metrics.activated }}</b><span>已激活（条）</span></div>
        <div class="metric-card"><b>{{ metrics.closed }}</b><span>已关闭（条）</span></div>
      </div>
      <p v-if="metrics" class="source-dist">
        已激活，按风险类型：
        <template v-for="(item, index) in metrics.sourceDist" :key="item.name">
          <span v-if="index">；</span>{{ item.name }} {{ item.value }} 条
        </template>
      </p>

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
          v-model="filters.approval_status"
          clearable
          placeholder="审批状态"
          style="width: 140px"
          aria-label="审批状态"
        >
          <el-option v-for="(label, key) in APPROVAL_STATUS_LABEL" :key="key" :label="label" :value="key" />
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
        <div class="toolbar-spacer" />
        <el-button type="primary" @click="goCreate">+ 新增</el-button>
      </div>

      <el-table :data="tableData" border stripe class="ap-table" style="width: 100%" empty-text="暂无数据">
        <el-table-column prop="risk_source_no" label="风险源编号" width="150" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.risk_source_no) }}</template>
        </el-table-column>
        <el-table-column prop="report_date" label="填报日期" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.report_date) }}</template>
        </el-table-column>
        <el-table-column prop="risk_type" label="风险类型" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_type) }}</template>
        </el-table-column>
        <el-table-column label="发生频率" width="120" align="center">
          <template #default="{ row }">{{ formatRiskFrequency(row) }}</template>
        </el-table-column>
        <el-table-column prop="severity" label="严重程度" width="100" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.severity) }}</template>
        </el-table-column>
        <el-table-column prop="risk_point" label="风险点" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_point) }}</template>
        </el-table-column>
        <el-table-column label="受影响区域" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ riskLocationLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="管控责任人" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ riskPersonLabel(row.control_person_id) }}</template>
        </el-table-column>
        <el-table-column label="实施责任人" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ riskPersonLabel(row.implement_person_id) }}</template>
        </el-table-column>
        <el-table-column prop="plan_start" label="计划开始" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.plan_start) }}</template>
        </el-table-column>
        <el-table-column prop="plan_end" label="计划结束" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.plan_end) }}</template>
        </el-table-column>
        <el-table-column label="施工阶段" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.construction_stage) }}</template>
        </el-table-column>
        <el-table-column label="施工进度" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ constructionProgressLabel(row.construction_progress_id) }}</template>
        </el-table-column>
        <el-table-column label="审批状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="approvalStatusTagType(row.approval_status)">
              {{ approvalStatusLabel(row.approval_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="风险状态" width="100" align="center">
          <template #default="{ row }">{{ riskRunStatusLabel(row) }}</template>
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
            >重新申报</el-button>
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
  margin-bottom: 8px;
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
.source-dist {
  margin: 0 0 12px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}
.mb-16 {
  margin-bottom: 16px;
}
.ap-table {
  font-size: 13px;
}
</style>
