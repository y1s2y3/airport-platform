<script setup>
/**
 * 风险点申报 — 详情（只读）
 * 审批在个人中心办理；「激活 / 关闭 / 重新激活」仅在从「风险点台账」进入时出现（见 fromLedger）；
 * 已驳回原单只读、不可再提，可从此处「重新报审」生成新单。
 * 本组件同时被「风险点台账」详情路由复用（路径 /site-construction/risk-point-ledger/:id）。
 * 本页不展示施工阶段与施工进度相关字段（激活状态由台账手工驱动，与进度无关）。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PersonalCenterReadonlyHint from '../../components/PersonalCenterReadonlyHint.vue'
import TodoApprovalFlowSection from '../personalCenter/components/TodoApprovalFlowSection.vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  APPROVAL_STATUS_LABEL,
  activateRiskPointControl,
  activationStatusTagType,
  approvalStatusTagType,
  closeRiskPointControl,
  reactivateRiskPointControl,
  formatMatSupervisorApproverLabel,
  formatRiskCell,
  formatRiskFrequency,
  formatRiskReportTime,
  getRiskPointControl,
  riskApprovalFlow,
  riskCopyFromLabel,
  riskLocationLabel,
  riskPersonLabel,
  riskRunStatus,
  riskRunStatusLabel,
  riskTypeName,
  severityTagType,
} from '../../mock/riskManage.js'

const route = useRoute()
const router = useRouter()
const { laborProjectId } = useCurrentProject()

const detailId = computed(() => String(route.params.id || ''))

/** 本组件被「风险点申报」与「风险点台账」两条详情路由复用，按进入路径取名 */
const fromLedger = computed(() => route.path.startsWith('/site-construction/risk-point-ledger'))
const listPath = computed(() => (
  fromLedger.value ? '/site-construction/risk-point-ledger' : '/site-construction/risk-point-control'
))
const pageOwner = computed(() => (fromLedger.value ? '风险点台账' : '风险点申报'))

const detail = computed(() => {
  const id = detailId.value
  return id ? getRiskPointControl(id) : null
})

const isReviewing = computed(() => detail.value?.approval_status === 'reviewing')
const runStatus = computed(() => riskRunStatus(detail.value))
const canActivate = computed(() => {
  const row = detail.value
  return !!(row && row.approval_status === 'approved' && runStatus.value === 'not_started')
})
const canClose = computed(() => {
  const row = detail.value
  if (!row || row.approval_status !== 'approved') return false
  return runStatus.value !== 'closed'
})
const canResubmit = computed(() => detail.value?.approval_status === 'rejected')
const canReactivate = computed(() => {
  const row = detail.value
  return !!(row && row.approval_status === 'approved' && runStatus.value === 'closed')
})

const supervisorLabel = computed(() => {
  const row = detail.value
  if (!row) return '--'
  return formatMatSupervisorApproverLabel({
    name: row.supervisor_approver_name,
    org: row.supervisor_approver_org,
    post_label: row.supervisor_approver_post_label,
  })
})

/** 审批过程（本模块仅监理一级审批，固定 2 步） */
const approvalFlow = computed(() => riskApprovalFlow(detail.value))

function goBack() {
  router.push(listPath.value)
}

/** 重新报审：跳本模块编辑页并带源单 id，由表单页预填后提交生成新单 */
function goResubmit() {
  const row = detail.value
  if (!row) return
  // 同上：hash 路由下不要把 resolve().href 再 push（会产生双井号地址）
  router.push({
    name: 'RiskPointControlEdit',
    params: { id: row.id },
    query: { from: row.id },
  })
}

