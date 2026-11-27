<script setup>
import InspectionVoidStamp from '../InspectionVoidStamp.vue'
import { normalizeInspectionCategories } from '../../config/inspectionManagement'
import { isInspectionVoidPending } from '../../utils/inspectionRectificationWorkflow'
import { isOverdue, personShort } from '../../composables/useInspectionHazardLedger'

const props = defineProps({
  rows: { type: Array, required: true },
  inScreen: Boolean,
})
const emit = defineEmits(['view'])
function onRowClick(row) {
  if (props.inScreen) emit('view', row)
}
</script>

<template>
  <el-table :data="rows" stripe border row-key="id" class="hazard-table" :class="{ 'hazard-table--coc': inScreen }"
    :max-height="inScreen ? 'min(60vh, 640px)' : undefined" @row-click="onRowClick">
    <el-table-column type="index" label="序号" width="52" align="center" />
    <!-- COC 大屏明细按用户裁决不展示单号，后台隐患清单仍保留，便于按单号查找与导出。 -->
    <el-table-column v-if="!inScreen" prop="rectifyNo" label="整改单编号" width="118">
      <template #default="{ row }">{{ row.rectifyNo || '—' }}</template>
    </el-table-column>
    <el-table-column v-if="!inScreen" prop="taskNo" label="巡检任务单编号" width="135">
      <template #default="{ row }">{{ row.taskNo || '—' }}</template>
    </el-table-column>
    <el-table-column prop="inspectionCategory" label="巡检分类" width="84" align="center">
      <template #default="{ row }">
        <el-tag
          v-for="category in normalizeInspectionCategories(row.inspectionCategories || row.inspectionCategory)"
          :key="category"
          size="small"
          :type="category === '质量' ? 'warning' : 'success'"
          style="margin:1px 2px"
        >{{ category }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="登记人" width="88" show-overflow-tooltip>
      <template #default="{ row }"><span :title="row.inspector || '--'">{{ personShort(row.inspector) }}</span></template>
    </el-table-column>
    <el-table-column prop="hazardCategory" label="隐患类别" width="90" show-overflow-tooltip>
      <template #default="{ row }">{{ row.hazardCategory || '—' }}</template>
    </el-table-column>
    <el-table-column label="隐患等级" width="96" show-overflow-tooltip>
      <template #default="{ row }">{{ row.hazardLevel || '未设置' }}</template>
    </el-table-column>
    <el-table-column prop="currentNode" label="当前节点" width="122" show-overflow-tooltip />
    <el-table-column label="整改人" width="80" align="center">
      <template #default="{ row }"><span :title="row.rectifier || '--'" class="person-cell">{{ personShort(row.rectifier) }}</span></template>
    </el-table-column>
    <el-table-column label="复查人" width="80" align="center">
      <template #default="{ row }"><span :title="row.reviewer || '--'" class="person-cell">{{ personShort(row.reviewer) }}</span></template>
    </el-table-column>
    <el-table-column label="整改单下发日期" width="110" align="center">
      <template #default="{ row }">{{ row.issueDate || '--' }}</template>
    </el-table-column>
    <el-table-column label="整改日期" width="104" align="center">
      <template #default="{ row }">
        <span v-if="row.rectDate">{{ row.rectDate }}</span>
        <span v-else style="color:#999">-</span>
      </template>
    </el-table-column>
    <el-table-column label="复查日期" width="104" align="center">
      <template #default="{ row }">
        <span v-if="row.reviewDate">{{ row.reviewDate }}</span>
        <span v-else style="color:#999">-</span>
      </template>
    </el-table-column>
    <el-table-column label="整改截止日期" width="104" align="center">
      <template #default="{ row }">
        <span v-if="row.deadline">{{ row.deadline }}</span>
        <span v-else style="color:#999">-</span>
      </template>
    </el-table-column>
    <el-table-column label="是否逾期" width="78" align="center">
      <template #default="{ row }">
        <span v-if="isOverdue(row)" style="color:#e53935;font-weight:600">是</span>
        <span v-else style="color:#999">{{ isOverdue(row) === false ? '否' : '--' }}</span>
      </template>
    </el-table-column>
    <el-table-column prop="status" label="状态" width="104" align="center">
      <template #default="{ row }">
        <span class="inspection-status">{{ row.status }} <InspectionVoidStamp v-if="isInspectionVoidPending(row)" /></span>
      </template>
    </el-table-column>
    <el-table-column label="操作" min-width="110" align="center">
      <template #default="{ row }">
        <el-button link type="primary" size="small" @click.stop="emit('view', row)">查看</el-button>
        <slot name="actions" :row="row" />
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.hazard-table { width:100%; font-size:13px; }
.hazard-table :deep(.el-table__cell .cell) { word-break:keep-all; }
.hazard-table :deep(.el-table__cell) { vertical-align:middle; }
.person-cell { display:inline-block; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.inspection-status { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
.hazard-table--coc {
  --el-table-bg-color:#162438;
  --el-table-tr-bg-color:#162438;
  --el-table-header-bg-color:#101d31;
  --el-table-text-color:#e1eaf5;
  --el-table-header-text-color:#c3d3e7;
  --el-table-border-color:#34475f;
  --el-table-row-hover-bg-color:#253750;
  --el-fill-color-lighter:#1c2d44;
  --el-color-primary:#54bfff;
}
.hazard-table--coc :deep(.el-table__row) { cursor:pointer; }
</style>
