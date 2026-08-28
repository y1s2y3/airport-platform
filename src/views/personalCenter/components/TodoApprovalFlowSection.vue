<script setup>
import '../styles/todoHandleBlocks.css'

defineProps({
  approvalFlow: { type: Array, default: () => [] },
  isInspection: { type: Boolean, default: false },
})

function flowType(status) {
  if (status === 'done') return 'success'
  if (status === 'current') return 'primary'
  return 'info'
}
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">{{ isInspection ? '流程记录' : '审批过程' }}</div>
    </div>
    <el-timeline class="flow-timeline">
      <el-timeline-item
        v-for="(step, index) in approvalFlow"
        :key="`${step.title}-${index}`"
        :type="flowType(step.status)"
        :hollow="step.status === 'pending'"
        :timestamp="step.time || '待进行'"
        placement="top"
      >
        <div class="flow-card" :class="step.status">
          <div class="flow-title">
            {{ step.title }}
            <el-tag v-if="step.status === 'current'" size="small" type="warning">当前</el-tag>
          </div>
          <div class="flow-meta">处理人：{{ step.user || '—' }}</div>
          <div v-if="step.remark" class="flow-remark">{{ step.remark }}</div>
        </div>
      </el-timeline-item>
    </el-timeline>
  </section>
</template>
