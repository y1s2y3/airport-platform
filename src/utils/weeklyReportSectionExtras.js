/**
 * 数字周报 · 章节图表与明细数据构造工具（页面渲染与 Word 导出共用数据形态）
 *
 * 目的：让每个章节都具备「环形图（本周构成）+ 折线图（近 6 周趋势）+ 明细数据表」三件套，
 * 避免只有个别章节有图、明细缺失。
 *
 * 约定：
 * - 环形图：{ key, type: 'donut', title, unit, data: [{ name, value }] }
 * - 折线图：{ key, type: 'line', title, unit, categories: string[], series: [{ name, data }] }
 * - 明细表：{ title, summary, columns, rows }
 */

/** 轻量确定性伪随机（0~1），保证同一周同一图表反复渲染结果稳定 */
function hashSeed(text) {
  let hash = 2166136261
  const source = String(text || '')
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

function round1(value) {
  return Math.round(value * 10) / 10
}

/** 由周标识生成最近 count 期的周标签（含本周） */
export function formatWeekLabels(weekKey, count = 6) {
  const matched = /^(\d{4})-W(\d{1,2})$/.exec(String(weekKey || ''))
  if (!matched) return Array.from({ length: count }, (_, index) => `第 ${index + 1} 期`)
  const year = Number(matched[1])
  const endWeek = Number(matched[2])
  const labels = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const week = endWeek - offset
    labels.push(week >= 1 ? `${year}年第${week}周` : `${year - 1}年第${52 + week}周`)
  }
  return labels
}

/** 环形图：通用数据构造 */
export function buildShareDonut({ key, title, unit, items }) {
  const data = (items || [])
    .map((item) => ({ name: item.name || '未命名', value: Number(item.value) || 0 }))
    .filter((item) => item.value > 0)
  return {
    key,
    type: 'donut',
    title,
    unit,
    data: data.length ? data : [{ name: '暂无数据', value: 0 }],
  }
}

/** 环形图：按项目的某个数值字段做构成占比（项目多时末位合并为「其他」） */
export function buildProjectShareDonut({ key, title, unit, rows, field, limit = 6, projectField = 'project' }) {
  const sorted = (rows || [])
    .map((row) => ({ name: row[projectField] || '未命名', value: Number(row[field]) || 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
  if (sorted.length > limit) {
    const head = sorted.slice(0, limit - 1)
    const rest = sorted.slice(limit - 1).reduce((sum, item) => sum + item.value, 0)
    return buildShareDonut({ key, title, unit, items: [...head, { name: '其他', value: round1(rest) }] })
  }
  return buildShareDonut({ key, title, unit, items: sorted })
}

/** 环形图：按某个枚举/状态字段做计数构成 */
export function buildStatusDonut({ key, title, unit, rows, field, valueField = null, order = null }) {
  const counter = new Map()
  ;(rows || []).forEach((row) => {
    const name = row[field] === null || row[field] === undefined || row[field] === '' ? '未填写' : String(row[field])
    const value = valueField ? Number(row[valueField]) || 0 : 1
    counter.set(name, (counter.get(name) || 0) + value)
  })
  let items = [...counter.entries()].map(([name, value]) => ({ name, value: round1(value) }))
  if (Array.isArray(order) && order.length) {
    items = order.map((name) => items.find((item) => item.name === name) || { name, value: 0 }).filter((item) => item.value > 0)
  }
  return buildShareDonut({ key, title, unit, items })
}

/** 折线图：通用构造 */
export function buildTrendLine({ key, title, unit, categories, series }) {
  return { key, type: 'line', title, unit, categories, series }
}

/**
 * 折线图：近 count 周趋势（演示数据）
 * 前 count-1 周按确定性伪随机围绕本周值波动；最后一周为真实本周值。
 * @param {number|Array<{name:string,value:number}>} current 本周值（单序列或双序列）
 */
export function buildDemoTrend({ key, title, unit, weekKey, current, fluctuation = 0.16, count = 6, bounds = null }) {
  const categories = formatWeekLabels(weekKey, count)
  const list = Array.isArray(current) ? current : [{ name: title, value: current }]
  const series = list.map((item, seriesIndex) => {
    const base = Number(item.value) || 0
    const data = []
    for (let index = 0; index < count - 1; index += 1) {
      const seed = hashSeed(`${weekKey}-${key}-${seriesIndex}-${index}`)
      let value = round1(base * (1 + (seed - 0.5) * 2 * fluctuation))
      if (Array.isArray(bounds) && bounds.length === 2) {
        value = Math.min(bounds[1], Math.max(bounds[0], value))
      }
      data.push(Math.max(0, value))
    }
    data.push(base)
    return { name: item.name || title, data }
  })
  return buildTrendLine({ key, title, unit, categories, series })
}

/** 明细表：统一构造 */
export function buildDetailTable({ title, summary, columns, rows, emptyText = '本周无数据' }) {
  return {
    title,
    summary: summary || '',
    columns,
    rows: rows || [],
    emptyText,
  }
}
