<script setup>
import { Search, Setting } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { INSPECTION_CATEGORIES } from '../../config/inspectionManagement'
import { INSPECTION_FLOW_NODES } from '../../utils/inspectionRectificationWorkflow'
import { HAZARD_FILTER_FIELDS, personShort } from '../../composables/useInspectionHazardLedger'

const props = defineProps({
  ledger: { type: Object, required: true },
  activeOnly: Boolean,
  inScreen: Boolean,
})
/** 大屏明细没有单号列，提示只写可见字段，避免引导用户按单号搜索。 */
const keywordPlaceholder = computed(() => (props.inScreen
  ? '搜索隐患说明、类别、等级...'
  : '搜索整改单编号/巡检任务单编号...'))
const {
  filterForm, nodeFilter, hazardCategoryOptions, hazardLevelOptions, inspectors, rectifiers, reviewers,
  handleReset, hazardFilterVisible, isHazardFilterVisible, applyHazardFilterVisibility,
} = props.ledger
</script>

<template>
  <div class="filter-bar" :class="{ 'filter-bar--coc': inScreen }">
    <el-input v-if="isHazardFilterVisible('keyword')" v-model="filterForm.keyword" :placeholder="keywordPlaceholder" clearable style="width:280px" :prefix-icon="Search" />
    <el-select v-if="isHazardFilterVisible('category')" v-model="filterForm.category" placeholder="巡检分类" clearable style="width:100px">
      <el-option v-for="category in INSPECTION_CATEGORIES" :key="category" :label="category" :value="category" />
    </el-select>
    <el-select v-if="isHazardFilterVisible('hazardCategory')" v-model="filterForm.hazardCategory" placeholder="隐患类别" clearable filterable style="width:150px">
      <el-option v-for="option in hazardCategoryOptions" :key="`${option.category}-${option.value}`" :label="option.label" :value="option.value" />
    </el-select>
    <el-select v-model="nodeFilter" placeholder="当前流程节点" clearable filterable style="width:160px" aria-label="当前流程节点">
      <el-option v-for="node in INSPECTION_FLOW_NODES" :key="node" :label="node" :value="node" />
    </el-select>
    <el-select v-if="isHazardFilterVisible('status')" v-model="filterForm.status" placeholder="整改状态" clearable style="width:110px">
      <el-option label="待整改" value="待整改" /><el-option v-if="!activeOnly" label="已作废" value="已作废" /><el-option label="待验收" value="待验收" /><el-option label="待复查" value="待复查" /><el-option label="已关闭" value="已关闭" />
    </el-select>
    <el-select v-if="isHazardFilterVisible('hazardLevel')" v-model="filterForm.hazardLevel" placeholder="隐患等级" clearable style="width:200px">
      <el-option v-for="level in hazardLevelOptions" :key="level" :label="level" :value="level" />
    </el-select>
    <el-select v-if="isHazardFilterVisible('overdue')" v-model="filterForm.overdue" placeholder="是否逾期" clearable style="width:100px">
      <el-option label="是" value="是" /><el-option label="否" value="否" />
    </el-select>
    <el-select v-if="isHazardFilterVisible('inspectors')"
      v-model="filterForm.inspectors"
      aria-label="登记人"
      placeholder="登记人"
      multiple
      collapse-tags
      collapse-tags-tooltip
      clearable
      filterable
      style="width:170px"
    >
      <el-option v-for="inspector in inspectors" :key="inspector" :label="inspector" :value="inspector" />
    </el-select>
    <el-select v-if="isHazardFilterVisible('rectifiers')"
      v-model="filterForm.rectifiers"
      aria-label="整改人"
      placeholder="整改人"
      multiple
      collapse-tags
      collapse-tags-tooltip
      clearable
      filterable
      style="width:170px"
    >
      <el-option v-for="name in rectifiers" :key="name" :label="personShort(name)" :value="name" />
    </el-select>
    <el-select v-if="isHazardFilterVisible('reviewers')"
      v-model="filterForm.reviewers"
      aria-label="复查人"
      placeholder="复查人"
      multiple
      collapse-tags
      collapse-tags-tooltip
      clearable
      filterable
      style="width:170px"
    >
      <el-option v-for="name in reviewers" :key="name" :label="personShort(name)" :value="name" />
    </el-select>
    <el-date-picker v-if="isHazardFilterVisible('issueRange')"
      v-model="filterForm.issueRange"
      type="daterange"
      value-format="YYYY-MM-DD"
      range-separator="至"
      start-placeholder="整改单下发开始日期"
      end-placeholder="整改单下发结束日期"
      unlink-panels
      style="width:340px"
    />
    <el-button @click="handleReset">重置</el-button>
    <el-popover placement="bottom-end" :width="230" trigger="click">
      <template #reference>
        <el-button :icon="Setting" circle title="设置筛选条件" aria-label="设置筛选条件" />
      </template>
      <div class="filter-setting">
        <div class="filter-setting-title">隐患清单筛选设置</div>
        <el-checkbox v-for="field in HAZARD_FILTER_FIELDS" :key="field.key" v-model="hazardFilterVisible[field.key]" @change="applyHazardFilterVisibility">{{ field.label }}</el-checkbox>
      </div>
    </el-popover>
  </div>
</template>

<style scoped>
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.filter-bar--coc { gap:8px; margin-bottom:12px; }
.filter-setting { display:flex; flex-direction:column; gap:6px; }
.filter-setting-title { margin-bottom:4px; font-size:13px; font-weight:600; color:#1f2329; }
.filter-setting :deep(.el-checkbox) { margin-right:0; }
@media (max-width: 450px) {
  .filter-bar--coc :deep(.el-date-editor) { max-width:100%; }
}
</style>
