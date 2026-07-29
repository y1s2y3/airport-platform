<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listProcessPending,
  NODE_LABEL,
  STATUS_LABEL,
  statusTagType,
} from '../../../mock/sample.js'
import SampleDemoRoleBar from './SampleDemoRoleBar.vue'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const nodeFilter = ref('')
const tick = ref(0)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listProcessPending(scopeProjectId.value, nodeFilter.value || undefined)
})

function reset() {
  nodeFilter.value = ''
  tick.value += 1
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 关键工序样板审批</div>
      <h1 class="page-title">关键工序样板审批</h1>
      <p class="page-tip">
        监理 → 项目经理 · 通过后赋码 · 当前：{{
          isHqSelected ? '请切换到具体项目' : scopeProjectLabel
        }}
      </p>
    </div>

    <SampleDemoRoleBar />

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
        <el-select v-model="nodeFilter" clearable placeholder="当前节点" style="width: 160px">
          <el-option label="待监理审" value="supervisor" />
          <el-option label="待项目经理审" value="pm" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="tick += 1">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无待审批单据">
        <el-table-column prop="application_id" label="报审编号" width="120" />
        <el-table-column prop="process_name" label="工序名称" min-width="150" />
        <el-table-column prop="use_part" label="部位" min-width="130" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ STATUS_LABEL[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前节点" width="120">
          <template #default="{ row }">{{ NODE_LABEL[row.current_node] }}</template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="170" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/sample/process/approve/detail?id=${row.application_id}`)"
            >
              办理
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>
