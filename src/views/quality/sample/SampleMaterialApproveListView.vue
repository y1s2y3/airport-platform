<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { listMaterialPending, statusLabel, statusTagType } from '../../../mock/sample.js'

const router = useRouter()
const { isHqSelected, scopeProjectId } = useQmProjectScope()
const tick = ref(0)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listMaterialPending(scopeProjectId.value)
})

function reset() {
  tick.value += 1
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 材料定样审批</div>
      <h1 class="page-title">材料定样审批</h1>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="请先切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-button type="primary" :icon="Search" @click="tick += 1">刷新</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无待审批单据">
        <el-table-column prop="application_id" label="报审编号" width="120" />
        <el-table-column prop="material_name" label="材料名称" min-width="140" />
        <el-table-column prop="use_part" label="施工部位" min-width="140" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="170" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/sample/material/approve/detail?id=${row.application_id}`)"
            >
              办理
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>
