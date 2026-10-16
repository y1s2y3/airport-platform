<script setup>
import { ref, computed } from 'vue'
import { getCocDispatchPendingWarnings } from '../../../mock/laborWarningList.js'
import DispatchDraggablePanel from '../safety/dispatch/DispatchDraggablePanel.vue'
import CocPanelHeading from './CocPanelHeading.vue'

/**
 * 项目级大屏 ·「实名制预警」（深色主题）
 * 原为「项目调度」页的 PersonnelRiskVerifyPanel，2026-10-16 与「项目值班」对调后
 * 落在项目级首页左下，并改挂首页标题（图标 + 标题 + V2 角标 + 前置操作位）。
 */
const props = defineProps({
  projectId: { type: String, required: true },
})

const moreOpen = ref(false)
const riskKeyword = ref('')

const riskList = computed(() =>
  getCocDispatchPendingWarnings(props.projectId).map((item) => ({
    id: item.id,
    warningNo: item.warning_no || item.id,
    personName: item.name || '--',
    workType: item.work_type || '--',
    unitName: item.unit_name || '--',
    riskType: item.rule_label || '实名制预警',
    handleMode: item.handle_mode || '--',
    triggeredAt: item.triggered_at || '',
    date: String(item.triggered_at || '').slice(0, 10),
    time: String(item.triggered_at || '').slice(11, 16),
    desc: item.trigger_reason || item.rule_label || '--',
    status: item.status,
    level: item.current_level,
  })),
)

const previewList = computed(() => riskList.value.slice(0, 10))

const filteredRiskList = computed(() => {
  const kw = riskKeyword.value.trim().toLowerCase()
  if (!kw) return riskList.value
  return riskList.value.filter((row) => {
    const blob = [
      row.personName,
      row.workType,
      row.unitName,
      row.riskType,
      row.handleMode,
      row.desc,
      row.warningNo,
      row.status,
    ]
      .join(' ')
      .toLowerCase()
    return blob.includes(kw)
  })
})

function openMore() {
  riskKeyword.value = ''
  moreOpen.value = true
}

function modeClass(mode) {
  if (mode === '手动处理') return 'mode-manual'
  if (mode === '系统自动关闭') return 'mode-auto'
  if (mode === '通知') return 'mode-notify'
  return 'mode-default'
}

function formatTriggered(row) {
  if (!row.date) return '--'
  const md = row.date.length >= 10 ? row.date.slice(5) : row.date
  return row.time ? `${md} ${row.time}` : md
}
</script>

