<script setup>
import './mat-page.css'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Refresh, ArrowLeft } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS } from '../../../config/projectOptions'
import { listLedger, ENTRY_TYPE_LABEL } from '../../../mock/mat.js'
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

function goDetail(row) {
  const line = row.line_index != null ? row.line_index : 0
  router.push(`/qm/mat/applications/detail?id=${row.entry_no}&from=ledger&line=${line}`)
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
        仅展示审批通过的进场明细（一明细一行，含退场信息）· 当前：{{
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
        <el-select v-model="exited" clearable placeholder="退场状态" style="width: 120px" aria-label="退场状态">
          <el-option label="未退场" value="0" />
          <el-option label="部分退场" value="partial" />
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
        <el-table-column prop="entry_no" label="进场单号" width="110" fixed />
        <el-table-column label="类型" width="80" sortable prop="entry_type">
          <template #default="{ row }">{{ ENTRY_TYPE_LABEL[row.entry_type] || '材料' }}</template>
        </el-table-column>
        <el-table-column label="名称" min-width="120">
          <template #default="{ row }">{{ displayName(row) }}</template>
        </el-table-column>
        <el-table-column label="规格型号" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.material_spec || row.model || '—' }}</template>
        </el-table-column>
        <el-table-column prop="brand_name" label="品牌" width="100" />
        <el-table-column label="定样单号" width="100">
          <template #default="{ row }">{{
            row.sample_application_id || '—'
          }}</template>
        </el-table-column>
        <el-table-column label="进场数量" width="100">
          <template #default="{ row }">{{ row.quantity }}{{ row.unit }}</template>
        </el-table-column>
        <el-table-column prop="supplier" label="供应商" min-width="110" show-overflow-tooltip />
        <el-table-column prop="submit_time" label="进场时间" width="160" sortable>
          <template #default="{ row }">{{ row.submit_time || '—' }}</template>
        </el-table-column>
        <el-table-column label="退场状态" width="100">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="
                row.exit_status === 'full'
                  ? 'warning'
                  : row.exit_status === 'partial'
                    ? ''
                    : 'success'
              "
              effect="plain"
            >
              {{ row.exit_status_label || (row.exited ? '已退场' : '未退场') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="累计退场数量" width="120">
          <template #default="{ row }">
            <span v-if="row.exit_qty_total > 0">{{ row.exit_qty_total }}{{ row.unit }}</span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="剩余可退" width="100">
          <template #default="{ row }">
            <span v-if="row.exit_qty_total > 0 || row.exited">
              {{ row.remaining_qty }}{{ row.unit }}
            </span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="exit_time" label="最近退场时间" width="160">
          <template #default="{ row }">{{ row.exit_time || '—' }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="最近退场原因" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.reason || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
.muted {
  color: #909399;
}
</style>
