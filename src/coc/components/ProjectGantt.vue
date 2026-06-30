<script setup>
import { computed, ref } from 'vue'
import {
  CONTROL_PLAN_NODE_COUNT,
  CONTROL_PLAN_PHASES,
  CONTROL_PLAN_NODES,
  CONTROL_PLAN_ROW_TYPES,
  getControlNodeKindLabel,
} from '../mock/controlPlanSchema.js'
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

const viewMode = ref('gantt')

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

const visibleRowTypes = computed(() => {
  const base = CONTROL_PLAN_ROW_TYPES.filter((row) =>
    ['planStart', 'planEnd', 'owner', 'status'].includes(row.key),
  )
  const optional = CONTROL_PLAN_ROW_TYPES.filter(
    (row) =>
      ['workProgress', 'remark'].includes(row.key) &&
      plans.value.some((plan) =>
        plan[row.key]?.some((cell) => cell && cell !== '-' && cell !== '/'),
      ),
  )
  return [...base, ...optional]
})

function summaryChipClass(kind) {
  if (kind === 'total') return 'status-total'
  return statusClass(kind)
}

function cellStatusClass(kind) {
  return `cell-${kind}`
}

function formatCell(value) {
  if (!value || value === '-') return '—'
  return value
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
        <div class="view-toggle">
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: viewMode === 'gantt' }"
            @click="viewMode = 'gantt'"
          >
            甘特图
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
          >
            台账
          </button>
        </div>
        <div class="gantt-legend">
          <span><i class="dot pending" />未开始</span>
          <span><i class="dot active" />进行中</span>
          <span><i class="dot done" />已完成</span>
          <span><i class="dot lag" />滞后</span>
        </div>
      </div>
    </div>

    <!-- 甘特图：工作项=阶段，节点=甘特条 -->
    <div v-if="viewMode === 'gantt'" class="gantt-chart">
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

    <!-- 台账表格 -->
    <div v-else class="control-plan-scroll">
      <div v-if="!plans.length" class="plan-empty">暂无控制性计划数据</div>

      <div v-for="plan in plans" :key="plan.id" class="plan-block">
        <div class="plan-head">
          <div class="plan-title">{{ plan.name }}</div>
          <div class="plan-meta">
            <span v-if="plan.currentStages?.length">
              当前阶段：
              <template v-for="(stage, idx) in plan.currentStages" :key="stage">
                <em>{{ stage }}</em><span v-if="idx < plan.currentStages.length - 1">，</span>
              </template>
            </span>
            <span>总体完成比例：<b>{{ plan.completionRate }}%</b></span>
            <span>滞后节点数：<b class="lag-num">{{ plan.lagCount }}</b></span>
          </div>
        </div>

        <div class="plan-table-wrap">
          <table class="plan-table">
            <thead>
              <tr class="phase-row">
                <th class="corner sticky-left" rowspan="2">
                  计划名称（{{ CONTROL_PLAN_NODE_COUNT }}）
                </th>
                <th class="type-col sticky-type" rowspan="2">类型</th>
                <th
                  v-for="phase in CONTROL_PLAN_PHASES"
                  :key="phase.id"
                  class="phase-head"
                  :colspan="phase.nodes.length"
                >
                  {{ phase.label }}
                </th>
              </tr>
              <tr class="node-row">
                <th
                  v-for="(node, nodeIndex) in CONTROL_PLAN_NODES"
                  :key="nodeIndex"
                  class="node-head"
                  :title="`${node.phaseLabel} · ${node.name}`"
                >
                  {{ node.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rowType in visibleRowTypes" :key="rowType.key">
                <td
                  v-if="rowType.key === 'planStart'"
                  class="plan-name-cell sticky-left"
                  :rowspan="visibleRowTypes.length"
                >
                  <span class="plan-name-in-table">{{ plan.name }}</span>
                </td>
                <td class="type-cell sticky-type">{{ rowType.label }}</td>
                <template v-if="rowType.key === 'status'">
                  <td
                    v-for="(node, nodeIndex) in plan.nodes"
                    :key="nodeIndex"
                    class="data-cell status-cell"
                    :class="cellStatusClass(node.statusKind)"
                    :title="node.remark && node.remark !== '-' ? node.remark : undefined"
                  >
                    {{ getControlNodeKindLabel(node.statusKind) }}
                    <span
                      v-if="node.progress != null && (node.statusKind === 'active' || node.statusKind === 'lag')"
                      class="cell-progress"
                    >{{ node.progress }}%</span>
                  </td>
                </template>
                <template v-else>
                  <td
                    v-for="(cell, nodeIndex) in plan[rowType.key]"
                    :key="nodeIndex"
                    class="data-cell"
                    :class="{
                      'is-empty': !cell || cell === '-' || cell === '/',
                      'is-wide': rowType.key === 'workProgress' || rowType.key === 'remark',
                    }"
                    :title="cell && cell.length > 12 ? cell : undefined"
                  >
                    {{ formatCell(cell) }}
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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

.view-toggle {
  display: inline-flex;
  padding: 2px;
  background: #f5f5f5;
  border-radius: 8px;
  border: 1px solid var(--coc-border);
}

.toggle-btn {
  border: none;
  background: transparent;
  padding: 4px 12px;
  font-size: 11px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--coc-text-secondary);
  font-family: inherit;
}

.toggle-btn.active {
  background: #fff;
  color: var(--coc-accent);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 500;
  background: #f5f7fa;
  color: var(--coc-text-secondary);
}

.status-chip b {
  font-size: 13px;
  font-weight: 700;
  color: var(--coc-text);
}

.status-chip.status-total {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
}

.status-chip.status-pending {
  background: rgba(144, 147, 153, 0.12);
  color: #606266;
}

