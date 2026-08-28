<script setup>
import './mat-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  ENTRY_TYPE_LABEL,
  listEntries,
  STATUS_LABEL,
  statusLabel,
  statusTagType,
  isReviewingStatus,
  withdrawEntry,
  getEntryDetail,
} from '../../../mock/mat.js'
import { useMatArchiveExport } from '../../../composables/useMatArchiveExport.js'
import MatArchiveExportDialog from './components/MatArchiveExportDialog.vue'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const entryTypeFilter = ref('')
const tick = ref(0)
const exportLoadingId = ref('')
const { dialogVisible, exportLoading, openExportDialog, confirmExport } = useMatArchiveExport()

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listEntries(scopeProjectId.value, {
    keyword: keyword.value,
    status: statusFilter.value,
    entry_type: entryTypeFilter.value,
  })
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
  entryTypeFilter.value = ''
}

function displayName(row) {
  return row.entry_type === 'equipment' ? row.equipment_name : row.material_name
}

function lineSpecQtyLines(row) {
  if (row.entry_type === 'equipment') {
    const qty = `${row.quantity ?? ''}${row.unit || ''}`
    const spec = (row.model || '').trim()
    if (spec && qty) return [`${spec} × ${qty}`]
    return [qty || spec || '—']
  }
  const lines = Array.isArray(row.line_items) ? row.line_items : []
  if (lines.length) {
    return lines.map((l) => {
      const spec = (l.material_spec || '').trim() || '—'
      const qty = `${l.quantity ?? ''}${l.unit || ''}`
      return qty ? `${spec} × ${qty}` : spec
    })
  }
  const spec = (row.material_spec || '').trim()
  const qty = `${row.quantity ?? ''}${row.unit || ''}`
  if (spec && qty) return [`${spec} × ${qty}`]
  return [spec || qty || '—']
}

function lineSpecQtyText(row) {
  return lineSpecQtyLines(row).join('；')
}

function onCopyNew(row) {
  router.push(
    `/qm/mat/applications/edit?copyFrom=${row.entry_id}&entry_type=${row.entry_type || 'material'}`,
  )
}

function onReEdit(row) {
  router.push(
    `/qm/mat/applications/edit?id=${row.entry_id}&reEdit=1&entry_type=${row.entry_type || 'material'}`,
  )
}

function onResubmit(row) {
  if (row.status === 'withdrawn') onReEdit(row)
  else if (row.status === 'rejected') onCopyNew(row)
}

async function onWithdraw(row) {
  try {
    await ElMessageBox.confirm(`确认撤回进场单 ${row.entry_id}？仅待审批时可撤。`, '撤回', {
      type: 'warning',
    })
  } catch {
    return
  }
  const r = withdrawEntry(row.entry_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已撤回')
}

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
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料设备进场 / 进场申请</div>
      <h1 class="page-title">进场申请</h1>
      <p class="page-tip">
        当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="进场申请为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="单号 / 名称 / 品牌 / 规格"
          style="width: 260px"
          :prefix-icon="Search" aria-label="单号 / 名称 / 品牌 / 规格"/>
        <el-select v-model="entryTypeFilter" clearable placeholder="进场类型" style="width: 130px" aria-label="进场类型">
          <el-option
            v-for="(label, val) in ENTRY_TYPE_LABEL"
            :key="val"
            :label="label"
            :value="val"
          />
        </el-select>
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px" aria-label="状态">
          <el-option
            v-for="(label, val) in STATUS_LABEL"
            :key="val"
            :label="label"
            :value="val"
          />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/qm/mat/applications/edit')">
          新增进场申请
        </el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无进场申请">
        <el-table-column prop="entry_id" label="进场单号" width="110" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            {{ ENTRY_TYPE_LABEL[row.entry_type] || '材料' }}
          </template>
        </el-table-column>
        <el-table-column label="关联定样" width="100">
          <template #default="{ row }">{{
            row.sample_application_id || row.sample_id || '—'
          }}</template>
        </el-table-column>
        <el-table-column label="名称" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ displayName(row) }}</template>
        </el-table-column>
        <el-table-column prop="use_part" label="施工部位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.use_part || '—' }}</template>
        </el-table-column>
        <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip />
        <el-table-column prop="supplier" label="供应商" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.supplier || '—' }}</template>
        </el-table-column>
        <el-table-column label="规格及数量" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="spec-qty-cell" :title="lineSpecQtyText(row)">
              <div v-for="(t, i) in lineSpecQtyLines(row)" :key="i">{{ t }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="160" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/mat/applications/detail?id=${row.entry_id}`)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'approved'"
              link
              type="primary"
              :loading="exportLoadingId === row.entry_id || exportLoading"
              @click="onExportArchive(row)"
            >
              导出归档
            </el-button>
            <el-button
              v-if="isReviewingStatus(row.status)"
              link
              type="warning"
              @click="onWithdraw(row)"
            >
              撤回
            </el-button>
            <el-button
              v-if="row.status === 'withdrawn' || row.status === 'rejected'"
              link
              type="primary"
              @click="onResubmit(row)"
            >
              重新申报
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
.spec-qty-cell div {
  line-height: 1.4;
}
.mb {
  margin-bottom: 12px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
</style>
