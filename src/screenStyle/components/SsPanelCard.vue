<script setup>
import { computed, ref, watch } from 'vue'
import { PANEL_TITLE_ICON_URL } from '../../coc/config/panelTitleAssets.js'

/**
 * 数据栏区块（左 3 右 3 版式）
 *
 * 支持的组合：
 *   metric + bottom.donut  → 上排 3 个指标切角牌，下排一个「类型占比」小环图
 *   donut  + bottom.trend  → 上排等级/分类环图，下排近 7 日趋势曲线
 *   trend                  → 独立趋势曲线
 *   rank                   → 项目排行（带结论标签）
 * 区块 = 标题行（图标 + 中文 + 英文 + 拖尾线 + 角标）+ 渐变分隔线 + 内容 + 底部说明行
 */
const props = defineProps({
  panel: { type: Object, required: true },
})

const TREND = { w: 348, h: 96, top: 10, bottom: 18, left: 24, right: 6 }

/** Catmull-Rom 近似平滑曲线 */
function smoothPath(points) {
  if (!points.length) return ''
  if (points.length < 3) {
    return `M${points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')}`
  }
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const k = 0.16
    const c1x = p1[0] + (p2[0] - p0[0]) * k
    const c1y = p1[1] + (p2[1] - p0[1]) * k
    const c2x = p2[0] - (p3[0] - p1[0]) * k
    const c2y = p2[1] - (p3[1] - p1[1]) * k
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

/** 趋势图数据（供独立趋势块与 donut 的下方趋势共用） */
function buildTrend(source, key) {
  const series = source.series || []
  const categories = source.categories || []
  if (!series.length) return null
  const flat = series.flatMap((item) => item.data)
  const dataMax = Math.max(...flat, 1)
  const dataMin = Math.min(...flat)
  const span = dataMax - dataMin || 1
  const max = dataMax + span * 0.2
  const min = Math.max(0, dataMin - span * 0.2)
  const innerW = TREND.w - TREND.left - TREND.right
  const innerH = TREND.h - TREND.top - TREND.bottom
  const stepX = categories.length > 1 ? innerW / (categories.length - 1) : 0
  const yOf = (value) => TREND.top + (1 - (value - min) / (max - min)) * innerH
  const baseY = TREND.h - TREND.bottom

  const lines = series.map((item) => {
    const pts = item.data.map((value, index) => [TREND.left + index * stepX, yOf(value)])
    const line = smoothPath(pts)
    return {
      name: item.name,
      color: item.color,
      line,
      area: `${line} L${(TREND.left + innerW).toFixed(1)},${baseY.toFixed(1)} L${TREND.left},${baseY.toFixed(1)} Z`,
      last: pts[pts.length - 1],
    }
  })

  return {
    uid: key,
    lines,
    grid: [0, 0.5, 1].map((ratio) => (TREND.top + ratio * innerH).toFixed(1)),
    yTicks: [0, 0.5, 1].map((ratio) => ({
      y: TREND.top + ratio * innerH,
      label: Math.round(max - (max - min) * ratio),
    })),
    labels: categories.map((text, index) => ({ text, x: TREND.left + index * stepX })),
    width: TREND.w,
    height: TREND.h,
  }
}

/** 环形图分段（stroke-dasharray / dashoffset） */
function buildDonut(items) {
  const list = items || []
  const total = list.reduce((sum, item) => sum + (Number(item.value) || 0), 0) || 1
  const R = 38
  const C = 2 * Math.PI * R
  let acc = 0
  const segments = list.map((item) => {
    const value = Number(item.value) || 0
    const ratio = value / total
    const len = ratio * C
    const seg = {
      label: item.label,
      value,
      color: item.color,
      ratio,
      dasharray: `${len.toFixed(2)} ${(C - len).toFixed(2)}`,
      dashoffset: (-acc).toFixed(2),
    }
    acc += len
    return seg
  })
  return { segments, total }
}

/** 时间维度筛选（如安全隐患分析的「本周 / 本月」） */
const activeFilter = ref('')
const filterOptions = computed(() => props.panel.filter?.options || [])
watch(
  filterOptions,
  (options) => {
    activeFilter.value = options[0] || ''
  },
  { immediate: true },
)

/** 指标牌数据：带筛选的区块取当前筛选维度的数据 */
const plateItems = computed(() => {
  if (props.panel.filter) return props.panel.filter.data[activeFilter.value] || []
  return props.panel.items || []
})

const chart = computed(() => {
  if (props.panel.type === 'trend') return buildTrend(props.panel, 'trend')
  if (props.panel.bottom?.type === 'trend') return buildTrend(props.panel.bottom, 'bottom')
  return null
})

const donut = computed(() => (props.panel.type === 'donut' ? buildDonut(props.panel.items) : null))
const extraDonut = computed(() => (props.panel.bottom?.type === 'donut' ? buildDonut(props.panel.bottom.items) : null))

const barMax = computed(() => {
  if (props.panel.type !== 'bars') return 1
  return Math.max(...props.panel.items.map((item) => Number(item.value) || 0), 1)
})

function barWidth(value) {
  return `${Math.max(6, (Number(value) / barMax.value) * 100).toFixed(1)}%`
}

const rankMax = computed(() => {
  if (props.panel.type !== 'rank') return 1
  return Math.max(...props.panel.items.map((item) => Number(item.value) || 0), 1)
})

function rankWidth(value) {
  return `${Math.max(10, (Number(value) / rankMax.value) * 100).toFixed(1)}%`
}
</script>

<template>
  <section class="ss-block" :class="`ss-block--${panel.type}`">
    <div class="ss-block__head">
      <img class="ss-block__icon" :src="PANEL_TITLE_ICON_URL" width="11" height="11" alt="" aria-hidden="true" draggable="false" />
      <span class="ss-block__title">{{ panel.title }}</span>
      <span class="ss-block__en">/ {{ panel.en }}</span>
      <span class="ss-block__tail" aria-hidden="true" />
      <div v-if="panel.filter" class="ss-filter" role="group" aria-label="统计周期">
        <button
          v-for="opt in panel.filter.options"
          :key="opt"
          type="button"
          class="ss-filter__btn"
          :class="{ 'is-active': opt === activeFilter }"
          @click="activeFilter = opt"
        >{{ opt }}</button>
      </div>
      <span v-else-if="panel.tag" class="ss-block__tag">{{ panel.tag }}</span>
    </div>
    <div class="ss-block__line" aria-hidden="true" />

    <div class="ss-block__body">
      <!-- 指标：切角牌（可选下排小环图） -->
      <div v-if="panel.type === 'metric'" class="ss-stack">
        <div class="ss-plates">
          <div v-for="item in plateItems" :key="item.label" class="ss-plate">
            <span class="ss-plate__label">{{ item.label }}</span>
            <span class="ss-plate__shape">
              <b class="ss-plate__value" :class="`tone-${item.tone || 'plain'}`">
                {{ item.value }}<i>{{ item.unit }}</i>
              </b>
            </span>
            <span class="ss-plate__subs">
              <span v-for="sub in item.sub || []" :key="sub[0]" class="ss-plate__sub">
                <em>{{ sub[0] }}</em>
                <b>
                  {{ sub[1] }}<i v-if="sub[2]" class="ss-trend-arrow" :class="sub[2] === 'down' ? 'is-down' : 'is-up'" />
                </b>
              </span>
            </span>
          </div>
        </div>

        <!-- 塔吊报警明细：项目 + 设备 + 报警类型 -->
        <div v-if="panel.bottom && panel.bottom.type === 'alarm-list'" class="ss-alarms">
          <div class="ss-alarms__head">
            <span v-for="col in panel.bottom.columns" :key="col">{{ col }}</span>
          </div>
          <div
            v-for="(item, index) in panel.bottom.items"
            :key="item.device + index"
            class="ss-alarms__row"
          >
            <span class="ss-alarms__project">{{ item.project }}</span>
            <span class="ss-alarms__device">{{ item.device }}</span>
            <span class="ss-alarms__type" :class="'is-' + (item.tone || 'info')">{{ item.type }}</span>
          </div>
        </div>

        <div v-else-if="extraDonut" class="ss-donut ss-donut--compact">
          <svg class="ss-donut__svg" viewBox="0 0 100 100" role="img" aria-label="占比图">
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255, 255, 255, 0.07)" stroke-width="13" />
            <circle
              v-for="seg in extraDonut.segments"
              :key="seg.label"
              cx="50"
              cy="50"
              r="38"
              fill="none"
              :stroke="seg.color"
              stroke-width="13"
              :stroke-dasharray="seg.dasharray"
              :stroke-dashoffset="seg.dashoffset"
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="47" text-anchor="middle" class="ss-donut__total">{{ extraDonut.total }}</text>
            <text x="50" y="61" text-anchor="middle" class="ss-donut__unit">{{ panel.bottom.unit || '' }}</text>
          </svg>
          <ul class="ss-donut__legend">
            <li v-for="seg in extraDonut.segments" :key="seg.label">
              <i :style="{ background: seg.color, boxShadow: `0 0 6px ${seg.color}` }" />
              <span class="ss-donut__name">{{ seg.label }}</span>
              <b class="ss-donut__val">{{ seg.value }}<em>{{ panel.bottom.unit || '' }}</em></b>
              <span class="ss-donut__pct">{{ Math.round(seg.ratio * 100) }}%</span>
            </li>
          </ul>
        </div>

        <div v-else-if="chart" class="ss-trend ss-trend--compact">
          <div class="ss-trend-meta">
            <span class="ss-trend-unit">{{ panel.bottom.unit }}</span>
            <span class="ss-trend-legend">
              <span v-for="item in panel.bottom.series" :key="item.name">
                <i :style="{ background: item.color }" />{{ item.name }}
              </span>
            </span>
          </div>
          <svg class="ss-trend-svg" :viewBox="`0 0 ${chart.width} ${chart.height}`" role="img" aria-label="趋势图">
            <defs>
              <linearGradient
                v-for="(item, index) in panel.bottom.series"
                :id="`ssm-${index}`"
                :key="item.name"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" :stop-color="item.color" stop-opacity="0.28" />
                <stop offset="100%" :stop-color="item.color" stop-opacity="0" />
              </linearGradient>
            </defs>
            <line
              v-for="y in chart.grid"
              :key="`grid-${y}`"
              class="ss-trend-grid"
              :x1="TREND.left"
              :x2="chart.width - TREND.right"
              :y1="y"
              :y2="y"
            />
            <text
              v-for="tick in chart.yTicks"
              :key="`tick-${tick.y}`"
              class="ss-trend-axis ss-trend-axis--y"
              :x="TREND.left - 6"
              :y="tick.y + 3"
              text-anchor="end"
            >{{ tick.label }}</text>
            <path
              v-for="(item, index) in chart.lines"
              :key="`area-${item.name}`"
              :d="item.area"
              :fill="`url(#ssm-${index})`"
            />
            <path
              v-for="item in chart.lines"
              :key="`line-${item.name}`"
              :d="item.line"
              :stroke="item.color"
              fill="none"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <circle
              v-for="item in chart.lines"
              :key="`dot-${item.name}`"
              :cx="item.last[0]"
              :cy="item.last[1]"
              r="2.2"
              :fill="item.color"
            />
            <text
              v-for="label in chart.labels"
              :key="label.text"
              class="ss-trend-axis"
              :x="label.x"
              :y="chart.height - 4"
              text-anchor="middle"
            >{{ label.text }}</text>
          </svg>
        </div>
      </div>

      <!-- 环形图（可选下排趋势曲线） -->
      <div v-else-if="panel.type === 'donut'" class="ss-stack">
        <div class="ss-donut">
          <svg class="ss-donut__svg" viewBox="0 0 100 100" role="img" :aria-label="panel.title">
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255, 255, 255, 0.07)" stroke-width="13" />
            <circle
              v-for="seg in donut.segments"
              :key="seg.label"
              cx="50"
              cy="50"
              r="38"
              fill="none"
              :stroke="seg.color"
              stroke-width="13"
              :stroke-dasharray="seg.dasharray"
              :stroke-dashoffset="seg.dashoffset"
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="47" text-anchor="middle" class="ss-donut__total">{{ donut.total }}</text>
            <text x="50" y="61" text-anchor="middle" class="ss-donut__unit">{{ panel.unit || '' }}</text>
          </svg>
          <ul class="ss-donut__legend">
            <li v-for="seg in donut.segments" :key="seg.label">
              <i :style="{ background: seg.color, boxShadow: `0 0 6px ${seg.color}` }" />
              <span class="ss-donut__name">{{ seg.label }}</span>
              <b class="ss-donut__val">{{ seg.value }}<em>{{ panel.unit || '' }}</em></b>
              <span class="ss-donut__pct">{{ Math.round(seg.ratio * 100) }}%</span>
            </li>
          </ul>
        </div>

        <div v-if="chart" class="ss-trend ss-trend--compact">
          <div class="ss-trend-meta">
            <span class="ss-trend-unit">{{ panel.bottom.unit }}</span>
            <span class="ss-trend-legend">
              <span v-for="item in panel.bottom.series" :key="item.name">
                <i :style="{ background: item.color }" />{{ item.name }}
              </span>
            </span>
          </div>
          <svg
            class="ss-trend-svg"
            :viewBox="`0 0 ${chart.width} ${chart.height}`"
            role="img"
            aria-label="趋势图"
          >
            <defs>
              <linearGradient
                v-for="(item, index) in panel.bottom.series"
                :id="`ssb-${index}`"
                :key="item.name"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" :stop-color="item.color" stop-opacity="0.28" />
                <stop offset="100%" :stop-color="item.color" stop-opacity="0" />
              </linearGradient>
            </defs>
            <line
              v-for="y in chart.grid"
              :key="`grid-${y}`"
              class="ss-trend-grid"
              :x1="TREND.left"
              :x2="chart.width - TREND.right"
              :y1="y"
              :y2="y"
            />
            <text
              v-for="tick in chart.yTicks"
              :key="`tick-${tick.y}`"
              class="ss-trend-axis ss-trend-axis--y"
              :x="TREND.left - 6"
              :y="tick.y + 3"
              text-anchor="end"
            >{{ tick.label }}</text>
            <path
              v-for="(item, index) in chart.lines"
              :key="`area-${item.name}`"
              :d="item.area"
              :fill="`url(#ssb-${index})`"
            />
            <path
              v-for="item in chart.lines"
              :key="`line-${item.name}`"
              :d="item.line"
              :stroke="item.color"
              fill="none"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <circle
              v-for="item in chart.lines"
              :key="`dot-${item.name}`"
              :cx="item.last[0]"
              :cy="item.last[1]"
              r="2.2"
              :fill="item.color"
            />
            <text
              v-for="label in chart.labels"
              :key="label.text"
              class="ss-trend-axis"
              :x="label.x"
              :y="chart.height - 4"
              text-anchor="middle"
            >{{ label.text }}</text>
          </svg>
        </div>
      </div>

      <!-- 分类横条 -->
      <div v-else-if="panel.type === 'bars'" class="ss-bars">
        <div v-for="item in panel.items" :key="item.label" class="ss-bar-row">
          <span class="ss-bar-label">{{ item.label }}</span>
          <span class="ss-bar-track">
            <i :style="{ width: barWidth(item.value) }" />
          </span>
          <span class="ss-bar-value">{{ item.value }}<em>{{ item.unit || '' }}</em></span>
        </div>
      </div>

      <!-- 独立趋势曲线 -->
      <div v-else-if="panel.type === 'trend'" class="ss-trend">
        <div class="ss-trend-meta">
          <span class="ss-trend-unit">{{ panel.unit }}</span>
          <span class="ss-trend-legend">
            <span v-for="item in panel.series" :key="item.name">
              <i :style="{ background: item.color }" />{{ item.name }}
            </span>
          </span>
        </div>
        <svg class="ss-trend-svg" :viewBox="`0 0 ${chart.width} ${chart.height}`" role="img" aria-label="趋势图">
          <defs>
            <linearGradient
              v-for="(item, index) in panel.series"
              :id="`sst-${index}`"
              :key="item.name"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" :stop-color="item.color" stop-opacity="0.28" />
              <stop offset="100%" :stop-color="item.color" stop-opacity="0" />
            </linearGradient>
          </defs>
          <line
            v-for="y in chart.grid"
            :key="`grid-${y}`"
            class="ss-trend-grid"
            :x1="TREND.left"
            :x2="chart.width - TREND.right"
            :y1="y"
            :y2="y"
          />
          <text
            v-for="tick in chart.yTicks"
            :key="`tick-${tick.y}`"
            class="ss-trend-axis ss-trend-axis--y"
            :x="TREND.left - 6"
            :y="tick.y + 3"
            text-anchor="end"
          >{{ tick.label }}</text>
          <path v-for="(item, index) in chart.lines" :key="`area-${item.name}`" :d="item.area" :fill="`url(#sst-${index})`" />
          <path
            v-for="item in chart.lines"
            :key="`line-${item.name}`"
            :d="item.line"
            :stroke="item.color"
            fill="none"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <circle
            v-for="item in chart.lines"
            :key="`dot-${item.name}`"
            :cx="item.last[0]"
            :cy="item.last[1]"
            r="2.4"
            :fill="item.color"
          />
          <text
            v-for="label in chart.labels"
            :key="label.text"
            class="ss-trend-axis"
            :x="label.x"
            :y="chart.height - 4"
            text-anchor="middle"
          >{{ label.text }}</text>
        </svg>
      </div>

      <!-- 项目排行 / 项目安全画像 -->
      <div v-else-if="panel.type === 'rank'" class="ss-rank">
        <div v-for="(item, index) in panel.items" :key="item.name" class="ss-rank-row">
          <span class="ss-rank-no" :class="`is-${item.tone || 'info'}`">{{ index + 1 }}</span>
          <span class="ss-rank-name">{{ item.name }}</span>
          <span v-if="item.tag" class="ss-rank-tag" :class="`is-${item.tone || 'info'}`">{{ item.tag }}</span>
          <span class="ss-rank-track">
            <i :style="{ width: rankWidth(item.value) }" :class="`is-${item.tone || 'info'}`" />
          </span>
          <span class="ss-rank-value" :class="`is-${item.tone || 'info'}`">{{ item.value }}<em>{{ item.unit || '' }}</em></span>
        </div>
      </div>
    </div>

    <p v-if="panel.foot" class="ss-block__foot">{{ panel.foot }}</p>
  </section>
</template>
