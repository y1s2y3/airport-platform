<script setup>
import './mat-page.css'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Refresh, Download, ArrowLeft } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS } from '../../../config/projectOptions'
import { listLedger, ENTRY_TYPE_LABEL, getEntryDetail } from '../../../mock/mat.js'
import { useMatArchiveExport } from '../../../composables/useMatArchiveExport.js'
import MatArchiveExportDialog from './components/MatArchiveExportDialog.vue'
import '../qm-hq-stats.css'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const fromHq = computed(() => route.query.from === 'hq')
const queryProjectId = computed(() => String(route.query.projectId || '').trim())

const viewProjectId = computed(() => {
  if (fromHq.value && queryProjectId.value) return queryProjectId.value
  if (!isHqSelected.value && scopeProjectId.value) return scopeProjectId.value
  return ''
})

const viewProjectLabel = computed(() => {
  if (!viewProjectId.value) return ''
  const found = COC_PROJECT_OPTIONS.find((p) => p.id === viewProjectId.value)
  return found?.label || viewProjectId.value
})

const canViewList = computed(() => !!viewProjectId.value)
const keyword = ref('')
const exited = ref('')
const entryTypeFilter = ref('')

watch(
  () => route.query,
  (q) => {
    if (q.exited != null) exited.value = String(q.exited)
    if (q.entry_type != null) entryTypeFilter.value = String(q.entry_type)
  },
  { immediate: true },
)

const list = computed(() => {
  if (!canViewList.value) return []
  return listLedger(viewProjectId.value, {
    keyword: keyword.value,
    exited: exited.value,
    entry_type: entryTypeFilter.value,
  })
})

function reset() {
  keyword.value = ''
  exited.value = ''
  entryTypeFilter.value = ''
}

function displayName(row) {
  return row.entry_type === 'equipment' ? row.equipment_name : row.material_name
}

const exportLoadingId = ref('')
const { dialogVisible, exportLoading, openExportDialog, confirmExport } = useMatArchiveExport()

function onExportArchive(row) {
  if (exportLoadingId.value || exportLoading.value) return
  exportLoadingId.value = row.entry_id
  try {
    const detail = getEntryDetail(row.entry_id)
    openExportDialog(detail)
  } finally {
    exportLoadingId.value = ''
  }
}

async function onConfirmExportArchive(selectedKeys) {
  await confirmExport(selectedKeys)
}

function goBackToHQ() {
  router.push('/qm/mat/dashboard')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        {{ fromHq ? '质量看板 / 材料设备进场' : '材料设备进场' }} / 材料设备台账
      </div>
      <div class="hq-title-row">
        <el-button
          v-if="fromHq && canViewList"
          link
          type="primary"
          :icon="ArrowLeft"
          @click="goBackToHQ"
        >
          返回
        </el-button>
        <h1 class="page-title">材料设备台账</h1>
        <span v-if="fromHq && canViewList" class="hq-title-project">{{ viewProjectLabel }}</span>
      </div>
      <p class="page-tip">
        仅展示审批通过的进场记录（含退场信息）· 当前：{{
          viewProjectLabel || (isHqSelected ? '请从看板选择项目查看' : scopeProjectLabel)
        }}
        <template v-if="fromHq">（指挥部只读）</template>
      </p>
    </div>

    <el-alert
      v-if="!canViewList"
      type="warning"
      :closable="false"
      show-icon
      title="台账为项目级视图，请先在顶部切换到具体项目，或从指挥部看板进入"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="单号 / 材料 / 品牌 / 定样 / 供应商 / 退场原因"
          style="width: 280px"
          :prefix-icon="Search"
          aria-label="单号 / 材料 / 品牌 / 定样 / 供应商 / 退场原因"
        />
        <el-select
          v-model="entryTypeFilter"
          clearable
          placeholder="进场类型"
          style="width: 120px"
          aria-label="进场类型"
        >
          <el-option
            v-for="(label, val) in ENTRY_TYPE_LABEL"
            :key="val"
            :label="label"
            :value="val"
          />
        </el-select>
        <el-select v-model="exited" clearable placeholder="状态" style="width: 110px" aria-label="状态">
          <el-option label="已进场" value="0" />
          <el-option label="已退场" value="1" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </div>

      <el-table
        :data="list"
        stripe
        border
        empty-text="暂无已通过进场记录"
        :default-sort="{ prop: 'submit_time', order: 'descending' }"
      >
        <el-table-column prop="entry_id" label="进场单号" width="110" fixed />
        <el-table-column label="类型" width="80" sortable prop="entry_type">
          <template #default="{ row }">{{ ENTRY_TYPE_LABEL[row.entry_type] || '材料' }}</template>
        </el-table-column>
        <el-table-column label="名称" min-width="120">
          <template #default="{ row }">{{ displayName(row) }}</template>
        </el-table-column>
        <el-table-column prop="brand_name" label="品牌" width="100" />
        <el-table-column label="定样单号" width="100">
          <template #default="{ row }">{{
            row.sample_application_id || row.sample_id || '—'
          }}</template>
        </el-table-column>
        <el-table-column label="进场数量" width="100">
          <template #default="{ row }">{{ row.quantity }}{{ row.unit }}</template>
        </el-table-column>
        <el-table-column prop="supplier" label="供应商" min-width="110" show-overflow-tooltip />
        <el-table-column prop="submit_time" label="进场时间" width="160" sortable>
          <template #default="{ row }">{{ row.submit_time || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.exited ? 'warning' : 'success'" effect="plain">
              {{ row.exited ? '已退场' : '已进场' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="退场数量" width="100">
          <template #default="{ row }">
            <span v-if="row.exited">{{ row.exit_qty }}{{ row.unit }}</span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="exit_time" label="退场时间" width="160">
          <template #default="{ row }">{{ row.exit_time || '—' }}</template>
        </el-table-column>
        <el-table-column prop="exit_reason" label="退场原因" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.exit_reason || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/mat/applications/detail?id=${row.entry_id}`)"
            >
              详情
            </el-button>
            <el-button
              link
              type="primary"
              :icon="Download"
              :loading="exportLoadingId === row.entry_id || exportLoading"
              @click="onExportArchive(row)"
            >
              导出归档
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <MatArchiveExportDialog
        v-model="dialogVisible"
        :loading="exportLoading"
        @confirm="onConfirmExportArchive"
      />
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
</style>
