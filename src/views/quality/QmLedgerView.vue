<script setup>
/**
 * 实体验收台账（指挥部）— 按项目汇总验评数据，查看项目详情并跳转项目级
 */
import QmLedgerTable from './components/QmLedgerTable.vue'
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 实体验收台账</div>
      <h1 class="page-title">实体验收台账</h1>
      <p class="page-tip">按项目汇总实体验收指标；点击「查看项目详情」进入项目级</p>
    </div>
    <QmLedgerTable />
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 12px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
</style>
