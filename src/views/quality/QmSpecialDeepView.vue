<script setup>
/**
 * 专项验收（深度集成）— 挂接验收计划、选择专项类型；不挂目录树
 */
import QmTaskList from './components/QmTaskList.vue'
</script>

<template>
  <QmTaskList
    :task-types="[6]"
    title="专项验收"
    breadcrumb="质量验评 / 实体验收（深度集成） / 专项验收"
    edit-path="/qm/inspect/special/edit"
    approve-path="/qm/inspect/special/approve"
    special-mode
  />
</template>
