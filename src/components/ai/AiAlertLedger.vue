<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, Search } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  AI_CATEGORY_META,
  getAiAlerts,
  getCategoryTypes,
} from '../../mock/aiApp.js'
import AiDisposeDialog from './AiDisposeDialog.vue'
import '../../views/aiApp/ai-app.css'

const props = defineProps({
  category: { type: String, required: true },
})

const router = useRouter()
const { selectedProjectId, headerProjectLabel } = useCurrentProject()
const meta = computed(() => AI_CATEGORY_META[props.category])
const dateRange = ref([])
const filters = reactive({ alertType: '', status: '', keyword: '' })
const currentPage = ref(1)
const pageSize = ref(8)
const disposeVisible = ref(false)
const currentAlert = ref(null)
const batchAlerts = ref([])
const selectedRows = ref([])
const tableRef = ref(null)

const sourceRows = computed(() =>
  getAiAlerts({ projectId: selectedProjectId.value, category: props.category }),
)

const metrics = computed(() => {
  const total = sourceRows.value.length
  const unhandled = sourceRows.value.filter((item) => item.status === '未处置').length
  return { total, unhandled, handled: total - unhandled }
})

const typeOptions = computed(() => getCategoryTypes(props.category))

const filteredRows = computed(() =>
  sourceRows.value.filter((row) => {
    if (filters.alertType && row.alertType !== filters.alertType) return false
    if (filters.status && row.status !== filters.status) return false
    if (dateRange.value?.length === 2) {
      const date = row.occurredAt.slice(0, 10)
      if (date < dateRange.value[0] || date > dateRange.value[1]) return false
    }
    const keyword = filters.keyword.trim()
    if (keyword) {
      // 处置人只有已处置才展示，因此搜索时也按该展示口径匹配
      const person = row.status === '已处置' ? (row.disposedBy || row.handler || '') : ''
      const target = `${row.alertNo}${row.alertType}${row.content}${row.location}${row.camera}${person}`
      if (!target.includes(keyword)) return false
    }
    return true
  }),
)

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

watch(
  () => [selectedProjectId.value, props.category],
  () => resetFilters(),
)

watch(
  () => [filters.alertType, filters.status, filters.keyword, dateRange.value],
  () => {
    currentPage.value = 1
  },
  { deep: true },
)

function setStatus(status) {
  filters.status = status
}

function resetFilters() {
  dateRange.value = []
  filters.alertType = ''
  filters.status = ''
  filters.keyword = ''
  currentPage.value = 1
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
}

function viewAlert(row) {
  router.push(`/ai-app/${meta.value.routeSegment}/${row.id}`)
}

function openDispose(row) {
  if (row.status === '已处置') return
  currentAlert.value = row
  batchAlerts.value = []
  disposeVisible.value = true
}

function onSelectionChange(rows) {
  selectedRows.value = rows
}

function selectable(row) {
  return row.status === '未处置'
}

function openBatchDispose() {
  batchAlerts.value = selectedRows.value.filter((row) => row.status === '未处置')
  if (!batchAlerts.value.length) return
  currentAlert.value = null
  disposeVisible.value = true
}

function onDisposed() {
  selectedRows.value = []
  batchAlerts.value = []
  tableRef.value?.clearSelection?.()
}
</script>

