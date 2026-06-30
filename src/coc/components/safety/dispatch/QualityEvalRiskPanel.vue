<script setup>
import { computed } from 'vue'
import { HQ_SELECTION_ID, getProjectQualityEvalRisks } from '../../../mock/data.js'

const props = defineProps({
  selectionId: { type: String, default: HQ_SELECTION_ID },
})

const isHq = computed(() => props.selectionId === HQ_SELECTION_ID)

const riskList = computed(() => getProjectQualityEvalRisks(props.selectionId))

const stats = computed(() => ({
  total: riskList.value.length,
  registerMismatch: riskList.value.filter((r) => r.inconsistency.includes('登记')).length,
  docMissing: riskList.value.filter((r) => r.docStatus.includes('未上传') || r.docStatus.includes('缺')).length,
}))
</script>

<template>
  <div class="panel-card quality-risk-panel">
    <div class="panel-title compact title-left">
      <span>{{ isHq ? '质量验评风险项统计' : '质量验评风险项' }}</span>
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
            <tr v-for="row in riskList" :key="row.id">
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
            <tr v-if="!riskList.length">
              <td colspan="2" class="empty-row">暂无资料与登记不一致项</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
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
  font-size: 11px;
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
  font-size: 18px;
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
  font-size: 10px;
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
  font-size: 12px;
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
  font-size: 10px;
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
  font-size: 10px;
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
  font-size: 11px;
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
