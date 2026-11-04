/**
 * 数字周报 · 快照存储
 *
 * 存储位置：localStorage（演示环境，与项目其它 mock 存储一致）
 * 规则：
 *  - 生成即冻结：已生成周报的数据快照不再随台账变化；
 *  - 重新生成产生新版本，旧版本归档保留（最多保留 2 个历史版本），可切换查看；
 *  - 首次进入自动补 W41～W44 演示周报，只补一次，刷新不重复。
 */
import { getWeekInfo, weekOfKey, addDays, isDemoWeek, DEMO_WEEK_KEYS } from '../mock/weeklyReport.js'
import { buildWeeklyReport } from './weeklyReportBuilder.js'

const STORAGE_KEY = 'airport-weekly-report-v1'
const MAX_ARCHIVED_VERSIONS = 2
/** 演示环境“今天”：固定用于列表自动补生成判断，避免不同机器时钟差异 */
export const WEEKLY_REPORT_TODAY = '2026-11-02'

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
    version: report.version,
    generatedAt: report.generatedAt,
    generatedBy: report.generatedBy,
    isDemo: Boolean(report.isDemo),
    archivedCount: (report.archivedVersions || []).length,
    metrics: (report.overview?.cards || []).map((card) => ({
      key: card.key,
      label: card.label,
      value: card.value,
      unit: card.unit,
      delta: card.delta,
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

/** 取完整周报；version 为空取当前版本，指定则取归档版本 */
export function getWeeklyReport(id, version) {
  const report = readRaw().reports.find((item) => item.id === id)
  if (!report) return null
  if (!version || Number(version) === report.version) return report
  const archived = (report.archivedVersions || []).find((item) => Number(item.version) === Number(version))
  if (!archived) return report
  return {
    ...report,
    ...archived,
    version: archived.version,
    generatedAt: archived.generatedAt,
    archivedVersions: report.archivedVersions,
    currentVersion: report.version,
  }
}

/** 可用版本列表（当前版本在前） */
export function listVersions(id) {
  const report = readRaw().reports.find((item) => item.id === id)
  if (!report) return []
  return [
    { version: report.version, generatedAt: report.generatedAt, current: true },
    ...(report.archivedVersions || []).map((item) => ({ version: item.version, generatedAt: item.generatedAt, current: false })),
  ]
}

function archiveCurrent(report) {
  const archived = report.archivedVersions || []
  const snapshot = {
    version: report.version,
    generatedAt: report.generatedAt,
    generatedBy: report.generatedBy,
    status: report.status,
    overview: report.overview,
    sections: report.sections,
    appendix: report.appendix,
    projectCount: report.projectCount,
  }
  return [snapshot, ...archived].slice(0, MAX_ARCHIVED_VERSIONS)
}

/** 写入一份新生成的周报（同周存在则升版本并归档旧版） */
export function saveGeneratedReport(report) {
  const state = readRaw()
  const index = state.reports.findIndex((item) => item.id === report.id)
  if (index < 0) {
    state.reports.push(report)
  } else {
    const existing = state.reports[index]
    state.reports[index] = {
      ...report,
      version: existing.version + 1,
      archivedVersions: archiveCurrent(existing),
    }
  }
  writeRaw(state)
  return state.reports.find((item) => item.id === report.id)
}

/**
 * 生成/重算周报
 * @param {{ weekKey?: string, weekStart?: string, target?: 'last'|'this' }} options
 * @returns {{ ok: boolean, report?: object, created?: boolean, msg?: string }}
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
  if (existing && existing.status === 'frozen' && !options.force) {
    return { ok: false, msg: `${weekInfo.label} 周报已生成，请使用「重新生成」创建新版本` }
  }

  const prevInfo = getWeekInfo(addDays(weekInfo.weekStart, -7))
  const prevReport = state.reports.find((item) => item.id === `wkr-${prevInfo.weekKey}`)
  const report = buildWeeklyReport({ weekInfo, prevReport })
  report.generatedAt = `${addDays(weekInfo.weekEnd, 1)} ${options.manual ? currentClock() : '08:00'}`
  report.generatedBy = options.manual ? '人工重新生成' : '系统自动生成'

  const saved = saveGeneratedReport(report)
  return { ok: true, report: saved, created: !existing, msg: existing ? `${weekInfo.label} 周报已重新生成（v${saved.version}）` : `${weekInfo.label} 周报已生成` }
}

function currentClock() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 重新生成指定周报（保留旧版本） */
export function regenerateWeeklyReport(id) {
  const report = readRaw().reports.find((item) => item.id === id)
  if (!report) return { ok: false, msg: '周报不存在' }
  return generateWeeklyReport({ weekKey: report.weekKey, force: true, manual: true })
}

/** 演示种子：首次进入时补齐演示周报（只补一次） */
export function ensureWeeklyReportSeeds() {
  const state = readRaw()
  if (state.reports.length) return state.reports
  const reports = DEMO_WEEK_KEYS.map((weekKey) => {
    const weekInfo = weekOfKey(weekKey)
    const reportsForPrev = null
    const report = buildWeeklyReport({ weekInfo, prevReport: reportsForPrev })
    report.generatedAt = `${addDays(weekInfo.weekEnd, 1)} 08:00`
    report.generatedBy = '系统自动生成（演示）'
    report.isDemo = true
    return report
  })
  // 逐周重算环比：前面已生成的作为后一周的对比基准
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

/** 列表页进入时调用：补种子 + 自动补生成“上周” */
export function ensureLatestWeekGenerated() {
  ensureWeeklyReportSeeds()
  const lastWeekInfo = getWeekInfo(addDays(WEEKLY_REPORT_TODAY, -7))
  const state = readRaw()
  const exists = state.reports.some((item) => item.id === `wkr-${lastWeekInfo.weekKey}`)
  if (exists) return { auto: false }
  const result = generateWeeklyReport({ weekKey: lastWeekInfo.weekKey })
  return { auto: result.ok, weekInfo: lastWeekInfo, msg: result.msg }
}

/** 统计：已生成周报数量 */
export function countWeeklyReports() {
  return readRaw().reports.length
}

/** 该周是否已有周报 */
export function hasWeeklyReport(weekKey) {
  return readRaw().reports.some((item) => item.id === `wkr-${weekKey}`)
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
