/**
 * 数字周报 · 图表渲染
 *
 * 页面展示与 Word 导出共用同一套 echarts option 构造，保证「所见即所得」。
 * 导出链路：离屏渲染 → getDataURL(png) → utils/weeklyReportDocx.js 写入 Word 媒体部件。
 * 依赖：echarts（项目已有依赖，多处看板在用）。
 */
import * as echarts from 'echarts'

const DONUT_COLORS = ['#91003d', '#c2410c', '#0f766e', '#1d4ed8', '#7c3aed', '#b45309']
const LINE_COLORS = ['#91003d', '#0f766e']

/**
 * 构造 echarts option（页面与导出共用）
 * @param {{ type: 'line'|'donut', unit?: string, categories?: string[], series?: Array, data?: Array }} chart
 * @param {{ forExport?: boolean }} options
 */
export function buildChartOption(chart, options = {}) {
  const { forExport = false } = options
  const unit = chart?.unit || ''
  const textStyle = { fontFamily: 'Microsoft YaHei, SimSun, sans-serif', color: '#4a4f57' }

  if (chart?.type === 'line') {
    return {
      textStyle,
      color: LINE_COLORS,
      grid: { left: 8, right: 18, top: forExport ? 44 : 36, bottom: 6, containLabel: true },
      legend: {
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 8,
        textStyle: { fontSize: 12, color: '#4a4f57' },
      },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => (value === null || value === undefined ? '--' : `${value} ${unit}`.trim()),
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chart.categories || [],
        axisLine: { lineStyle: { color: '#dcdfe6' } },
        axisTick: { show: false },
        axisLabel: { fontSize: 11, color: '#909399' },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 11, color: '#909399' },
        splitLine: { lineStyle: { color: '#f0f2f5' } },
      },
      series: (chart.series || []).map((item) => ({
        name: item.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        connectNulls: false,
        data: item.data,
        lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.06 },
        emphasis: { focus: 'series' },
      })),
    }
  }

  return {
    textStyle,
    color: DONUT_COLORS,
    tooltip: { trigger: 'item', formatter: `{b}：{c} ${unit}（{d}%）`.trim() },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      icon: 'circle',
      itemWidth: 9,
      itemHeight: 9,
      textStyle: { fontSize: 12, color: '#4a4f57' },
    },
    series: [
      {
        type: 'pie',
        radius: ['46%', '70%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          formatter: `{b}\n{c} ${unit}（{d}%）`.trim(),
          fontSize: 11,
          color: '#4a4f57',
          lineHeight: 16,
        },
        labelLine: { length: 8, length2: 8 },
        data: chart.data || [],
      },
    ],
  }
}

/**
 * 离屏渲染图表为 PNG dataURL（不依赖页面上的图表实例，任何页面点导出都能出图）
 * @param {object} chart 周报快照中的图表定义
 * @param {{ width?: number, height?: number, pixelRatio?: number }} options
 * @returns {string} data:image/png;base64,...
 */
export function renderChartToPng(chart, options = {}) {
  const width = options.width || 900
  const height = options.height || (chart?.type === 'line' ? 360 : 340)
  const pixelRatio = options.pixelRatio || 2
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-99999px;top:0;width:${width}px;height:${height}px;`
  document.body.appendChild(container)
  let instance = null
  try {
    instance = echarts.init(container, null, { renderer: 'canvas', width, height })
    instance.setOption(buildChartOption(chart, { forExport: true }), true)
    return instance.getDataURL({ type: 'png', pixelRatio, backgroundColor: '#ffffff' })
  } finally {
    if (instance) instance.dispose()
    container.remove()
  }
}
