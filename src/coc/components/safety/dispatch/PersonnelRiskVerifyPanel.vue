<script setup>
import { ref, computed, inject } from 'vue'
import { getCocDispatchPendingWarnings } from '../../../../mock/laborWarningList.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'

const dispatchHqUi = inject('dispatchHqUi', false)

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
  <div class="panel-card detail-panel list-panel risk-panel" :class="{ 'dispatch-hq-list-panel': dispatchHqUi }">
    <DispatchHqPanelTitle v-if="dispatchHqUi" title="实名制预警" show-v2-tag>
      <template #actions>
        <span class="risk-count">待处置 {{ riskList.length }}</span>
        <button type="button" class="title-more-btn" @click="openMore">更多</button>
      </template>
    </DispatchHqPanelTitle>
    <div v-else class="panel-title compact risk-title-row title-left">
      <span class="risk-title-text">实名制预警</span>
      <span class="panel-v2-tip">V2版本上线</span>
      <span class="risk-count">待处置 {{ riskList.length }}</span>
      <button type="button" class="title-more-btn" @click="openMore">更多</button>
    </div>

    <div class="panel-body list-table-body list-wrap">
      <div class="table-scroll">
        <table class="mini-table risk-table">
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
        <table class="mini-table more-table risk-more-table">
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
@import './dispatch-lower.css';

.risk-panel .panel-title {
  border-left: 4px solid #e6a23c;
}

.risk-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.risk-title-text {
  flex-shrink: 0;
  text-align: left;
}

.risk-count {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: #e6a23c;
  white-space: nowrap;
}

.risk-title-row .risk-count {
  margin-left: auto;
}

.risk-title-row .title-more-btn {
  margin-left: 0;
}

.title-more-btn {
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #fff;
  padding: 4px 12px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-accent);
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
}

.title-more-btn:hover {
  border-color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}

.risk-table {
  table-layout: fixed;
}

.risk-table th,
.risk-table td {
  padding: 10px 8px;
  vertical-align: middle;
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
  color: var(--coc-text);
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
  color: var(--coc-text);
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
  color: #67c23a;
}

.mode-tag.mode-notify {
  background: rgba(144, 147, 153, 0.14);
  color: #909399;
}

.mode-tag.mode-default {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
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
