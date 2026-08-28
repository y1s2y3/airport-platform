<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Warning,
  DocumentChecked,
  Box,
  UserFilled,
} from '@element-plus/icons-vue'
import { personalTodoStore } from '../mock/personalCenter.js'
import {
  summaryCards,
  pendingHazardByProject,
  pendingHazardTotal,
  laborAbnormalCards,
  laborAttendanceSegments,
  laborAttendanceTotal,
  projectEvalBoard,
  systemActivityMetrics,
  deviceAlarmByProject,
  deviceAlarmTotal,
  pendingTaskDisplayLimit,
  noticePenaltyList,
  alertMessages,
} from '../mock/workbenchStats.js'

const router = useRouter()

const summaryIconMap = {
  Warning,
  DocumentChecked,
  Box,
  UserFilled,
}

const activeTaskModule = ref('全部')
const taskMoreVisible = ref(false)

function mapTodoToWorkbenchRow(todo) {
  return {
    id: todo.id,
    module: todo.category || todo.sourceLabel || '流程',
    title: todo.processName || todo.bizType || '待办',
    project: todo.detail?.project || todo.projectName || '—',
    applicant: todo.applicant || '—',
    time: todo.applyTime || '',
    needsApproval: true,
    approvalStatus: '待审批',
  }
}

const taskList = computed(() => personalTodoStore.todos.map(mapTodoToWorkbenchRow))

const taskModuleOptions = computed(() => {
  const modules = [...new Set(taskList.value.map((item) => item.module).filter(Boolean))]
  return [
    { label: '全部', count: taskList.value.length },
    ...modules.map((label) => ({
      label,
      count: taskList.value.filter((item) => item.module === label).length,
    })),
  ]
})

const filteredTasks = computed(() => {
  if (activeTaskModule.value === '全部') return taskList.value
  return taskList.value.filter((item) => item.module === activeTaskModule.value)
})

const panelTasks = computed(() => filteredTasks.value.slice(0, pendingTaskDisplayLimit))

const hazardBarMax = computed(() => Math.max(...pendingHazardByProject.map((r) => r.count), 1))

const attendanceDonutSegments = computed(() => {
  const total = laborAttendanceTotal
  let offset = 0
  return laborAttendanceSegments.map((c) => {
    const pct = c.value / total
    const seg = { ...c, pct, offset }
    offset += pct
    return seg
  })
})

const attendanceRate = computed(() => {
  const present = laborAttendanceSegments.find((s) => s.name === '正常出勤')?.value ?? 0
  return `${((present / laborAttendanceTotal) * 100).toFixed(1)}%`
})

const deviceAlarmMax = computed(() => Math.max(...deviceAlarmByProject.map((r) => r.alarmCount), 1))

function alertLevelType(level) {
  if (level === 'danger') return 'danger'
  if (level === 'warning') return 'warning'
  return 'info'
}

function docTypeClass(type) {
  return type === 'penalty' ? 'doc-penalty' : 'doc-notice'
}

function taskStatusType(status) {
  if (status === '待审批') return 'warning'
  if (status === '已通过') return 'success'
  if (status === '已驳回') return 'danger'
  return 'info'
}

function openTaskMore() {
  taskMoreVisible.value = true
}

function openApproval(task) {
  if (!task?.id) return
  router.push({
    path: '/personal-center/todo/handle',
    query: { id: task.id, from: 'todo' },
  })
}
</script>

