<script setup>
import { computed } from 'vue'
import {
  DUTY_SLOT_DEFS,
  buildHqDutyRows,
  buildHqDutyStats,
  todayYmd,
  weekdayLabelOf,
} from '../../mock/dutyScreenData.js'

const props = defineProps({
  projects: { type: Array, required: true },
})

const date = todayYmd()

const stats = computed(() => buildHqDutyStats(props.projects, { date }))

const rows = computed(() => buildHqDutyRows(props.projects, { date }))

const statCards = computed(() => [
  { key: 'total', label: '项目总数', value: stats.value.total, unit: '个', tone: '' },
  { key: 'building', label: '在建项目', value: stats.value.building, unit: '个', tone: 'accent' },
  { key: 'scheduled', label: '已安排值班项目', value: stats.value.scheduled, unit: '个', tone: 'ok' },
  { key: 'unscheduled', label: '未排班项目', value: stats.value.unscheduled, unit: '个', tone: 'warn' },
])

function cellText(row, slotKey) {
  if (!row.scheduled) return { kind: 'empty', text: '未排班' }
  const n = row.counts?.[slotKey] || 0
  if (!n) return { kind: 'empty', text: '未排班' }
  return { kind: 'count', value: n }
}
</script>

<template>
  <div class="panel-card duty-stats-panel">
    <div class="panel-title">
      <span>项目值班统计</span>
      <span class="panel-v2-tip">V2版本上线</span>
    </div>

    <div class="panel-body duty-stats-body">
      <!-- 左侧：项目 / 在建 / 已排班 / 未排班 -->
      <div class="duty-stats">
        <div v-for="item in statCards" :key="item.key" class="duty-stat" :class="`duty-stat--${item.tone || 'plain'}`">
          <div class="duty-stat__value">
            {{ item.value }}<span class="duty-stat__unit">{{ item.unit }}</span>
          </div>
          <div class="duty-stat__label">{{ item.label }}</div>
        </div>
      </div>

      <!-- 右侧：在建项目值班人员列表 -->
      <div class="duty-list">
        <div class="duty-list__head">
          <span class="duty-list__title">在建项目值班人员</span>
          <span class="duty-list__summary">
            {{ date }} {{ weekdayLabelOf(date) }} · 已排班 {{ stats.scheduled }} / {{ stats.building }} ·
            今日值班 {{ stats.personTotal }} 人
          </span>
        </div>
        <div class="duty-list__scroll">
          <table class="duty-table">
            <thead>
              <tr>
                <th class="col-name">项目名称</th>
                <th v-for="def in DUTY_SLOT_DEFS" :key="def.key">
                  {{ def.shiftLabel }}<span class="th-sep">-</span>{{ def.partyLabel }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.projectId" :class="{ 'is-unscheduled': !row.scheduled }">
                <td class="col-name">
                  <span class="duty-project" :title="row.fullName">{{ row.projectName }}</span>
                </td>
                <td v-for="def in DUTY_SLOT_DEFS" :key="def.key">
                  <span v-if="cellText(row, def.key).kind === 'count'" class="duty-count">
                    <b>{{ cellText(row, def.key).value }}</b> 人
                  </span>
                  <span v-else class="duty-empty">未排班</span>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="5" class="duty-row-empty">暂无在建项目</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.duty-stats-panel {
  height: 100%;
}

.duty-stats-body {
  display: flex;
  align-items: stretch;
  gap: 14px;
  padding: 10px 14px 12px !important;
  min-height: 0;
  overflow: hidden;
}

/* 左侧指标 */
.duty-stats {
  flex: 0 0 232px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  min-height: 0;
}

.duty-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  min-height: 0;
}

.duty-stat--accent {
  border-color: rgba(94, 238, 255, 0.32);
  background: rgba(94, 238, 255, 0.08);
}

.duty-stat--ok {
  border-color: rgba(94, 238, 255, 0.32);
  background: rgba(94, 238, 255, 0.08);
}

.duty-stat--warn {
  border-color: rgba(246, 197, 117, 0.38);
  background: rgba(246, 197, 117, 0.1);
}

.duty-stat__value {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-size: calc(26px + var(--coc-font-boost));
  font-weight: 700;
  line-height: 1.05;
  color: #fff;
  font-family: 'D-DIN-PRO', 'DIN Pro', 'PingFang SC', sans-serif;
}

.duty-stat--accent .duty-stat__value,
.duty-stat--ok .duty-stat__value {
  color: #5eeeff;
}

.duty-stat--warn .duty-stat__value {
  color: #f6c575;
}

.duty-stat__unit {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 400;
  color: var(--coc-text-muted);
}

.duty-stat__label {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  white-space: nowrap;
}

/* 右侧列表 */
.duty-list {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.duty-list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
}

.duty-list__title {
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 600;
  color: #fff;
}

.duty-list__summary {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  white-space: nowrap;
}

.duty-list__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--coc-hq-scrollbar-thumb-solid) var(--coc-hq-scrollbar-track);
}

.duty-list__scroll::-webkit-scrollbar {
  width: var(--coc-hq-scrollbar-size, 5px);
  height: var(--coc-hq-scrollbar-size, 5px);
}

.duty-list__scroll::-webkit-scrollbar-track {
  background: var(--coc-hq-scrollbar-track, rgba(255, 255, 255, 0.05));
}

.duty-list__scroll::-webkit-scrollbar-thumb {
  background: var(--coc-hq-scrollbar-thumb-solid, rgba(94, 238, 255, 0.58));
  border-radius: 3px;
}

.duty-table {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(12px + var(--coc-font-boost));
  table-layout: fixed;
}

.duty-table th,
.duty-table td {
  padding: 5px 8px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.duty-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #1e3048;
  color: var(--coc-text-secondary);
  font-weight: 600;
  font-size: calc(11px + var(--coc-font-boost));
}

.duty-table th.col-name,
.duty-table td.col-name {
  width: 30%;
  text-align: left;
}

.th-sep {
  margin: 0 1px;
  opacity: 0.7;
}

.duty-project {
  color: rgba(255, 255, 255, 0.92);
}

.duty-table tr.is-unscheduled .duty-project {
  color: #f6c575;
}

.duty-count {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  color: var(--coc-text-secondary);
}

.duty-count b {
  font-size: calc(15px + var(--coc-font-boost));
  font-weight: 700;
  color: #5eeeff;
}

.duty-empty {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 9px;
  font-size: calc(10px + var(--coc-font-boost));
  color: #f6c575;
  background: rgba(246, 197, 117, 0.12);
  border: 1px solid rgba(246, 197, 117, 0.32);
}

.duty-row-empty {
  text-align: center;
  color: var(--coc-text-muted);
  padding: 22px 8px;
}
</style>