<template>
  <div class="ai-page page-card">
    <div class="ai-page-header">
      <div>
        <div class="ai-page-breadcrumb">{{ meta.breadcrumb }}</div>
        <h1 class="ai-page-title">{{ meta.label }}</h1>
        <p class="ai-page-tip">{{ meta.description }}</p>
      </div>
      <div class="ai-project-chip">当前项目：{{ headerProjectLabel }}</div>
    </div>

    <div class="ai-metric-grid">
      <button class="ai-metric-card" :class="{ active: !filters.status }" type="button" @click="setStatus('')">
        <div class="ai-metric-value">{{ metrics.total }}</div>
        <div class="ai-metric-label">预警总数</div>
      </button>
      <button class="ai-metric-card warning" :class="{ active: filters.status === '未处置' }" type="button" @click="setStatus('未处置')">
        <div class="ai-metric-value">{{ metrics.unhandled }}</div>
        <div class="ai-metric-label">未处置数量</div>
      </button>
      <button class="ai-metric-card success" :class="{ active: filters.status === '已处置' }" type="button" @click="setStatus('已处置')">
        <div class="ai-metric-value">{{ metrics.handled }}</div>
        <div class="ai-metric-label">已处置数量</div>
      </button>
    </div>

    <div class="ai-panel">
      <div class="ai-panel-title">查询条件</div>
      <div class="ai-filter-bar">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 250px"
        />
        <el-select v-model="filters.alertType" placeholder="预警类型" clearable style="width: 150px">
          <el-option v-for="item in typeOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="filters.status" placeholder="预警状态" clearable style="width: 120px">
          <el-option label="未处置" value="未处置" />
          <el-option label="已处置" value="已处置" />
        </el-select>
        <el-input
          v-model="filters.keyword"
          :prefix-icon="Search"
          clearable
          placeholder="位置 / 摄像头 / 预警内容 / 处置人"
          style="width: 240px"
        />
        <div class="ai-filter-actions">
          <el-button type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </div>
      </div>
    </div>

    <div class="ai-panel">
      <div class="ledger-toolbar">
        <div class="ai-panel-title">预警台账</div>
        <el-button
          type="primary"
          :disabled="!selectedRows.length"
          @click="openBatchDispose"
        >
          批量处置{{ selectedRows.length ? `（${selectedRows.length}）` : '' }}
        </el-button>
      </div>
      <el-table
        ref="tableRef"
        :data="pagedRows"
        stripe
        border
        class="ap-table"
        empty-text="当前条件下暂无预警记录"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="46" align="center" :selectable="selectable" />
        <el-table-column type="index" label="序号" width="58" align="center" />
        <el-table-column label="预警截图" width="120" align="center">
          <template #default="{ row }">
            <div class="ai-snapshot">
              <span class="ai-snapshot-label">{{ row.alertType }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="occurredAt" label="预警时间" width="165" />
        <el-table-column prop="alertType" label="预警类型" width="135" />
        <el-table-column prop="content" label="预警内容" min-width="210" show-overflow-tooltip />
        <el-table-column label="发生位置" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.location }}</div>
            <div style="margin-top: 3px; color: var(--ap-text-muted); font-size: 12px">{{ row.camera }}</div>
          </template>
        </el-table-column>
        <el-table-column label="处置人" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.status === '已处置' ? (row.disposedBy || row.handler || '') : '' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="预警状态" width="92" align="center">
          <template #default="{ row }">
            <span class="ai-status-tag" :class="row.status === '未处置' ? 'unhandled' : 'handled'">{{ row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column label="处置结果" width="92" align="center">
          <template #default="{ row }">
            <span v-if="row.disposition" class="ai-result-tag" :class="row.disposition === '误报' ? 'false-alarm' : 'processed'">
              {{ row.disposition }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="disposedAt" label="处置时间" width="165">
          <template #default="{ row }">{{ row.disposedAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="132" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewAlert(row)">查看</el-button>
            <el-button link type="primary" :disabled="row.status === '已处置'" @click="openDispose(row)">处置</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="filteredRows.length" class="ai-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          background
          layout="total, prev, pager, next"
          :total="filteredRows.length"
        />
      </div>
    </div>

    <AiDisposeDialog
      v-model="disposeVisible"
      :alert="currentAlert"
      :alerts="batchAlerts"
      @submitted="onDisposed"
    />
  </div>
</template>

<style scoped>
.ledger-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.ledger-toolbar .ai-panel-title {
  margin-bottom: 0;
}
</style>
