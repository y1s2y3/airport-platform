<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  inspectionTasks,
  ORG_LABEL,
  RECTIFY_STATUS,
  rectificationOrders,
  resolveProjectName,
  taskStatusTagType,
} from '../../mock/qm.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')

const list = computed(() => {
  let rows = [...rectificationOrders]
  if (!isHqSelected.value && scopeProjectId.value) {
    rows = rows.filter((r) => r.project_id === scopeProjectId.value)
  }
  if (statusFilter.value !== '') {
    rows = rows.filter((r) => String(r.status) === String(statusFilter.value))
  }
  const kw = keyword.value.trim()
  if (kw) rows = rows.filter((r) => `${r.order_no}${r.problem_desc}`.includes(kw))
  return rows
})

function taskNo(source_task_id) {
  return inspectionTasks.find((t) => t.id === source_task_id)?.task_no || source_task_id
}

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

function isOverdue(row) {
  if (row.status === 3 || !row.deadline) return false
  const today = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const todayStr = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`
  return row.deadline.slice(0, 10) < todayStr
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 整改复验</div>
      <h1 class="page-title">整改复验</h1>
      <p class="page-tip">
        当前：{{ isHqSelected ? '请切换到项目' : scopeProjectLabel }} · 整改单与复验销号
      </p>
    </div>

    <div class="filter-bar">
      <el-input v-model="keyword" clearable placeholder="整改单号/问题描述" style="width: 240px" :prefix-icon="Search" aria-label="整改单号/问题描述"/>
      <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px" aria-label="状态">
        <el-option v-for="(label, val) in RECTIFY_STATUS" :key="val" :label="label" :value="String(val)" />
      </el-select>
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
    </div>

    <el-table :data="list" stripe border>
      <el-table-column prop="order_no" label="整改单号" width="140" />
      <el-table-column label="来源验评单号" width="130">
        <template #default="{ row }">{{ taskNo(row.source_task_id) }}</template>
      </el-table-column>
      <el-table-column label="项目名称" min-width="160">
        <template #default="{ row }">{{ resolveProjectName(row.project_id) }}</template>
      </el-table-column>
      <el-table-column prop="problem_desc" label="问题描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="责任单位" min-width="140">
        <template #default="{ row }">{{ ORG_LABEL[row.responsible_org_id] || row.responsible_org_id }}</template>
      </el-table-column>
      <el-table-column prop="deadline" label="整改期限" width="160" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 3 ? 'success' : taskStatusTagType(row.status)" size="small">
            {{ RECTIFY_STATUS[row.status] }}
          </el-tag>
          <el-tag v-if="isOverdue(row)" type="danger" size="small" style="margin-left: 4px">逾期</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/qm/inspect/rectify/detail?id=${row.id}`)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
</style>
