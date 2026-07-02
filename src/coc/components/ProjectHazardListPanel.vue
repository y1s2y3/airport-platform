<script setup>
import { ref, computed } from 'vue'
import { Close, Camera } from '@element-plus/icons-vue'
import {
  getProjectIssuesByType,
} from '../mock/data.js'

const props = defineProps({
  projectId: { type: String, required: true },
})

const hazardStatusFilter = ref('待整改')
const hazardStatusOptions = [
  { label: '全部', value: '全部' },
  { label: '待整改', value: '待整改' },
  { label: '整改中', value: '整改中' },
  { label: '已闭合', value: '已闭合' },
]

const HAZARD_LEVEL_ORDER = { 重大: 0, 较大: 1, 一般: 2 }
const statusMap = { 待整改: 'pending', 整改中: 'doing', 已闭合: 'closed' }

const hazardList = computed(() => [
  ...getProjectIssuesByType('safety', props.projectId).map((h) => ({ ...h, hazardCategory: '安全' })),
  ...getProjectIssuesByType('quality', props.projectId).map((h) => ({ ...h, hazardCategory: '质量' })),
])

const filteredHazardList = computed(() => {
  const list =
    hazardStatusFilter.value === '全部'
      ? [...hazardList.value]
      : hazardList.value.filter((row) => row.status === hazardStatusFilter.value)
  return list.sort(
    (a, b) => (HAZARD_LEVEL_ORDER[a.level] ?? 9) - (HAZARD_LEVEL_ORDER[b.level] ?? 9),
  )
})

const detailItem = ref(null)

function levelClass(level) {
  if (level === '重大') return 'major'
  if (level === '较大') return 'medium'
  return 'normal'
}

function openDetail(row) {
  detailItem.value = row
}

function closeDetail() {
  detailItem.value = null
}
</script>

<template>
  <div class="panel-card project-hazard-panel">
    <div class="panel-title compact title-left hazard-title-row">
      <span class="hazard-title-text">隐患清单</span>
      <span class="panel-v2-tip">V2版本上线</span>
      <span class="head-meta">
        <el-select
          v-model="hazardStatusFilter"
          size="small"
          class="hazard-status-select"
        >
          <el-option
            v-for="opt in hazardStatusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </span>
    </div>
    <div class="panel-body list-body">
      <div class="list-wrap">
        <table class="hazard-table">
          <thead>
            <tr>
              <th>类别</th>
              <th>描述</th>
              <th>隐患等级</th>
              <th>整改状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in filteredHazardList"
              :key="`${row.hazardCategory}-${row.id}`"
              class="clickable-row"
              @click="openDetail(row)"
            >
              <td>
                <span class="cat-tag" :class="row.hazardCategory === '安全' ? 'safety' : 'quality'">
                  {{ row.hazardCategory }}
                </span>
              </td>
              <td class="desc-cell" :title="row.desc">{{ row.desc }}</td>
              <td>
                <span class="level-tag" :class="levelClass(row.level)">{{ row.level }}</span>
              </td>
              <td>
                <span class="status-tag" :class="statusMap[row.status]">{{ row.status }}</span>
              </td>
            </tr>
            <tr v-if="!filteredHazardList.length">
              <td colspan="4" class="empty-row">暂无符合条件的隐患记录</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="detailItem" class="detail-overlay">
        <div class="detail-card">
          <div class="detail-header">
            <span class="detail-title">{{ detailItem.hazardCategory }}隐患详情</span>
            <button type="button" class="close-btn" @click="closeDetail">
              <el-icon :size="13"><Close /></el-icon>
              关闭
            </button>
          </div>
          <div class="detail-body">
            <div class="detail-grid">
              <div class="detail-item"><span class="dl">发现日期</span><span>{{ detailItem.date }}</span></div>
              <div class="detail-item"><span class="dl">施工部位</span><span>{{ detailItem.location }}</span></div>
              <div class="detail-item"><span class="dl">隐患等级</span><span>{{ detailItem.level }}</span></div>
              <div class="detail-item"><span class="dl">整改状态</span><span>{{ detailItem.status }}</span></div>
            </div>
            <div v-if="detailItem.detail?.images?.length" class="detail-block">
              <div class="block-label">隐患图片</div>
              <div class="hazard-images">
                <div
                  v-for="img in detailItem.detail.images"
                  :key="img.id"
                  class="hazard-img"
                  :style="{ background: img.background }"
                >
                  <el-icon :size="15" color="rgba(255,255,255,0.5)"><Camera /></el-icon>
                  <span>{{ img.label }}</span>
                </div>
              </div>
            </div>
            <div class="detail-block">
              <div class="block-label">隐患描述</div>
              <div class="block-content">{{ detailItem.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-hazard-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-title.compact.title-left {
  font-size: calc(17px + var(--coc-font-boost));
  justify-content: flex-start;
  gap: 8px;
  border-left: 4px solid #e6a23c;
}

.hazard-title-row {
  display: flex;
  align-items: center;
}

.hazard-title-text {
  flex-shrink: 0;
}

.head-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.hazard-status-select {
  width: 88px;
}

.hazard-status-select :deep(.el-select__wrapper) {
  min-height: 24px;
  padding: 0 8px;
  font-size: calc(13px + var(--coc-font-boost));
}

.list-body {
  flex: 1;
  min-height: 0;
  padding: 0 !important;
  position: relative;
  overflow: hidden;
}

.list-wrap {
  height: 100%;
  overflow: auto;
}

.hazard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(13px + var(--coc-font-boost));
}

.hazard-table th,
.hazard-table td {
  padding: 8px 6px;
  border-bottom: 1px solid var(--coc-border);
  text-align: left;
  vertical-align: middle;
}

.hazard-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #faf8f6;
  font-weight: 600;
  color: var(--coc-text-secondary);
  font-size: calc(12px + var(--coc-font-boost));
}

.desc-cell {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background: rgba(201, 123, 99, 0.05);
}

.cat-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  white-space: nowrap;
}

.cat-tag.safety {
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
}

.cat-tag.quality {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.level-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  white-space: nowrap;
}

.level-tag.normal {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.level-tag.medium {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}

.level-tag.major {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
}

.status-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  white-space: nowrap;
}

.status-tag.pending {
  background: rgba(144, 147, 153, 0.12);
  color: #909399;
}

.status-tag.doing {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.status-tag.closed {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.empty-row {
  text-align: center;
  color: var(--coc-text-muted);
  font-size: calc(13px + var(--coc-font-boost));
  padding: 16px 8px !important;
}

.detail-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
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
  padding: 10px 12px;
  border-bottom: 1px solid var(--coc-border);
}

.detail-title {
  font-size: calc(14px + var(--coc-font-boost));
  font-weight: 700;
}

.close-btn {
  border: 1px solid var(--coc-border);
  background: #fff;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: calc(12px + var(--coc-font-boost));
}

.detail-body {
  padding: 10px 12px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
}

.detail-item {
  display: flex;
  gap: 6px;
  font-size: calc(12px + var(--coc-font-boost));
}

.dl {
  color: var(--coc-text-muted);
  min-width: 52px;
  flex-shrink: 0;
}

.detail-block {
  margin-top: 8px;
}

.block-label {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
  margin-bottom: 4px;
}

.block-content {
  font-size: calc(12px + var(--coc-font-boost));
  line-height: 1.5;
  padding: 8px 10px;
  background: #faf8f6;
  border-radius: 6px;
  border: 1px solid var(--coc-border);
}

.hazard-images {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.hazard-img {
  height: 64px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: rgba(255, 255, 255, 0.85);
  font-size: calc(11px + var(--coc-font-boost));
}
</style>