<template>
  <div class="panel-card risk-panel">
    <CocPanelHeading title="实名制预警">
      <template #actions>
        <span class="risk-count">待处置 {{ riskList.length }}</span>
        <button type="button" class="title-more-btn" @click="openMore">更多</button>
      </template>
    </CocPanelHeading>

    <div class="panel-body risk-body">
      <div class="table-scroll">
        <table class="risk-table">
          <thead>
            <tr>
              <th class="col-person">人员</th>
              <th class="col-type">预警类型</th>
              <th class="col-mode">处置方式</th>
              <th class="col-status">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in previewList" :key="row.id">
              <td class="col-person">
                <div class="person-name" :title="row.personName">{{ row.personName }}</div>
                <div class="person-meta" :title="row.workType">{{ row.workType }}</div>
              </td>
              <td class="col-type">
                <div class="type-text" :title="row.riskType">{{ row.riskType }}</div>
              </td>
              <td class="col-mode">
                <span class="mode-tag" :class="modeClass(row.handleMode)">{{ row.handleMode }}</span>
              </td>
              <td class="col-status">
                <span class="status-tag pending">{{ row.status }}</span>
              </td>
            </tr>
            <tr v-if="!previewList.length">
              <td colspan="4" class="empty-row">暂无待处置预警</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <DispatchDraggablePanel
      v-if="moreOpen"
      title="实名制预警（待处置）"
      :width="920"
      placement="right"
      @close="moreOpen = false"
    >
      <div class="more-dialog-toolbar">
        <span class="more-count">共 {{ filteredRiskList.length }} / {{ riskList.length }} 条待处置</span>
        <el-input
          v-model="riskKeyword"
          clearable
          size="small"
          class="more-search"
          placeholder="搜索人员/单位/预警类型/说明"
        />
      </div>
      <div class="more-table-wrap">
        <table class="more-table risk-more-table">
          <thead>
            <tr>
              <th>人员</th>
              <th>工种</th>
              <th>单位</th>
              <th>预警类型</th>
              <th>处置方式</th>
              <th>触发时间</th>
              <th>说明</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRiskList" :key="`more-${row.id}`">
              <td class="cell-strong">{{ row.personName }}</td>
              <td>{{ row.workType }}</td>
              <td class="desc col-desc" :title="row.unitName">{{ row.unitName }}</td>
              <td class="desc col-desc" :title="row.riskType">{{ row.riskType }}</td>
              <td>
                <span class="mode-tag" :class="modeClass(row.handleMode)">{{ row.handleMode }}</span>
              </td>
              <td class="cell-nowrap">{{ formatTriggered(row) }}</td>
              <td class="desc col-desc" :title="row.desc">{{ row.desc }}</td>
              <td>
                <span class="status-tag pending">{{ row.status }}</span>
              </td>
            </tr>
            <tr v-if="!filteredRiskList.length">
              <td colspan="8" class="empty-row">暂无符合条件的待处置预警</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DispatchDraggablePanel>
  </div>
</template>

<style scoped>
.risk-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.risk-panel > :deep(.hq-panel-heading-wrap) {
  padding: 10px 14px 0;
}

.risk-count {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: #f6c575;
  white-space: nowrap;
}

.title-more-btn {
  border: 1px solid rgba(94, 238, 255, 0.45);
  border-radius: 6px;
  background: rgba(64, 158, 255, 0.1);
  padding: 4px 12px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: #5eeeff;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
  font-family: inherit;
}

.title-more-btn:hover {
  border-color: rgba(94, 238, 255, 0.7);
  background: rgba(64, 158, 255, 0.22);
  color: #fff;
}

.risk-body {
  flex: 1;
  min-height: 0;
  padding: 0 !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.risk-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: calc(13px + var(--coc-font-boost));
}

.risk-table th,
.risk-table td {
  padding: 10px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
  line-height: 1.5;
  vertical-align: middle;
  color: rgba(255, 255, 255, 0.92);
}

.risk-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--coc-table-head-bg);
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

.risk-table .col-person {
  width: 22%;
}

.risk-table .col-type {
  width: 36%;
}

.risk-table .col-mode {
  width: 24%;
}

.risk-table .col-status {
  width: 18%;
}

.person-name {
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-meta {
  margin-top: 2px;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-text {
  font-size: calc(12px + var(--coc-font-boost));
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

.mode-tag {
  display: inline-block;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.mode-tag.mode-manual {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}

.mode-tag.mode-auto {
  background: rgba(103, 194, 58, 0.14);
  color: #95d475;
}

.mode-tag.mode-notify {
  background: rgba(144, 147, 153, 0.14);
  color: #a8abb2;
}

.mode-tag.mode-default {
  background: rgba(64, 158, 255, 0.12);
  color: #5eeeff;
}

.status-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  white-space: nowrap;
}

.status-tag.pending {
  background: rgba(245, 108, 108, 0.14);
  color: #f56c6c;
}

.cell-strong {
  font-weight: 600;
}

.cell-nowrap {
  white-space: nowrap;
}

/* 浮层内表格沿用 .more-table 全局基线，仅对齐本表面板的内边距 */
.risk-more-table th,
.risk-more-table td {
  padding: 10px 12px;
  vertical-align: middle;
}

.empty-row {
  text-align: center;
  color: var(--coc-text-muted);
  font-size: calc(13px + var(--coc-font-boost));
  padding: 16px 8px !important;
}
</style>
