<script setup>
import './mat-page.css'
import '../qm-hq-stats.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  buildHqDashboardByProject,
  buildHqDashboardSummary,
  getDashboard,
} from '../../../mock/mat.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tick = ref(0)
const keyword = ref('')

const dash = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) {
    return {
      total_batches: 0,
      material_count: 0,
      equipment_count: 0,
      in_approval_count: 0,
      approved_count: 0,
      rejected_count: 0,
      exited_count: 0,
      material_exited_count: 0,
      equipment_exited_count: 0,
    }
  }
  return getDashboard(scopeProjectId.value)
})

const hqRows = computed(() => {
  void tick.value
  return buildHqDashboardByProject()
})

const hqSummary = computed(() => {
  void tick.value
  return buildHqDashboardSummary()
})

const hqFiltered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return hqRows.value
  return hqRows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

function resetKw() {
  keyword.value = ''
}

function handleSearch() {
  ElMessage.success(`已按条件查询，共 ${hqFiltered.value.length} 个项目`)
}

async function viewProjectDetail(row) {
  if (!row?.project_id) return
  await router.push({
    path: '/qm/mat/ledger',
    query: { from: 'hq', projectId: row.project_id },
  })
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        {{ isHqSelected ? '质量看板' : '材料设备进场' }} / 材料设备进场
      </div>
      <h1 class="page-title">材料设备进场</h1>
      <p class="page-tip">
        <template v-if="isHqSelected">
          指挥部按项目汇总材料与设备进场数据。操作仅支持查看项目详情（进入该项目材料设备台账）。
        </template>
        <template v-else>当前：{{ scopeProjectLabel }}</template>
      </p>
    </div>

    <template v-if="isHqSelected">
      <div class="hq-stat-row cols-9">
        <div class="hq-stat-card">
          <span class="hq-stat-label">覆盖项目数</span>
          <span class="hq-stat-value">{{ hqSummary.projectCount }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">进场合计</span>
          <span class="hq-stat-value">{{ hqSummary.total_batches }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">材料进场</span>
          <span class="hq-stat-value">{{ hqSummary.material_count }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">材料退场</span>
          <span class="hq-stat-value">{{ hqSummary.material_exited_count }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">设备进场</span>
          <span class="hq-stat-value">{{ hqSummary.equipment_count }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">设备退场</span>
          <span class="hq-stat-value">{{ hqSummary.equipment_exited_count }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">审批中</span>
          <span class="hq-stat-value warn">{{ hqSummary.in_approval_count }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">已通过</span>
          <span class="hq-stat-value ok">{{ hqSummary.approved_count }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">已驳回</span>
          <span class="hq-stat-value danger">{{ hqSummary.rejected_count }}</span>
        </div>
      </div>

      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="项目名称 / 编号"
          style="width: 260px"
          :prefix-icon="Search" aria-label="项目名称 / 编号"/>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="resetKw">重置</el-button>
      </div>

      <el-table :data="hqFiltered" stripe border empty-text="暂无项目数据">
        <el-table-column type="index" label="序号" width="64" align="center" />
        <el-table-column
          prop="project_name"
          label="项目名称"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column prop="project_id" label="项目编号" width="100" />
        <el-table-column prop="total_batches" label="进场合计" width="100" align="center" />
        <el-table-column prop="material_count" label="材料进场" width="100" align="center" />
        <el-table-column prop="material_exited_count" label="材料退场" width="100" align="center" />
        <el-table-column prop="equipment_count" label="设备进场" width="100" align="center" />
        <el-table-column prop="equipment_exited_count" label="设备退场" width="100" align="center" />
        <el-table-column label="审批中" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'warn-num': row.in_approval_count > 0 }">{{ row.in_approval_count }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="approved_count" label="已通过" width="90" align="center" />
        <el-table-column label="已驳回" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'danger-num': row.rejected_count > 0 }">{{ row.rejected_count }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewProjectDetail(row)">查看项目详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <template v-else>
      <div class="stat-grid mb">
        <div class="stat-card">
          <div class="label">进场合计</div>
          <div class="value">{{ dash.total_batches }}</div>
        </div>
        <div class="stat-card">
          <div class="label">材料进场</div>
          <div class="value">{{ dash.material_count }}</div>
        </div>
        <div class="stat-card">
          <div class="label">材料退场</div>
          <div class="value">{{ dash.material_exited_count }}</div>
        </div>
        <div class="stat-card">
          <div class="label">设备进场</div>
          <div class="value">{{ dash.equipment_count }}</div>
        </div>
        <div class="stat-card">
          <div class="label">设备退场</div>
          <div class="value">{{ dash.equipment_exited_count }}</div>
        </div>
        <div class="stat-card">
          <div class="label">审批中</div>
          <div class="value">{{ dash.in_approval_count }}</div>
        </div>
        <div class="stat-card">
          <div class="label">已通过</div>
          <div class="value">{{ dash.approved_count }}</div>
        </div>
        <div class="stat-card">
          <div class="label">已驳回</div>
          <div class="value">{{ dash.rejected_count }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
