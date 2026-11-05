<script setup>
import { ref } from 'vue'
import { Edit, Delete, View } from '@element-plus/icons-vue'
import BusinessPagedTable from '../../../components/common/BusinessPagedTable.vue'
import DailyCheckContent from './DailyCheckContent.vue'
import DailyCheckImages from './DailyCheckImages.vue'
import { CHECK_FIELDS, FIELD_LABELS, PART_LABELS, personImages } from '../../../utils/dailyDispatchCheckRules.js'
defineProps({ rows: { type: Array, default: () => [] }, people: { type: Object, default: () => ({}) }, editing: Boolean, disabled: Boolean, projectOnly: Boolean })
defineEmits(['open', 'remove', 'unified'])
const table = ref(null)
defineExpose({ getPagination: () => table.value?.getPagination(), restorePagination: value => table.value?.restorePagination(value) })
</script>
<template>
  <BusinessPagedTable ref="table" :data="rows" row-key="projectId" border class="ap-table daily-inspection-table" @row-click="$emit('open', $event)">
    <el-table-column label="项目名称" min-width="225" fixed="left"><template #default="{ row }"><div class="daily-row-name" :title="row.projectName">{{ row.projectName }}</div></template></el-table-column>
    <el-table-column v-if="!projectOnly" label="当日统一调度" width="112" align="center"><template #default="{ row }"><span @click.stop><el-checkbox v-if="editing" :model-value="row.unified" :aria-label="row.projectName + '当日统一调度'" :disabled="disabled" @update:model-value="$emit('unified', row, $event)" /><span v-else>{{ row.unified ? '是' : '否' }}</span></span></template></el-table-column>
    <el-table-column v-if="!projectOnly" label="人员履职" min-width="130"><template #default="{ row }"><DailyCheckContent :value="row.personnel" personnel compact /></template></el-table-column>
    <el-table-column v-for="key in (projectOnly ? [] : CHECK_FIELDS)" :key="key" :label="FIELD_LABELS[key]" min-width="200"><template #default="{ row }"><DailyCheckContent :value="row[key]" compact /></template></el-table-column>
    <el-table-column v-if="!projectOnly" label="备注" min-width="180"><template #default="{ row }"><p class="daily-table-preview" :class="{ 'is-empty': !row.remark?.text }">{{ row.remark?.text || '--' }}</p><DailyCheckImages v-if="row.remark?.images?.length" :model-value="row.remark.images" :preview-limit="2" readonly compact /></template></el-table-column>
    <el-table-column v-for="(label, part) in PART_LABELS" :key="part" :label="label" align="center">
      <el-table-column label="姓名" min-width="110"><template #default="{ row }">{{ people[row.projectId]?.[part]?.name || '--' }}</template></el-table-column>
      <el-table-column label="项目检查情况" min-width="220"><template #default="{ row }"><DailyCheckContent :value="people[row.projectId]?.[part]" person compact :show-images="false" /></template></el-table-column>
      <el-table-column label="检查情况截图" min-width="120" align="center"><template #default="{ row }"><DailyCheckImages v-if="personImages(people[row.projectId]?.[part]).length" :model-value="personImages(people[row.projectId]?.[part])" :preview-limit="2" readonly compact /><span v-else class="daily-table-empty">--</span></template></el-table-column>
    </el-table-column>
    <el-table-column label="操作" width="110" fixed="right" align="center"><template #default="{ row }"><div class="daily-row-actions"><el-button link type="primary" :icon="editing || projectOnly ? Edit : View" :aria-label="projectOnly ? '填写项目部检查' : editing ? '填写检查' : '查看详情'" :disabled="disabled" @click.stop="$emit('open', row)">{{ editing || projectOnly ? '填写' : '查看详情' }}</el-button><el-button v-if="editing && !projectOnly" link type="danger" :icon="Delete" :disabled="disabled" @click.stop="$emit('remove', row)">删除项目</el-button></div></template></el-table-column>
  </BusinessPagedTable>
</template>
<style scoped>
.daily-inspection-table { cursor: pointer; }
.daily-row-name { line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.daily-table-preview { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; margin: 0; text-align: left; color: var(--ap-text); }
.daily-table-preview.is-empty, .daily-table-empty { color: var(--ap-text-muted); }
.daily-image-count { display: inline-block; color: var(--ap-primary); font-size: 14px; font-weight: 400; line-height: 1.6; white-space: nowrap; }
.daily-image-count.is-after-content { margin-top: 4px; }
.daily-inspection-table :deep(.el-table__body td.el-table__cell) { vertical-align: middle; }
.daily-row-actions { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.daily-row-actions .el-button + .el-button { margin-left: 0; }
.daily-inspection-table :deep(.el-table-fixed-column--left), .daily-inspection-table :deep(.el-table-fixed-column--right) { background: var(--ap-bg-surface, #fff); }
.daily-inspection-table :deep(th.el-table-fixed-column--left), .daily-inspection-table :deep(th.el-table-fixed-column--right) { background: var(--el-table-header-bg-color); }
</style>
