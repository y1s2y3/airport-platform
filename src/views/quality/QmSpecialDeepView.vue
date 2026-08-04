<script setup>
/**
 * 专项验收 — 挂接目录树专项节点（消防/人防等），不做验收计划；
 * 含专项容器汇总任务（task_type 10，§5.2）
 */
import QmTaskList from './components/QmTaskList.vue'
</script>

<template>
  <QmTaskList
    :task-types="[6, 10]"
    title="专项验收"
    breadcrumb="质量验评 / 专项验收"
    edit-path="/qm/inspect/special/edit"
    approve-path="/qm/inspect/special/approve"
    :node-types="[7]"
    special-mode
  />
</template>
