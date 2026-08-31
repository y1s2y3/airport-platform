<script setup>
import { computed } from 'vue'
import { SUBCONTRACTOR_APPROVAL_NODES } from '../../mock/subcontractorManagement'

const props = defineProps({
  /** 报审单 approvalFlow */
  approvalFlow: {
    type: Array,
    default: () => [],
  },
  /** 个人中心区块模式（沿用 todo block 样式） */
  panel: {
    type: Boolean,
    default: false,
  },
})

const ACTION_LABEL = {
  submit: '提交',
  agree: '同意',
  reject: '驳回',
}

function isRejectRemark(remark) {
  return /驳回/.test(String(remark || ''))
}

function findStep(nodeKey) {
  return (props.approvalFlow || []).find((s) => s.nodeKey === nodeKey)
}

function nodeStepMeta(step) {
  if (!step) return { status: 'wait', desc: '等待' }
  if (step.status === 'done' && isRejectRemark(step.remark)) {
    return { status: 'error', desc: step.time || '已驳回' }
  }
  if (step.status === 'done') {
    return { status: 'success', desc: step.time || '已同意' }
  }
  if (step.status === 'current') {
    return { status: 'process', desc: '审批中' }
  }
  return { status: 'wait', desc: '等待' }
}

/** 顶部步骤条：提交 + 四审批节点（不含抄送，对齐品牌报审） */
const processSteps = computed(() => {
  const submit = findStep('submit')
  const steps = [
    {
      title: '施工单位提交',
      status: submit?.status === 'done' ? 'success' : submit?.status === 'current' ? 'process' : 'wait',
      desc: submit?.time || (submit?.status === 'done' ? '已提交' : '等待'),
    },
  ]
  for (const node of SUBCONTRACTOR_APPROVAL_NODES) {
    const step = findStep(node.key)
    steps.push({
      title: node.title,
      ...nodeStepMeta(step),
    })
  }
  return steps
})

function resolveAction(step) {
  if (step.nodeKey === 'submit') {
    return { action: 'submit', actionLabel: ACTION_LABEL.submit }
  }
  if (step.status === 'current') {
    return { action: '', actionLabel: '待办理' }
  }
  if (step.status === 'done' && isRejectRemark(step.remark)) {
    return { action: 'reject', actionLabel: ACTION_LABEL.reject }
  }
  if (step.status === 'done') {
    return { action: 'agree', actionLabel: ACTION_LABEL.agree }
  }
  return { action: '', actionLabel: '' }
}

/** 时间线：仅已完成 + 当前节点（不展示后续等待节点，对齐品牌报审） */
const approvalTimeline = computed(() => {
  return (props.approvalFlow || [])
    .filter((step) => step.status === 'done' || step.status === 'current')
    .map((step, index) => {
      const { action, actionLabel } = resolveAction(step)
      let cardStatus = step.status
      if (step.status === 'done' && isRejectRemark(step.remark)) cardStatus = 'rejected'
      return {
        key: `${step.nodeKey || step.title}-${index}`,
        title: step.title,
        action,
        actionLabel,
        operator: step.user || '—',
        time: step.time || (step.status === 'current' ? '' : '—'),
        remark: step.remark || '',
        status: cardStatus,
        isCc: Boolean(step.isCc),
      }
    })
})

function timelineType(status) {
  if (status === 'done') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'current') return 'warning'
  return 'info'
}

function actionTagType(action) {
  if (action === 'agree' || action === 'submit') return 'success'
  if (action === 'reject') return 'danger'
  return 'warning'
}
</script>

<template>
  <section :class="panel ? 'block block--panel' : 'info-section'">
    <div v-if="panel" class="block-head">
      <div class="block-title">审批流程</div>
    </div>
    <div v-else class="section-title">审批流程</div>

    <el-steps class="process-steps" align-center>
      <el-step
        v-for="s in processSteps"
        :key="s.title"
        :title="s.title"
        :description="s.desc"
        :status="s.status"
      />
    </el-steps>

    <el-timeline v-if="approvalTimeline.length" class="approval-timeline">
      <el-timeline-item
        v-for="step in approvalTimeline"
        :key="step.key"
        :type="timelineType(step.status)"
        :hollow="step.status === 'current'"
        :timestamp="step.time || '进行中'"
        placement="top"
      >
        <div class="flow-card" :class="step.status">
          <div class="flow-title">
            <span>{{ step.title }}</span>
            <el-tag v-if="step.status === 'current'" size="small" type="warning">当前</el-tag>
            <el-tag
              v-else-if="step.actionLabel"
              size="small"
              :type="actionTagType(step.action)"
              effect="light"
            >
              {{ step.actionLabel }}
            </el-tag>
            <el-tag v-if="step.isCc" size="small" type="info" effect="plain">抄送</el-tag>
          </div>
          <div class="flow-meta">处理人：{{ step.operator }}</div>
          <div v-if="step.remark" class="flow-remark">意见：{{ step.remark }}</div>
        </div>
      </el-timeline-item>
    </el-timeline>
    <el-empty v-else description="暂无审批记录" :image-size="60" />
  </section>
</template>

<style scoped>
.section-title {
  margin: 0 0 14px;
  padding-left: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  border-left: 3px solid var(--ap-primary);
}

.process-steps {
  margin: 4px 0 20px;
}

.approval-timeline {
  padding: 4px 8px 0;
}

.flow-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
}

.flow-card.done {
  border-color: #e1f3d8;
  background: #f0f9eb;
}

.flow-card.rejected {
  border-color: #fde2e2;
  background: #fef0f0;
}

.flow-card.current {
  border-color: #f5dab1;
  background: #fdf6ec;
}

.flow-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.flow-meta,
.flow-remark {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}

.info-section {
  margin-bottom: 20px;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px 20px;
}
</style>
