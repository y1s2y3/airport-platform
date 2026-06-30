<script setup>
import { ref, computed, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import {
  HQ_SELECTION_ID,
  PROJECT_EQUIPMENT_SAMPLE_SUMMARY,
  EQUIPMENT_SAMPLE_RECORDS,
  filterByProjectId,
} from '../../mock/data.js'

const props = defineProps({
  selectionId: { type: String, default: HQ_SELECTION_ID },
})

const isHq = computed(() => props.selectionId === HQ_SELECTION_ID)
const detailItem = ref(null)

function isMonitorConnected(item) {
  if (item.monitorConnected != null) return item.monitorConnected
  const n = Number.parseInt(String(item.id).replace(/\D/g, ''), 10) || 0
  return n % 4 !== 0
}

const list = computed(() =>
  filterByProjectId(EQUIPMENT_SAMPLE_RECORDS, props.selectionId).map((item) => ({
    ...item,
    monitorConnected: isMonitorConnected(item),
  })),
)

const stats = computed(() => {
  const total = list.value.length
  const connected = list.value.filter((item) => item.monitorConnected).length
  return {
    total,
    connected,
    disconnected: total - connected,
  }
})

const hqRows = computed(() =>
  PROJECT_EQUIPMENT_SAMPLE_SUMMARY.map((row) => {
    const disconnected = Math.max(1, Math.floor(row.taskCount / 4))
    return {
      projectName: row.projectName,
      projectShortName: row.projectShortName,
      total: row.taskCount,
      connected: Math.max(0, row.taskCount - disconnected),
      disconnected,
    }
  }),
)

const hqRankRows = computed(() =>
  [...hqRows.value]
    .sort((a, b) => b.disconnected - a.disconnected || b.total - a.total)
    .map((row, index) => ({ ...row, rank: index + 1 })),
)

function openDetail(row) {
  detailItem.value = row
}
function closeDetail() {
  detailItem.value = null
}

watch(() => props.selectionId, () => closeDetail())
</script>

<template>
  <div class="panel-card special-equipment-panel">
    <div class="panel-title compact title-left">
      <span>{{ isHq ? '特种作业设备统计' : '特种作业设备' }}</span>
    </div>
    <div class="panel-body panel-inner">
      <div class="kpi-blocks">
        <div class="kpi-block total">
          <div class="kpi-val">{{ isHq ? hqRows.reduce((s, r) => s + r.total, 0) : stats.total }}</div>
          <div class="kpi-lbl">设备总数</div>
        </div>
        <div class="kpi-block connected">
          <div class="kpi-val">{{ isHq ? hqRows.reduce((s, r) => s + r.connected, 0) : stats.connected }}</div>
          <div class="kpi-lbl">接入监测</div>
        </div>
        <div class="kpi-block disconnected">
          <div class="kpi-val">{{ isHq ? hqRows.reduce((s, r) => s + r.disconnected, 0) : stats.disconnected }}</div>
          <div class="kpi-lbl">未接入监测</div>
        </div>
      </div>

      <div v-if="isHq" class="list-subtitle">项目排行</div>
      <div class="list-wrap">
        <table v-if="isHq" class="data-table">
          <thead>
            <tr><th>排名</th><th>项目</th><th>设备总数</th><th>接入监测</th><th>未接入</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in hqRankRows" :key="row.projectName">
              <td class="rank-cell">{{ row.rank }}</td>
              <td class="name-cell" :title="row.projectName">{{ row.projectShortName }}</td>
              <td>{{ row.total }}</td>
              <td class="ok-cell">{{ row.connected }}</td>
              <td class="warn-cell">{{ row.disconnected }}</td>
            </tr>
          </tbody>
        </table>
        <table v-else class="data-table">
          <thead>
            <tr><th>设备名称</th><th>类型</th><th>监测接入</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="row in list"
              :key="row.id"
              class="clickable-row"
              @click="openDetail(row)"
            >
              <td class="name-cell" :title="row.name">{{ row.name }}</td>
              <td>{{ row.type }}</td>
              <td :class="row.monitorConnected ? 'ok-cell' : 'warn-cell'">
                {{ row.monitorConnected ? '已接入' : '未接入' }}
              </td>
              <td :class="row.inspectResult === '正常' ? 'ok-cell' : 'danger-cell'">{{ row.inspectResult || row.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="detailItem" class="detail-overlay">
        <div class="detail-card">
          <div class="detail-header">
            <span class="detail-title">设备详情</span>
            <button class="close-btn" type="button" @click="closeDetail">
              <el-icon :size="13"><Close /></el-icon>
              关闭
            </button>
          </div>
          <div class="detail-body">
            <div class="detail-grid">
              <div class="detail-item"><span class="dl">设备名称</span><span>{{ detailItem.name }}</span></div>
              <div class="detail-item"><span class="dl">设备类型</span><span>{{ detailItem.type }}</span></div>
              <div class="detail-item"><span class="dl">监测接入</span><span>{{ detailItem.monitorConnected ? '已接入' : '未接入' }}</span></div>
              <div class="detail-item"><span class="dl">抽检结果</span><span>{{ detailItem.inspectResult || '—' }}</span></div>
              <div class="detail-item"><span class="dl">记录日期</span><span>{{ detailItem.date }}</span></div>
              <div class="detail-item"><span class="dl">处理状态</span><span>{{ detailItem.status || '—' }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.special-equipment-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-title.compact.title-left {
  font-size: 17px;
  justify-content: flex-start;
  gap: 12px;
  border-left: 4px solid #909399;
}

.panel-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px 12px !important;
  position: relative;
}

.kpi-blocks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.kpi-block {
  border-radius: 8px;
  padding: 10px 8px;
  text-align: center;
  border: 1px solid var(--coc-border);
}

.kpi-block.total {
  background: linear-gradient(135deg, rgba(144, 147, 153, 0.12), rgba(144, 147, 153, 0.04));
}

.kpi-block.connected {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.12), rgba(103, 194, 58, 0.04));
}

.kpi-block.disconnected {
  background: linear-gradient(135deg, rgba(230, 162, 60, 0.12), rgba(230, 162, 60, 0.04));
}

.kpi-val {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.kpi-block.total .kpi-val { color: #606266; }
.kpi-block.connected .kpi-val { color: #67c23a; }
.kpi-block.disconnected .kpi-val { color: #e6a23c; }

.kpi-lbl {
  margin-top: 4px;
  font-size: 12px;
  color: var(--coc-text-secondary);
}

.list-subtitle {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--coc-text-secondary);
}

.rank-cell {
  width: 36px;
  text-align: center;
  font-weight: 700;
  color: var(--coc-text-muted);
}

.list-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 8px 6px;
  border-bottom: 1px solid var(--coc-border);
  text-align: left;
  vertical-align: middle;
}

.data-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #faf8f6;
  font-weight: 600;
  color: var(--coc-text-secondary);
}

.name-cell {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clickable-row { cursor: pointer; }
.clickable-row:hover { background: rgba(201, 123, 99, 0.05); }

.ok-cell { color: var(--coc-success); font-weight: 600; }
.warn-cell { color: #e6a23c; font-weight: 600; }
.danger-cell { color: #f56c6c; font-weight: 600; }

.detail-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.detail-card {
  background: #fff;
  border-radius: 10px;
  width: 100%;
  max-height: 100%;
  overflow: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--coc-border);
}

.detail-title { font-size: 13px; font-weight: 700; }

.close-btn {
  border: 1px solid var(--coc-border);
  background: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.detail-body { padding: 12px 14px; }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}

.detail-item {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.dl {
  color: var(--coc-text-muted);
  min-width: 56px;
  flex-shrink: 0;
}
</style>
