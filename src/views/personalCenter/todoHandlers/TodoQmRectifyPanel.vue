<script setup>
/**
 * 质量验评「整改单」已下线：旧入口保留登记，避免历史待办白屏。
 * 现行验评请走深填报 / 审批流（驳回后重新申报），不再使用独立整改单。
 */
defineProps({
  todo: { type: Object, required: true },
  isReadonly: { type: Boolean, default: false },
  onBack: { type: Function, default: null },
})
</script>

<template>
  <div class="qm-rectify-offline">
    <el-empty description="质量验评整改单已下线">
      <template #description>
        <p class="title">质量验评整改单已下线</p>
        <p class="desc">
          独立整改 / 复验单据已废止。请在质量验评深填报流程中办理；已驳回任务请重新申报。
        </p>
        <p v-if="todo?.processName" class="meta">原待办：{{ todo.processName }}</p>
      </template>
      <el-button v-if="onBack" type="primary" @click="onBack()">返回</el-button>
    </el-empty>
  </div>
</template>

<style scoped>
.qm-rectify-offline {
  padding: 48px 24px;
  background: #fff;
  border-radius: 8px;
}
.title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}
.desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #646a73;
  max-width: 420px;
}
.meta {
  margin: 12px 0 0;
  font-size: 12px;
  color: #8f959e;
}
</style>
