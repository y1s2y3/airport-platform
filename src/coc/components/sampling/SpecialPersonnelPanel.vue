<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import {
  HQ_SELECTION_ID,
  PROJECT_PERSONNEL_MGMT_SUMMARY,
  SPECIAL_PERSONNEL_LIST,
  filterByProjectId,
} from '../../mock/data.js'

const props = defineProps({
  selectionId: { type: String, default: HQ_SELECTION_ID },
})

const isHq = computed(() => props.selectionId === HQ_SELECTION_ID)
const detailItem = ref(null)

function isCertified(person) {
  return person.certStatus === '有效' || person.certStatus === '即将过期'
}

const list = computed(() => filterByProjectId(SPECIAL_PERSONNEL_LIST, props.selectionId))

const stats = computed(() => {
  const total = list.value.length
  const certified = list.value.filter(isCertified).length
  return {
    total,
    certified,
    uncertified: total - certified,
  }
})

const hqRows = computed(() =>
  PROJECT_PERSONNEL_MGMT_SUMMARY.map((row) => ({
    projectName: row.projectName,
    projectShortName: row.projectShortName,
    total: row.specialCount,
    certified: Math.max(0, row.specialCount - row.certExpire),
    uncertified: row.certExpire,
  })),
)

const hqRankRows = computed(() =>
  [...hqRows.value]
    .sort((a, b) => b.uncertified - a.uncertified || b.total - a.total)
    .map((row, index) => ({ ...row, rank: index + 1 })),
)

const certStatusClass = { 有效: 'ok', 即将过期: 'warn', 已过期: 'danger' }

function openDetail(row) {
  detailItem.value = row
}
function closeDetail() {
  detailItem.value = null
}

function handleSpotPass() {
  if (!detailItem.value) return
  detailItem.value.spotCheckStatus = 'passed'
  ElMessage.success(`${detailItem.value.name} 抽查通过，已记录`)
  closeDetail()
}

function handleSpotRectify() {
  if (!detailItem.value) return
  detailItem.value.spotCheckStatus = 'rectify'
  ElMessage.warning(`已向 ${detailItem.value.name} 下发责令整改通知`)
  closeDetail()
}

watch(() => props.selectionId, () => closeDetail())
</script>

<template>
  <div class="panel-card special-personnel-panel">
    <div class="panel-title compact title-left">
      <span>{{ isHq ? '特种作业人员统计' : '特种作业人员' }}</span>
    </div>
    <div class="panel-body panel-inner">
      <div class="kpi-blocks">
        <div class="kpi-block total">
          <div class="kpi-val">{{ isHq ? hqRows.reduce((s, r) => s + r.total, 0) : stats.total }}</div>
          <div class="kpi-lbl">总人数</div>
        </div>
        <div class="kpi-block certified">
          <div class="kpi-val">{{ isHq ? hqRows.reduce((s, r) => s + r.certified, 0) : stats.certified }}</div>
          <div class="kpi-lbl">持证人数</div>
        </div>
        <div class="kpi-block uncertified">
          <div class="kpi-val">{{ isHq ? hqRows.reduce((s, r) => s + r.uncertified, 0) : stats.uncertified }}</div>
          <div class="kpi-lbl">未持证人数</div>
        </div>
      </div>

      <div v-if="isHq" class="list-subtitle">项目排行</div>
      <div class="list-wrap">
        <table v-if="isHq" class="data-table">
          <thead>
            <tr><th>排名</th><th>项目</th><th>总人数</th><th>持证</th><th>未持证</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in hqRankRows" :key="row.projectName">
              <td class="rank-cell">{{ row.rank }}</td>
              <td class="name-cell" :title="row.projectName">{{ row.projectShortName }}</td>
              <td>{{ row.total }}</td>
              <td class="ok-cell">{{ row.certified }}</td>
              <td class="danger-cell">{{ row.uncertified }}</td>
            </tr>
          </tbody>
        </table>
        <table v-else class="data-table">
          <thead>
            <tr><th>姓名</th><th>工种</th><th>持证</th><th>在岗</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="row in list"
              :key="row.id"
              class="clickable-row"
              @click="openDetail(row)"
            >
              <td>{{ row.name }}</td>
              <td class="loc-cell" :title="row.workType">{{ row.workType }}</td>
              <td :class="isCertified(row) ? 'ok-cell' : 'danger-cell'">
                {{ isCertified(row) ? '已持证' : '未持证' }}
              </td>
              <td :class="row.onDuty ? 'ok-cell' : 'warn-cell'">{{ row.onDuty ? '在岗' : '离岗' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="detailItem" class="detail-overlay">
        <div class="detail-card">
          <div class="detail-header">
            <span class="detail-title">特种作业人员详情</span>
            <button class="close-btn" type="button" @click="closeDetail">
              <el-icon :size="13"><Close /></el-icon>
              关闭
            </button>
          </div>
          <div class="detail-body">
            <div class="detail-grid">
              <div class="detail-item"><span class="dl">姓名</span><span>{{ detailItem.name }}</span></div>
              <div class="detail-item"><span class="dl">工种</span><span>{{ detailItem.workType }}</span></div>
              <div class="detail-item"><span class="dl">证件状态</span><span :class="`${certStatusClass[detailItem.certStatus]}-cell`">{{ detailItem.certStatus }}</span></div>
              <div class="detail-item"><span class="dl">在岗状态</span><span>{{ detailItem.onDuty ? '在岗' : '离岗' }}</span></div>
              <div class="detail-item"><span class="dl">联系电话</span><span>{{ detailItem.phone }}</span></div>
              <div class="detail-item"><span class="dl">所属单位</span><span>{{ detailItem.company }}</span></div>
            </div>
          </div>
          <div class="detail-footer">
            <el-button type="success" @click="handleSpotPass">抽查通过</el-button>
            <el-button type="warning" @click="handleSpotRectify">责令整改</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.special-personnel-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-title.compact.title-left {
  font-size: calc(17px + var(--coc-font-boost));
  justify-content: flex-start;
  gap: 12px;
  border-left: 4px solid #e6a23c;
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
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(64, 158, 255, 0.04));
}

.kpi-block.certified {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.12), rgba(103, 194, 58, 0.04));
}

.kpi-block.uncertified {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.12), rgba(245, 108, 108, 0.04));
}

.kpi-val {
  font-size: calc(18px + var(--coc-font-boost));
  font-weight: 700;
  line-height: 1.2;
}

.kpi-block.total .kpi-val { color: #409eff; }
.kpi-block.certified .kpi-val { color: #67c23a; }
.kpi-block.uncertified .kpi-val { color: #f56c6c; }

.kpi-lbl {
  margin-top: 4px;
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
}

.list-subtitle {
  flex-shrink: 0;
  font-size: calc(13px + var(--coc-font-boost));
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
  font-size: calc(13px + var(--coc-font-boost));
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

.name-cell,
.loc-cell {
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
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--coc-border);
}

.detail-title { font-size: calc(13px + var(--coc-font-boost)); font-weight: 700; }

.close-btn {
  border: 1px solid var(--coc-border);
  background: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: calc(11px + var(--coc-font-boost));
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
  font-size: calc(11px + var(--coc-font-boost));
}

.dl {
  color: var(--coc-text-muted);
  min-width: 56px;
  flex-shrink: 0;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--coc-border);
  background: #faf8f6;
}
</style>
