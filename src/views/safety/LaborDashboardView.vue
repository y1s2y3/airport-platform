<script setup>
import { laborDashboardData } from '../../mock/laborManagement'

const data = laborDashboardData
</script>

<template>
  <div class="dash-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">劳务管理 / 劳务看板</div>
      <h1 class="page-title">劳务看板</h1>
    </div>

    <div class="stats-row">
      <div class="stat-card"><span class="stat-label">总人数</span><span class="stat-value">{{ data.summary.total }}</span></div>
      <div class="stat-card"><span class="stat-label">管理人员</span><span class="stat-value">{{ data.summary.manager }}</span></div>
      <div class="stat-card"><span class="stat-label">特种作业</span><span class="stat-value warn">{{ data.summary.special }}</span></div>
      <div class="stat-card"><span class="stat-label">劳务人员</span><span class="stat-value">{{ data.summary.worker }}</span></div>
      <div class="stat-card"><span class="stat-label">今日出勤</span><span class="stat-value">{{ data.summary.todayPresent }}</span></div>
      <div class="stat-card"><span class="stat-label">出勤率</span><span class="stat-value ok">{{ data.summary.attendanceRate }}</span></div>
    </div>

    <div class="panel-grid">
      <section class="panel">
        <div class="panel-title">准入异常清单</div>
        <el-table :data="data.accessAbnormalList" border stripe size="small" class="ap-table">
          <el-table-column prop="name" label="姓名" width="80" />
          <el-table-column prop="company" label="单位" min-width="100" />
          <el-table-column prop="blockType" label="拦截类型" width="100">
            <template #default="{ row }">
              <span class="ap-status-tag ap-tag-high">{{ row.blockType }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="time" label="时间" width="80" />
        </el-table>
      </section>

      <section class="panel">
        <div class="panel-title">培训异常清单</div>
        <el-table :data="data.trainingAbnormalList" border stripe size="small" class="ap-table">
          <el-table-column prop="name" label="姓名" width="80" />
          <el-table-column prop="company" label="单位" min-width="100" />
          <el-table-column prop="abnormalType" label="异常类型" width="110" />
          <el-table-column prop="expireDate" label="到期日" width="100" />
        </el-table>
      </section>
    </div>

    <section class="panel full">
      <div class="panel-title">各项目出勤情况</div>
      <el-table :data="data.projectRanking" border stripe class="ap-table">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="projectName" label="项目" min-width="200" />
        <el-table-column prop="onSite" label="在场人数" width="100" align="center">
          <template #header>
            <el-tooltip content="已打上班卡且未打下班卡" placement="top">
              <span>在场人数</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="present" label="今日出勤" width="100" align="center" />
        <el-table-column prop="rate" label="出勤率" width="100" align="center" />
      </el-table>
    </section>
  </div>
</template>

<style scoped>
.dash-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; }
.stats-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
.stat-label { font-size: 13px; color: var(--ap-text-muted); }
.stat-value { font-size: 22px; font-weight: 700; color: var(--ap-primary); }
.stat-value.warn { color: var(--ap-warning); }
.stat-value.ok { color: var(--ap-success); }
.panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
.panel.full { margin-bottom: 0; }
.panel-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
</style>
