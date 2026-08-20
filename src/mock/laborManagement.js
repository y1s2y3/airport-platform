import { projectTree, getRealNameStats, getProjectPersonnel, getProjectLabel, buildHqRealNameStatsByProject } from './laborRealName.js'
import { getProjectWarnings, getWarningStats } from './laborWarningList.js'
import { getPersonStats, buildHqAttendanceStatsByProject } from './laborAttendanceStats.js'
import { REALNAME_ENTRY_STATUS } from '../constants/laborPersonStatus.js'

export { projectTree }

export const projectList = projectTree[0].children.map((item) => ({
  id: item.id,
  name: item.label.replace(/\(\d+\)$/, ''),
  count: item.count,
}))

const ALL_LABOR_PROJECT_IDS = projectList.map((item) => item.id)

/** 演示「今日」口径，与考勤/预警 mock 主数据日对齐 */
export const LABOR_HQ_STATS_TODAY = '2026-06-29'

export const HQ_AGE_SEGMENTS = [
  { name: '30岁以下', color: '#4285f4' },
  { name: '31-40岁', color: '#00bcd4' },
  { name: '41-50岁', color: '#43a047' },
  { name: '51-60岁', color: '#ff9800' },
  { name: '60岁以上', color: '#e53935' },
]

export const HQ_CATEGORY_SEGMENTS = [
  { name: '管理人员', color: '#43a047' },
  { name: '建筑工人', color: '#4285f4' },
]

function getAgeBucket(age) {
  if (age <= 30) return '30岁以下'
  if (age <= 40) return '31-40岁'
  if (age <= 50) return '41-50岁'
  if (age <= 60) return '51-60岁'
  return '60岁以上'
}

function getEnteredPersonnel(project_id) {
  const ids =
    !project_id || project_id === 'hq' ? ALL_LABOR_PROJECT_IDS : [project_id]
  return ids.flatMap((id) => getProjectPersonnel(id)).filter(
    (item) => item.entry_status === REALNAME_ENTRY_STATUS.ENTERED,
  )
}

function aggregateAgeAnalysis(project_id = 'hq') {
  const counts = Object.fromEntries(HQ_AGE_SEGMENTS.map((seg) => [seg.name, 0]))
  getEnteredPersonnel(project_id).forEach((person) => {
    const bucket = getAgeBucket(person.basic.age)
    if (counts[bucket] !== undefined) counts[bucket] += 1
  })
  return HQ_AGE_SEGMENTS.map((seg) => ({ ...seg, value: counts[seg.name] }))
}

function aggregateCategoryAnalysis(project_id = 'hq') {
  const counts = Object.fromEntries(HQ_CATEGORY_SEGMENTS.map((seg) => [seg.name, 0]))
  getEnteredPersonnel(project_id).forEach((person) => {
    const category = person.unit.personnel_category
    if (counts[category] !== undefined) counts[category] += 1
  })
  return HQ_CATEGORY_SEGMENTS.map((seg) => ({ ...seg, value: counts[seg.name] }))
}

function buildAttendanceTrend({ manage = 0, labor = 0 } = {}, endDate = LABOR_HQ_STATS_TODAY) {
  const end = new Date(endDate)
  const trend = []
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(end)
    date.setDate(end.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)
    const seed = Number(dateStr.replace(/-/g, '')) % 97
    const rate = 86 + (seed % 10) + ((29 - i) % 5) * 0.4
    const today_manage_attendance_rate = Math.min(100, rate + 2 + (seed % 3) * 0.3)
    const today_labor_attendance_rate = Math.max(80, rate - 1 - (seed % 2) * 0.4)
    const manage_present_count = Math.round((manage * today_manage_attendance_rate) / 100)
    const labor_present_count = Math.round((labor * today_labor_attendance_rate) / 100)
    const present_count = manage_present_count + labor_present_count
    const attendance_rate = manage + labor
      ? Number((((present_count / (manage + labor)) * 100) || 0).toFixed(1))
      : Number(rate.toFixed(1))
    trend.push({
      date: dateStr,
      label: dateStr.slice(5),
      manage_present_count,
      labor_present_count,
      present_count,
      attendance_rate,
    })
  }
  return trend
}

