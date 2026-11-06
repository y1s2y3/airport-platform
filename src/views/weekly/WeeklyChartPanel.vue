<script setup>
/**
 * 数字周报 · 章节图表（折线图 / 环形图）
 * 数据来自周报快照 section.charts；与 Word 导出共用 utils/weeklyReportChart.js 的 option 构造。
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { buildChartOption } from '../../utils/weeklyReportChart'

const props = defineProps({
  chart: { type: Object, required: true },
})

const el = ref(null)
let instance = null
let observer = null

function render() {
  if (!el.value || !props.chart) return
  if (!instance) instance = echarts.init(el.value, null, { renderer: 'canvas' })
  instance.setOption(buildChartOption(props.chart), true)
  instance.resize()
}

onMounted(async () => {
  await nextTick()
  render()
  if (typeof ResizeObserver !== 'undefined' && el.value) {
    observer = new ResizeObserver(() => instance?.resize())
    observer.observe(el.value)
  }
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  if (instance) instance.dispose()
  observer = null
  instance = null
})

watch(
  () => props.chart,
  () => {
    render()
  },
  { deep: true },
)
</script>

<template>
  <div class="weekly-chart">
    <div class="chart-head">
      <span class="chart-title">{{ chart.title }}</span>
      <span class="chart-sub">单位：{{ chart.unit || '—' }}</span>
    </div>
    <div ref="el" class="chart-canvas" :class="{ 'is-donut': chart.type === 'donut' }"></div>
  </div>
</template>

<style scoped>
.weekly-chart {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--ap-border, #ebeef5);
}
.chart-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text, #303133);
}
.chart-sub {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.chart-canvas {
  width: 100%;
  height: 300px;
}
.chart-canvas.is-donut {
  height: 280px;
}
</style>
