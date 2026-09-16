<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  getHqOpenHazards,
  getHqPendingTopProjects,
} from '../mock/hazardStats.js'
import { HQ_HAZARD_LEVEL_SEGMENTS } from '../mock/data.js'

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
  return pieData.value.map((d) => ({
    name: d.name,
    color: d.color,
    value: d.value,
    percent: total.value ? `${Math.round((d.value / sum) * 100)}%` : '0%',
  }))
})

function buildOption() {
  const centerTotalColor = props.darkTheme ? '#ffffff' : '#333'
  const centerSubColor = props.darkTheme ? '#a8abb2' : '#909399'
  const sliceBorderColor = props.darkTheme ? 'rgba(16, 29, 55, 0.85)' : '#fff'
  const emptyColor = props.darkTheme ? 'rgba(255,255,255,0.12)' : '#e8e8e8'
  const data = pieData.value.map((d) => ({
    name: d.name,
    value: Math.max(d.value, 0),
    itemStyle: { color: d.color },
  }))
  if (!data.some((d) => d.value > 0)) {
    data.push({ name: '暂无', value: 1, itemStyle: { color: emptyColor } })
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
          formatter: () => `{total|${total.value}}\n{sub|待整改}`,
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
            formatter: () => `{total|${total.value}}\n{sub|待整改}`,
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
  const el = chartRef.value
  if (!el) return
  const w = el.clientWidth
  const h = el.clientHeight
  if (w < 20 || h < 20) return
  if (!chart) chart = echarts.init(el)
  chart.setOption(buildOption(), true)
  chart.resize()
}

function disposeChart() {
  chart?.dispose()
  chart = null
}

function handleResize() {
  renderChart()
}

let resizeObserver = null

watch([pieData, () => props.darkTheme], () => {
  nextTick(renderChart)
})

onMounted(() => {
  nextTick(() => {
    renderChart()
    if (typeof ResizeObserver !== 'undefined' && chartRef.value) {
      resizeObserver = new ResizeObserver(() => {
        renderChart()
      })
      resizeObserver.observe(chartRef.value)
    }
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  resizeObserver?.disconnect()
  resizeObserver = null
  disposeChart()
})
</script>

<template>
  <div class="panel-card hazard-analysis-panel">
    <div class="panel-title compact title-left">
      <span>隐患分析</span>
      <span class="panel-v2-tip">V2版本上线</span>
    </div>
    <div class="panel-body hazard-body">
      <div class="chart-row">
        <div class="level-ring" :class="{ 'level-ring--hq': darkTheme }">
          <div ref="chartRef" class="level-ring__chart" />
        </div>
        <ul class="level-stats" :class="{ 'level-stats--hq': darkTheme }">
          <li v-for="item in levelStats" :key="item.name" class="level-stat-item">
            <span class="level-ring-icon" :style="{ borderColor: item.color }" />
            <span class="level-name">{{ item.name }}</span>
            <span class="level-count">
              <strong class="level-count-num">{{ item.value }}</strong>
              <span class="level-count-unit"> 项</span>
            </span>
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

.hazard-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 12px 12px !important;
  overflow: hidden;
}

.chart-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  min-height: 138px;
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
  overflow: hidden;
}

.level-ring__chart {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
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

.level-stats--hq {
  gap: 14px;
  padding: 4px 0 4px 4px;
  justify-content: center;
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

.level-stats--hq .level-stat-item {
  grid-template-columns: 12px minmax(0, 1fr) auto auto;
  column-gap: 10px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  font-size: calc(12px + var(--coc-font-boost));
}

.level-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.level-ring-icon {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid currentColor;
  background: transparent;
  box-sizing: border-box;
  flex-shrink: 0;
}

.level-stats--hq .level-ring-icon {
  width: 11px;
  height: 11px;
  border-width: 2px;
}

.level-name {
  color: var(--coc-text);
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-stats--hq .level-name {
  color: rgba(255, 255, 255, 0.78);
  font-weight: 400;
}

.level-count {
  color: var(--coc-text-secondary);
  white-space: nowrap;
}

.level-count-num {
  font-weight: inherit;
}

.level-stats--hq .level-count-num {
  font-size: calc(17px + var(--coc-font-boost));
  font-weight: 700;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.level-stats--hq .level-count-unit {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 400;
  color: rgba(255, 255, 255, 0.78);
}

.level-pct {
  font-weight: 700;
  color: var(--coc-accent);
  white-space: nowrap;
}

.level-stats--hq .level-pct {
  min-width: 38px;
  text-align: right;
  font-weight: 400;
  font-size: calc(12px + var(--coc-font-boost));
  color: rgba(255, 255, 255, 0.52);
  font-variant-numeric: tabular-nums;
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
  border-color: var(--coc-podium-first-border, #c0392b);
  background: var(
    --coc-podium-first-bg,
    linear-gradient(180deg, #a82525 0%, #6e1818 48%, #3a0d0d 100%)
  );
  box-shadow: var(--coc-podium-first-shadow, 0 4px 14px rgba(160, 28, 28, 0.28));
}

.podium-card.rank-second {
  border-color: var(--coc-podium-second-border, #d4af37);
  background: var(
    --coc-podium-second-bg,
    linear-gradient(180deg, #a8842e 0%, #6b5220 50%, #3d2e12 100%)
  );
  box-shadow: var(--coc-podium-second-shadow, 0 4px 12px rgba(168, 132, 46, 0.24));
}

.podium-card.rank-third {
  border-color: var(--coc-podium-third-border, #9ca3af);
  background: var(
    --coc-podium-third-bg,
    linear-gradient(180deg, #5c6573 0%, #3a4049 52%, #252830 100%)
  );
  box-shadow: var(--coc-podium-third-shadow, 0 4px 10px rgba(0, 0, 0, 0.18));
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
  background: var(--coc-podium-first-rank-bg, #ffffff);
  color: var(--coc-podium-first-rank-color, #c62828);
}

.podium-card.rank-second .podium-rank {
  background: var(--coc-podium-second-rank-bg, #d4af37);
  color: var(--coc-podium-second-rank-color, #ffffff);
}

.podium-card.rank-third .podium-rank {
  background: var(--coc-podium-third-rank-bg, #9ca3af);
  color: var(--coc-podium-third-rank-color, #ffffff);
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
  color: var(--coc-podium-first-name-color, #ffffff);
}

.podium-card.rank-second .podium-name {
  color: var(--coc-podium-second-name-color, #ffffff);
}

.podium-card.rank-third .podium-name {
  color: var(--coc-podium-third-name-color, #ffffff);
}

.podium-count {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-podium-count-color, #666);
}

.podium-card.rank-first .podium-count {
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-podium-first-count-color, #ef5350);
}

.podium-card.rank-second .podium-count {
  color: var(--coc-podium-second-count-color, #f6c575);
}

.podium-card.rank-third .podium-count {
  color: var(--coc-podium-third-count-color, #e5e7eb);
}
</style>
