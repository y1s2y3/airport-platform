<script setup>
import QmTaskList from './components/QmTaskList.vue'
</script>
<template>
  <QmTaskList
    :task-types="[5,8]"
    title="单位/子单位工程验收"
    breadcrumb="质量验评 / 单位工程验收"
    edit-path="/qm/inspect/unit/edit"
    approve-path="/qm/inspect/unit/approve"
    :node-types="[1,2]"
  />
</template>
