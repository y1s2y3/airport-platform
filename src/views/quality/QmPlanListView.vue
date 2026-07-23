<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  acceptancePlans,
  cancelPlan,
  inspectionTasks,
  NODE_TYPE_LABEL,
  PLAN_STATUS,
  PLAN_TYPE,
  resolveEditPathByNodeType,
  resolveProjectName,
  TASK_STATUS,
  taskStatusTagType,
  wbsNodes,
} from '../../mock/qm.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')

const taskVisible = ref(false)
const taskPlan = ref(null)

const list = computed(() => {
  let rows = [...acceptancePlans]
  if (!isHqSelected.value && scopeProjectId.value) {
    rows = rows.filter((p) => p.project_id === scopeProjectId.value)
  }
  if (statusFilter.value !== '') {
    rows = rows.filter((p) => String(p.status) === String(statusFilter.value))
  }
  const kw = keyword.value.trim()
  if (kw) rows = rows.filter((p) => `${p.plan_no}${p.plan_name}`.includes(kw))
  return rows
})

const planTasks = computed(() => {
  if (!taskPlan.value) return []
  return inspectionTasks.filter((t) => t.plan_id === taskPlan.value.id)
})

function nodeName(id) {
  return wbsNodes.find((n) => n.id === id)?.node_name || id
}

function planTaskCount(planId) {
  return inspectionTasks.filter((t) => t.plan_id === planId).length
}

async function onCancel(plan) {
  try {
    await ElMessageBox.confirm(`确认取消计划「${plan.plan_name}」？`, '取消计划', { type: 'warning' })
  } catch {
    return
  }
  const r = cancelPlan(plan)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('计划已取消')
}

function viewPlanTasks(plan) {
  taskPlan.value = plan
  taskVisible.value = true
}

function openTask(task) {
  const node = wbsNodes.find((n) => n.id === task.wbs_node_id)
  router.push(resolveEditPathByNodeType(node?.node_type || 6, task.id))
}

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 验收计划</div>
      <h1 class="page-title">验收计划</h1>
      <p class="page-tip">
        当前项目：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
      </p>
    </div>

    <div class="filter-bar">
      <el-input v-model="keyword" clearable placeholder="计划编号/名称" style="width: 220px" :prefix-icon="Search" />
      <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px">
        <el-option v-for="(label, val) in PLAN_STATUS" :key="val" :label="label" :value="String(val)" />
      </el-select>
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
      <el-button type="primary" :icon="Plus" @click="router.push('/qm/inspect/plans/edit')">编制计划</el-button>
    </div>

    <el-table :data="list" stripe border>
      <el-table-column prop="plan_no" label="计划编号" width="140" />
      <el-table-column prop="plan_name" label="计划名称" min-width="180" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">{{ PLAN_TYPE[row.plan_type] }}</template>
      </el-table-column>
      <el-table-column label="关联目录树" min-width="150">
        <template #default="{ row }">{{ nodeName(row.wbs_node_id) }}</template>
      </el-table-column>
      <el-table-column
        v-if="isHqSelected"
        label="项目名称"
        min-width="150"
      >
        <template #default="{ row }">{{ resolveProjectName(row.project_id) }}</template>
      </el-table-column>
      <el-table-column prop="plan_date" label="计划日期" width="120" />
      <el-table-column label="验评任务" width="90" align="center">
        <template #default="{ row }">{{ planTaskCount(row.id) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="row.status === 3 ? 'success' : row.status === 2 ? 'primary' : row.status === 0 ? 'warning' : 'info'"
          >
            {{ PLAN_STATUS[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="变更" width="70">
        <template #default="{ row }">{{ row.change_flag === 1 ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <!-- 待复核：复核 -->
          <el-button
            v-if="row.status === 0"
            link
            type="primary"
            @click="router.push(`/qm/inspect/plans/review?id=${row.id}`)"
          >
            复核
          </el-button>
          <!-- 未开始：取消 -->
          <el-button
            v-else-if="row.status === 1"
            link
            type="danger"
            @click="onCancel(row)"
          >
            取消
          </el-button>
          <!-- 进行中 / 已完成：查看验收任务 -->
          <el-button
            v-else
            link
            type="primary"
            @click="viewPlanTasks(row)"
          >
            查看验收任务
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="taskVisible"
      :title="`验收任务 — ${taskPlan?.plan_name || ''}`"
      width="860px"
      destroy-on-close
    >
      <el-table :data="planTasks" border stripe empty-text="该计划暂无验收任务" max-height="420">
        <el-table-column prop="task_no" label="任务编号" width="140" />
        <el-table-column label="节点类型" width="100">
          <template #default="{ row }">
            {{ NODE_TYPE_LABEL[wbsNodes.find((n) => n.id === row.wbs_node_id)?.node_type] || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="关联节点" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ nodeName(row.wbs_node_id) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="taskStatusTagType(row.status)">
              {{ TASK_STATUS[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openTask(row)">打开</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="taskVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
</style>