function handleActivate() {
  const row = detail.value
  if (!row || !laborProjectId.value) return
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

function handleReactivate() {
  const row = detail.value
  if (!row || !laborProjectId.value) return
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
        <div class="page-breadcrumb">风险管理 / {{ pageOwner }} / 详情</div>
        <div class="title-row">
          <h3 class="page-title">{{ pageOwner }}详情</h3>
          <div class="title-actions">
            <el-button
              v-if="canResubmit"
              type="primary"
              @click="goResubmit"
            >重新报审</el-button>
            <el-button
              v-if="fromLedger && canActivate"
              type="warning"
              @click="handleActivate"
            >激活</el-button>
            <el-button
              v-if="fromLedger && canClose"
              type="warning"
              @click="handleClose"
            >关闭</el-button>
            <el-button
              v-if="fromLedger && canReactivate"
              type="warning"
              @click="handleReactivate"
            >重新激活</el-button>
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
      <el-descriptions-item label="填报时间">{{ formatRiskReportTime(detail.report_time) }}</el-descriptions-item>
      <el-descriptions-item label="风险源编号">{{ formatRiskCell(detail.risk_source_no) }}</el-descriptions-item>
      <el-descriptions-item v-if="!fromLedger && detail.copy_from_source_no" label="重新申报来源">
        {{ riskCopyFromLabel(detail) }}
      </el-descriptions-item>
      <el-descriptions-item label="风险类型">{{ riskTypeName(detail) }}</el-descriptions-item>
      <el-descriptions-item label="风险点">{{ formatRiskCell(detail.risk_point) }}</el-descriptions-item>
      <el-descriptions-item label="风险细分">{{ formatRiskCell(detail.risk_segment) }}</el-descriptions-item>
      <el-descriptions-item label="发生频率">{{ formatRiskFrequency(detail) }}</el-descriptions-item>
      <el-descriptions-item label="严重程度">
        <el-tag size="small" :type="severityTagType(detail.severity)">{{ formatRiskCell(detail.severity) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="受影响区域" :span="2">{{ riskLocationLabel(detail) }}</el-descriptions-item>
      <el-descriptions-item label="风险因素" :span="2">{{ formatRiskCell(detail.risk_factor) }}</el-descriptions-item>
      <el-descriptions-item label="危害后果" :span="2">{{ formatRiskCell(detail.hazard_consequence) }}</el-descriptions-item>
      <el-descriptions-item label="风险描述" :span="2">{{ formatRiskCell(detail.risk_desc) }}</el-descriptions-item>
      <el-descriptions-item label="管控措施" :span="2">{{ formatRiskCell(detail.control_measure) }}</el-descriptions-item>
      <el-descriptions-item label="计划开始时间">{{ formatRiskCell(detail.plan_start) }}</el-descriptions-item>
      <el-descriptions-item label="计划结束时间">{{ formatRiskCell(detail.plan_end) }}</el-descriptions-item>
      <el-descriptions-item label="管控责任人">{{ riskPersonLabel(detail.control_person_id) }}</el-descriptions-item>
      <el-descriptions-item label="实施责任人">{{ riskPersonLabel(detail.implement_person_id) }}</el-descriptions-item>
      <el-descriptions-item label="监理审批人">{{ supervisorLabel }}</el-descriptions-item>
      <el-descriptions-item v-if="!fromLedger" label="审批状态">
        <el-tag size="small" :type="approvalStatusTagType(detail.approval_status)">
          {{ APPROVAL_STATUS_LABEL[detail.approval_status] || '--' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item v-if="!fromLedger" label="最近审批意见" :span="2">{{ formatRiskCell(detail.last_opinion) }}</el-descriptions-item>
      <el-descriptions-item label="激活状态">
        <el-tag size="small" :type="activationStatusTagType(detail)">{{ riskRunStatusLabel(detail) }}</el-tag>
      </el-descriptions-item>
    </el-descriptions>

    <!-- 审批过程仅在「风险点申报」入口展示；台账为只读业务台账，不展示审批流程与审批相关字段 -->
    <TodoApprovalFlowSection v-if="detail && !fromLedger" class="approval-flow" :approval-flow="approvalFlow" />
  </div>
</template>

<style scoped>
.approval-flow {
  margin-top: 16px;
}
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
