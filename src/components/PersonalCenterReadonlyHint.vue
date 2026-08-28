<script setup>
/** 业务模块详情页：审批/处置仅个人中心待办可办时的统一提示条 */
defineProps({
  title: {
    type: String,
    default: '本页为只读查看；审批与处置请在「个人中心 → 我的待办」中处理。',
  },
})
</script>

<template>
  <el-alert type="info" :closable="false" show-icon class="pc-readonly-hint" :title="title" />
</template>

<style scoped>
.pc-readonly-hint {
  margin-bottom: 12px;
}
</style>
