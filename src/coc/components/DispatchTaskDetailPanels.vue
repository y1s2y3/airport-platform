<script setup>
import { computed } from 'vue'
import {
  buildTaskFlow, taskExecutors, taskExecutionMode, taskReplyProgress,
  taskStatus, taskStatusTag, TASK_EXECUTION_MODES,
} from '../utils/dispatchTaskWorkflow.js'
import DispatchImageAttachments from './DispatchImageAttachments.vue'

const props = defineProps({
  record: { type: Object, required: true },
  handling: { type: Boolean, default: false },
  canReply: { type: Boolean, default: false },
})
const progress = computed(() => taskReplyProgress(props.record))
const mode = computed(() => taskExecutionMode(props.record))
const status = computed(() => taskStatus(props.record))
const flow = computed(() => buildTaskFlow(props.record))
const executorText = computed(() => taskExecutors(props.record).join('、') || '--')
const progressText = computed(() =>
  mode.value === TASK_EXECUTION_MODES.PARALLEL && progress.value.total > 1
    ? `（已回复 ${progress.value.repliedAssigned}/${progress.value.total}）`
    : '',
)
</script>

<template>
  <div class="dispatch-task-details">
    <section class="dispatch-task-section" aria-label="基本信息">
      <h3 class="dispatch-task-heading">{{ handling ? '任务信息' : '基本信息' }}</h3>
      <el-descriptions :column="2" border class="dispatch-task-description" label-width="112px">
        <el-descriptions-item label="编号">{{ record.id || '--' }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="taskStatusTag(status)" size="small">{{ status }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="项目名称">{{ record.project || '--' }}</el-descriptions-item>
        <el-descriptions-item label="工作类型">{{ record.workType || '--' }}</el-descriptions-item>
        <el-descriptions-item label="工作要求" :span="2"><span class="dispatch-task-text">{{ record.workRequirement || '--' }}</span></el-descriptions-item>
        <el-descriptions-item label="工作来源">{{ record.workSource || '--' }}</el-descriptions-item>
        <el-descriptions-item label="执行模式">{{ mode }}</el-descriptions-item>
        <el-descriptions-item label="执行人">
          <span class="dispatch-task-text">{{ executorText }}<span v-if="progressText" class="dispatch-task-muted">{{ progressText }}</span></span>
        </el-descriptions-item>
        <el-descriptions-item label="完成时限">{{ record.deadline || '--' }}</el-descriptions-item>
        <el-descriptions-item label="下发时间">{{ record.issueTime || '--' }}</el-descriptions-item>
        <el-descriptions-item label="登记人">{{ record.createdBy || record.issuer || '--' }}</el-descriptions-item>
        <el-descriptions-item label="备注"><span class="dispatch-task-text">{{ record.remark || '--' }}</span></el-descriptions-item>
        <el-descriptions-item v-if="record.receivedTime" label="历史签收时间" :span="2">{{ record.receivedTime }}</el-descriptions-item>
        <el-descriptions-item label="图片" :span="2">
          <DispatchImageAttachments v-if="record.attachments?.length" :model-value="record.attachments" readonly />
          <span v-else class="dispatch-task-muted">暂无图片</span>
        </el-descriptions-item>
      </el-descriptions>
    </section>

    <!-- 待办办理页：仅保留处理表单；处理记录统一在下方「处理流程」展示 -->
    <section v-if="handling && canReply" class="dispatch-task-section" aria-label="任务处理">
      <h3 class="dispatch-task-heading">任务处理</h3>
      <slot name="processing" />
    </section>

    <section class="dispatch-task-section" aria-label="处理流程">
      <h3 class="dispatch-task-heading">处理流程</h3>
      <el-timeline class="dispatch-task-flow">
        <el-timeline-item
          v-for="(step, index) in flow"
          :key="`${step.title}-${index}`"
          :type="step.status === 'done' ? 'primary' : step.status === 'void' ? 'info' : 'primary'"
          :hollow="['pending', 'current'].includes(step.status)"
          :timestamp="step.status === 'pending' || step.status === 'current' ? '待进行' : `${step.user} · ${step.time || '--'}`"
          placement="bottom"
          :class="{ 'dispatch-task-flow-last': index === flow.length - 1 }"
        >
          <div class="dispatch-task-flow-title">
            {{ step.title }}
            <el-tag v-if="step.replyResult" :type="step.replyResult === '已执行' ? 'success' : step.replyResult === '转派' ? 'warning' : 'info'" size="small">{{ step.replyResult }}</el-tag>
            <el-tag v-if="step.status === 'void'" type="info" size="small">终止</el-tag>
          </div>
          <div v-if="step.replyTransferTo" class="dispatch-task-flow-field">
            <span class="flow-field-label">转派给</span>
            <span class="dispatch-task-flow-remark flow-field-text">{{ step.replyTransferTo }}</span>
          </div>
          <div v-if="step.replyRemark" class="dispatch-task-flow-field">
            <span class="flow-field-label">{{ step.replyResult === '转派' ? '转派说明' : '处理说明' }}</span>
            <span class="dispatch-task-flow-remark flow-field-text">{{ step.replyRemark }}</span>
          </div>
          <div v-if="step.replyAttachments?.length" class="dispatch-task-flow-field">
            <span class="flow-field-label">图片</span>
            <DispatchImageAttachments :model-value="step.replyAttachments" readonly />
          </div>
          <div v-if="!step.replyResult" class="dispatch-task-flow-remark">{{ step.remark }}</div>
        </el-timeline-item>
      </el-timeline>
    </section>
  </div>
</template>

<style scoped>
.dispatch-task-details { display: flex; flex-direction: column; gap: 32px; }
.dispatch-task-section { min-width: 0; }
.dispatch-task-heading { margin: 0 0 16px; padding-left: 10px; border-left: 3px solid var(--ap-primary); font-size: 16px; font-weight: 600; line-height: 22px; color: var(--ap-text); }
.dispatch-task-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.65; }
.dispatch-task-description { width: 100%; }
.dispatch-task-description :deep(.el-descriptions__table) { table-layout: fixed; }
.dispatch-task-description :deep(.el-descriptions__cell) { overflow-wrap: anywhere; vertical-align: middle; }
.dispatch-task-description :deep(.el-descriptions__label) { color: var(--ap-text-secondary); background: #f5f7fa; }
.dispatch-task-muted { color: var(--ap-text-secondary); font-size: 13px; }
.dispatch-task-flow { margin: 0; padding: 4px 0 0 8px; }
.dispatch-task-flow-title { display: flex; align-items: center; gap: 10px; font-weight: 600; line-height: 22px; color: var(--ap-text); }
.dispatch-task-flow-remark { margin-top: 6px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; color: var(--ap-text-secondary); }
.dispatch-task-flow-field { display: flex; align-items: flex-start; gap: 10px; margin-top: 6px; min-width: 0; }
.flow-field-label { flex-shrink: 0; font-size: 13px; line-height: 1.6; color: var(--ap-text-secondary); }
.flow-field-text { margin-top: 0; color: var(--ap-text); }
.dispatch-task-flow :deep(.el-timeline-item__timestamp) { line-height: 1.5; overflow-wrap: anywhere; }
.dispatch-task-flow :deep(.el-timeline-item) { padding-bottom: 24px; }
.dispatch-task-flow :deep(.dispatch-task-flow-last) { padding-bottom: 0; }
@media (max-width: 640px) { .dispatch-task-details { gap: 24px; } .dispatch-task-description :deep(.el-descriptions__label) { width: 80px; } }
</style>
