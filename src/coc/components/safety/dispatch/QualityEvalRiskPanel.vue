<script setup>
import { ref, computed } from 'vue'
import { HQ_SELECTION_ID, getProjectQualityEvalRisks } from '../../../mock/data.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'

const props = defineProps({
  selectionId: { type: String, default: HQ_SELECTION_ID },
})

const moreOpen = ref(false)

const isHq = computed(() => props.selectionId === HQ_SELECTION_ID)

const panelTitle = computed(() => (isHq.value ? '质量验评风险项统计' : '质量验评风险项'))

const riskList = computed(() => getProjectQualityEvalRisks(props.selectionId))
const previewList = computed(() => riskList.value.slice(0, 8))

const stats = computed(() => ({
  total: riskList.value.length,
  registerMismatch: riskList.value.filter((r) => r.inconsistency.includes('登记')).length,
  docMissing: riskList.value.filter((r) => r.docStatus.includes('未上传') || r.docStatus.includes('缺')).length,
}))
</script>

<template>
  <div class="panel-card quality-risk-panel">
    <div class="panel-title compact quality-title-row title-left">
      <span class="quality-title-text">{{ panelTitle }}</span>
      <span class="panel-v2-tip">V2版本上线</span>
      <button type="button" class="title-more-btn" @click="moreOpen = true">更多</button>
    </div>
    <div class="panel-body panel-inner">
      <p class="panel-tip">仅展示验评资料与登记数据不一致项</p>
      <div class="kpi-blocks">
        <div class="kpi-block total">
          <div class="kpi-val">{{ stats.total }}</div>
          <div class="kpi-lbl">风险项</div>
        </div>
        <div class="kpi-block warn">
          <div class="kpi-val">{{ stats.registerMismatch }}</div>
          <div class="kpi-lbl">登记不一致</div>
        </div>
        <div class="kpi-block danger">
          <div class="kpi-val">{{ stats.docMissing }}</div>
          <div class="kpi-lbl">资料缺项</div>
        </div>
      </div>

      <div class="list-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>验收项</th>
              <th>不一致说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in previewList" :key="row.id">
              <td>
                <div class="item-name" :title="row.item">{{ row.item }}</div>
                <div class="item-meta">{{ row.evalType }} · {{ row.date.slice(5) }}</div>
              </td>
              <td>
                <div class="mismatch-line">
                  <span class="tag register">登记 {{ row.registerStatus }}</span>
                  <span class="tag doc">资料 {{ row.docStatus }}</span>
                </div>
                <div class="inconsistency" :title="row.inconsistency">{{ row.inconsistency }}</div>
              </td>
            </tr>
            <tr v-if="!previewList.length">
              <td colspan="2" class="empty-row">暂无资料与登记不一致项</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <DispatchDraggablePanel
      v-if="moreOpen"
      :title="panelTitle"
      :width="860"
      placement="right"
      @close="moreOpen = false"
    >
      <div class="more-dialog-toolbar">
        <span class="more-count">共 {{ riskList.length }} 条风险项</span>
      </div>
      <div class="more-table-wrap">
        <table class="data-table more-table">
          <thead>
            <tr>
              <th>验收项</th>
              <th>验评类型</th>
              <th>部位</th>
              <th>日期</th>
              <th>登记状态</th>
              <th>资料状态</th>
              <th>不一致说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in riskList" :key="`more-${row.id}`">
              <td>{{ row.item }}</td>
              <td>{{ row.evalType }}</td>
              <td>{{ row.location }}</td>
              <td>{{ row.date.slice(5) }}</td>
              <td>
                <span class="tag register">{{ row.registerStatus }}</span>
              </td>
              <td>
                <span class="tag doc">{{ row.docStatus }}</span>
              </td>
              <td class="inconsistency-full" :title="row.inconsistency">{{ row.inconsistency }}</td>
            </tr>
            <tr v-if="!riskList.length">
              <td colspan="7" class="empty-row">暂无资料与登记不一致项</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DispatchDraggablePanel>
  </div>
</template>

<style scoped>
.quality-risk-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.quality-risk-panel .panel-title {
  border-left: 4px solid #409eff;
}

.quality-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quality-title-text {
  flex-shrink: 0;
}

.quality-title-row .title-more-btn {
  margin-left: auto;
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

.more-dialog-toolbar {
  padding: 0 4px 10px;
}

.more-count {
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text-muted);
}

.more-table-wrap {
  overflow: auto;
  max-height: calc(100% - 36px);
}

.more-table th,
.more-table td {
  white-space: nowrap;
}

.more-table .inconsistency-full {
  white-space: normal;
  min-width: 200px;
  max-width: 320px;
  line-height: 1.45;
  color: var(--coc-text-secondary);
}

.panel-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px !important;
}

.panel-tip {
  margin: 0;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  line-height: 1.4;
}

.kpi-blocks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.kpi-block {
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  padding: 8px 6px;
  text-align: center;
  background: #faf8f6;
}

.kpi-val {
  font-size: calc(18px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
  line-height: 1.2;
}

.kpi-block.warn .kpi-val {
  color: #e6a23c;
}

.kpi-block.danger .kpi-val {
  color: #f56c6c;
}

.kpi-lbl {
  margin-top: 2px;
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text-muted);
}

.list-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(12px + var(--coc-font-boost));
}

.data-table th,
.data-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--coc-border);
  text-align: left;
  vertical-align: top;
}

.data-table th {
  position: sticky;
  top: 0;
  background: #faf8f6;
  font-weight: 600;
  z-index: 1;
}

.item-name {
  font-weight: 600;
  color: var(--coc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.item-meta {
  margin-top: 2px;
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text-muted);
}

.mismatch-line {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 600;
}

.tag.register {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.tag.doc {
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
}

.inconsistency {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-row {
  text-align: center;
  color: var(--coc-text-muted);
  padding: 16px 8px !important;
}
</style>
