/**
 * 数字周报 · 快照存储
 *
 * 存储位置：localStorage（演示环境，与项目其它 mock 存储一致）
 * 规则：
 *  - 生成即冻结：已生成周报的数据快照不再随台账变化；
 *  - **不支持重新生成**：每个自然周只有一份周报，已生成的周次不可再生成（用户 2026-11-04 调整）；
 *  - 首次进入自动补 W41～W44 演示周报，只补一次，刷新不重复；
 *  - 进入列表时若上周尚未生成，自动补生成一份。
 */
import { getWeekInfo, weekOfKey, addDays, isDemoWeek, DEMO_WEEK_KEYS } from '../mock/weeklyReport.js'
import { buildWeeklyReport } from './weeklyReportBuilder.js'

const STORAGE_KEY = 'airport-weekly-report-v2'
/** 演示环境“今天”：固定用于列表自动补生成判断，避免不同机器时钟差异 */
export const WEEKLY_REPORT_TODAY = '2026-11-04'

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { reports: [] }
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.reports)) return { reports: [] }
    return parsed
  } catch (error) {
    return { reports: [] }
  }
}

function writeRaw(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** 周报摘要（列表用，不含 sections 大对象） */
function toSummary(report) {
  return {
    id: report.id,
    weekKey: report.weekKey,
    weekStart: report.weekStart,
    weekEnd: report.weekEnd,
    weekLabel: report.weekLabel,
    rangeLabel: report.rangeLabel,
    status: report.status,
    generatedAt: report.generatedAt,
    generatedBy: report.generatedBy,
    isDemo: Boolean(report.isDemo),
    metrics: (report.overview?.cards || []).map((card) => ({
      key: card.key,
      label: card.label,
      value: card.value,
      unit: card.unit,
      delta: card.delta,
      group: card.group,
    })),
  }
}

/** 列表：按周倒序 */
export function listWeeklyReports() {
  return readRaw()
    .reports.slice()
    .sort((a, b) => String(b.weekStart).localeCompare(String(a.weekStart)))
    .map(toSummary)
}

/** 取完整周报 */
export function getWeeklyReport(id) {
  return readRaw().reports.find((item) => item.id === id) || null
}

/**
 * 生成周报
 * @param {{ weekKey?: string, weekStart?: string, target?: 'last'|'this', manual?: boolean }} options
 * @returns {{ ok: boolean, report?: object, msg?: string }}
 */
export function generateWeeklyReport(options = {}) {
  let weekInfo
  if (options.weekKey) {
    weekInfo = weekOfKey(options.weekKey)
  } else if (options.weekStart) {
    weekInfo = getWeekInfo(options.weekStart)
  } else if (options.target === 'this') {
    weekInfo = getWeekInfo(WEEKLY_REPORT_TODAY)
  } else {
    weekInfo = getWeekInfo(addDays(WEEKLY_REPORT_TODAY, -7))
  }

  const state = readRaw()
  const existing = state.reports.find((item) => item.id === `wkr-${weekInfo.weekKey}`)
  if (existing) {
    return { ok: false, msg: `${weekInfo.label} 周报已生成，同一周不支持重复生成` }
  }

  const prevInfo = getWeekInfo(addDays(weekInfo.weekStart, -7))
  const prevReport = state.reports.find((item) => item.id === `wkr-${prevInfo.weekKey}`)
  const report = buildWeeklyReport({ weekInfo, prevReport, trendContext: buildTrendContext(state, weekInfo) })
  report.generatedAt = `${addDays(weekInfo.weekEnd, 1)} ${options.manual ? currentClock() : '08:00'}`
  report.generatedBy = options.manual ? '人工生成' : '系统自动生成'

  state.reports.push(report)
  writeRaw(state)
  return { ok: true, report, msg: `${weekInfo.label} 周报已生成` }
}

function currentClock() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * 近 6 周折线图上下文：读取已有周报的「新增隐患 / 闭环隐患」
 * 缺失周为 null（图上断线），不伪造历史数据。
 */
function buildTrendContext(state, weekInfo) {
  const list = []
  for (let i = 5; i >= 1; i -= 1) {
    const info = getWeekInfo(addDays(weekInfo.weekStart, -7 * i))
    const prev = state.reports.find((item) => item.id === `wkr-${info.weekKey}`)
    list.push({
      label: `第 ${info.weekNo} 周`,
      created: prev?.sections?.anziHazard?.totals?.created ?? null,
      closed: prev?.sections?.anziHazard?.totals?.closed ?? null,
    })
  }
  return list
}

/** 该周是否已有周报 */
export function hasWeeklyReport(weekKey) {
  return readRaw().reports.some((item) => item.id === `wkr-${weekKey}`)
}

/**
 * 近 6 周趋势上下文（含本周）：供旧快照补图表 / 详情页兜底使用
 * 已有周报取实际值，缺失周为 null（图上断线，不伪造历史）。
 * @param {string|object} weekInfoOrKey 周次或周信息
 * @param {{ created?: number, closed?: number }} current 本周实际值
 */
export function getHazardTrendContext(weekInfoOrKey, current = null) {
  const weekInfo = typeof weekInfoOrKey === 'string' ? weekOfKey(weekInfoOrKey) : weekInfoOrKey
  const state = readRaw()
  const list = []
  for (let i = 5; i >= 0; i -= 1) {
    const info = getWeekInfo(addDays(weekInfo.weekStart, -7 * i))
    if (i === 0) {
      list.push({
        label: `第 ${info.weekNo} 周`,
        created: current?.created ?? null,
        closed: current?.closed ?? null,
      })
      continue
    }
    const prev = state.reports.find((item) => item.id === `wkr-${info.weekKey}`)
    list.push({
      label: `第 ${info.weekNo} 周`,
      created: prev?.sections?.anziHazard?.totals?.created ?? null,
      closed: prev?.sections?.anziHazard?.totals?.closed ?? null,
    })
  }
  return list
}

/** 演示种子：首次进入时补齐演示周报（只补一次） */
export function ensureWeeklyReportSeeds() {
  const state = readRaw()
  if (state.reports.length) return state.reports
  const seeded = []
  for (const weekKey of DEMO_WEEK_KEYS) {
    const weekInfo = weekOfKey(weekKey)
    const prevReport = seeded.length ? seeded[seeded.length - 1] : null
    const report = buildWeeklyReport({ weekInfo, prevReport })
    report.generatedAt = `${addDays(weekInfo.weekEnd, 1)} 08:00`
    report.generatedBy = '系统自动生成（演示）'
    report.isDemo = true
    seeded.push(report)
  }
  writeRaw({ reports: seeded })
  return seeded
}

/** 列表页进入时调用：补种子 + 自动补生成“上周”（不存在时） */
export function ensureLatestWeekGenerated() {
  ensureWeeklyReportSeeds()
  const lastWeekInfo = getWeekInfo(addDays(WEEKLY_REPORT_TODAY, -7))
  if (hasWeeklyReport(lastWeekInfo.weekKey)) return { auto: false }
  const result = generateWeeklyReport({ weekKey: lastWeekInfo.weekKey })
  return { auto: result.ok, weekInfo: lastWeekInfo, msg: result.msg }
}

/** 可选周次（用于生成弹窗）：最近 8 周 */
export function listWeekOptions(total = 8) {
  const options = []
  for (let i = 1; i <= total; i += 1) {
    const weekInfo = getWeekInfo(addDays(WEEKLY_REPORT_TODAY, -7 * i))
    options.push({
      ...weekInfo,
      isDemo: isDemoWeek(weekInfo.weekKey),
      exists: hasWeeklyReport(weekInfo.weekKey),
    })
  }
  return options
}

/** 清空（仅供调试，不暴露到界面） */
export function clearWeeklyReports() {
  localStorage.removeItem(STORAGE_KEY)
}
