<script setup>
import './brand-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  getApplicationDetail,
  listApplications,
  MATERIAL_TYPE,
  NODE_LABEL,
  STATUS_LABEL,
  statusTagType,
} from '../../../mock/brand.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tab = ref('processing')
const keyword = ref('')

const processing = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listApplications(scopeProjectId.value, { status: 'in_approval' }).map(enrich)
})

const completed = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  const rows = listApplications(scopeProjectId.value, { keyword: keyword.value }).filter((a) =>
    ['approved', 'rejected', 'withdrawn'].includes(a.status),
  )
  return rows.map(enrich)
})

function enrich(a) {
  const detail = getApplicationDetail(a.application_id)
  return {
    ...a,
    brand_preview: (detail?.candidates || []).map((c) => c.brand_name).join(' / '),
  }
}

function reset() {
  keyword.value = ''
}

function openApprove(row) {
  router.push(`/qm/brand/approve/detail?id=${row.application_id}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审审批</div>
      <h1 class="page-title">报审审批</h1>
      <p class="page-tip">
        监理 → 项目经理终审 · 当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="报审审批为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <el-tabs v-model="tab">
        <el-tab-pane :label="`审批中（${processing.length}）`" name="processing" />
        <el-tab-pane label="已完成" name="completed" />
      </el-tabs>

      <template v-if="tab === 'processing'">
        <el-table :data="processing" stripe border empty-text="暂无待审单据">
          <el-table-column prop="application_id" label="报审编号" width="130" />
          <el-table-column prop="material_name" label="材料/设备" min-width="130" />
          <el-table-column label="类型" width="80">
            <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] }}</template>
          </el-table-column>
          <el-table-column prop="brand_preview" label="备选品牌" min-width="180" show-overflow-tooltip />
          <el-table-column prop="applicant_name" label="申请人" width="90" />
          <el-table-column prop="submit_time" label="提交时间" width="170" />
          <el-table-column label="当前节点" width="120">
            <template #default="{ row }">
              <el-tag size="small" type="warning">{{ NODE_LABEL[row.current_node] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openApprove(row)">审批</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template v-else>
        <div class="filter-bar">
          <el-input
            v-model="keyword"
            clearable
            placeholder="搜索已完成记录"
            style="width: 240px"
            :prefix-icon="Search"
          />
          <el-button type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="reset">重置</el-button>
        </div>
        <el-table :data="completed" stripe border empty-text="暂无已完成记录">
          <el-table-column prop="application_id" label="报审编号" width="130" />
          <el-table-column prop="material_name" label="材料/设备" min-width="130" />
          <el-table-column prop="brand_preview" label="备选品牌" min-width="160" show-overflow-tooltip />
          <el-table-column label="结果" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="statusTagType(row.status)">{{ STATUS_LABEL[row.status] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="finish_time" label="办结时间" width="170" />
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                @click="router.push(`/qm/brand/applications/detail?id=${row.application_id}`)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
</style>
