<script setup>
/**
 * 实体验收台账列表（指挥部按项目汇总）— 对齐 PRD 四态统计
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { COC_PROJECT_OPTIONS } from '../../../config/projectOptions.js'
import { buildQmLedgerByProject } from '../../../mock/qm.js'

const props = defineProps({
  /** 仅展示某一项目（项目级看板可选） */
  projectId: { type: String, default: '' },
  /** 是否展示筛选栏 */
  showFilter: { type: Boolean, default: true },
})

const router = useRouter()
const keyword = ref('')

const rows = computed(() => {
  let list = buildQmLedgerByProject(COC_PROJECT_OPTIONS)
  if (props.projectId) list = list.filter((r) => r.project_id === props.projectId)
  return list
})

const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return rows.value
  return rows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

function reset() {
  keyword.value = ''
}

function passRateText(row) {
  const approved = Number(row.approved_count ?? row.approvedCount)
  const rejected = Number(row.rejected_count ?? row.rejectedCount)
  if (!(approved + rejected)) return '—'
  return `${row.pass_rate ?? row.passRate}%`
}

function viewProjectDetail(row) {
  if (!row?.project_id) return
  router.push({
    path: '/qm/inspect/tree',
    query: { from: 'hq', projectId: row.project_id },
  })
}
</script>

<template>
  <div class="ledger-table">
    <div v-if="showFilter" class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="项目名称"
        style="width: 260px"
        :prefix-icon="Search"
        aria-label="项目名称"
      />
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无项目验评数据">
      <el-table-column prop="project_name" label="项目名称" min-width="200" fixed show-overflow-tooltip />
      <el-table-column label="待提交" width="88" align="center">
        <template #default="{ row }">{{ row.pending_count ?? row.pendingCount }}</template>
      </el-table-column>
      <el-table-column label="审批中" width="88" align="center">
        <template #default="{ row }">{{ row.approving_count ?? row.approvingCount }}</template>
      </el-table-column>
      <el-table-column label="已通过" width="88" align="center">
        <template #default="{ row }">{{ row.approved_count ?? row.approvedCount }}</template>
      </el-table-column>
      <el-table-column label="已驳回" width="88" align="center">
        <template #default="{ row }">{{ row.rejected_count ?? row.rejectedCount }}</template>
      </el-table-column>
      <el-table-column label="验收任务数" width="100" align="center">
        <template #default="{ row }">{{ row.task_total ?? row.taskTotal }}</template>
      </el-table-column>
      <el-table-column label="一次性通过率" width="110" align="center">
        <template #default="{ row }">{{ passRateText(row) }}</template>
      </el-table-column>
      <el-table-column label="节点总数" width="96" align="center">
        <template #default="{ row }">{{ row.node_total ?? row.nodeTotal }}</template>
      </el-table-column>
      <el-table-column label="验收完成节点" width="110" align="center">
        <template #default="{ row }">{{ row.node_completed ?? row.nodeCompleted }}</template>
      </el-table-column>
      <el-table-column label="节点完成率" width="100" align="center">
        <template #default="{ row }">{{ row.node_complete_rate ?? row.nodeCompleteRate }}%</template>
      </el-table-column>
      <el-table-column label="操作" width="130" min-width="130" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewProjectDetail(row)">查看项目详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.ledger-table { display: flex; flex-direction: column; gap: 12px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
</style>