.status-chip.status-active {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.status-chip.status-done {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.status-chip.status-lag {
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
}

.gantt-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 11px;
  color: var(--coc-text-muted);
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

.dot.pending { background: #c0c4cc; }
.dot.active { background: #409eff; }
.dot.done { background: #67c23a; }
.dot.lag { background: #f56c6c; }

/* —— 甘特图 —— */
.gantt-chart {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--coc-border);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.gantt-head {
  display: flex;
  background: #faf8f6;
  border-bottom: 1px solid var(--coc-border);
  flex-shrink: 0;
}

.head-label {
  width: 300px;
  flex-shrink: 0;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--coc-text-secondary);
  border-right: 1px solid var(--coc-border);
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
  font-size: 10px;
  color: var(--coc-text-muted);
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
  border-bottom: 1px solid #f5f5f5;
  min-height: 38px;
}

.gantt-row:hover {
  background: rgba(201, 123, 99, 0.03);
}

.gantt-row.is-group.row-level-0 {
  background: rgba(201, 123, 99, 0.08);
}

.gantt-row.is-group.row-level-1 {
  background: rgba(64, 158, 255, 0.05);
}

.row-label {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 0;
  border-right: 1px solid #f0f2f5;
  min-width: 0;
}

.level-tag {
  flex-shrink: 0;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.tag-l0 {
  background: rgba(201, 123, 99, 0.18);
  color: var(--coc-accent);
}

.tag-l1 {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.tag-l2 {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.row-name {
  flex: 1;
  font-size: 11px;
  color: var(--coc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-level-0 .row-name {
  font-size: 12px;
  font-weight: 700;
}

.row-level-1 .row-name {
  font-weight: 600;
}

.row-status {
  flex-shrink: 0;
  font-size: 10px;
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
  border-right: 1px dashed #eef0f3;
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
}

.bar-group {
  height: 8px;
  opacity: 0.55;
}

.task-bar.status-done {
  background: linear-gradient(90deg, #95d475, #67c23a);
}

.task-bar.status-active {
  background: linear-gradient(90deg, #79bbff, #409eff);
}

.task-bar.status-lag {
  background: linear-gradient(90deg, #ff9a9a, #f56c6c);
}

.task-bar.status-pending {
  background: linear-gradient(90deg, #e4e7ed, #c0c4cc);
}

.row-status.status-done { color: #67c23a; }
.row-status.status-active { color: #409eff; }
.row-status.status-lag { color: #f56c6c; }
.row-status.status-pending { color: #909399; }

/* —— 台账 —— */
.control-plan-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid var(--coc-border);
  border-radius: 10px;
  background: #fff;
  padding: 12px;
}

.plan-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--coc-text-muted);
  font-size: 13px;
  min-height: 120px;
}

.plan-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: min-content;
}

.plan-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 2px;
}

.plan-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--coc-text);
}

.plan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 11px;
  color: var(--coc-text-secondary);
}

.plan-meta b {
  color: var(--coc-text);
  font-weight: 700;
}

.plan-meta em {
  font-style: normal;
  color: var(--coc-accent);
  font-weight: 600;
}

.lag-num {
  color: var(--coc-danger) !important;
}

.plan-table-wrap {
  overflow: auto;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  max-width: 100%;
}

.plan-table {
  border-collapse: collapse;
  font-size: 10px;
  min-width: max-content;
  table-layout: fixed;
}

.plan-table th,
.plan-table td {
  border: 1px solid #eef0f3;
  padding: 6px 8px;
  text-align: center;
  vertical-align: middle;
  line-height: 1.35;
  white-space: nowrap;
}

.corner,
.plan-name-cell,
.sticky-left {
  position: sticky;
  left: 0;
  z-index: 3;
  background: #faf8f6;
  min-width: 180px;
  max-width: 220px;
  text-align: left;
  font-weight: 600;
  color: var(--coc-text-secondary);
}

.type-col,
.type-cell,
.sticky-type {
  position: sticky;
  left: 180px;
  z-index: 2;
  background: #fcfbfa;
  min-width: 88px;
  max-width: 96px;
  font-weight: 600;
  color: var(--coc-text-secondary);
}

.phase-head {
  background: #f3f6fb;
  color: #409eff;
  font-weight: 700;
  font-size: 10px;
}

.node-head {
  background: #fafafa;
  color: var(--coc-text);
  font-weight: 600;
  min-width: 72px;
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-name-in-table {
  font-size: 11px;
  font-weight: 700;
  color: var(--coc-text);
  line-height: 1.4;
}

.data-cell {
  color: var(--coc-text);
  min-width: 72px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-cell.is-empty {
  color: var(--coc-text-muted);
}

.data-cell.is-wide {
  max-width: 160px;
  white-space: normal;
  word-break: break-all;
  font-size: 9px;
}

.status-cell {
  font-weight: 600;
}

.cell-progress {
  display: block;
  font-size: 9px;
  font-weight: 500;
  opacity: 0.85;
}

.status-cell.cell-done { color: #67c23a; background: rgba(103, 194, 58, 0.06); }
.status-cell.cell-active { color: var(--coc-accent); background: rgba(201, 123, 99, 0.06); }
.status-cell.cell-pending { color: #909399; background: rgba(144, 147, 153, 0.06); }
.status-cell.cell-lag { color: #f56c6c; background: rgba(245, 108, 108, 0.08); }
.status-cell.cell-na { color: #c0c4cc; background: #fafafa; }
.status-cell.cell-empty { color: var(--coc-text-muted); }

thead th {
  position: sticky;
  top: 0;
  z-index: 1;
}

.phase-row .corner,
.phase-row .type-col {
  z-index: 4;
  top: 0;
}

.node-row th {
  top: 32px;
  z-index: 1;
}
</style>
