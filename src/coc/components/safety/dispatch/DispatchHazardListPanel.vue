<script setup>
import { ref, computed, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  SAFETY_HAZARDS,
  QUALITY_HAZARDS,
  closeCocSupervisionMeetingHazard,
} from '../../../mock/data.js'
import { isSupervisionMeetingHazardTicket } from '../../../../utils/cocAdminDeviceStorage.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchRecordDetailBody from './DispatchRecordDetailBody.vue'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'

const dispatchHqUi = inject('dispatchHqUi', false)

const hazardList = ref([
  ...SAFETY_HAZARDS.map((h) => ({ ...h, hazardCategory: '安全' })),
  ...QUALITY_HAZARDS.map((h) => ({ ...h, hazardCategory: '质量' })),
])

const hazardStatusFilter = ref('待整改')
const hazardDateRange = ref(null)
const hazardMoreOpen = ref(false)
const detailView = ref(null)
const closing = ref(false)

const hazardStatusOptions = [
  { label: '全部', value: '全部' },
  { label: '待整改', value: '待整改' },
  { label: '整改中', value: '整改中' },
  { label: '已闭合', value: '已闭合' },
]

const HAZARD_LEVEL_ORDER = { 重大: 0, 较大: 1, 一般: 2 }

const filteredHazardList = computed(() => {
  const list =
    hazardStatusFilter.value === '全部'
      ? [...hazardList.value]
      : hazardList.value.filter((row) => row.status === hazardStatusFilter.value)
  return list.sort(
    (a, b) => (HAZARD_LEVEL_ORDER[a.level] ?? 9) - (HAZARD_LEVEL_ORDER[b.level] ?? 9),
  )
})

function matchHazardDateRange(row, range) {
  if (!range?.[0]) return true
  const rowDate = row.date
  if (!rowDate) return true
  const [start, end] = range
  if (end) return rowDate >= start && rowDate <= end
  return rowDate === start
}

const popupFilteredHazardList = computed(() => {
  if (!hazardDateRange.value?.[0]) return filteredHazardList.value
  return filteredHazardList.value.filter((row) => matchHazardDateRange(row, hazardDateRange.value))
})

const previewList = computed(() => filteredHazardList.value.slice(0, 8))

const statusMap = { 待整改: 'pending', 整改中: 'doing', 已闭合: 'closed' }

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

function openHazardDetail(row) {
  detailView.value = { kind: 'hazard', data: { ...row } }
}

function closeDetail() {
  detailView.value = null
}

function syncLocalHazardStatus(id, status) {
  const row = hazardList.value.find((item) => item.id === id)
  if (row) row.status = status
  if (detailView.value?.data?.id === id) {
    detailView.value = {
      ...detailView.value,
      data: { ...detailView.value.data, status },
    }
  }
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
  const result = closeCocSupervisionMeetingHazard(row.id, {
    operator: '指挥部用户',
  })
  closing.value = false

  if (!result.ok) {
    ElMessage.warning(result.msg || '关闭失败')
    return
  }
  syncLocalHazardStatus(row.id, '已闭合')
  ElMessage.success('隐患已关闭')
}
</script>

<template>
  <div class="panel-card hazard-side-panel" :class="{ 'dispatch-hq-list-panel': dispatchHqUi }">
    <DispatchHqPanelTitle v-if="dispatchHqUi" title="隐患清单">
      <template #actions>
        <div class="title-actions">
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
          <button type="button" class="title-more-btn" @click="hazardMoreOpen = true">
            更多
          </button>
        </div>
      </template>
    </DispatchHqPanelTitle>
    <div v-else class="panel-title compact hazard-title-row title-left">
      <span class="hazard-title-text">隐患清单</span>
      <span class="panel-v2-tip">V2版本上线</span>
      <div class="title-actions">
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
        <button type="button" class="title-more-btn" @click="hazardMoreOpen = true">
          更多
        </button>
      </div>
    </div>
    <div class="panel-body panel-inner">
      <div class="list-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>类别</th>
              <th>描述</th>
              <th>等级</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in previewList"
              :key="`${row.hazardCategory}-${row.id}`"
              class="clickable-row"
              @click="openHazardDetail(row)"
            >
              <td>
                <span class="cat-tag" :class="row.hazardCategory === '安全' ? 'safety' : 'quality'">
                  {{ row.hazardCategory }}
                </span>
              </td>
              <td class="desc" :title="row.desc">{{ row.desc }}</td>
              <td>
                <span class="level-tag" :class="levelClass(row.level)">{{ row.level }}</span>
              </td>
              <td>
                <span class="status-tag" :class="statusMap[row.status]">{{ row.status }}</span>
              </td>
            </tr>
            <tr v-if="!previewList.length">
              <td colspan="4" class="empty-row">暂无符合条件的隐患记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <DispatchDraggablePanel
      v-if="hazardMoreOpen"
      title="隐患清单"
      :width="880"
      placement="right"
      @close="hazardMoreOpen = false"
    >
      <div class="more-dialog-toolbar">
        <span class="more-count">共 {{ popupFilteredHazardList.length }} 条</span>
        <div class="more-filters">
          <el-date-picker
            v-model="hazardDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            clearable
            size="small"
            class="hazard-date-filter"
          />
          <el-select v-model="hazardStatusFilter" size="small" class="hazard-status-select more-filter">
            <el-option
              v-for="opt in hazardStatusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
      </div>
      <div class="more-table-wrap">
        <table class="mini-table more-table">
          <thead>
            <tr>
              <th>类别</th>
              <th>日期</th>
              <th>描述</th>
              <th>隐患等级</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in popupFilteredHazardList"
              :key="`more-${row.hazardCategory}-${row.id}`"
              class="clickable-row"
              @click="openHazardDetail(row)"
            >
              <td>
                <span class="cat-tag" :class="row.hazardCategory === '安全' ? 'safety' : 'quality'">
                  {{ row.hazardCategory }}
                </span>
              </td>
              <td>{{ row.date }}</td>
              <td class="desc col-desc" :title="row.desc">{{ row.desc }}</td>
              <td>
                <span class="level-tag" :class="levelClass(row.level)">{{ row.level }}</span>
              </td>
              <td><span class="status-tag" :class="statusMap[row.status]">{{ row.status }}</span></td>
            </tr>
            <tr v-if="!popupFilteredHazardList.length">
              <td colspan="5" class="empty-row">暂无符合条件的隐患记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DispatchDraggablePanel>

    <DispatchDraggablePanel
      v-if="detailView"
      :title="detailTitle"
      :width="560"
      :z-index="120010"
      placement="right"
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
@import './dispatch-lower.css';

.hazard-side-panel {
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

.hazard-side-panel .panel-title {
  border-left: 4px solid #e6a23c;
}

.hazard-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.hazard-title-text {
  flex-shrink: 0;
  text-align: left;
}

.title-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.hazard-status-select {
  width: 96px;
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

.panel-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
}

.list-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
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

.data-table .desc {
  max-width: 140px;
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
  padding: 2px 7px;
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
  padding: 3px 10px;
  border-radius: 4px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
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

.hazard-date-filter {
  width: 240px;
}

.hazard-date-filter :deep(.el-range-input) {
  font-size: calc(12px + var(--coc-font-boost));
}

.more-filter {
  width: 108px;
}
</style>
