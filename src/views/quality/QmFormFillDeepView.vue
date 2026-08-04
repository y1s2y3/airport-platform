<script setup>
/**
 * 实体工程验收 — 检验批至单位工程逐级验收（D3 下级全部通过方可发起本级）；
 * 含实体容器汇总任务（task_type 9，§5.2 至少一个下级完成即可发起）
 */
import QmTaskList from './components/QmTaskList.vue'
</script>

<template>
  <QmTaskList
    :task-types="[1, 2, 3, 4, 5, 8, 9]"
    title="实体工程验收"
    breadcrumb="质量验评 / 实体工程验收"
    edit-path="/qm/inspect/unit/edit"
    approve-path="/qm/inspect/unit/approve"
    :node-types="[1, 2, 3, 4, 5, 6]"
    allow-all-nodes
    entity-mode
  />
</template>
