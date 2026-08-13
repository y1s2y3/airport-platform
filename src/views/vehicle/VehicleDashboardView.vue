<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { selectedProjectId, useCurrentProject } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import { getVehicleDashboardData } from '../../mock/vehicleManagement'

const router = useRouter()
const { isHqSelected, headerProjectLabel } = useCurrentProject()

const dashboardScopeId = computed(() =>
  isHqSelected.value ? HQ_PROJECT_OPTION.id : selectedProjectId.value,
)
const projectLabel = computed(() => headerProjectLabel.value)

const data = computed(() => getVehicleDashboardData(dashboardScopeId.value))

async function viewProjectDetail(row) {
  if (!row?.projectId) return
  selectedProjectId.value = row.projectId
  await router.push('/vehicle/access')
  ElMessage.success(`已切换至项目：${row.projectName}（进出场记录）`)
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
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ projectLabel }}</p>
      <p class="page-tip">
        {{
          isHqSelected
            ? '按项目汇总车辆进出场与在场情况；点击「查看项目详情」进入该项目进出场记录（项目侧无车辆管理看板）'
            : '车辆管理看板仅指挥部提供；请切换至指挥部查看汇总，或前往「进出场记录」。'
        }}
      </p>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">{{ data.summary.todayIn }}</div>
        <div class="summary-label">今日进场</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">{{ data.summary.todayOut }}</div>
        <div class="summary-label">今日出场</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">{{ data.summary.onSite }}</div>
        <div class="summary-label">在场车辆</div>
      </div>
    </div>

    <section class="dashboard-panel">
      <div class="panel-title">各项目车辆统计</div>
      <el-table :data="data.projectStats" border stripe class="ap-table">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="projectName" label="项目" min-width="160" show-overflow-tooltip />
        <el-table-column prop="todayIn" label="今日进场" width="90" align="center" />
        <el-table-column prop="todayOut" label="今日出场" width="90" align="center" />
        <el-table-column prop="onSite" label="在场" width="72" align="center" />
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

.page-scope {
  margin: 4px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-tip {
  margin-top: 0;
  font-size: 12px;
  color: var(--ap-text-muted);
  line-height: 1.5;
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
