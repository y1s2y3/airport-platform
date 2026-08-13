<script setup>
import QmTaskList from './components/QmTaskList.vue'
</script>
<template>
  <QmTaskList
    :task-types="[2,3,4]"
    title="分部分项验收"
    breadcrumb="质量验评 / 分部分项验收"
    edit-path="/qm/inspect/part/edit"
    :node-types="[5,4,3]"
  />
</template>
