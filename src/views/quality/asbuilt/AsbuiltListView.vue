<script setup>
import '../mat/mat-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { listAsbuilt, STATUS_LABEL, NODE_LABEL, statusTagType } from '../../../mock/asbuilt.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')

const list = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listAsbuilt(scopeProjectId.value, {
    keyword: keyword.value,
    status: statusFilter.value,
  })
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

function goCreate() {
  router.push('/qm/asbuilt/edit')
}

function copyFromRejected(row) {
  router.push(`/qm/asbuilt/edit?copyFrom=${row.id}`)
}

function nodeSummary(row) {
  const nodes = row.nodes || []
  if (!nodes.length) return '—'
  if (nodes.length === 1) return nodes[0].wbs_node_path || nodes[0].wbs_node_id
  return `${nodes[0].wbs_node_path || nodes[0].wbs_node_id} 等 ${nodes.length} 项`
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">施工质量管控 / 实模一致验收</div>
      <h1 class="page-title">实模一致验收</h1>
      <p class="page-tip">
        审批在个人中心待办处理 · 当前：{{
          isHqSelected ? '请切换到具体项目' : scopeProjectLabel
        }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="实模一致验收为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="单号 / 名称 / 节点 / 报告 / 备注"
          style="width: 280px"
          :prefix-icon="Search"
          aria-label="单号 / 名称 / 节点 / 报告 / 备注"
        />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px" aria-label="状态">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Plus" @click="goCreate">新建验收</el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无实模一致验收单">
        <el-table-column prop="biz_no" label="验收单号" width="140" />
        <el-table-column prop="title" label="任务名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="所选节点" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ nodeSummary(row) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ STATUS_LABEL[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前节点" width="120">
          <template #default="{ row }">{{ NODE_LABEL[row.current_node] || '—' }}</template>
        </el-table-column>
        <el-table-column prop="submitted_at" label="提交时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/asbuilt/detail?id=${row.id}`)"
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
    </template>
  </div>
</template>
