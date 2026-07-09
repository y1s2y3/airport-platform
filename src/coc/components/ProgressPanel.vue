<script setup>
import { computed } from 'vue'
import { TrendCharts, FullScreen } from '@element-plus/icons-vue'
import ProjectGantt from './ProjectGantt.vue'
import { getGanttLagStats } from '../mock/data.js'

const props = defineProps({
  projects: { type: Array, required: true },
  project: { type: Object, default: null },
  isEnterprise: { type: Boolean, default: true },
})

const emit = defineEmits(['expand', 'project-change'])

function selectProject(id) {
  emit('project-change', id)
}

const building = computed(() => props.projects.filter((p) => p.status === '在建'))

const overview = computed(() => {
  const list = building.value
  const avg = list.length
    ? Math.round(list.reduce((s, p) => s + p.actualRate, 0) / list.length)
    : 0
  let lagNodes = 0
  let totalNodes = 0
  list.forEach((p) => {
    const stats = getGanttLagStats(p.ganttWbs)
    lagNodes += stats.lagNodes
    totalNodes += stats.totalNodes
  })
  const lagNodeRate = totalNodes ? Math.round((lagNodes / totalNodes) * 1000) / 10 : 0
  return {
    total: props.projects.length,
    building: list.length,
    avg,
    lagNodeRate,
    lagNodes,
  }
})

/** 按实际完成率从高到低排列（柱状图左侧最高） */
const chartProjects = computed(() =>
  [...building.value].sort((a, b) => b.actualRate - a.actualRate),
)

const single = computed(() => props.project)

function barColor(p) {
  if (p.lagLevel === 'red') return 'linear-gradient(180deg, #f56c6c 0%, #f89898 100%)'
  if (p.lagLevel === 'yellow') return 'linear-gradient(180deg, #e6a23c 0%, #f3d19e 100%)'
  return 'linear-gradient(180deg, #c97b63 0%, #e8b4a0 100%)'
}
</script>

