<script setup>
import './mat-page.css'
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { selectedProjectId, useQmProjectScope } from '../../../composables/useCurrentProject'
import { buildHqDashboardByProject, getDashboard } from '../../../mock/mat.js'

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tick = ref(0)
const keyword = ref('')

const dash = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) {
    return {
      total_batches: 0,
      pending_count: 0,
      approved_count: 0,
      exited_count: 0,
    }
  }
  return getDashboard(scopeProjectId.value)
})

const hqRows = computed(() => {
  void tick.value
  return buildHqDashboardByProject()
})

const hqFiltered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return hqRows.value
  return hqRows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

function resetKw() {
  keyword.value = ''
}

function viewProjectDetail(row) {
  if (!row?.project_id) return
  selectedProjectId.value = row.project_id
  ElMessage.success(`已切换至项目：${row.project_name}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        {{ isHqSelected ? '质量看板' : '材料进场管理' }} / 材料进场看板
      </div>
      <h1 class="page-title">材料进场看板</h1>
      <p class="page-tip">
        <template v-if="isHqSelected">指挥部：按项目汇总进场指标</template>
        <template v-else>当前：{{ scopeProjectLabel }}</template>
      </p>
    </div>

    <template v-if="isHqSelected">
      <el-card shadow="never">
        <template #header>
          <div class="title-row">
            <strong>项目进场汇总</strong>
            <span class="muted">点击「查看项目详情」进入该项目看板</span>
          </div>
        </template>
        <div class="filter-bar mb">
          <el-input
            v-model="keyword"
            clearable
            placeholder="项目名称"
            style="width: 260px"
            :prefix-icon="Search"
          />
          <el-button type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="resetKw">重置</el-button>
        </div>
        <el-table :data="hqFiltered" stripe border empty-text="暂无项目数据">
          <el-table-column
            prop="project_name"
            label="项目名称"
            min-width="220"
            fixed
            show-overflow-tooltip
          />
          <el-table-column prop="entry_count" label="进场登记次数" width="130" align="center" />
          <el-table-column prop="exit_count" label="退场登记次数" width="130" align="center" />
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewProjectDetail(row)">查看项目详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <template v-else>
      <div class="stat-grid mb">
        <div class="stat-card">
          <div class="label">进场批次</div>
          <div class="value">{{ dash.total_batches }}</div>
        </div>
        <div class="stat-card">
          <div class="label">审核中</div>
          <div class="value">{{ dash.pending_count }}</div>
        </div>
        <div class="stat-card">
          <div class="label">已通过</div>
          <div class="value">{{ dash.approved_count }}</div>
        </div>
        <div class="stat-card">
          <div class="label">已退场</div>
          <div class="value">{{ dash.exited_count }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