<template>
  <div class="workbench-stats">
    <section class="summary-row">
      <div v-for="(card, i) in summaryCards" :key="i" class="summary-card">
        <div class="summary-top">
          <div class="summary-icon" :style="{ background: card.iconBg, color: card.iconColor }">
            <el-icon :size="22"><component :is="summaryIconMap[card.icon]" /></el-icon>
          </div>
          <div class="summary-main">
            <div class="summary-title">{{ card.title }}</div>
            <div class="summary-value-row">
              <span class="summary-value">{{ card.value }}</span>
              <a class="summary-link" href="#">去处理</a>
            </div>
          </div>
        </div>
        <div class="summary-footer">
          <span class="stat-new">今日新增 <b>{{ card.todayNew }}</b></span>
          <span class="stat-done">今日已处理 <b>{{ card.todayDone }}</b></span>
        </div>
      </div>
    </section>

    <section class="module-row module-row-3">
      <div class="panel-card module-card">
        <div class="panel-head">
          <span class="panel-title">任务待办</span>
          <button type="button" class="panel-more" @click="openTaskMore">更多</button>
        </div>
        <div class="module-tags">
          <button
            v-for="tag in taskModuleOptions"
            :key="tag.label"
            type="button"
            class="module-tag"
            :class="{ active: activeTaskModule === tag.label }"
            @click="activeTaskModule = tag.label"
          >
            {{ tag.label }}
            <span class="tag-count">{{ tag.count }}</span>
          </button>
        </div>
        <ul class="data-list task-list">
          <li v-for="item in panelTasks" :key="item.id">
            <el-tag size="small" type="info" effect="plain">{{ item.module }}</el-tag>
            <div class="task-main">
              <span class="list-title">{{ item.title }}</span>
              <span class="list-sub">{{ item.project }} · {{ item.applicant }}</span>
            </div>
            <el-tag
              v-if="item.needsApproval && item.approvalStatus"
              size="small"
              :type="taskStatusType(item.approvalStatus)"
              effect="light"
            >
              {{ item.approvalStatus }}
            </el-tag>
            <span class="list-time">{{ item.time }}</span>
            <el-button
              link
              type="primary"
              size="small"
              class="task-approve-btn"
              @click="openApproval(item)"
            >
              办理
            </el-button>
          </li>
        </ul>
      </div>

      <div class="panel-card module-card">
        <div class="panel-head">
          <span class="panel-title">任务单</span>
          <a class="panel-more" href="#">更多</a>
        </div>
        <ul class="data-list doc-list">
          <li v-for="item in noticePenaltyList" :key="item.id">
            <span class="doc-type" :class="docTypeClass(item.type)">{{ item.typeLabel }}</span>
            <div class="doc-main">
              <span class="list-title">{{ item.title }}</span>
              <span class="list-sub">{{ item.project }} · {{ item.date }}</span>
            </div>
            <el-tag size="small" :type="item.status === '待处理' ? 'danger' : 'warning'" effect="light">
              {{ item.status }}
            </el-tag>
          </li>
        </ul>
      </div>

      <div class="panel-card module-card">
        <div class="panel-head">
          <span class="panel-title">预警消息</span>
          <a class="panel-more" href="#">推送规则</a>
        </div>
        <ul class="data-list alert-list">
          <li v-for="item in alertMessages" :key="item.id">
            <el-tag size="small" :type="alertLevelType(item.level)" effect="plain">
              {{ item.category }}
            </el-tag>
            <span class="list-title">{{ item.text }}</span>
            <span class="list-time">{{ item.time }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="chart-section">
      <div class="chart-row-3">
        <div class="panel-card chart-card">
          <div class="panel-head">
            <span class="panel-title">待整改隐患统计</span>
            <span class="panel-sub">合计 {{ pendingHazardTotal }} 项</span>
          </div>
          <div class="hazard-bar-chart hazard-bar-chart--vertical">
            <div class="hazard-vbars">
              <div v-for="item in pendingHazardByProject" :key="item.projectName" class="hazard-vbar-item">
                <span class="hazard-vbar-val">{{ item.count }}</span>
                <div class="hazard-vbar-track">
                  <div
                    class="hazard-vbar-fill"
                    :style="{ height: (item.count / hazardBarMax) * 100 + '%' }"
                  />
                </div>
                <span class="hazard-vbar-label" :title="item.projectName">{{ item.projectName }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-card chart-card labor-panel">
          <div class="panel-head">
            <span class="panel-title">劳务人员管理</span>
          </div>
          <div class="labor-body">
            <div class="labor-cards">
              <div
                v-for="card in laborAbnormalCards"
                :key="card.label"
                class="labor-stat-card"
                :style="{ background: card.bg }"
              >
                <span class="labor-stat-label">{{ card.label }}</span>
                <span class="labor-stat-value" :style="{ color: card.color }">{{ card.count }}</span>
              </div>
            </div>
            <div class="labor-donut-area">
              <div class="donut-wrap">
                <svg viewBox="0 0 100 100" class="donut-chart">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#f0f0f0" stroke-width="14" />
                  <circle
                    v-for="(seg, i) in attendanceDonutSegments"
                    :key="i"
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    :stroke="seg.color"
                    stroke-width="14"
                    stroke-linecap="butt"
                    :stroke-dasharray="`${seg.pct * 238.76} 238.76`"
                    :stroke-dashoffset="`${-seg.offset * 238.76}`"
                    transform="rotate(-90 50 50)"
                  />
                  <text x="50" y="46" text-anchor="middle" class="donut-num">{{ attendanceRate }}</text>
                  <text x="50" y="58" text-anchor="middle" class="donut-label">出勤率</text>
                </svg>
              </div>
              <ul class="hazard-legend attendance-legend">
                <li v-for="item in laborAttendanceSegments" :key="item.name">
                  <span class="legend-dot" :style="{ background: item.color }" />
                  <span class="legend-name">{{ item.name }}</span>
                  <span class="legend-val">{{ item.value.toLocaleString() }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="panel-card chart-card device-alarm-card">
          <div class="panel-head">
            <span class="panel-title">设备报警统计</span>
            <span class="panel-sub">合计 {{ deviceAlarmTotal }} 次</span>
          </div>
          <div class="device-alarm-list">
            <div v-for="item in deviceAlarmByProject" :key="item.projectName" class="device-alarm-row">
              <span class="device-alarm-name" :title="item.projectName">{{ item.projectName }}</span>
              <div class="device-alarm-track">
                <div
                  class="device-alarm-fill"
                  :style="{ width: (item.alarmCount / deviceAlarmMax) * 100 + '%' }"
                />
              </div>
              <span class="device-alarm-count">{{ item.alarmCount }}</span>
              <span v-if="item.unhandled" class="device-alarm-pending">待处理 {{ item.unhandled }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-card chart-card eval-panel-full">
        <div class="panel-head">
          <span class="panel-title">项目验评看板</span>
        </div>
        <div class="eval-board-grid">
          <div
            v-for="item in projectEvalBoard"
            :key="item.projectName"
            class="eval-tile"
            :title="`${item.projectName} · 验评完成 ${item.completionRate}% · 一次性通过率 ${item.passRate}`"
          >
            <div
              class="eval-tile-fill"
              :style="{ height: item.completionRate + '%', background: item.color }"
            />
            <div class="eval-tile-content">
              <span class="eval-tile-name">{{ item.projectName }}</span>
              <span class="eval-tile-pass-label">一次性验评通过率</span>
              <span class="eval-tile-rate">{{ item.passRate }}</span>
              <span class="eval-tile-sub">完成 {{ item.completionRate }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-card activity-panel-full">
        <div class="activity-metrics-row">
          <div
            v-for="item in systemActivityMetrics"
            :key="item.key"
            class="activity-metric-item"
          >
            <span class="activity-metric-label">{{ item.label }}</span>
            <span class="activity-metric-value">{{ item.value.toLocaleString() }}</span>
            <span class="activity-metric-unit">{{ item.unit }}</span>
          </div>
        </div>
      </div>
    </section>

    <el-dialog v-model="taskMoreVisible" title="任务待办" width="720px" class="task-more-dialog">
      <div class="module-tags dialog-tags">
        <button
          v-for="tag in taskModuleOptions"
          :key="tag.label"
          type="button"
          class="module-tag"
          :class="{ active: activeTaskModule === tag.label }"
          @click="activeTaskModule = tag.label"
        >
          {{ tag.label }}
          <span class="tag-count">{{ tag.count }}</span>
        </button>
      </div>
      <el-table :data="filteredTasks" border stripe max-height="420" class="task-more-table">
        <el-table-column prop="module" label="模块" width="96" />
        <el-table-column prop="title" label="事项" min-width="180" show-overflow-tooltip />
        <el-table-column prop="project" label="项目" width="140" show-overflow-tooltip />
        <el-table-column prop="applicant" label="提交人" width="88" />
        <el-table-column prop="time" label="时间" width="148" />
        <el-table-column label="审批状态" width="96" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.needsApproval && row.approvalStatus"
              size="small"
              :type="taskStatusType(row.approvalStatus)"
              effect="light"
            >
              {{ row.approvalStatus }}
            </el-tag>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openApproval(row)">
              办理
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<style scoped>
.workbench-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-row,
.module-row {
  display: grid;
  gap: 12px;
}

.summary-row {
  grid-template-columns: repeat(4, 1fr);
}

.module-row-3 {
  grid-template-columns: repeat(3, 1fr);
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-row-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.eval-panel-full {
  width: 100%;
}

.activity-panel-full {
  width: 100%;
  background: #fafafa;
  padding: 14px 18px;
}

.activity-metrics-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.activity-metric-item {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
}

.activity-metric-label {
  color: var(--ap-text-secondary);
}

.activity-metric-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--ap-text);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.activity-metric-unit {
  font-size: 12px;
  color: var(--ap-text-muted);
}

.summary-card,
.panel-card {
  background: #fff;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  padding: 16px 18px;
}

.summary-top {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.summary-title {
  font-size: 13px;
  color: var(--ap-text-secondary);
  margin-bottom: 6px;
  line-height: 1.4;
}

.summary-value-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--ap-text);
  line-height: 1;
}

.summary-link,
.panel-more {
  font-size: 13px;
  color: #1677ff;
  text-decoration: none;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
}

.summary-link:hover,
.panel-more:hover {
  text-decoration: underline;
}

.summary-footer {
  display: flex;
  gap: 20px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: var(--ap-text-muted);
}

.stat-new b {
  color: var(--ap-danger);
  font-weight: 600;
}

.stat-done b {
  color: var(--ap-success);
  font-weight: 600;
}

.module-card {
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.chart-card {
  min-height: 300px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
}

.panel-sub {
  font-size: 12px;
  color: var(--ap-text-muted);
}

.module-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.module-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--ap-border);
  border-radius: 999px;
  background: #fafafa;
  font-size: 12px;
  color: var(--ap-text-secondary);
  cursor: pointer;
}

.module-tag.active {
  border-color: var(--ap-primary);
  background: var(--ap-primary-muted);
  color: var(--ap-primary);
  font-weight: 600;
}

.tag-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.06);
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.module-tag.active .tag-count {
  background: rgba(143, 0, 69, 0.15);
}

.data-list {
  list-style: none;
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.data-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #f0f0f0;
  font-size: 13px;
}

.data-list li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.list-title {
  flex: 1;
  color: var(--ap-text);
  line-height: 1.45;
}

.list-time {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--ap-text-muted);
  white-space: nowrap;
}

.doc-list li {
  align-items: center;
}

.task-list li {
  align-items: center;
  flex-wrap: wrap;
}

.task-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.task-approve-btn {
  flex-shrink: 0;
  margin-left: 4px;
}

.dialog-tags {
  margin-bottom: 12px;
}

.approval-desc {
  margin-bottom: 16px;
}

.approval-form {
  margin-top: 4px;
}

.attachment-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  width: 100%;
}

