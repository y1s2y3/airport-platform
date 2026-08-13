<script setup>
/**
 * 实体工程验收 — 检验批至单位工程逐级验收。
 * 目录树中「实体工程验收」(node_type=9) 仅为分类文件夹，不可发起验收；
 * 业务上单位工程上一级视为项目层级，树中仍挂在该分类下便于展示。
 * D3：普通业务节点须下级全部通过后方可发起本级（检验批可直接发起）。
 */
import QmTaskList from './components/QmTaskList.vue'
</script>

<template>
  <QmTaskList
    :task-types="[1, 2, 3, 4, 5, 8]"
    title="实体工程验收"
    breadcrumb="质量验评 / 实体工程验收"
    edit-path="/qm/inspect/unit/edit"
    :node-types="[1, 2, 3, 4, 5, 6]"
    allow-all-nodes
    entity-mode
  />
</template>
