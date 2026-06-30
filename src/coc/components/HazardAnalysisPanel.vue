<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  getHqOpenHazards,
  getHqPendingTopProjects,
  HQ_HAZARD_LEVEL_SEGMENTS,
} from '../mock/data.js'

const chartRef = ref(null)
let chart = null

const emit = defineEmits(['project-change'])

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
    percent: total.value ? `${((d.value / sum) * 100).toFixed(1)}%` : '0%',
  }))
})

function buildOption() {
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
          borderColor: '#fff',
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
              color: '#333',
              lineHeight: 22,
              align: 'center',
            },
            sub: {
              fontSize: 11,
              color: '#909399',
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
                color: '#333',
                lineHeight: 22,
                align: 'center',
              },
              sub: {
                fontSize: 11,
                color: '#909399',
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
  if (!el || el.clientWidth < 20) return
  if (!chart) chart = echarts.init(el)
  chart.setOption(buildOption(), true)
}

function handleResize() {
  chart?.resize()
}

watch(pieData, () => nextTick(renderChart))

onMounted(() => {
  nextTick(renderChart)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="panel-card hazard-analysis-panel">
    <div class="panel-title compact title-left title-with-tip">
      <span>隐患分析</span>
      <el-tooltip
        content="包含安全巡检、质量巡检、随手拍、告知单、处罚单隐患统计"
        placement="top"
        :show-after="200"
      >
        <span class="title-tip-icon" aria-label="统计说明">?</span>
      </el-tooltip>
    </div>
    <div class="panel-body hazard-body">
      <div class="chart-row">
        <div ref="chartRef" class="level-ring" />
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
  font-size: 18px;
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
  font-size: 12px;
  font-weight: 600;
  color: var(--coc-text-secondary);
  background: #f0ebe6;
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
  background: #faf8f6;
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  font-size: 11px;
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
  font-size: 12px;
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
  background: #faf8f6;
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
  border-color: #c62828;
  background: linear-gradient(180deg, rgba(198, 40, 40, 0.22) 0%, rgba(198, 40, 40, 0.08) 100%);
  box-shadow: 0 2px 8px rgba(183, 28, 28, 0.18);
}

.podium-card.rank-second {
  border-color: rgba(230, 162, 60, 0.75);
  background: linear-gradient(180deg, rgba(230, 162, 60, 0.2) 0%, rgba(230, 162, 60, 0.06) 100%);
  box-shadow: 0 2px 6px rgba(230, 162, 60, 0.18);
}

.podium-card.rank-third {
  border-color: var(--coc-border);
  background: #faf8f6;
}

.podium-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee;
  color: #666;
}

.podium-card.rank-first .podium-rank {
  width: 26px;
  height: 26px;
  font-size: 13px;
  background: #b71c1c;
  color: #fff;
}

.podium-card.rank-second .podium-rank {
  background: #e6a23c;
  color: #fff;
}

.podium-card.rank-third .podium-rank {
  background: #e0e0e0;
  color: #666;
}

.podium-name {
  width: 100%;
  font-size: 10px;
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
  font-size: 11px;
  font-weight: 600;
  -webkit-line-clamp: 4;
  color: #8b1a1a;
}

.podium-card.rank-second .podium-name {
  color: #9a6b00;
}

.podium-count {
  font-size: 11px;
  font-weight: 700;
  color: #666;
}

.podium-card.rank-first .podium-count {
  font-size: 12px;
  color: #b71c1c;
}

.podium-card.rank-second .podium-count {
  color: #d48806;
}
</style>