.attachment-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--ap-border);
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 6px;
}

.text-muted {
  color: var(--ap-text-muted);
  font-size: 12px;
}

.doc-type {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.doc-notice {
  background: #e6f4ff;
  color: #1677ff;
}

.doc-penalty {
  background: #fff1f0;
  color: #cf1322;
}

.doc-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.list-sub {
  font-size: 11px;
  color: var(--ap-text-muted);
}

.alert-list li {
  align-items: center;
}

.hazard-bar-chart {
  min-height: 220px;
  padding: 4px;
}

.hazard-bar-chart--vertical {
  display: flex;
  align-items: stretch;
}

.hazard-vbars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 220px;
  padding: 0 4px;
}

.hazard-vbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  height: 100%;
}

.hazard-vbar-val {
  font-size: 12px;
  font-weight: 700;
  color: var(--ap-text);
  margin-bottom: 4px;
  flex-shrink: 0;
}

.hazard-vbar-track {
  flex: 1;
  width: 100%;
  max-width: 36px;
  background: #f5f5f5;
  border-radius: 4px 4px 0 0;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.hazard-vbar-fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #ff7875, #e53935);
  min-height: 4px;
  transition: height 0.3s ease;
}

.hazard-vbar-label {
  margin-top: 6px;
  font-size: 10px;
  color: var(--ap-text-secondary);
  text-align: center;
  line-height: 1.25;
  max-height: 32px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.labor-body {
  display: flex;
  gap: 12px;
  min-height: 220px;
}

.labor-panel .labor-cards {
  width: 130px;
}

.labor-donut-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.attendance-legend {
  width: 100%;
  flex: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 6px;
  row-gap: 4px;
  padding: 0 2px;
}

.attendance-legend li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  min-width: 0;
}

