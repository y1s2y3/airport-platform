<script setup>
import './mat-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listEntries,
  STATUS_LABEL,
  statusTagType,
} from '../../../mock/mat.js'

const router = useRouter()
const { isHqSelected, scopeProjectId } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listEntries(scopeProjectId.value, {
    keyword: keyword.value,
    status: statusFilter.value,
  })
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

/** 一条进场可含多规格：合并展示「规格 × 数量单位」 */
function lineSpecQtyLines(row) {
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
  if (spec) return [spec]
  if (qty) return [qty]
  return ['—']
}

function lineSpecQtyText(row) {
  return lineSpecQtyLines(row).join('；')
}

function onReopen(row) {
  router.push(`/qm/mat/applications/edit?relatedRejectId=${row.entry_id}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料进场管理 / 材料进场申请</div>
      <h1 class="page-title">材料进场申请</h1>
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
          placeholder="单号 / 材料 / 品牌 / 规格 / 运单号"
          style="width: 260px"
          :prefix-icon="Search"
        />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px">
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
        <el-table-column prop="sample_id" label="关联定样" width="100">
          <template #default="{ row }">{{ row.sample_id || '—' }}</template>
        </el-table-column>
        <el-table-column prop="material_name" label="材料名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="use_part" label="施工部位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.use_part || '—' }}</template>
        </el-table-column>
        <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip />
        <el-table-column prop="manufacturer" label="生产厂家" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.manufacturer || '—' }}</template>
        </el-table-column>
        <el-table-column prop="supplier" label="供应商" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.supplier || '—' }}</template>
        </el-table-column>
        <el-table-column label="材料规格及数量" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="spec-qty-cell" :title="lineSpecQtyText(row)">
              <div v-for="(t, i) in lineSpecQtyLines(row)" :key="i">{{ t }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ STATUS_LABEL[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="160" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/mat/applications/detail?id=${row.entry_id}`)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'rejected'"
              link
              type="success"
              @click="onReopen(row)"
            >
              重开申请
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.spec-qty-cell {
  line-height: 1.5;
  font-size: 13px;
  color: #303133;
}
</style>