/** 近 30 日预警趋势：每日新增、当日仍待处理数 */
function buildWarningTrend(project_id = 'hq', endDate = LABOR_HQ_STATS_TODAY) {
  const warnings = getProjectWarnings(project_id)
  const end = new Date(endDate)
  const trend = []
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(end)
    date.setDate(end.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)
    const new_warning_count = warnings.filter((w) => String(w.triggered_at || '').startsWith(dateStr)).length
    // 演示：当日未处置 = 触发日≤当日且状态为待处理，加少量种子波动便于出图
    const pendingBase = warnings.filter(
      (w) =>
        w.status === '待处理' &&
        String(w.triggered_at || '').slice(0, 10) <= dateStr,
    ).length
    const seed = Number(dateStr.replace(/-/g, '')) % 5
    const pending_warning_count = Math.max(0, pendingBase - (i % 3) + (seed % 2))
    trend.push({
      date: dateStr,
      label: dateStr.slice(5),
      new_warning_count,
      pending_warning_count,
    })
  }
  return trend
}

function aggregateRealNameStats() {
  return ALL_LABOR_PROJECT_IDS.reduce(
    (acc, id) => {
      const stats = getRealNameStats(id)
      acc.total += stats.total
      acc.entered += stats.entered
      acc.exited += stats.exited
      acc.on_site_count += stats.on_site_count
      acc.special += stats.special
      return acc
    },
    { total: 0, entered: 0, exited: 0, on_site_count: 0, special: 0 },
  )
}

function buildDashboardPayload({ realname, warningStats, warnings, personStats }) {
  const openWarnings = warnings
    .filter((item) => item.status === '待处理')
    .sort((a, b) => (b.triggered_at || '').localeCompare(a.triggered_at || ''))

  // 平台仅汇总：全局人数、工种/类别占比、特种在岗、预警；班组明细由项目自有系统完成
  return {
    summary: {
      total: realname.entered,
      manage: 0,
      labor: 0,
      special: realname.special,
      today_attendance_rate: '-',
      today_manage_attendance_rate: '-',
      today_warning_count: 0,
      pending_warning_count: warningStats.pending,
    },
    pending_warning_list: openWarnings.slice(0, 6).map((item) => ({
      warning_no: item.warning_no,
      project_id: item.project_id,
      project_name: getProjectLabel(item.project_id),
      name: item.name,
      rule_label: item.rule_label,
      status: item.status,
      time: item.triggered_at?.slice(11, 16) || '-',
    })),
    training_abnormal_list: openWarnings
      .filter((item) => ['noLevel3Education', 'specialCertMissing'].includes(item.rule_key))
      .slice(0, 6)
      .map((item) => ({
        name: item.name,
        unit_name: item.unit_name,
        abnormal_type: item.rule_label,
        expire_date: item.status,
      })),
    work_type_summary: (() => {
      const counts = {}
      personStats.forEach((row) => {
        const key = row.work_type || '其他'
        counts[key] = (counts[key] || 0) + 1
      })
      return Object.entries(counts)
        .map(([work_type, headcount]) => ({ work_type, headcount }))
        .sort((a, b) => b.headcount - a.headcount)
        .slice(0, 12)
    })(),
  }
}

export function getLaborDashboardData(project_id) {
  const scopeId = !project_id || project_id === 'hq' ? 'hq' : project_id
  const realname =
    scopeId === 'hq' ? aggregateRealNameStats() : getRealNameStats(scopeId)
  const warnings = getProjectWarnings(scopeId)
  const categoryAnalysis = aggregateCategoryAnalysis(scopeId)
  const payload = {
    ...buildDashboardPayload({
      realname,
      warningStats: getWarningStats(scopeId),
      warnings,
      personStats:
        scopeId === 'hq'
          ? ALL_LABOR_PROJECT_IDS.flatMap((id) => getPersonStats(id))
          : getPersonStats(scopeId),
    }),
    ageAnalysis: aggregateAgeAnalysis(scopeId),
    categoryAnalysis,
    attendanceTrend: buildAttendanceTrend({
      manage: categoryAnalysis.find((item) => item.name === '管理人员')?.value || 0,
      labor: categoryAnalysis.find((item) => item.name === '建筑工人')?.value || 0,
    }),
    warningTrend: buildWarningTrend(scopeId),
  }
  payload.summary = buildDashboardKpiSummary(scopeId)
  return payload
}