.attendance-legend .legend-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
}

.attendance-legend .legend-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.attendance-legend .legend-val {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
}

.device-alarm-card {
  display: flex;
  flex-direction: column;
}

.device-alarm-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 220px;
  justify-content: center;
}

.device-alarm-row {
  display: grid;
  grid-template-columns: 80px 1fr 32px auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.device-alarm-name {
  color: var(--ap-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-alarm-track {
  height: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.device-alarm-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #ffb74d, #f57c00);
  min-width: 4px;
}

.device-alarm-count {
  font-weight: 700;
  color: var(--ap-text);
  text-align: right;
}

.device-alarm-pending {
  font-size: 10px;
  color: var(--ap-danger);
  white-space: nowrap;
}

.eval-board-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 10px;
}

.eval-tile {
  position: relative;
  height: 96px;
  border-radius: 8px;
  background: #f5f5f5;
  overflow: hidden;
  cursor: default;
}

.eval-tile-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.4;
  transition: height 0.3s ease;
}

.eval-tile-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 6px 4px;
  gap: 2px;
  text-align: center;
}

.eval-tile-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--ap-text);
  line-height: 1.25;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.eval-tile-pass-label {
  font-size: 9px;
  color: var(--ap-text-muted);
  line-height: 1.2;
  white-space: nowrap;
}

