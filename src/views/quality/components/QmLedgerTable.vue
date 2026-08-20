<script setup>
/**
 * 实体验收台账列表（指挥部按项目汇总）
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { selectedProjectId } from '../../../composables/useCurrentProject'
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

function viewProjectDetail(row) {
  if (!row?.project_id) return
  selectedProjectId.value = row.project_id
  ElMessage.success(`已切换至项目：${row.project_name}`)
  router.push('/qm/inspect/dashboard')
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
        :prefix-icon="Search" aria-label="项目名称"/>
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无项目验评数据">
      <el-table-column prop="project_name" label="项目名称" min-width="220" fixed show-overflow-tooltip />
      <el-table-column label="节点总数" width="96" align="center" prop="nodeTotal" />
      <el-table-column label="验收完成节点" width="110" align="center" prop="nodeCompleted" />
      <el-table-column label="节点完成率" width="100" align="center">
        <template #default="{ row }">{{ row.nodeCompleteRate }}%</template>
      </el-table-column>
      <el-table-column label="验收任务总数" width="110" align="center" prop="taskTotal" />
      <el-table-column label="通过率" width="88" align="center">
        <template #default="{ row }">{{ row.passRate }}%</template>
      </el-table-column>
      <el-table-column label="一次性通过率" width="110" align="center">
        <template #default="{ row }">{{ row.firstPassRate }}%</template>
      </el-table-column>
      <el-table-column label="整改总数" width="96" align="center" prop="rectifyTotal" />
      <el-table-column label="整改中" width="88" align="center" prop="rectifying" />
      <el-table-column label="整改完成率" width="100" align="center">
        <template #default="{ row }">{{ row.rectifyCompleteRate }}%</template>
      </el-table-column>
      <el-table-column label="整改延期" width="96" align="center">
        <template #default="{ row }">
          <span :class="{ 'num-danger': row.rectifyOverdueCount > 0 }">{{ row.rectifyOverdueCount }}</span>
        </template>
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
.num-danger {
  color: #c62828;
  font-weight: 600;
}
</style>
