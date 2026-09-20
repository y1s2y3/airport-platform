<script setup>
/**
 * 风险点管控 — 详情（只读）
 * 审批在个人中心办理；已通过且未关闭可在此关闭；已驳回可重新申报。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PersonalCenterReadonlyHint from '../../components/PersonalCenterReadonlyHint.vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  APPROVAL_STATUS_LABEL,
  approvalStatusTagType,
  closeRiskPointControl,
  constructionProgressLabel,
  formatMatSupervisorApproverLabel,
  formatRiskCell,
  formatRiskFrequency,
  getRiskPointControl,
  riskLocationLabel,
  riskPersonLabel,
  riskRunStatus,
  riskRunStatusLabel,
} from '../../mock/riskManage.js'

const route = useRoute()
const router = useRouter()
const { laborProjectId } = useCurrentProject()

const detailId = computed(() => String(route.params.id || ''))

const detail = computed(() => {
  const id = detailId.value
  return id ? getRiskPointControl(id) : null
})

const isReviewing = computed(() => detail.value?.approval_status === 'reviewing')
const canClose = computed(() => {
  const row = detail.value
  if (!row || row.approval_status !== 'approved') return false
  return riskRunStatus(row) !== 'closed'
})
const canResubmit = computed(() => detail.value?.approval_status === 'rejected')

const supervisorLabel = computed(() => {
  const row = detail.value
  if (!row) return '--'
  return formatMatSupervisorApproverLabel({
    name: row.supervisor_approver_name,
    org: row.supervisor_approver_org,
    post_label: row.supervisor_approver_post_label,
  })
})

function goBack() {
  router.push('/site-construction/risk-point-control')
}

function goResubmit() {
  if (!detail.value) return
  router.push(`/site-construction/risk-point-control/${detail.value.id}/edit`)
}

function handleClose() {
  const row = detail.value
  if (!row || !laborProjectId.value) return
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
</script>

<template>
  <div class="page page-card">
    <div class="page-head">
      <div>
        <div class="page-breadcrumb">风险管理 / 风险点管控 / 详情</div>
        <div class="title-row">
          <h3 class="page-title">风险点管控详情</h3>
          <div class="title-actions">
            <el-button
              v-if="canResubmit"
              type="primary"
              @click="goResubmit"
            >重新申报</el-button>
            <el-button
              v-if="canClose"
              type="warning"
              @click="handleClose"
            >关闭</el-button>
            <el-button @click="goBack">返回列表</el-button>
          </div>
        </div>
        <PersonalCenterReadonlyHint
          v-if="isReviewing"
          title="本页为只读查看；审批请在「个人中心 → 我的待办」中处理。"
        />
        <p v-else class="page-tip">本页只读；审批在个人中心待办办理。</p>
      </div>
    </div>

    <el-empty v-if="!detail" description="未找到风险辨识记录" />

    <el-descriptions v-else :column="2" border>
      <el-descriptions-item label="填报日期">{{ formatRiskCell(detail.report_date) }}</el-descriptions-item>
      <el-descriptions-item label="风险源编号">{{ formatRiskCell(detail.risk_source_no) }}</el-descriptions-item>
      <el-descriptions-item label="风险类型">{{ formatRiskCell(detail.risk_type) }}</el-descriptions-item>
      <el-descriptions-item label="风险点">{{ formatRiskCell(detail.risk_point) }}</el-descriptions-item>
      <el-descriptions-item label="风险细分">{{ formatRiskCell(detail.risk_segment) }}</el-descriptions-item>
      <el-descriptions-item label="发生频率">{{ formatRiskFrequency(detail) }}</el-descriptions-item>
      <el-descriptions-item label="严重程度">{{ formatRiskCell(detail.severity) }}</el-descriptions-item>
      <el-descriptions-item label="受影响区域" :span="2">{{ riskLocationLabel(detail) }}</el-descriptions-item>
      <el-descriptions-item label="风险因素" :span="2">{{ formatRiskCell(detail.risk_factor) }}</el-descriptions-item>
      <el-descriptions-item label="危害后果" :span="2">{{ formatRiskCell(detail.hazard_consequence) }}</el-descriptions-item>
      <el-descriptions-item label="风险描述" :span="2">{{ formatRiskCell(detail.risk_desc) }}</el-descriptions-item>
      <el-descriptions-item label="管控措施" :span="2">{{ formatRiskCell(detail.control_measure) }}</el-descriptions-item>
      <el-descriptions-item label="施工阶段">{{ formatRiskCell(detail.construction_stage) }}</el-descriptions-item>
      <el-descriptions-item label="施工进度">{{ constructionProgressLabel(detail.construction_progress_id) }}</el-descriptions-item>
      <el-descriptions-item label="计划开始时间">{{ formatRiskCell(detail.plan_start) }}</el-descriptions-item>
      <el-descriptions-item label="计划结束时间">{{ formatRiskCell(detail.plan_end) }}</el-descriptions-item>
      <el-descriptions-item label="管控责任人">{{ riskPersonLabel(detail.control_person_id) }}</el-descriptions-item>
      <el-descriptions-item label="实施责任人">{{ riskPersonLabel(detail.implement_person_id) }}</el-descriptions-item>
      <el-descriptions-item label="监理审批人">{{ supervisorLabel }}</el-descriptions-item>
      <el-descriptions-item label="审批状态">
        <el-tag size="small" :type="approvalStatusTagType(detail.approval_status)">
          {{ APPROVAL_STATUS_LABEL[detail.approval_status] || '--' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="风险状态">{{ riskRunStatusLabel(detail) }}</el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 16px;
}
.page-breadcrumb {
  font-size: 12px;
  color: #909399;
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin: 4px 0;
}
.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
}
.title-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.page-tip {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
</style>