<template>
  <div class="panel-card progress-panel">
    <div class="panel-title" :class="{ 'title-with-tools': !isEnterprise && single }">
      <span>项目进度</span>
      <span class="panel-v2-tip">V2版本上线</span>
      <span v-if="!isEnterprise && single" class="project-subtitle" :title="single.name">
        {{ single.shortName || single.name }}
      </span>
      <div class="title-tools">
        <button
          v-if="!isEnterprise && single"
          type="button"
          class="expand-btn"
          title="放大查看进度甘特图"
          @click="emit('expand')"
        >
          <el-icon :size="16"><FullScreen /></el-icon>
        </button>
        <el-icon v-else :size="17" color="#c97b63"><TrendCharts /></el-icon>
      </div>
    </div>

    <!-- 指挥部：左侧统计 + 右侧柱状图 -->
    <div v-if="isEnterprise" class="panel-body hq-body">
      <div class="hq-stats">
        <div class="stat-card">
          <div class="stat-value">{{ overview.total }}</div>
          <div class="stat-label">项目总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value accent">{{ overview.building }}</div>
          <div class="stat-label">在建项目</div>
        </div>
        <div class="stat-card">
          <div class="stat-value accent">{{ overview.avg }}%</div>
          <div class="stat-label">整体进度</div>
        </div>
        <div class="stat-card warn">
          <div class="stat-value">{{ overview.lagNodeRate }}%</div>
          <div class="stat-label">滞后节点比例</div>
        </div>
      </div>

      <div class="hq-chart">
        <div v-if="chartProjects.length" class="hq-chart-scroll">
          <div class="bar-chart">
            <div
              v-for="p in chartProjects"
              :key="p.id"
              class="bar-col"
              :title="`${p.name}：进度 ${p.actualRate}%，滞后节点数量 ${p.lagNodeCount}`"
            >
              <div class="bar-area">
                <span class="bar-pct">{{ p.actualRate }}%</span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :style="{ height: `${p.actualRate}%`, background: barColor(p) }"
                  />
                  <div class="bar-lag-center">
                    <span class="bar-lag-label">滞后节点数量</span>
                    <span class="bar-lag-value">{{ p.lagNodeCount }}</span>
                  </div>
                </div>
              </div>
              <div class="bar-footer">
                <button
                  type="button"
                  class="bar-name"
                  :title="p.name"
                  @click="selectProject(p.id)"
                >
                  {{ p.shortName || p.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="chart-empty">暂无在建项目</div>
      </div>
    </div>

    <!-- 单项目：施工甘特图 -->
    <div v-else-if="single" class="panel-body gantt-body">
      <ProjectGantt :project="single" />
    </div>
  </div>
</template>

<style scoped>
.progress-panel {
  height: 100%;
}

.panel-title {
  gap: 16px;
}

.panel-title.title-with-tools {
  justify-content: flex-start;
}

.title-tools {
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  background: #fff;
  color: var(--coc-text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.expand-btn:hover {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.06);
}

.project-subtitle {
  flex: 1;
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 500;
  color: var(--coc-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.hq-body {
  display: flex;
  align-items: stretch;
  gap: 16px;
  padding: 12px 16px !important;
  min-height: 0;
  overflow: hidden;
}

.hq-stats {
  flex: 0 0 200px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  min-height: 0;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 6px;
  background: linear-gradient(135deg, #fff, #faf8f6);
  border: 1px solid var(--coc-border);
  border-radius: 10px;
  min-height: 0;
}

.stat-value {
  font-size: calc(18px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
  line-height: 1.2;
}

.stat-value.accent {
  color: var(--coc-accent);
}

.stat-card.warn .stat-value {
  color: var(--coc-danger);
}

.stat-label {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  margin-top: 4px;
  white-space: nowrap;
}

.hq-chart {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.hq-chart-scroll {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--coc-progress-scrollbar-thumb, rgba(201, 123, 99, 0.35))
    var(--coc-progress-scrollbar-track, transparent);
}

.hq-chart-scroll::-webkit-scrollbar {
  height: 6px;
}

.hq-chart-scroll::-webkit-scrollbar-track {
  background: var(--coc-progress-scrollbar-track, transparent);
  border-radius: 3px;
}

.hq-chart-scroll::-webkit-scrollbar-thumb {
  background: var(--coc-progress-scrollbar-thumb, rgba(201, 123, 99, 0.35));
  border-radius: 3px;
}

.hq-chart-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--coc-progress-scrollbar-thumb-hover, rgba(201, 123, 99, 0.5));
}

.bar-chart {
  display: flex;
  align-items: stretch;
  gap: 10px;
  height: 100%;
  min-height: 0;
  min-width: min-content;
  padding: 0 4px 4px;
}

.bar-col {
  flex: 0 0 96px;
  width: 96px;
  height: 100%;
  display: grid;
  grid-template-rows: 1fr auto;
  min-height: 0;
  gap: 4px;
}

.bar-footer {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.bar-lag-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
  text-align: center;
  width: 92%;
}

.bar-lag-label {
  font-size: calc(8px + var(--coc-font-boost));
  line-height: 1.15;
  color: var(--coc-text-secondary);
  white-space: nowrap;
}

.bar-lag-value {
  font-size: calc(14px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-danger);
  line-height: 1;
  white-space: nowrap;
}

.bar-area {
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.bar-pct {
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text-secondary);
  line-height: 1;
  flex-shrink: 0;
  align-self: center;
}

.bar-track {
  position: relative;
  flex: 1;
  width: 70px;
  min-height: 0;
  background: #f0f2f5;
  border-radius: 6px 6px 4px 4px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  min-height: 3px;
  border-radius: 4px 4px 2px 2px;
  transition: height 0.35s ease;
}

.bar-name {
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  text-align: center;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
  width: 100%;
  min-height: 24px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: color 0.2s;
}

.bar-name:hover {
  color: var(--coc-accent);
  font-weight: 600;
}

.chart-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--coc-text-muted);
  font-size: calc(13px + var(--coc-font-boost));
  background: #faf8f6;
  border: 1px dashed var(--coc-border);
  border-radius: 10px;
}

.gantt-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
