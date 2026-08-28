<script setup>
import './brand-page.css'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { listLedger, MATERIAL_TYPE, ROLE_TAG, paginateBrandRows } from '../../../mock/brand.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)

const listAll = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listLedger(scopeProjectId.value, { keyword: keyword.value })
})

const total = computed(() => listAll.value.length)
const list = computed(() => paginateBrandRows(listAll.value, page.value, pageSize.value).items)

function reset() {
  keyword.value = ''
  page.value = 1
}

watch(keyword, () => {
  page.value = 1
})

function openDetail(row) {
  if (!row?.application_id) return
  router.push(`/qm/brand/ledger/detail?id=${row.application_id}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 品牌报审台账</div>
      <h1 class="page-title">品牌报审台账</h1>
      <p class="page-tip">
        审批通过后写入 · 当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
        · 唯一键：项目 + 品牌 + 厂家 + 材料（同品牌不同材料分多条）
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="品牌报审台账为项目级视图，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="品牌 / 厂家 / 材料/设备名称 / 报审编号"
          style="width: 280px"
          :prefix-icon="Search" aria-label="品牌 / 厂家 / 材料/设备名称 / 报审编号"/>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无台账记录">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="material_name" label="材料/设备名称" min-width="140" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] || row.material_type }}</template>
        </el-table-column>
        <el-table-column prop="brand_name" label="品牌名称" width="120" />
        <el-table-column prop="manufacturer" label="生产厂家" min-width="180" show-overflow-tooltip />
        <el-table-column label="主备标识" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.role_tag === 'primary' ? 'success' : 'info'">
              {{ ROLE_TAG[row.role_tag] || row.role_tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="application_id" label="报审单号" width="130">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">{{ row.application_id }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="use_part" label="施工部位" width="110" />
        <el-table-column prop="updated_at" label="更新时间" width="170" />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看报审单</el-button>
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
