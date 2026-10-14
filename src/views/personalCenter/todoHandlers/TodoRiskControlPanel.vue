<script setup>
import { computed } from 'vue'
import {
  activationStatusTagType,
  approvalStatusLabel,
  formatMatSupervisorApproverLabel,
  formatRiskCell,
  formatRiskFrequency,
  formatRiskReportTime,
  getRiskPointControl,
  riskApprovalFlow,
  riskCopyFromLabel,
  riskLocationLabel,
  riskPersonLabel,
  riskRunStatusLabel,
  riskTypeName,
  severityTagType,
} from '../../../mock/riskManage.js'
import TodoApprovalFlowSection from '../components/TodoApprovalFlowSection.vue'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
})

const row = computed(() => {
  const id = props.todo?.riskControlId || props.todo?.detail?.controlId
  return id ? getRiskPointControl(id) : null
})

const supervisorLabel = computed(() => {
  const current = row.value
  if (!current) return '--'
  return formatMatSupervisorApproverLabel({
    name: current.supervisor_approver_name,
    org: current.supervisor_approver_org,
    post_label: current.supervisor_approver_post_label,
  })
})

/** 审批过程（与详情页同一取数：仅监理一级审批，固定 2 步） */
const approvalFlow = computed(() => riskApprovalFlow(row.value))
</script>

<template>
  <div>
    <el-empty v-if="!row" description="未找到关联风险辨识" :image-size="64" />
    <template v-else>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="填报时间">{{ formatRiskReportTime(row.report_time) }}</el-descriptions-item>
        <el-descriptions-item label="风险源编号">{{ formatRiskCell(row.risk_source_no) }}</el-descriptions-item>
        <el-descriptions-item v-if="row.copy_from_source_no" label="重新申报来源" :span="2">
          {{ riskCopyFromLabel(row) }}
        </el-descriptions-item>
        <el-descriptions-item label="风险类型">{{ riskTypeName(row) }}</el-descriptions-item>
        <el-descriptions-item label="风险点">{{ formatRiskCell(row.risk_point) }}</el-descriptions-item>
        <el-descriptions-item label="风险细分">{{ formatRiskCell(row.risk_segment) }}</el-descriptions-item>
        <el-descriptions-item label="发生频率">{{ formatRiskFrequency(row) }}</el-descriptions-item>
        <el-descriptions-item label="严重程度">
          <el-tag size="small" :type="severityTagType(row.severity)">{{ formatRiskCell(row.severity) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="受影响区域" :span="2">{{ riskLocationLabel(row) }}</el-descriptions-item>
        <el-descriptions-item label="风险因素" :span="2">{{ formatRiskCell(row.risk_factor) }}</el-descriptions-item>
        <el-descriptions-item label="危害后果" :span="2">{{ formatRiskCell(row.hazard_consequence) }}</el-descriptions-item>
        <el-descriptions-item label="风险描述" :span="2">{{ formatRiskCell(row.risk_desc) }}</el-descriptions-item>
        <el-descriptions-item label="管控措施" :span="2">{{ formatRiskCell(row.control_measure) }}</el-descriptions-item>
        <el-descriptions-item label="计划开始时间">{{ formatRiskCell(row.plan_start) }}</el-descriptions-item>
        <el-descriptions-item label="计划结束时间">{{ formatRiskCell(row.plan_end) }}</el-descriptions-item>
        <el-descriptions-item label="管控责任人">{{ riskPersonLabel(row.control_person_id) }}</el-descriptions-item>
        <el-descriptions-item label="实施责任人">{{ riskPersonLabel(row.implement_person_id) }}</el-descriptions-item>
        <el-descriptions-item label="监理审批人">{{ supervisorLabel }}</el-descriptions-item>
        <el-descriptions-item label="审批状态">{{ approvalStatusLabel(row.approval_status) }}</el-descriptions-item>
        <el-descriptions-item label="最近审批意见" :span="2">{{ formatRiskCell(row.last_opinion) }}</el-descriptions-item>
        <el-descriptions-item label="激活状态">
          <el-tag size="small" :type="activationStatusTagType(row)">{{ riskRunStatusLabel(row) }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <TodoApprovalFlowSection class="approval-flow" :approval-flow="approvalFlow" />
    </template>
  </div>
</template>

<style scoped>
.approval-flow {
  margin-top: 16px;
}
</style>
