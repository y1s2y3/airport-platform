<script setup>
/**
 * 隐患统计来源卡 · 明细弹层
 * 巡检 / 监理例会 / 调度：字段与筛选对齐对应后台模块
 */
import { ref, computed, watch } from 'vue'
import { getCocHazardsByChannel } from '../mock/hazardStats.js'
import { DISPATCH_HAZARD_RECTIFY_STATUSES } from '../../utils/dispatchHazardStorage.js'
import { SUPERVISION_HAZARD_RECTIFY_STATUSES } from '../../utils/cocAdminDeviceStorage.js'
import DispatchDraggablePanel from './safety/dispatch/DispatchDraggablePanel.vue'
import DispatchRecordDetailBody from './safety/dispatch/DispatchRecordDetailBody.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  channel: {
    type: String,
    default: '',
    validator: (v) => ['', 'inspection', 'supervision', 'dispatch'].includes(v),
  },
  projectId: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue'])

const keyword = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const detailView = ref(null)

const TITLE_MAP = {
  inspection: '巡检隐患明细',
  supervision: '监理例会登记隐患明细',
  dispatch: '调度隐患明细',
}

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const title = computed(() => TITLE_MAP[props.channel] || '隐患明细')

const statusOptions = computed(() => {
  if (props.channel === 'dispatch') return DISPATCH_HAZARD_RECTIFY_STATUSES
  if (props.channel === 'supervision') return SUPERVISION_HAZARD_RECTIFY_STATUSES
  return ['待整改', '待复查', '已复查', '已关闭']
})

const searchPlaceholder = computed(() => {
  if (props.channel === 'dispatch') return '搜索隐患描述、整改人、摄像头…'
  if (props.channel === 'supervision') return '搜索隐患描述、备注、项目…'
  return '搜索描述、类别、等级…'
})

const rows = computed(() => {
  if (!props.channel || !visible.value) return []
  return getCocHazardsByChannel(props.projectId, props.channel)
})

