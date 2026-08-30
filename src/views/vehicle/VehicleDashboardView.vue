<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { selectedProjectId, useCurrentProject } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import { getVehicleDashboardData } from '../../mock/vehicleManagement'

const route = useRoute()
const router = useRouter()
const { isHqSelected, headerProjectLabel } = useCurrentProject()
const fromHq = computed(() => route.query.from === 'hq')

const dashboardScopeId = computed(() =>
  isHqSelected.value ? HQ_PROJECT_OPTION.id : selectedProjectId.value,
)

const data = computed(() => getVehicleDashboardData(dashboardScopeId.value))

function viewProjectDetail(row) {
  if (!row?.project_id) return
  selectedProjectId.value = row.project_id
  router.push({ path: '/vehicle/dashboard', query: { from: 'hq' } })
}

function goBackToHQ() {
  selectedProjectId.value = HQ_PROJECT_OPTION.id
  router.push('/vehicle/dashboard')
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
      <p v-if="!isHqSelected" class="page-tip">
        当前项目：{{ headerProjectLabel || selectedProjectId }}
      </p>
    </div>

    <div v-if="!isHqSelected && fromHq" class="hq-drill-back-bar">
      <el-button link type="primary" :icon="ArrowLeft" @click="goBackToHQ">返回</el-button>
      <span class="hq-drill-back-project">{{ headerProjectLabel || selectedProjectId }}</span>
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
      <div class="panel-title">{{ isHqSelected ? '各项目车辆统计' : '本项目车辆统计' }}</div>
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

.page-tip {
  margin: 8px 0 0;
  font-size: 13px;
  color: #606266;
}

.hq-drill-back-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.hq-drill-back-project {
  font-size: 14px;
  color: #606266;
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
