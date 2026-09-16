<script setup>
import { computed, inject } from 'vue'
import { HQ_SELECTION_ID } from '../../../mock/data.js'
import { buildQmDashboardPanels } from '../../../../mock/qm.js'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'

const dispatchHqUi = inject('dispatchHqUi', false)

const props = defineProps({
  selectionId: { type: String, default: HQ_SELECTION_ID },
})

const isHq = computed(() => props.selectionId === HQ_SELECTION_ID)

const panelTitle = computed(() => (isHq.value ? '质量验评统计' : '质量验评统计'))

const stats = computed(() => {
  const projectId = isHq.value ? '' : props.selectionId
  const panels = buildQmDashboardPanels(projectId)
  const physical = panels.physical || {}
  const special = panels.special || {}
  const complete = panels.complete || {}

  // 展示指标：实体+专项合计，不单独展示竣工分项
  const nodeTotal = (physical.node_total || 0) + (special.node_total || 0)
  const nodeCompleted = (physical.node_completed || 0) + (special.node_completed || 0)
  const taskTotal = (physical.task_total || 0) + (special.task_total || 0)
  const approved = (physical.approved_count || 0) + (special.approved_count || 0)

  // 一次性通过率：分子分母均含竣工
  const onePass =
    (physical.one_pass_count ?? physical.onePassCount ?? 0) +
    (special.one_pass_count ?? special.onePassCount ?? 0) +
    (complete.one_pass_count ?? complete.onePassCount ?? 0)
  const rateDenom =
    (physical.task_total || 0) + (special.task_total || 0) + (complete.task_total || 0)

  return {
    nodeTotal,
    nodeCompleted,
    nodeCompleteRate: nodeTotal ? Math.round((nodeCompleted / nodeTotal) * 100) : 0,
    taskTotal,
    approvedCount: approved,
    passRate: rateDenom ? Math.round((onePass / rateDenom) * 100) : null,
  }
})

const kpis = computed(() => [
  { label: '节点总数', value: stats.value.nodeTotal, unit: '个' },
  { label: '已完成数量', value: stats.value.nodeCompleted, unit: '个' },
  { label: '完成率', value: `${stats.value.nodeCompleteRate}%`, unit: '' },
  { label: '验收单总数', value: stats.value.taskTotal, unit: '单' },
  { label: '已通过数量', value: stats.value.approvedCount, unit: '单' },
  {
    label: '一次性通过率',
    value: stats.value.passRate == null ? '—' : `${stats.value.passRate}%`,
    unit: '',
    tip: '计算含实体+专项+竣工；已通过中「重新申报来源」为空 ÷ 验收单总数；其余展示指标为实体+专项合计，不单独展示竣工；分母为 0 时为 —',
  },
])
</script>

<template>
  <div class="panel-card quality-stats-panel" :class="{ 'dispatch-hq-list-panel': dispatchHqUi }">
    <DispatchHqPanelTitle v-if="dispatchHqUi" :title="panelTitle" show-v2-tag />
    <div v-else class="panel-title compact quality-title-row title-left">
      <span class="quality-title-text">{{ panelTitle }}</span>
      <span class="panel-v2-tip">V2版本上线</span>
    </div>
    <div class="panel-body panel-inner">
      <div class="kpi-blocks">
        <div v-for="item in kpis" :key="item.label" class="kpi-block">
          <div class="kpi-val">
            {{ item.value }}
            <span v-if="item.unit" class="kpi-unit">{{ item.unit }}</span>
          </div>
          <div class="kpi-lbl">
            {{ item.label }}
            <el-tooltip v-if="item.tip" :content="item.tip" placement="top" :show-after="200">
              <span class="kpi-tip" aria-label="口径说明">?</span>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './dispatch-lower.css';

.quality-stats-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.quality-stats-panel .panel-title {
  border-left: 4px solid #409eff;
}

.dispatch-hq-list-panel .panel-title {
  border-left: none;
}

.quality-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quality-title-text {
  flex-shrink: 0;
}

.panel-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 12px !important;
}

.kpi-blocks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  flex: 1;
  align-content: start;
}

.kpi-block {
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
  background: #faf8f6;
}

.kpi-val {
  font-size: calc(18px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
  line-height: 1.2;
}

.kpi-unit {
  margin-left: 2px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 500;
  color: var(--coc-text-muted);
}

.kpi-lbl {
  margin-top: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.kpi-tip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: 10px;
  line-height: 1;
  opacity: 0.75;
  cursor: help;
}
</style>
