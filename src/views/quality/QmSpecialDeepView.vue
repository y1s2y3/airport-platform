<script setup>
/**
 * 专项验收 — 挂接目录树专项叶子（消防/人防等），不做验收计划；
 * 「专项验收」容器仅为分类，不可发起（对齐实体工程验收分类逻辑）
 */
import QmTaskList from './components/QmTaskList.vue'
</script>

<template>
  <QmTaskList
    :task-types="[6]"
    title="专项验收"
    breadcrumb="质量验评 / 专项验收"
    edit-path="/qm/inspect/special/edit"
    :node-types="[7]"
    special-mode
  />
</template>