export const attendancePersonList = [
  { name: '张强', unit_name: '中建三局', work_type: '钢筋工', attendance_days: 22, total_hours: 198, avg_hours: 9.0, late_count: 1, early_leave_count: 0, absent_count: 0, overtime_hours: 12, attendance_rate: '100%' },
  { name: '李华', unit_name: '中建三局', work_type: '木工', attendance_days: 21, total_hours: 185, avg_hours: 8.8, late_count: 2, early_leave_count: 1, absent_count: 1, overtime_hours: 8, attendance_rate: '95.5%' },
  { name: '赵磊', unit_name: '广东建工', work_type: '特种-电工', attendance_days: 20, total_hours: 176, avg_hours: 8.8, late_count: 0, early_leave_count: 0, absent_count: 2, overtime_hours: 16, attendance_rate: '90.9%' },
  { name: '刘洋', unit_name: '深圳市政', work_type: '特种-焊工', attendance_days: 22, total_hours: 202, avg_hours: 9.2, late_count: 0, early_leave_count: 0, absent_count: 0, overtime_hours: 20, attendance_rate: '100%' },
  { name: '陈静', unit_name: '中铁建工', work_type: '安全员', attendance_days: 22, total_hours: 176, avg_hours: 8.0, late_count: 0, early_leave_count: 0, absent_count: 0, overtime_hours: 4, attendance_rate: '100%' },
  { name: '周杰', unit_name: '中建三局', work_type: '特种-架子工', attendance_days: 19, total_hours: 168, avg_hours: 8.8, late_count: 3, early_leave_count: 2, absent_count: 3, overtime_hours: 10, attendance_rate: '86.4%' },
]

export const attendanceTeamList = [
  { team: '钢筋一班', unit_name: '中建三局', headcount: 32, present_days: 680, avg_rate: '96.2%', absent_total: 12, overtime_hours: 86 },
  { team: '木工二班', unit_name: '中建三局', headcount: 28, present_days: 588, avg_rate: '94.8%', absent_total: 18, overtime_hours: 64 },
  { team: '机电班组', unit_name: '广东建工', headcount: 24, present_days: 512, avg_rate: '97.1%', absent_total: 6, overtime_hours: 120 },
  { team: '钢结构班', unit_name: '深圳市政', headcount: 18, present_days: 378, avg_rate: '93.5%', absent_total: 10, overtime_hours: 48 },
]

export const workTypes = [
  '钢筋工',
  '木工',
  '混凝土工',
  '特种-架子工',
  '特种-电工',
  '特种-焊工',
  '特种-起重工',
  '普工',
  '安全员',
]

/**
 * 指挥部 · 实名制统计（按项目）
 * 在岗人数 / 三类人员 / 今日出勤率（含分类）/ 今日与累计预警 / 未处置
 */
export function buildHqRealNameSupervisionStatsByProject(today = LABOR_HQ_STATS_TODAY) {
  const headcounts = buildHqRealNameStatsByProject()
  const attendance = Object.fromEntries(
    buildHqAttendanceStatsByProject(today).map((row) => [row.project_id, row]),
  )

  return headcounts.map((row) => {
    const att = attendance[row.project_id]
    const warnings = row.demo_empty ? [] : getProjectWarnings(row.project_id)
    const todayWarnings = warnings.filter((w) => String(w.triggered_at || '').startsWith(today))
    const pending = warnings.filter((w) => w.status === '待处理').length

    return {
      project_id: row.project_id,
      project_name: row.project_name,
      demo_empty: row.demo_empty,
      total: row.total,
      manage: row.manage,
      labor: row.labor,
      special: row.special,
      today_attendance_rate: att?.today_attendance_rate ?? 0,
      today_manage_attendance_rate: att?.today_manage_attendance_rate ?? 0,
      today_labor_attendance_rate: att?.today_labor_attendance_rate ?? 0,
      today_special_attendance_rate: att?.today_special_attendance_rate ?? 0,
      today_warning_count: todayWarnings.length,
      pending_warning_count: pending,
      total_warning_count: warnings.length,
    }
  })
}

