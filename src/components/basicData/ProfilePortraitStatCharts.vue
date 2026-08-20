<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { getProfilePortraitStats } from '../../mock/projectSafetyProfile'

const props = defineProps({
  projectId: {
    type: String,
    default: '',
  },
  section: {
    type: String,
    required: true,
    validator: (value) => ['hazard', 'machine'].includes(value),
  },
})

const emit = defineEmits(['open-major-list', 'open-danger-list'])

const leftChartRef = ref(null)
const rightChartRef = ref(null)
const charts = { left: null, right: null }

const stats = computed(() => getProfilePortraitStats(props.projectId))

function sumValues(segments) {
  return (segments || []).reduce((sum, item) => sum + Number(item.value || 0), 0)
}

function buildRingOption(segments, centerSub, unit, layout = 'default') {
  const total = sumValues(segments)
  const chartData = (segments || []).map((item) => ({
    name: item.name,
    value: Math.max(Number(item.value) || 0, 0),
    itemStyle: { color: item.color },
  }))
  if (!chartData.some((item) => item.value > 0)) {
    chartData.push({ name: '暂无', value: 1, itemStyle: { color: '#e8e8e8' } })
  }
  const isNarrow = layout === 'narrow'
  return {
    tooltip: {
      trigger: 'item',
      formatter: `{b}：{c} ${unit}（{d}%）`,
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: isNarrow ? ['40%', '60%'] : ['48%', '72%'],
        center: isNarrow ? ['30%', '50%'] : ['44%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 8,
        cursor: 'pointer',
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{total|${total}}\n{sub|${centerSub}}`,
          rich: {
            total: {
              fontSize: isNarrow ? 16 : 18,
              fontWeight: 700,
              color: '#1a1a1a',
              lineHeight: 20,
              align: 'center',
            },
            sub: { fontSize: 12, color: '#909399', lineHeight: 16, align: 'center' },
          },
        },
        emphasis: { scale: true, scaleSize: 4 },
        labelLine: { show: false },
        data: chartData,
      },
    ],
    legend: {
      orient: 'vertical',
      left: isNarrow ? '52%' : '58%',
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: isNarrow ? 6 : 10,
      textStyle: { fontSize: isNarrow ? 11 : 12, color: '#333' },
      formatter(name) {
        const hit = chartData.find((item) => item.name === name)
        return hit && hit.name !== '暂无' ? `${name}  ${hit.value}` : name
      },
    },
  }
}

function buildMaintainTrendOption(points) {
  const list = points || []
  return {
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        const item = params[0]
        return `${item.axisValue}<br/>${item.marker}维保次数：${item.value} 次`
      },
    },
    grid: { left: 40, right: 16, top: 24, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: list.map((item) => item.label),
      axisLabel: { fontSize: 11, color: '#909399' },
      axisLine: { lineStyle: { color: '#e4e7ed' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      name: '次',
      axisLabel: { fontSize: 11, color: '#909399' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [
      {
        name: '维保次数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#1a73e8' },
        itemStyle: { color: '#1a73e8' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(26, 115, 232, 0.22)' },
            { offset: 1, color: 'rgba(26, 115, 232, 0.02)' },
          ]),
        },
        data: list.map((item) => item.count),
      },
    ],
  }
}

function ensureChart(key, el) {
  if (!el) return null
  if (!charts[key]) charts[key] = echarts.init(el)
  return charts[key]
}

function bindHazardClicks(chart, kind) {
  if (!chart || props.section !== 'hazard') return
  chart.off('click')
  chart.getZr().off('click')

  let sectorHit = false
  chart.on('click', (params) => {
    if (params?.componentType !== 'series') return
    const name = params?.name && params.name !== '暂无' ? params.name : ''
    sectorHit = true
    if (kind === 'major') emit('open-major-list', { filter: name })
    else emit('open-danger-list', { filter: name })
    setTimeout(() => {
      sectorHit = false
    }, 0)
  })

  chart.getZr().on('click', () => {
    setTimeout(() => {
      if (sectorHit) return
      if (kind === 'major') emit('open-major-list', { filter: '' })
      else emit('open-danger-list', { filter: '' })
    }, 0)
  })
}

function renderCharts() {
  nextTick(() => {
    const left = ensureChart('left', leftChartRef.value)
    const right = ensureChart('right', rightChartRef.value)
    if (props.section === 'hazard') {
      if (left) {
        left.setOption(buildRingOption(stats.value.majorStartStatus, '项', '项'), true)
        bindHazardClicks(left, 'major')
      }
      if (right) {
        right.setOption(buildRingOption(stats.value.dangerCategories, '项', '项'), true)
        bindHazardClicks(right, 'danger')
      }
    } else {
      if (left) left.setOption(buildRingOption(stats.value.equipmentTypes, '台', '台', 'narrow'), true)
      if (right) right.setOption(buildMaintainTrendOption(stats.value.maintainTrend), true)
    }
    handleResize()
  })
}

function disposeCharts() {
  Object.keys(charts).forEach((key) => {
    charts[key]?.dispose()
    charts[key] = null
  })
}

function handleResize() {
  Object.values(charts).forEach((chart) => chart?.resize())
}

function openMajorAll() {
  emit('open-major-list', { filter: '' })
}

function openDangerAll() {
  emit('open-danger-list', { filter: '' })
}

let resizeObserver = null

watch(() => [props.projectId, props.section], renderCharts)
onMounted(() => {
  renderCharts()
  window.addEventListener('resize', handleResize)
  resizeObserver = new ResizeObserver(handleResize)
  nextTick(() => {
    if (leftChartRef.value) resizeObserver.observe(leftChartRef.value)
    if (rightChartRef.value) resizeObserver.observe(rightChartRef.value)
  })
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  resizeObserver?.disconnect()
  resizeObserver = null
  disposeCharts()
})
</script>

<template>
  <div v-if="section === 'hazard'" class="stat-split">
    <div class="stat-pane is-clickable" title="点击查看危大工程清单" @click="openMajorAll">
      <div class="stat-title">
        危大工程作业（按状态）
        <span class="stat-tip">点击查看清单 · 扇区可筛选</span>
      </div>
      <div ref="leftChartRef" class="stat-chart" @click.stop />
    </div>
    <div class="stat-pane is-clickable" title="点击查看危险作业清单" @click="openDangerAll">
      <div class="stat-title">
        危险作业（按作业类别）
        <span class="stat-tip">点击查看清单 · 扇区可筛选</span>
      </div>
      <div ref="rightChartRef" class="stat-chart" @click.stop />
    </div>
  </div>
  <div v-else class="stat-split stat-split--machine">
    <div class="stat-pane">
      <div class="stat-title">设备类型统计</div>
      <div ref="leftChartRef" class="stat-chart" />
    </div>
    <div class="stat-pane">
      <div class="stat-title">设备维保趋势</div>
      <div ref="rightChartRef" class="stat-chart" />
    </div>
  </div>
</template>

<style scoped>
.stat-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: 260px;
  position: relative;
}

.stat-split--machine {
  grid-template-columns: 1fr 2fr;
}

.stat-pane {
  min-width: 0;
  background: #fff;
  border-radius: 0;
  padding: 0 8px;
}

.stat-pane + .stat-pane {
  border-left: 1px solid #c5d8e8;
  padding-left: 12px;
}

.stat-pane:first-child {
  padding-right: 12px;
}

.stat-pane.is-clickable {
  cursor: pointer;
  transition: box-shadow 0.15s ease, background 0.15s ease;
}

.stat-pane.is-clickable:hover {
  background: #fafbfd;
  box-shadow: inset 0 0 0 1px rgba(143, 0, 69, 0.18);
}

.stat-title {
  padding: 8px 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  text-align: center;
}

.stat-tip {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 400;
  color: #909399;
}

.stat-chart {
  width: 100%;
  height: 240px;
}
</style>
