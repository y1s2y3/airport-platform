<script setup>
/**
 * 实体验收（深度集成）— 列表仅展示到单位工程层级
 */
import QmTaskList from './components/QmTaskList.vue'
</script>

<template>
  <QmTaskList
    :task-types="[5]"
    title="实体验收"
    breadcrumb="质量验评 / 实体验收（深度集成） / 实体验收"
    edit-path="/qm/inspect/unit/edit"
    approve-path="/qm/inspect/unit/approve"
    :node-types="[1]"
    unit-level-only
  />
</template>
