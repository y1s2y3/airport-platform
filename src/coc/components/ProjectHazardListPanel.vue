<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getProjectIssuesByType,
  closeCocSupervisionMeetingHazard,
} from '../mock/data.js'
import { isSupervisionMeetingHazardTicket } from '../../utils/cocAdminDeviceStorage.js'
import DispatchDraggablePanel from './safety/dispatch/DispatchDraggablePanel.vue'
import DispatchRecordDetailBody from './safety/dispatch/DispatchRecordDetailBody.vue'

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
const listVersion = ref(0)
const closing = ref(false)

const hazardList = computed(() => {
  listVersion.value
  return [
    ...getProjectIssuesByType('safety', props.projectId).map((h) => ({ ...h, hazardCategory: '安全' })),
    ...getProjectIssuesByType('quality', props.projectId).map((h) => ({ ...h, hazardCategory: '质量' })),
  ]
})

const filteredHazardList = computed(() => {
  const list =
    hazardStatusFilter.value === '全部'
      ? [...hazardList.value]
      : hazardList.value.filter((row) => row.status === hazardStatusFilter.value)
  return list.sort(
    (a, b) => (HAZARD_LEVEL_ORDER[a.level] ?? 9) - (HAZARD_LEVEL_ORDER[b.level] ?? 9),
  )
})

const detailView = ref(null)

const detailTitle = computed(() => {
  if (!detailView.value) return ''
  const cat = detailView.value.data.hazardCategory || '安质'
  return `${cat}隐患详情`
})

const canConfirmCloseDetail = computed(() => {
  const row = detailView.value?.data
  if (!row || detailView.value?.kind !== 'hazard') return false
  return isSupervisionMeetingHazardTicket(row) && row.status === '待整改'
})

function levelClass(level) {
  if (level === '重大') return 'major'
  if (level === '较大') return 'medium'
  return 'normal'
}

function openDetail(row) {
  detailView.value = { kind: 'hazard', data: { ...row } }
}

function closeDetail() {
  detailView.value = null
}

async function handleConfirmClose() {
  const row = detailView.value?.data
  if (!row) return
  try {
    await ElMessageBox.confirm(
      '确认关闭该监理会议隐患？关闭后状态将变为「已闭合」，与后台指挥部关闭操作一致。',
      '确认关闭',
      {
        type: 'warning',
        confirmButtonText: '确认关闭',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  closing.value = true
  const result = closeCocSupervisionMeetingHazard(row.id, { operator: '指挥部用户' })
  closing.value = false
  if (!result.ok) {
    ElMessage.warning(result.msg || '关闭失败')
    return
  }
  listVersion.value += 1
  detailView.value = {
    ...detailView.value,
    data: { ...detailView.value.data, status: '已闭合' },
  }
  ElMessage.success('隐患已关闭')
}
</script>

<template>
  <div class="panel-card project-hazard-panel">
    <div class="panel-title compact title-left hazard-title-row">
      <span class="hazard-title-text">隐患清单</span>
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
    </div>

    <DispatchDraggablePanel
      v-if="detailView"
      :title="detailTitle"
      :width="560"
      :z-index="120010"
      placement="right"
      right-backdrop
      @close="closeDetail"
    >
      <DispatchRecordDetailBody :kind="detailView.kind" :record="detailView.data" />
      <div v-if="canConfirmCloseDetail" class="hazard-detail-actions">
        <el-button type="success" :loading="closing" @click="handleConfirmClose">
          确认关闭
        </el-button>
      </div>
    </DispatchDraggablePanel>
  </div>
</template>

<style scoped>
.project-hazard-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.hazard-detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--coc-border, #e4e7ed);
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
</style>
