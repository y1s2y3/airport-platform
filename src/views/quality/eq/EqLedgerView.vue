<script setup>
import '../mat/mat-page.css'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { listLedger, STATUS_LABEL, statusTagType } from '../../../mock/eq.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')

watch(
  () => route.query,
  (q) => {
    if (q.status != null) statusFilter.value = String(q.status)
  },
  { immediate: true },
)

const list = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listLedger(scopeProjectId.value, {
    keyword: keyword.value,
    status: statusFilter.value,
  })
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">设备进场管理 / 设备进场台账</div>
      <h1 class="page-title">设备进场台账</h1>
      <p class="page-tip">
        全量设备进场台账 · 当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
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
          placeholder="单号 / 设备 / 品牌 / 定样 / 型号"
          style="width: 260px"
          :prefix-icon="Search"
        />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 130px">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无设备进场记录">
        <el-table-column prop="entry_id" label="进场单号" width="110" />
        <el-table-column prop="equipment_name" label="设备名称" min-width="120" />
        <el-table-column prop="model" label="型号" width="110" show-overflow-tooltip />
        <el-table-column prop="brand_name" label="品牌" width="100" />
        <el-table-column prop="sample_id" label="定样单号" width="100">
          <template #default="{ row }">{{ row.sample_id || '—' }}</template>
        </el-table-column>
        <el-table-column label="数量" width="90">
          <template #default="{ row }">{{ row.quantity }}{{ row.unit }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ STATUS_LABEL[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="160" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/eq/applications/detail?id=${row.entry_id}`)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>
