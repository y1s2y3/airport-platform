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
  await router.push('/vehicle/dashboard')
  selectedProjectId.value = row.projectId
  ElMessage.success(`已切换至项目：${row.projectName}`)
}
</script>

<template>
  <div class="vehicle-dashboard page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        {{ isHqSelected ? '安全看板' : '车辆管理' }} / 车辆管理看板
      </div>
      <div class="page-heading">
        <h1 class="page-title">车辆管理看板</h1>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ projectLabel }}</p>
      <p class="page-tip">
        {{
          isHqSelected
            ? '按项目汇总车辆进出场、在场/在途及预警；点击「查看项目详情」进入项目级车辆管理看板'
            : '车辆监管总看板：展示本项目车辆进出场量、在途/在场数量及异常预警统计。'
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
      <div class="summary-card">
        <div class="summary-value">{{ data.summary.inTransit }}</div>
        <div class="summary-label">在途车辆</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">{{ data.summary.registered }}</div>
        <div class="summary-label">登记车辆</div>
      </div>
      <div class="summary-card warn">
        <div class="summary-value">{{ data.summary.totalWarnings }}</div>
        <div class="summary-label">异常预警</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <section class="dashboard-panel">
        <div class="panel-title">各项目车辆统计</div>
        <el-table :data="data.projectStats" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="projectName" label="项目" min-width="160" show-overflow-tooltip />
          <el-table-column prop="todayIn" label="今日进场" width="90" align="center" />
          <el-table-column prop="todayOut" label="今日出场" width="90" align="center" />
          <el-table-column prop="onSite" label="在场" width="72" align="center" />
          <el-table-column prop="inTransit" label="在途" width="72" align="center" />
          <el-table-column prop="registered" label="登记车辆" width="90" align="center" />
          <el-table-column prop="vehicleWarnings" label="车辆监管预警" width="110" align="center" />
          <el-table-column prop="trackWarnings" label="轨迹预警" width="90" align="center" />
          <el-table-column prop="totalWarnings" label="预警合计" width="90" align="center">
            <template #default="{ row }">
              <span :class="{ 'warn-text': row.totalWarnings > 0 }">{{ row.totalWarnings }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="isHqSelected" label="操作" width="130" min-width="130" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewProjectDetail(row)">查看项目详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="dashboard-panel">
        <div class="panel-title">异常预警动态</div>
        <el-table :data="data.recentWarnings" border stripe class="ap-table" empty-text="暂无异常预警">
          <el-table-column prop="plateNo" label="车牌号" width="110" />
          <el-table-column v-if="isHqSelected" prop="projectName" label="项目" min-width="140" show-overflow-tooltip />
          <el-table-column prop="warningType" label="预警类型" min-width="120" />
          <el-table-column prop="source" label="来源" width="90" align="center" />
          <el-table-column prop="time" label="触发时间" width="160" />
        </el-table>
      </section>
    </div>
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
  grid-template-columns: repeat(6, minmax(0, 1fr));
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

.summary-card.warn {
  border-color: rgba(229, 57, 53, 0.25);
  background: #fff8f7;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--ap-text);
  line-height: 1.2;
}

.summary-card.warn .summary-value {
  color: var(--ap-danger);
}

.summary-label {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ap-text-secondary);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;
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

.warn-text {
  color: var(--ap-danger);
  font-weight: 600;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
