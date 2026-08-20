<script setup>
import '../mat/mat-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Connection } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listAsbuilt,
  deleteAsbuiltDraft,
  submitAsbuilt,
  simulateAsbuiltSync,
  STATUS_LABEL,
  DATA_SOURCE_LABEL,
  statusTagType,
} from '../../../mock/asbuilt.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)

const list = computed(() => {
  void tick.value
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

function goEdit(id = '', relatedRejectId = '') {
  const q = new URLSearchParams()
  if (id) q.set('id', id)
  if (relatedRejectId) q.set('relatedRejectId', relatedRejectId)
  const qs = q.toString()
  router.push(`/qm/asbuilt/edit${qs ? `?${qs}` : ''}`)
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除待提交单 ${row.biz_no}？`, '删除', { type: 'warning' })
  } catch {
    return
  }
  const r = deleteAsbuiltDraft(row.id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已删除')
}

async function onSubmit(row) {
  try {
    await ElMessageBox.confirm(
      `确认提交 ${row.biz_no}？提交后资料只读，进入个人中心待办审批。`,
      '提交审批',
      { type: 'warning' },
    )
  } catch {
    return
  }
  const r = submitAsbuilt(row.id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已提交，监理待办已生成（个人中心）')
}

function onSync() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  const r = simulateAsbuiltSync(scopeProjectId.value)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success(`已模拟第三方同步入库：${r.data.biz_no}（待提交，需人工发起审批）`)
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
        承接实模一致性报告与对比地址 · 审批仅个人中心待办 · 当前：{{
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
          placeholder="单号 / 名称 / 节点 / 地址"
          style="width: 260px"
          :prefix-icon="Search" aria-label="单号 / 名称 / 节点 / 地址"/>
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px" aria-label="状态">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Plus" @click="goEdit()">新建验收</el-button>
        <el-button :icon="Connection" @click="onSync">模拟第三方同步</el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无实模一致验收单">
        <el-table-column prop="biz_no" label="验收单号" width="140" />
        <el-table-column prop="title" label="任务名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="所选节点" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ nodeSummary(row) }}</template>
        </el-table-column>
        <el-table-column label="来源" width="100">
          <template #default="{ row }">{{ DATA_SOURCE_LABEL[row.data_source] || row.data_source }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ STATUS_LABEL[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitter_name" label="提交人" width="110" />
        <el-table-column prop="updated_at" label="更新时间" width="160" />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/asbuilt/detail?id=${row.id}`)"
            >
              详情
            </el-button>
            <el-button v-if="row.status === 'draft'" link type="primary" @click="goEdit(row.id)">
              编辑
            </el-button>
            <el-button v-if="row.status === 'draft'" link type="success" @click="onSubmit(row)">
              提交
            </el-button>
            <el-button v-if="row.status === 'draft'" link type="danger" @click="onDelete(row)">
              删除
            </el-button>
            <el-button
              v-if="row.status === 'rejected'"
              link
              type="warning"
              @click="goEdit('', row.id)"
            >
              重新申报
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>
