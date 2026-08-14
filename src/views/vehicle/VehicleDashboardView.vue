<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { selectedProjectId, useCurrentProject } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import { getVehicleDashboardData } from '../../mock/vehicleManagement'

const router = useRouter()
const { isHqSelected } = useCurrentProject()

const dashboardScopeId = computed(() =>
  isHqSelected.value ? HQ_PROJECT_OPTION.id : selectedProjectId.value,
)

const data = computed(() => getVehicleDashboardData(dashboardScopeId.value))

async function viewProjectDetail(row) {
  if (!row?.project_id) return
  selectedProjectId.value = row.project_id
  await router.push('/vehicle/access')
  ElMessage.success(`已切换至项目：${row.project_name}（进出场记录）`)
}
</script>

<template>
  <div class="vehicle-dashboard page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        车辆管理 / 车辆管理看板
      </div>
      <div class="page-heading">
      <h1 class="page-title">车辆管理看板</h1>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">{{ data.summary.today_in_count }}</div>
        <div class="summary-label">今日进场</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">{{ data.summary.today_out_count }}</div>
        <div class="summary-label">今日出场</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">{{ data.summary.on_site_count }}</div>
        <div class="summary-label">在场车辆</div>
      </div>
    </div>

    <section class="dashboard-panel">
      <div class="panel-title">各项目车辆统计</div>
      <el-table :data="data.projectStats" border stripe class="ap-table">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="project_name" label="项目" min-width="160" show-overflow-tooltip />
        <el-table-column prop="today_in_count" label="今日进场" width="90" align="center" />
        <el-table-column prop="today_out_count" label="今日出场" width="90" align="center" />
        <el-table-column prop="on_site_count" label="在场" width="72" align="center" />
        <el-table-column v-if="isHqSelected" label="操作" width="130" min-width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewProjectDetail(row)">查看项目详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 16px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  text-align: center;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--ap-text);
  line-height: 1.2;
}

.summary-label {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ap-text-secondary);
}

.dashboard-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  min-width: 0;
  overflow-x: auto;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 12px;
}
</style>
