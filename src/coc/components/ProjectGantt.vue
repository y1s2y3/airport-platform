<script setup>
import { computed } from 'vue'
import {
  barPos,
  buildProjectControlPlanGanttRows,
  getControlPlanGanttTimeRange,
  getGanttStatusLabel,
  levelIndent,
  statusClass,
  tickPosition,
} from '../mock/controlPlanGantt.js'
import {
  enrichControlPlan,
  getControlPlanStats,
  getControlPlansForProject,
} from '../mock/controlPlans.js'

const props = defineProps({
  project: { type: Object, required: true },
  expanded: { type: Boolean, default: false },
})

const plans = computed(() => getControlPlansForProject(props.project.id).map(enrichControlPlan))

const ganttRows = computed(() => buildProjectControlPlanGanttRows(plans.value))

const timeRange = computed(() =>
  getControlPlanGanttTimeRange(ganttRows.value, { maxTicks: props.expanded ? 9 : 7 }),
)

const statusStats = computed(() => getControlPlanStats(plans.value))

const statusSummary = computed(() => [
  { key: 'total', label: '节点总数', count: statusStats.value.total },
  { key: 'pending', label: '未开始', count: statusStats.value.pending },
  { key: 'active', label: '进行中', count: statusStats.value.active },
  { key: 'done', label: '已完成', count: statusStats.value.done },
  { key: 'lag', label: '滞后', count: statusStats.value.lag },
])

function summaryChipClass(kind) {
  if (kind === 'total') return 'status-total'
  return statusClass(kind)
}

function taskBarStyle(row) {
  return barPos(row.planStart, row.planEnd, timeRange.value)
}

function barTitle(row) {
  const status = getGanttStatusLabel(row.status)
  const range = row.planStart && row.planEnd ? `${row.planStart} ~ ${row.planEnd}` : ''
  const extra = row.progress != null ? ` · ${row.progress}%` : ''
  return [status, range, extra].filter(Boolean).join(' · ')
}

function axisTickStyle(tick, index, total) {
  const left = tickPosition(tick.time, timeRange.value)
  let transform = 'translateX(-50%)'
  if (index === 0) transform = 'translateX(0)'
  if (index === total - 1) transform = 'translateX(-100%)'
  return { left: `${left}%`, transform }
}

function gridLineStyle(tick) {
  return { left: `${tickPosition(tick.time, timeRange.value)}%` }
}

function rowTitle(row) {
  if (row.levelLabel === '节点' && row.owner) {
    return `${row.name} · ${row.owner}${row.remark ? ` · ${row.remark}` : ''}`
  }
  if (row.levelLabel === '控制性计划') {
    return `${row.name} · 完成 ${row.completionRate}% · 滞后 ${row.lagCount}`
  }
  return row.name
}
</script>

<template>
  <div class="project-gantt control-plan-view" :class="{ 'is-expanded': expanded }">
    <div class="gantt-summary">
      <div class="status-counts">
        <span
          v-for="item in statusSummary"
          :key="item.key"
          class="status-chip"
          :class="summaryChipClass(item.key)"
        >
          {{ item.label }} <b>{{ item.count }}</b>
        </span>
      </div>
      <div class="summary-actions">
        <div class="gantt-legend">
          <span><i class="dot pending" />未开始</span>
          <span><i class="dot active" />进行中</span>
          <span><i class="dot done" />已完成</span>
          <span><i class="dot lag" />滞后</span>
        </div>
      </div>
    </div>

    <div class="gantt-chart">
      <div v-if="!ganttRows.length" class="plan-empty">暂无控制性计划数据</div>
      <template v-else>
        <div class="gantt-head">
          <div class="head-label">工作项 / 节点</div>
          <div class="head-timeline">
            <span
              v-for="(tick, index) in timeRange.ticks"
              :key="`${tick.label}-${index}`"
              class="axis-tick"
              :style="axisTickStyle(tick, index, timeRange.ticks.length)"
            >
              {{ tick.label }}
            </span>
          </div>
        </div>
        <div class="gantt-scroll">
          <div
            v-for="row in ganttRows"
            :key="row.id"
            class="gantt-row"
            :class="[`row-level-${row.level}`, { 'is-group': row.isGroup }]"
          >
            <div class="row-label" :style="{ paddingLeft: levelIndent(row.level, expanded) }">
              <span class="level-tag" :class="`tag-l${row.level}`">{{ row.levelLabel }}</span>
              <span class="row-name" :title="rowTitle(row)">{{ row.name }}</span>
              <span v-if="!row.isGroup" class="row-status" :class="statusClass(row.status)">
                {{ getGanttStatusLabel(row.status) }}
              </span>
            </div>
            <div class="row-track">
              <div class="track-grid">
                <span
                  v-for="(tick, index) in timeRange.ticks"
                  :key="`grid-${index}`"
                  class="grid-line"
                  :style="gridLineStyle(tick)"
                />
              </div>
              <div
                v-if="taskBarStyle(row)"
                class="bar task-bar"
                :class="[statusClass(row.status), { 'bar-group': row.isGroup && row.level > 0 }]"
                :style="taskBarStyle(row)"
                :title="barTitle(row)"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.control-plan-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 10px;
}

.gantt-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.status-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 500;
  background: rgba(64, 158, 255, 0.08);
  color: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(94, 238, 255, 0.12);
}