function weightedRate(rows, rateKey, weightKey) {
  let weighted = 0
  let weightSum = 0
  rows.forEach((row) => {
    const w = Number(row[weightKey]) || 0
    if (w <= 0) return
    weighted += (Number(row[rateKey]) || 0) * w
    weightSum += w
  })
  return weightSum ? Number((weighted / weightSum).toFixed(1)) : 0
}

/** 指挥部 · 实名制统计顶部指标卡（全项目汇总） */
export function buildHqRealNameSupervisionSummary(today = LABOR_HQ_STATS_TODAY) {
  const rows = buildHqRealNameSupervisionStatsByProject(today).filter((r) => !r.demo_empty)
  const total = rows.reduce((s, r) => s + r.total, 0)
  const manage = rows.reduce((s, r) => s + r.manage, 0)
  const labor = rows.reduce((s, r) => s + r.labor, 0)
  const special = rows.reduce((s, r) => s + r.special, 0)
  return {
    today,
    total,
    manage,
    labor,
    special,
    today_attendance_rate: weightedRate(rows, 'today_attendance_rate', 'total'),
    today_manage_attendance_rate: weightedRate(rows, 'today_manage_attendance_rate', 'manage'),
    today_warning_count: rows.reduce((s, r) => s + r.today_warning_count, 0),
    pending_warning_count: rows.reduce((s, r) => s + r.pending_warning_count, 0),
  }
}

function formatDashboardRate(rate) {
  return `${Number(rate || 0).toFixed(1)}%`
}

/** 看板指标卡：与指挥部「实名制统计」顶部指标口径一致（hq=汇总；项目=同行口径） */
export function buildDashboardKpiSummary(project_id, today = LABOR_HQ_STATS_TODAY) {
  if (!project_id || project_id === 'hq') {
    const s = buildHqRealNameSupervisionSummary(today)
    return {
      total: s.total,
      manage: s.manage,
      labor: s.labor,
      special: s.special,
      today_attendance_rate: formatDashboardRate(s.today_attendance_rate),
      today_manage_attendance_rate: formatDashboardRate(s.today_manage_attendance_rate),
      today_warning_count: s.today_warning_count,
      pending_warning_count: s.pending_warning_count,
    }
  }
  const row = buildHqRealNameSupervisionStatsByProject(today).find((item) => item.project_id === project_id)
  if (!row || row.demo_empty) {
    return {
      total: 0,
      manage: 0,
      labor: 0,
      special: 0,
      today_attendance_rate: '0.0%',
      today_manage_attendance_rate: '0.0%',
      today_warning_count: 0,
      pending_warning_count: 0,
    }
  }
  return {
    total: row.total,
    manage: row.manage,
    labor: row.labor,
    special: row.special,
    today_attendance_rate: formatDashboardRate(row.today_attendance_rate),
    today_manage_attendance_rate: formatDashboardRate(row.today_manage_attendance_rate),
    today_warning_count: row.today_warning_count,
    pending_warning_count: row.pending_warning_count,
  }
}

export const laborDashboardData = getLaborDashboardData('p-000')

/** 未处置预警最多的项目（用于指标卡下钻） */
export function pickProjectWithMostPendingWarnings(today = LABOR_HQ_STATS_TODAY) {
  const rows = buildHqRealNameSupervisionStatsByProject(today)
    .filter((r) => !r.demo_empty && r.pending_warning_count > 0)
    .sort((a, b) => b.pending_warning_count - a.pending_warning_count)
  return rows[0] || null
}