.eval-tile-rate {
  font-size: 13px;
  font-weight: 700;
  color: var(--ap-primary);
  line-height: 1.2;
}

.eval-tile-sub {
  font-size: 10px;
  color: var(--ap-text-muted);
}

.donut-wrap {
  width: 120px;
  flex-shrink: 0;
}

.donut-chart {
  width: 100%;
  height: auto;
}

.donut-num {
  font-size: 16px;
  font-weight: 700;
  fill: var(--ap-text);
}

.donut-label {
  font-size: 7px;
  fill: var(--ap-text-muted);
}

.hazard-legend {
  list-style: none;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hazard-legend li {
  display: grid;
  grid-template-columns: 8px 1fr auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-name {
  color: var(--ap-text-secondary);
}

.legend-val {
  font-weight: 600;
  color: var(--ap-text);
}

.labor-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.labor-stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  padding: 8px 6px;
  min-height: 46px;
}

.labor-stat-label {
  font-size: 11px;
  color: var(--ap-text-secondary);
  text-align: center;
  line-height: 1.3;
}

.labor-stat-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

@media (max-width: 1400px) {
  .summary-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .module-row-3 {
    grid-template-columns: 1fr;
  }

  .chart-row-3 {
    grid-template-columns: 1fr;
  }

  .eval-board-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .activity-metrics-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .activity-metric-item {
    justify-content: flex-start;
  }

  .labor-body {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .eval-board-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