const filtered = computed(() => {
  let list = rows.value
  if (typeFilter.value) {
    const want = typeFilter.value === 'quality' ? '质量' : '安全'
    list = list.filter((row) => row.hazardCategory === want)
  }
  if (statusFilter.value) {
    list = list.filter((row) => {
      if (props.channel === 'inspection') return row.status === statusFilter.value
      const raw = row.raw?.rectifyStatus || row.status
      return raw === statusFilter.value
    })
  }
  const q = keyword.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((row) => {
    const raw = row.raw || {}
    const blob = [
      row.desc,
      row.hazardCategory,
      row.level,
      row.status,
      row.unifiedStatus,
      row.date,
      row.projectName,
      raw.remark,
      raw.rectifier,
      raw.cameraName,
      raw.cameraLocation,
      raw.source,
      raw.uploadTime,
      raw.rectifyStatus,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return blob.includes(q)
  })
})

watch(
  () => [props.modelValue, props.channel],
  () => {
    keyword.value = ''
    statusFilter.value = ''
    typeFilter.value = ''
    detailView.value = null
  },
)

function close() {
  visible.value = false
}

function openDetail(row) {
  detailView.value = { kind: 'hazard', data: { ...row } }
}

function closeDetail() {
  detailView.value = null
}

function typeLabel(row) {
  return row.hazardCategory || (row.raw?.hazardType === 'quality' ? '质量' : '安全')
}

function rawStatus(row) {
  if (props.channel === 'inspection') return row.status
  return row.raw?.rectifyStatus || row.status || '—'
}
</script>

<template>
  <DispatchDraggablePanel
    v-if="visible"
    :title="title"
    :width="920"
    :z-index="120020"
    placement="right"
    right-backdrop
    @close="close"
  >
    <div class="src-more-toolbar">
      <span class="src-more-count">共 {{ filtered.length }} 条</span>
      <div class="src-more-filters">
        <el-select
          v-model="typeFilter"
          clearable
          size="small"
          class="src-filter"
          placeholder="隐患类型"
        >
          <el-option label="安全" value="safety" />
          <el-option label="质量" value="quality" />
        </el-select>
        <el-select
          v-model="statusFilter"
          clearable
          size="small"
          class="src-filter"
          placeholder="整改状态"
        >
          <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
        </el-select>
        <el-input
          v-model="keyword"
          clearable
          size="small"
          class="src-search"
          :placeholder="searchPlaceholder"
        />
      </div>
    </div>

    <div class="src-table-wrap">
      <!-- 巡检：对齐隐患清单/巡检整改四态 -->
      <table v-if="channel === 'inspection'" class="src-table">
        <thead>
          <tr>
            <th>类别</th>
            <th>日期</th>
            <th>描述</th>
            <th>隐患等级</th>
            <th>整改状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filtered"
            :key="row.id"
            class="clickable"
            @click="openDetail(row)"
          >
            <td>{{ typeLabel(row) }}</td>
            <td>{{ row.date || '—' }}</td>
            <td class="desc" :title="row.desc">{{ row.desc || '—' }}</td>
            <td>{{ row.level || '—' }}</td>
            <td>{{ row.status || '—' }}</td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="5" class="empty">暂无巡检隐患记录</td>
          </tr>
        </tbody>
      </table>

      <!-- 监理例会：对齐监理隐患清单 -->
      <table v-else-if="channel === 'supervision'" class="src-table">
        <thead>
          <tr>
            <th>隐患类型</th>
            <th>隐患描述</th>
            <th>隐患等级</th>
            <th>备注</th>
            <th>整改状态</th>
            <th>来源</th>
            <th>登记时间</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filtered"
            :key="row.id"
            class="clickable"
            @click="openDetail(row)"
          >
            <td>{{ typeLabel(row) }}</td>
            <td class="desc" :title="row.desc">{{ row.desc || '—' }}</td>
            <td>{{ row.level || '—' }}</td>
            <td class="desc">{{ row.raw?.remark || '—' }}</td>
            <td>{{ rawStatus(row) }}</td>
            <td>{{ row.raw?.source || '清单导入' }}</td>
            <td>{{ row.raw?.uploadTime || row.date || '—' }}</td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="7" class="empty">暂无监理例会登记隐患</td>
          </tr>
        </tbody>
      </table>

      <!-- 调度：对齐调度隐患清单 -->
      <table v-else-if="channel === 'dispatch'" class="src-table">
        <thead>
          <tr>
            <th>类型</th>
            <th>隐患描述</th>
            <th>等级</th>
            <th>整改状态</th>
            <th>整改人</th>
            <th>整改期限</th>
            <th>摄像头</th>
            <th>来源</th>
            <th>登记时间</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filtered"
            :key="row.id"
            class="clickable"
            @click="openDetail(row)"
          >
            <td>{{ typeLabel(row) }}</td>
            <td class="desc" :title="row.desc">{{ row.desc || '—' }}</td>
            <td>{{ row.level || '—' }}</td>
            <td>{{ rawStatus(row) }}</td>
            <td>{{ row.raw?.rectifier || '—' }}</td>
            <td>{{ row.raw?.hazardDeadline || '—' }}</td>
            <td>{{ row.raw?.cameraName || '—' }}</td>
            <td>{{ row.raw?.source || '问题截图' }}</td>
            <td>{{ row.raw?.uploadTime || row.date || '—' }}</td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="9" class="empty">暂无调度隐患记录</td>
          </tr>
        </tbody>
      </table>
    </div>

    <DispatchDraggablePanel
      v-if="detailView"
      :title="`${title} · 详情`"
      :width="560"
      :z-index="120030"
      placement="right"
      right-backdrop
      @close="closeDetail"
    >
      <DispatchRecordDetailBody :kind="detailView.kind" :record="detailView.data" />
    </DispatchDraggablePanel>
  </DispatchDraggablePanel>
</template>

<style scoped>
.src-more-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.src-more-count {
  font-size: calc(13px + var(--coc-font-boost));
  color: var(--coc-text-secondary, #909399);
  flex-shrink: 0;
}

.src-more-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

.src-filter {
  width: 120px;
}

.src-search {
  width: 220px;
}

.src-table-wrap {
  max-height: min(70vh, 720px);
  overflow: auto;
}

.src-table {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(13px + var(--coc-font-boost));
}

.src-table th,
.src-table td {
  padding: 8px 8px;
  border-bottom: 1px solid var(--coc-border, rgba(255, 255, 255, 0.08));
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.src-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(16, 29, 55, 0.96);
  color: var(--coc-text-secondary, #a8abb2);
  font-weight: 600;
}

.src-table .desc {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.src-table .clickable {
  cursor: pointer;
}

.src-table .clickable:hover {
  background: rgba(255, 255, 255, 0.04);
}

.src-table .empty {
  text-align: center;
  color: var(--coc-text-muted, #909399);
  padding: 24px 8px;
}
</style>
