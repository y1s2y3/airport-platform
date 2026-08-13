<script setup>
import './mat-page.css'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { listLedger, STATUS_LABEL, statusTagType } from '../../../mock/mat.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const brandMatch = ref('')
const exited = ref('')

watch(
  () => route.query,
  (q) => {
    if (q.status != null) statusFilter.value = String(q.status)
    if (q.brandMatch != null) brandMatch.value = String(q.brandMatch)
    if (q.exited != null) exited.value = String(q.exited)
  },
  { immediate: true },
)

const list = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listLedger(scopeProjectId.value, {
    keyword: keyword.value,
    status: statusFilter.value,
    brandMatch: brandMatch.value,
    exited: exited.value,
  })
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
  brandMatch.value = ''
  exited.value = ''
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料进场管理 / 材料进场台账</div>
      <h1 class="page-title">材料进场台账</h1>
      <p class="page-tip">
        全量进场台账（含退场信息）· 当前：{{
          isHqSelected ? '请切换到具体项目' : scopeProjectLabel
        }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="台账为项目级视图，请先在顶部切换到具体项目"
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
        />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 130px">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-select v-model="brandMatch" clearable placeholder="品牌一致" style="width: 120px">
          <el-option label="一致" value="1" />
          <el-option label="不一致" value="0" />
        </el-select>
        <el-select v-model="exited" clearable placeholder="退场" style="width: 110px">
          <el-option label="已退场" value="1" />
          <el-option label="未退场" value="0" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无进场记录">
        <el-table-column prop="entry_id" label="进场单号" width="110" fixed />
        <el-table-column prop="material_name" label="材料名称" min-width="120" />
        <el-table-column prop="brand_name" label="品牌" width="100" />
        <el-table-column prop="sample_id" label="定样单号" width="100">
          <template #default="{ row }">{{ row.sample_id || '—' }}</template>
        </el-table-column>
        <el-table-column label="进场数量" width="100">
          <template #default="{ row }">{{ row.quantity }}{{ row.unit }}</template>
        </el-table-column>
        <el-table-column prop="supplier" label="供应商" min-width="110" show-overflow-tooltip />
        <el-table-column label="品牌一致" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.brand_match ? 'success' : 'danger'">
              {{ row.brand_match ? '一致' : '不一致' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审批状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ STATUS_LABEL[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="退场状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.exited ? 'warning' : 'info'" effect="plain">
              {{ row.exited ? '已退场' : '未退场' }}
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
        <el-table-column prop="submit_time" label="进场提交时间" width="160" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/mat/applications/detail?id=${row.entry_id}`)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>
