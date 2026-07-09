<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import hazardPieChart from '../assets/hq/hazard-pie-chart.svg?url'
import {
  getHqOpenHazards,
  getHqPendingTopProjects,
  HQ_HAZARD_LEVEL_SEGMENTS,
} from '../mock/data.js'

/** Figma 环图色块 · 一般 / 较大 / 重大 */
const HQ_PIE_COLORS = ['#1498F6', '#C29D53', '#A4A7B0']

const chartRef = ref(null)
let chart = null

const emit = defineEmits(['project-change'])

const props = defineProps({
  darkTheme: { type: Boolean, default: false },
})

const hazardItems = getHqOpenHazards()
const topProjects = getHqPendingTopProjects(3)

function selectProject(projectId) {
  if (!projectId) return
  emit('project-change', projectId)
}

const pieData = computed(() =>
  HQ_HAZARD_LEVEL_SEGMENTS.map((seg) => ({
    ...seg,
    value: hazardItems.filter((item) => item.level === seg.filter).length,
  })),
)

const total = computed(() => hazardItems.length)

const levelStats = computed(() => {
  const sum = total.value || 1
  return pieData.value.map((d, index) => ({
    name: d.name,
    color: props.darkTheme ? HQ_PIE_COLORS[index] : d.color,
    value: d.value,
    percent: total.value ? `${((d.value / sum) * 100).toFixed(1)}%` : '0%',
  }))
})

