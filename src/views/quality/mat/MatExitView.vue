<script setup>
import './mat-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { listExits, getExitDetail } from '../../../mock/mat.js'

const router = useRouter()
const { isHqSelected, scopeProjectId } = useQmProjectScope()
const tick = ref(0)
const keyword = ref('')

const detailVisible = ref(false)
const detail = ref(null)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listExits(scopeProjectId.value, { keyword: keyword.value })
})

function resetFilter() {
  keyword.value = ''
}

function openDetail(row) {
  detail.value = getExitDetail(row.exit_id)
  detailVisible.value = true
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料设备进场管理 / 退场登记</div>
      <h1 class="page-title">退场登记</h1>
      <p class="page-tip">登记退场请在 APP「退场登记（移动端）」操作 · Web 仅查询与详情</p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="退场登记为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="退场单号 / 进场单号 / 材料 / 品牌 / 原因"
          style="width: 280px"
          :prefix-icon="Search" aria-label="退场单号 / 进场单号 / 材料 / 品牌 / 原因"/>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="resetFilter">重置</el-button>
        <el-button type="primary" plain @click="router.push('/mobile/mat/exit')">
          打开 APP 退场登记
        </el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无退场记录">
        <el-table-column prop="exit_id" label="退场单号" width="130" />
        <el-table-column prop="entry_id" label="进场单号" width="110" />
        <el-table-column prop="material_name" label="材料名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip />
        <el-table-column prop="supplier" label="供应商" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.supplier || '—' }}</template>
        </el-table-column>
        <el-table-column label="退场数量" width="110">
          <template #default="{ row }">{{ row.exit_qty }}{{ row.unit || '' }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="退场原因" min-width="160" show-overflow-tooltip />
        <el-table-column prop="operator" label="登记人" width="100" />
        <el-table-column prop="exit_time" label="登记时间" width="170" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <el-dialog v-model="detailVisible" title="退场详情" width="640px" destroy-on-close>
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="退场单号">{{ detail.exit_id }}</el-descriptions-item>
          <el-descriptions-item label="进场单号">{{ detail.entry_id }}</el-descriptions-item>
          <el-descriptions-item label="材料名称">{{ detail.material_name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关联定样">{{ detail.sample_id || '—' }}</el-descriptions-item>
          <el-descriptions-item label="品牌">{{ detail.brand_name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ detail.supplier || '—' }}</el-descriptions-item>
          <el-descriptions-item label="生产厂家">{{ detail.manufacturer || '—' }}</el-descriptions-item>
          <el-descriptions-item label="施工部位">{{ detail.use_part || '—' }}</el-descriptions-item>
          <el-descriptions-item label="进场数量">
            <template v-if="detail.quantity != null">{{ detail.quantity }}{{ detail.unit }}</template>
            <template v-else>—</template>
          </el-descriptions-item>
          <el-descriptions-item label="退场数量">
            {{ detail.exit_qty }}{{ detail.unit || '' }}
          </el-descriptions-item>
          <el-descriptions-item label="登记人">{{ detail.operator || '—' }}</el-descriptions-item>
          <el-descriptions-item label="登记时间">{{ detail.exit_time }}</el-descriptions-item>
          <el-descriptions-item label="退场原因" :span="2">{{ detail.reason }}</el-descriptions-item>
          <el-descriptions-item label="现场照片" :span="2">
            {{ detail.photo_file || '未上传' }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button type="primary" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>