.status-chip b {
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 700;
  color: #fff;
}

.status-chip.status-total {
  background: rgba(64, 158, 255, 0.18);
  color: #5eeeff;
  border-color: rgba(94, 238, 255, 0.35);
}

.status-chip.status-pending {
  background: rgba(255, 255, 255, 0.06);
  color: #a8abb2;
  border-color: rgba(255, 255, 255, 0.1);
}

.status-chip.status-active {
  background: rgba(64, 158, 255, 0.15);
  color: #5eeeff;
  border-color: rgba(94, 238, 255, 0.28);
}

.status-chip.status-done {
  background: rgba(94, 238, 255, 0.1);
  color: #67c23a;
  border-color: rgba(103, 194, 58, 0.25);
}

.status-chip.status-lag {
  background: rgba(246, 197, 117, 0.12);
  color: #f6c575;
  border-color: rgba(246, 197, 117, 0.28);
}

.gantt-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: calc(11px + var(--coc-font-boost));
  color: #a8abb2;
  align-items: center;
}

.gantt-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 14px;
  height: 8px;
  border-radius: 3px;
  display: inline-block;
}

.dot.pending { background: #6b7a8f; }
.dot.active { background: linear-gradient(90deg, #409eff, #5eeeff); }
.dot.done { background: #67c23a; }
.dot.lag { background: #f6c575; }

.gantt-chart {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(94, 238, 255, 0.22);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 53, 108, 0.22);
  box-shadow: inset 0 0 24px rgba(94, 238, 255, 0.04);
}

.gantt-head {
  display: flex;
  background: rgba(64, 158, 255, 0.1);
  border-bottom: 1px solid rgba(94, 238, 255, 0.18);
  flex-shrink: 0;
}

.head-label {
  width: 300px;
  flex-shrink: 0;
  padding: 10px 14px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  border-right: 1px solid rgba(94, 238, 255, 0.15);
}

.control-plan-view.is-expanded .head-label,
.control-plan-view.is-expanded .row-label {
  width: 380px;
}

.head-timeline {
  flex: 1;
  position: relative;
  min-width: 0;
  min-height: 36px;
}

.axis-tick {
  position: absolute;
  top: 0;
  font-size: calc(10px + var(--coc-font-boost));
  color: #a8abb2;
  padding: 10px 0;
  white-space: nowrap;
  line-height: 1.2;
}

.gantt-scroll {
  flex: 1;
  overflow: auto;
}

.gantt-row {
  display: flex;
  border-bottom: 1px solid rgba(94, 238, 255, 0.08);
  min-height: 38px;
}

.gantt-row:hover {
  background: rgba(94, 238, 255, 0.06);
}

.gantt-row.is-group.row-level-0 {
  background: rgba(64, 158, 255, 0.14);
}

.gantt-row.is-group.row-level-1 {
  background: rgba(64, 158, 255, 0.08);
}

.row-label {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 0;
  border-right: 1px solid rgba(94, 238, 255, 0.1);
  min-width: 0;
}

.level-tag {
  flex-shrink: 0;
  font-size: calc(10px + var(--coc-font-boost));
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.tag-l0 {
  background: rgba(94, 238, 255, 0.18);
  color: #5eeeff;
}

.tag-l1 {
  background: rgba(64, 158, 255, 0.2);
  color: #79bbff;
}

.tag-l2 {
  background: rgba(94, 238, 255, 0.1);
  color: #a7cfe9;
}

.row-name {
  flex: 1;
  font-size: calc(11px + var(--coc-font-boost));
  color: rgba(255, 255, 255, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-level-0 .row-name {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 700;
}

.row-level-1 .row-name {
  font-weight: 600;
}

.row-status {
  flex-shrink: 0;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 700;
  min-width: 42px;
  text-align: right;
}

.row-track {
  flex: 1;
  position: relative;
  min-height: 38px;
  min-width: 0;
}

.track-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-right: 1px dashed rgba(94, 238, 255, 0.12);
  transform: translateX(-0.5px);
}

.bar {
  position: absolute;
  border-radius: 4px;
  height: 12px;
  top: 50%;
  transform: translateY(-50%);
  min-width: 4px;
  z-index: 1;
  box-shadow: 0 0 8px rgba(94, 238, 255, 0.2);
}

.bar-group {
  height: 8px;
  opacity: 0.65;
}

.task-bar.status-done {
  background: linear-gradient(90deg, #67c23a, #95d475);
  box-shadow: 0 0 8px rgba(103, 194, 58, 0.35);
}

.task-bar.status-active {
  background: linear-gradient(90deg, #409eff, #5eeeff);
  box-shadow: 0 0 10px rgba(94, 238, 255, 0.45);
}

.task-bar.status-lag {
  background: linear-gradient(90deg, #e6a23c, #f6c575);
  box-shadow: 0 0 8px rgba(246, 197, 117, 0.35);
}

.task-bar.status-pending {
  background: linear-gradient(90deg, #4a5568, #6b7a8f);
  box-shadow: none;
}

.row-status.status-done { color: #67c23a; }
.row-status.status-active { color: #5eeeff; }
.row-status.status-lag { color: #f6c575; }
.row-status.status-pending { color: #a8abb2; }

.plan-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a8abb2;
  font-size: calc(13px + var(--coc-font-boost));
  min-height: 120px;
}
</style>