function buildOption() {
  const centerTotalColor = props.darkTheme ? '#ffffff' : '#333'
  const centerSubColor = props.darkTheme ? '#a8abb2' : '#909399'
  const sliceBorderColor = props.darkTheme ? 'rgba(16, 29, 55, 0.85)' : '#fff'
  const data = pieData.value.map((d) => ({
    name: d.name,
    value: Math.max(d.value, 0),
    itemStyle: { color: d.color },
  }))
  if (!data.some((d) => d.value > 0)) {
    data.push({ name: '暂无', value: 1, itemStyle: { color: '#e8e8e8' } })
  }
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}：{c} 项 ({d}%)',
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 8,
        itemStyle: {
          borderRadius: 6,
          borderColor: sliceBorderColor,
          borderWidth: 3,
        },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{total|${total.value}}\n{sub|待处理}`,
          rich: {
            total: {
              fontSize: 18,
              fontWeight: 700,
              color: centerTotalColor,
              lineHeight: 22,
              align: 'center',
            },
            sub: {
              fontSize: 11,
              color: centerSubColor,
              lineHeight: 16,
              align: 'center',
            },
          },
        },
        emphasis: {
          scale: false,
          label: {
            show: true,
            formatter: () => `{total|${total.value}}\n{sub|待处理}`,
            rich: {
              total: {
                fontSize: 18,
                fontWeight: 700,
                color: centerTotalColor,
                lineHeight: 22,
                align: 'center',
              },
              sub: {
                fontSize: 11,
                color: centerSubColor,
                lineHeight: 16,
                align: 'center',
              },
            },
          },
        },
        labelLine: { show: false },
        data,
      },
    ],
  }
}

function renderChart() {
  if (props.darkTheme) return
  const el = chartRef.value
  if (!el || el.clientWidth < 20) return
  if (!chart) chart = echarts.init(el)
  chart.setOption(buildOption(), true)
}

function disposeChart() {
  chart?.dispose()
  chart = null
}

function handleResize() {
  chart?.resize()
}

watch([pieData, () => props.darkTheme], () => {
  if (props.darkTheme) {
    disposeChart()
    return
  }
  nextTick(renderChart)
})

onMounted(() => {
  nextTick(renderChart)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeChart()
})
</script>

<template>
  <div class="panel-card hazard-analysis-panel">
    <div class="panel-title compact title-left title-with-tip">
      <span>隐患分析</span>
      <span class="panel-v2-tip">V2版本上线</span>
      <el-tooltip
        content="包含安全巡检、质量巡检、随手拍隐患统计"
        placement="top"
        :show-after="200"
      >
        <span class="title-tip-icon" aria-label="统计说明">?</span>
      </el-tooltip>
    </div>
    <div class="panel-body hazard-body">
      <div class="chart-row">
        <div class="level-ring" :class="{ 'level-ring--hq': darkTheme }">
          <template v-if="darkTheme">
            <img
              class="level-ring__art"
              :src="hazardPieChart"
              width="164"
              height="138"
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <div class="level-ring__center" aria-hidden="true">
              <span class="level-ring__total">{{ total }}</span>
              <span class="level-ring__sub">待处理</span>
            </div>
          </template>
          <div v-else ref="chartRef" class="level-ring__chart" />
        </div>
        <ul class="level-stats">
          <li v-for="item in levelStats" :key="item.name" class="level-stat-item">
            <span class="level-dot" :style="{ background: item.color }" />
            <span class="level-name">{{ item.name }}</span>
            <span class="level-count">{{ item.value }} 项</span>
            <span class="level-pct">{{ item.percent }}</span>
          </li>
        </ul>
      </div>

      <div class="top-section">
        <div class="top-title">待整改问题 Top3 项目</div>
        <div class="podium">
          <div
            v-if="topProjects[1]"
            class="podium-card side rank-second"
          >
            <span class="podium-rank">2</span>
            <button
              type="button"
              class="podium-name"
              :title="topProjects[1].fullName"
              @click="selectProject(topProjects[1].projectId)"
            >
              {{ topProjects[1].fullName }}
            </button>
            <span class="podium-count">{{ topProjects[1].value }} 项</span>
          </div>
          <div
            v-if="topProjects[0]"
            class="podium-card center rank-first"
          >
            <span class="podium-rank">1</span>
            <button
              type="button"
              class="podium-name"
              :title="topProjects[0].fullName"
              @click="selectProject(topProjects[0].projectId)"
            >
              {{ topProjects[0].fullName }}
            </button>
            <span class="podium-count">{{ topProjects[0].value }} 项</span>
          </div>
          <div
            v-if="topProjects[2]"
            class="podium-card side rank-third"
          >
            <span class="podium-rank">3</span>
            <button
              type="button"
              class="podium-name"
              :title="topProjects[2].fullName"
              @click="selectProject(topProjects[2].projectId)"
            >
              {{ topProjects[2].fullName }}
            </button>
            <span class="podium-count">{{ topProjects[2].value }} 项</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hazard-analysis-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-title.compact.title-left {
  font-size: calc(18px + var(--coc-font-boost));
  justify-content: flex-start;
  flex-shrink: 0;
}

.title-with-tip {
  gap: 8px;
}

.title-tip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
  background: var(--coc-tip-icon-bg, #f0ebe6);
  cursor: help;
  flex-shrink: 0;
}

.hazard-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 12px 12px !important;
  min-height: 0;
  overflow: hidden;
}

.chart-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.level-ring {
  flex: 0 0 52%;
  height: 148px;
  min-width: 0;
}

.level-ring--hq {
  flex: 0 0 164px;
  width: 164px;
  height: 138px;
  position: relative;
}

.level-ring__chart {
  width: 100%;
  height: 100%;
}

.level-ring__art {
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
  pointer-events: none;
}

.level-ring__center {
  position: absolute;
  left: 50%;
  top: 52%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
}

.level-ring__total {
  font-size: calc(18px + var(--coc-font-boost));
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
}

.level-ring__sub {
  font-size: calc(11px + var(--coc-font-boost));
  color: #a8abb2;
  line-height: 1.2;
}

.level-stats {
  flex: 1;
  min-width: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-stat-item {
  display: grid;
  grid-template-columns: 8px 1fr auto auto;
  align-items: center;
  gap: 6px;
  padding: 8px 8px;
  background: var(--coc-surface-muted, #faf8f6);
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  font-size: calc(11px + var(--coc-font-boost));
}

.level-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.level-name {
  color: var(--coc-text);
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-count {
  color: var(--coc-text-secondary);
  white-space: nowrap;
}

.level-pct {
  font-weight: 700;
  color: var(--coc-accent);
  white-space: nowrap;
}

.top-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.top-title {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
  margin-bottom: 16px;
  text-align: left;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  padding-left: 2px;
}

.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 1;
  margin-top: 4px;
}

.podium-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: var(--coc-podium-base-bg, #faf8f6);
  border: 1px solid var(--coc-border);
  border-radius: 8px 8px 4px 4px;
  text-align: center;
}

.podium-card.side {
  padding-bottom: 14px;
  min-height: 80px;
}

.podium-card.center {
  padding: 14px 8px 22px;
  min-height: 96px;
}

.podium-card.rank-first {
  border-color: var(--coc-podium-first-border, #c62828);
  background: var(
    --coc-podium-first-bg,
    linear-gradient(180deg, rgba(198, 40, 40, 0.22) 0%, rgba(198, 40, 40, 0.08) 100%)
  );
  box-shadow: var(--coc-podium-first-shadow, 0 2px 8px rgba(183, 28, 28, 0.18));
}

.podium-card.rank-second {
  border-color: var(--coc-podium-second-border, rgba(230, 162, 60, 0.75));
  background: var(
    --coc-podium-second-bg,
    linear-gradient(180deg, rgba(230, 162, 60, 0.2) 0%, rgba(230, 162, 60, 0.06) 100%)
  );
  box-shadow: var(--coc-podium-second-shadow, 0 2px 6px rgba(230, 162, 60, 0.18));
}

.podium-card.rank-third {
  border-color: var(--coc-podium-third-border, var(--coc-border));
  background: var(--coc-podium-third-bg, var(--coc-podium-base-bg, #faf8f6));
}

.podium-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--coc-podium-rank-bg, #eee);
  color: var(--coc-podium-rank-color, #666);
}

.podium-card.rank-first .podium-rank {
  width: 26px;
  height: 26px;
  font-size: calc(13px + var(--coc-font-boost));
  background: var(--coc-podium-first-rank-bg, #b71c1c);
  color: var(--coc-podium-first-rank-color, #fff);
}

.podium-card.rank-second .podium-rank {
  background: var(--coc-podium-second-rank-bg, #e6a23c);
  color: var(--coc-podium-second-rank-color, #fff);
}

.podium-card.rank-third .podium-rank {
  background: var(--coc-podium-third-rank-bg, #e0e0e0);
  color: var(--coc-podium-third-rank-color, #666);
}

.podium-name {
  width: 100%;
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text);
  line-height: 1.35;
  white-space: normal;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: center;
}

.podium-name:hover {
  color: var(--coc-accent);
}

.podium-card.rank-first .podium-name {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  -webkit-line-clamp: 4;
  color: var(--coc-podium-first-name-color, #8b1a1a);
}

.podium-card.rank-second .podium-name {
  color: var(--coc-podium-second-name-color, #9a6b00);
}

.podium-card.rank-third .podium-name {
  color: var(--coc-podium-third-name-color, var(--coc-text));
}

.podium-count {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-podium-count-color, #666);
}

.podium-card.rank-first .podium-count {
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-podium-first-count-color, #b71c1c);
}

.podium-card.rank-second .podium-count {
  color: var(--coc-podium-second-count-color, #d48806);
}

.podium-card.rank-third .podium-count {
  color: var(--coc-podium-third-count-color, var(--coc-podium-count-color, #666));
}
</style>
