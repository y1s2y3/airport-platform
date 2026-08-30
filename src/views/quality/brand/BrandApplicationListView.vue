<script setup>
import './brand-page.css'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listApplications,
  MATERIAL_TYPE,
  NODE_LABEL,
  STATUS_LABEL,
  statusLabel,
  statusTagType,
  getApplicationDetail,
  paginateBrandRows,
} from '../../../mock/brand.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)
const page = ref(1)
const pageSize = ref(20)

const listAll = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listApplications(scopeProjectId.value, {
    keyword: keyword.value,
    status: statusFilter.value,
  }).map((a) => {
    const detail = getApplicationDetail(a.application_id)
    const cands = detail?.candidates || []
    const primary = cands.find((c) => c.is_primary)
    const alternates = cands.filter((c) => !c.is_primary)
    return {
      ...a,
      primary_brand: primary?.brand_name || '—',
      alternate_preview: alternates.map((c) => c.brand_name).join(' / ') || '—',
    }
  })
})

const total = computed(() => listAll.value.length)

const list = computed(() => paginateBrandRows(listAll.value, page.value, pageSize.value).items)

function reset() {
  keyword.value = ''
  statusFilter.value = ''
  page.value = 1
}

watch([keyword, statusFilter], () => {
  page.value = 1
})

function copyFromRejected(row) {
  router.push(`/qm/brand/applications/edit?copyFrom=${row.application_id}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审申请</div>
      <h1 class="page-title">报审申请</h1>
      <p class="page-tip">
        审批在个人中心待办处理
        · 当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="报审申请为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="报审编号 / 材料 / 品牌"
          style="width: 240px"
          :prefix-icon="Search" aria-label="报审编号 / 材料 / 品牌"/>
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px" aria-label="状态">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/qm/brand/applications/edit')">
          新增品牌报审
        </el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无报审单">
        <el-table-column prop="application_id" label="报审编号" width="130" />
        <el-table-column prop="material_name" label="材料/设备名称" min-width="130" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] }}</template>
        </el-table-column>
        <el-table-column prop="primary_brand" label="主选品牌" width="120" />
        <el-table-column prop="alternate_preview" label="备选品牌" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前节点" width="120">
          <template #default="{ row }">{{ NODE_LABEL[row.current_node] || '—' }}</template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/brand/applications/detail?id=${row.application_id}`)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'rejected'"
              link
              type="primary"
              @click="copyFromRejected(row)"
            >
              重新申报
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.pagination-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
