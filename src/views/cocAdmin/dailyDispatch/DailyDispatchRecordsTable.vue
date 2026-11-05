<script setup>
import { ref } from 'vue'
import { View } from '@element-plus/icons-vue'
import BusinessPagedTable from '../../../components/common/BusinessPagedTable.vue'
import { summaryCell } from '../../../utils/dailyDispatchCheckRules.js'
import DailyLedgerResult from './DailyLedgerResult.vue'
defineProps({ data: { type: Array, default: () => [] }, columns: { type: Array, required: true }, loading: Boolean, error: { type: String, default: '' }, actions: Boolean, detailOnly: Boolean })
defineEmits(['open'])
const table = ref(null)
defineExpose({ getPagination: () => table.value?.getPagination(), restorePagination: value => table.value?.restorePagination(value) })
</script>
<template>
  <div class="daily-records-table" :class="{ 'is-daily-check': actions }">
    <el-empty v-if="error" description="数据加载失败，请点击刷新重试" />
    <BusinessPagedTable v-else ref="table" v-loading="loading" row-key="date" height="100%" :data="data" border stripe class="ap-table daily-ledger-list" empty-text="暂无符合条件的记录">
      <el-table-column v-for="column in columns" :key="column.key" :prop="column.key" :label="column.label" :min-width="column.width" :fixed="column.key === 'date' ? 'left' : false" :align="column.status || ['unified', 'safetyQuality', 'camera'].includes(column.key) ? 'center' : 'left'"><template #default="{ row }"><DailyLedgerResult v-if="column.status" :value="row[column.key]" /><span v-else class="daily-summary-value">{{ summaryCell(row, column.key) }}</span></template></el-table-column>
      <el-table-column v-if="actions || detailOnly" label="操作" fixed="right" :width="detailOnly ? 140 : 280"><template #default="{ row }"><div class="daily-list-actions"><div v-if="actions" class="daily-list-actions-primary"><el-button link type="primary" @click="$emit('open', row, 'unified')">统一调度检查填写</el-button><el-button link type="primary" @click="$emit('open', row, 'project')">项目部检查填写</el-button></div><el-button link type="primary" :icon="View" @click="$emit('open', row, 'detail')">查看详情</el-button></div></template></el-table-column>
    </BusinessPagedTable>
  </div>
</template>
<style scoped>
.daily-records-table { display: flex; flex: 1; min-height: 0; min-width: 0; }
.daily-records-table :deep(.business-paged-table) { flex: 1; min-height: 0; }
/* Keep the daily action column shadow-free; summary shadows follow native scrolling. */
.daily-records-table :deep(.daily-ledger-list) { flex: 1; min-height: 0; }
.daily-records-table.is-daily-check :deep(.daily-ledger-list .el-table-fixed-column--right.is-first-column::before) { box-shadow: none; }
.daily-summary-value { white-space: pre-line; overflow-wrap: anywhere; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.daily-list-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.daily-list-actions-primary { display: flex; align-items: center; flex-wrap: nowrap; gap: 12px; white-space: nowrap; }
.daily-list-actions .el-button { margin-left: 0; white-space: nowrap; }
</style>
