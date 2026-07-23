<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getProjectHazardStats } from '../mock/data.js'

const props = defineProps({
  projectId: { type: String, required: true },
})

const statusChartRef = ref(null)
const levelChartRef = ref(null)
let statusChart = null
let levelChart = null

const stats = computed(() => getProjectHazardStats(props.projectId))

function buildRingOption({ data, centerLabel, centerSub }) {
  const seriesData = data.map((d) => ({
    name: d.name || d.label,
    value: Math.max(d.value, 0),
    itemStyle: { color: d.color },
  }))
  if (!seriesData.some((d) => d.value > 0)) {
    seriesData.push({ name: '暂无', value: 1, itemStyle: { color: 'rgba(255,255,255,0.12)' } })
  }
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}：{c} ({d}%)',
      appendToBody: true,
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 6,
        itemStyle: {
          borderRadius: 4,
          borderColor: 'rgba(16, 29, 55, 0.9)',
          borderWidth: 2,
        },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{total|${centerLabel}}\n{sub|${centerSub}}`,
          rich: {
            total: {
              fontSize: 16,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 20,
              align: 'center',
            },
            sub: {
              fontSize: 11,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 15,
              align: 'center',
            },
          },
        },
        emphasis: {
          scale: false,
          label: { show: true },
        },
        labelLine: { show: false },
        data: seriesData,
      },
    ],
  }
}

function ensureChart(refEl, instance) {
  const el = refEl.value
  if (!el || el.clientWidth < 20) return instance
  if (!instance) return echarts.init(el)
  return instance
}

function renderCharts() {
  statusChart = ensureChart(statusChartRef, statusChart)
  levelChart = ensureChart(levelChartRef, levelChart)
  if (statusChart) {
    statusChart.setOption(
      buildRingOption({
        data: stats.value.statusSegments,
        centerLabel: String(stats.value.total),
        centerSub: '全部',
      }),
      true,
    )
  }
  if (levelChart) {
    levelChart.setOption(
      buildRingOption({
        data: stats.value.levelSegments,
        centerLabel: String(stats.value.total),
        centerSub: '等级',
      }),
      true,
    )
  }
}

function disposeCharts() {
  statusChart?.dispose()
  levelChart?.dispose()
  statusChart = null
  levelChart = null
}

function handleResize() {
  statusChart?.resize()
  levelChart?.resize()
}

watch(
  () => props.projectId,
  () => nextTick(renderCharts),
)

watch(stats, () => nextTick(renderCharts), { deep: true })

onMounted(() => {
  nextTick(renderCharts)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})
</script>

<template>
  <div class="panel-card project-hazard-stats">
    <div class="stats-top">
      <div class="kpi-card kpi-card--pending">
        <div class="kpi-label">待整改隐患</div>
        <div class="kpi-value kpi-value--pending">{{ stats.pendingTotal }}</div>
      </div>
      <div
        v-for="item in stats.channels"
        :key="item.key"
        class="kpi-card"
      >
        <div class="kpi-label">
          <span class="channel-dot" :style="{ background: item.color }" />
          {{ item.label }}
        </div>
        <div class="kpi-value">{{ item.value }}</div>
      </div>
    </div>

    <div class="stats-charts">
      <div class="chart-block">
        <div class="chart-title">隐患整改状态</div>
        <div ref="statusChartRef" class="chart-canvas" />
        <ul class="chart-legend">
          <li v-for="item in stats.statusSegments" :key="item.name">
            <i :style="{ background: item.color }" />
            <span>{{ item.name }}</span>
            <b>{{ item.value }}</b>
          </li>
        </ul>
      </div>
      <div class="chart-block">
        <div class="chart-title">隐患等级</div>
        <div ref="levelChartRef" class="chart-canvas" />
        <ul class="chart-legend">
          <li v-for="item in stats.levelSegments" :key="item.name">
            <i :style="{ background: item.color }" />
            <span>{{ item.name }}</span>
            <b>{{ item.value }}</b>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-hazard-stats {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px 12px !important;
  overflow: hidden;
}

.stats-top {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  flex-shrink: 0;
}

.kpi-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

.kpi-card--pending {
  background: rgba(245, 108, 108, 0.12);
  border-color: rgba(245, 108, 108, 0.28);
}

.kpi-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  max-width: 100%;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-secondary, #909399);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-value {
  font-size: calc(18px + var(--coc-font-boost));
  font-weight: 700;
  line-height: 1;
  color: var(--coc-text, #303133);
}

.kpi-value--pending {
  color: #f56c6c;
}

.channel-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stats-charts {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.chart-block {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px 4px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.chart-title {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary, #909399);
  margin-bottom: 2px;
}

.chart-canvas {
  width: 100%;
  flex: 1;
  min-height: 110px;
}

.chart-legend {
  list-style: none;
  margin: 0;
  padding: 0 4px 2px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chart-legend li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted, #a8abb2);
}

.chart-legend i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chart-legend span {
  flex: 1;
  min-width: 0;
}

.chart-legend b {
  font-weight: 600;
  color: var(--coc-text, #fff);
}
</style>
