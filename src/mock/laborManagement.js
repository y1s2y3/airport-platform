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

export const HQ_AGE_SEGMENTS = [
  { name: '18-30岁', color: '#4285f4' },
  { name: '31-40岁', color: '#00bcd4' },
  { name: '41-50岁', color: '#43a047' },
  { name: '51-60岁', color: '#ff9800' },
  { name: '60岁以上', color: '#e53935' },
]

export const HQ_CATEGORY_SEGMENTS = [
  { name: '劳务人员', color: '#4285f4' },
  { name: '管理人员', color: '#43a047' },
  { name: '特种作业人员', color: '#ff9800' },
]

function getAgeBucket(age) {
  if (age <= 30) return '18-30岁'
  if (age <= 40) return '31-40岁'
  if (age <= 50) return '41-50岁'
  if (age <= 60) return '51-60岁'
  return '60岁以上'
}

function getAllEnteredPersonnel() {
  return ALL_LABOR_PROJECT_IDS.flatMap((id) => getProjectPersonnel(id)).filter(
    (item) => item.entryStatus === REALNAME_ENTRY_STATUS.ENTERED,
  )
}

function aggregateAgeAnalysis() {
  const counts = Object.fromEntries(HQ_AGE_SEGMENTS.map((seg) => [seg.name, 0]))
  getAllEnteredPersonnel().forEach((person) => {
    const bucket = getAgeBucket(person.basic.age)
    if (counts[bucket] !== undefined) counts[bucket] += 1
  })
  return HQ_AGE_SEGMENTS.map((seg) => ({ ...seg, value: counts[seg.name] }))
}

function aggregateCategoryAnalysis() {
  const counts = Object.fromEntries(HQ_CATEGORY_SEGMENTS.map((seg) => [seg.name, 0]))
  getAllEnteredPersonnel().forEach((person) => {
    const category = person.unit.personnelCategory
    if (counts[category] !== undefined) counts[category] += 1
  })
  return HQ_CATEGORY_SEGMENTS.map((seg) => ({ ...seg, value: counts[seg.name] }))
}

function buildHqAttendanceTrend(enteredTotal) {
  const end = new Date('2026-06-29')
  const trend = []
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(end)
    date.setDate(end.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)
    const seed = Number(dateStr.replace(/-/g, '')) % 97
    const rate = 86 + (seed % 10) + ((29 - i) % 5) * 0.4
    const presentCount = Math.round(enteredTotal * rate / 100)
    trend.push({
      date: dateStr,
      label: dateStr.slice(5),
      presentCount,
      attendanceRate: Number(rate.toFixed(1)),
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
      acc.onSite += stats.onSite
      acc.special += stats.special
      return acc
    },
    { total: 0, entered: 0, exited: 0, onSite: 0, special: 0 },
  )
}

function buildDashboardPayload({ realname, warningStats, warnings, personStats }) {
  const avgAttendanceRate = personStats.length
    ? `${(personStats.reduce((sum, row) => sum + parseFloat(row.attendanceRate), 0) / personStats.length).toFixed(1)}%`
    : '-'
  const todayPresent = personStats.reduce((sum, row) => sum + Math.round(row.attendanceDays * 0.95), 0)
  const openWarnings = warnings
    .filter((item) => item.status !== '已关闭')
    .sort((a, b) => (b.triggeredAt || '').localeCompare(a.triggeredAt || ''))

  // 平台仅汇总：全局人数、工种/类别占比、特种在岗、预警；班组明细由项目自有系统完成
  return {
    summary: {
      total: realname.total,
      entered: realname.entered,
      onSite: realname.onSite,
      special: realname.special,
      pendingWarnings: warningStats.pending,
      processingWarnings: warningStats.processing,
      todayPresent,
      attendanceRate: avgAttendanceRate,
    },
    pendingWarningList: openWarnings.slice(0, 6).map((item) => ({
      warningNo: item.warningNo,
      projectId: item.projectId,
      projectName: getProjectLabel(item.projectId),
      name: item.name,
      ruleLabel: item.ruleLabel,
      status: item.status,
      time: item.triggeredAt?.slice(11, 16) || '-',
    })),
    trainingAbnormalList: openWarnings
      .filter((item) => ['noLevel3Education', 'specialCertMissing'].includes(item.ruleKey))
      .slice(0, 6)
      .map((item) => ({
        name: item.name,
        company: item.unitName,
        abnormalType: item.ruleLabel,
        expireDate: item.status,
      })),
    workTypeSummary: (() => {
      const counts = {}
      personStats.forEach((row) => {
        const key = row.workType || '其他'
        counts[key] = (counts[key] || 0) + 1
      })
      return Object.entries(counts)
        .map(([workType, headcount]) => ({ workType, headcount }))
        .sort((a, b) => b.headcount - a.headcount)
        .slice(0, 12)
    })(),
  }
}

export function getLaborDashboardData(projectId) {
  if (!projectId || projectId === 'hq') {
    const realname = aggregateRealNameStats()
    return {
      ...buildDashboardPayload({
        realname,
        warningStats: getWarningStats('hq'),
        warnings: getProjectWarnings('hq'),
        personStats: ALL_LABOR_PROJECT_IDS.flatMap((id) => getPersonStats(id)),
      }),
      ageAnalysis: aggregateAgeAnalysis(),
      categoryAnalysis: aggregateCategoryAnalysis(),
      attendanceTrend: buildHqAttendanceTrend(realname.entered),
    }
  }

  return buildDashboardPayload({
    realname: getRealNameStats(projectId),
    warningStats: getWarningStats(projectId),
    warnings: getProjectWarnings(projectId),
    personStats: getPersonStats(projectId),
  })
}

export const laborDashboardData = getLaborDashboardData('p-000')

export const accessStatsSummary = {
  projectCount: 5,
  totalOnSite: 2998,
  todayAccess: 4526,
  passCount: 4412,
  blockCount: 114,
  passRate: '97.5%',
}

export const accessStatsByProject = [
  { projectId: 'p-000', projectName: 'T2航站区及配套工程', onSite: 1286, todayAccess: 1862, passCount: 1818, blockCount: 44, passRate: '97.6%', violationCount: 3, noTraining: 28, expiredCert: 12, blacklist: 1 },
  { projectId: 'p-003', projectName: '三跑道扩建工程', onSite: 856, todayAccess: 1248, passCount: 1216, blockCount: 32, passRate: '97.4%', violationCount: 2, noTraining: 18, expiredCert: 9, blacklist: 0 },
  { projectId: 'p-001', projectName: 'T1航站区配套工程', onSite: 432, todayAccess: 628, passCount: 602, blockCount: 26, passRate: '95.9%', violationCount: 4, noTraining: 15, expiredCert: 8, blacklist: 2 },
  { projectId: 'p-004', projectName: '综合配套区市政工程', onSite: 268, todayAccess: 412, passCount: 404, blockCount: 8, passRate: '98.1%', violationCount: 0, noTraining: 5, expiredCert: 2, blacklist: 0 },
  { projectId: 'p-005', projectName: '捷运线延长段工程', onSite: 156, todayAccess: 376, passCount: 372, blockCount: 4, passRate: '98.9%', violationCount: 0, noTraining: 3, expiredCert: 1, blacklist: 0 },
]

export const accessBlockDetailsByProject = {
  'p-000': [
    { name: '赵某', idCard: '440300199005121234', phone: '13800138011', workType: '钢筋工', company: '中建三局', team: '钢筋一班', blockType: '未培训', blockReason: '未完成三级安全教育', gate: 'T2东门闸机', time: '2026-06-29 08:12:35' },
    { name: '钱某', idCard: '440300198812089876', phone: '13900139022', workType: '电工', company: '广东建工', team: '机电班组', blockType: '证件过期', blockReason: '特种作业操作证已过期', gate: 'T2西门闸机', time: '2026-06-29 09:35:18' },
    { name: '孙某', idCard: '440300199203156789', phone: '', workType: '普工', company: '深圳市政', team: '综合班组', blockType: '黑名单', blockReason: '存在于劳务黑名单', gate: 'T2北门闸机', time: '2026-06-29 10:08:42' },
    { name: '李某', idCard: '440300198711223344', phone: '13700137033', workType: '架子工', company: '中铁建工', team: '脚手架班', blockType: '未培训', blockReason: '进场安全教育未完成', gate: 'T2东门闸机', time: '2026-06-29 11:22:05' },
  ],
  'p-003': [
    { name: '周某', idCard: '440300199108156543', phone: '13600136044', workType: '焊工', company: '广东建工', team: '钢结构班', blockType: '证件过期', blockReason: '焊工证有效期已过', gate: '三跑道1号门', time: '2026-06-29 07:48:20' },
    { name: '吴某', idCard: '440300198905098765', phone: '13500135055', workType: '普工', company: '中建三局', team: '杂工班', blockType: '未培训', blockReason: '未参加复工安全教育', gate: '三跑道2号门', time: '2026-06-29 08:56:11' },
  ],
  'p-001': [
    { name: '郑某', idCard: '440300199406121122', phone: '13400134066', workType: '木工', company: '深圳市政', team: '木工二班', blockType: '黑名单', blockReason: '劳务黑名单人员', gate: 'T1南门', time: '2026-06-29 09:15:33' },
    { name: '王某', idCard: '440300198803045566', phone: '', workType: '起重工', company: '中铁建工', team: '塔吊班', blockType: '证件过期', blockReason: '起重机械操作证过期', gate: 'T1北门', time: '2026-06-29 10:42:08' },
  ],
  'p-004': [
    { name: '冯某', idCard: '440300199012187788', phone: '13300133077', workType: '混凝土工', company: '深圳市政', team: '混凝土班', blockType: '未培训', blockReason: '安全教育记录缺失', gate: '配套区主入口', time: '2026-06-29 08:30:45' },
  ],
  'p-005': [
    { name: '陈某', idCard: '440300198709034455', phone: '13200132088', workType: '安全员', company: '广东建工', team: '安全管理组', blockType: '违规准入', blockReason: '非授权时段强行刷卡', gate: '捷运线入口', time: '2026-06-29 07:22:16' },
  ],
}

export function getAccessBlockDetails(projectId) {
  return accessBlockDetailsByProject[projectId] || []
}

export function maskIdCard(idCard) {
  if (!idCard || idCard.length < 8) return idCard
  return `${idCard.slice(0, 6)}********${idCard.slice(-4)}`
}

export const blockTypeOptions = ['未培训', '证件过期', '黑名单', '违规准入']

export const attendancePersonList = [
  { name: '张强', company: '中建三局', workType: '钢筋工', attendanceDays: 22, totalHours: 198, avgHours: 9.0, lateCount: 1, earlyLeaveCount: 0, absentCount: 0, overtimeHours: 12, attendanceRate: '100%' },
  { name: '李华', company: '中建三局', workType: '木工', attendanceDays: 21, totalHours: 185, avgHours: 8.8, lateCount: 2, earlyLeaveCount: 1, absentCount: 1, overtimeHours: 8, attendanceRate: '95.5%' },
  { name: '赵磊', company: '广东建工', workType: '电工', attendanceDays: 20, totalHours: 176, avgHours: 8.8, lateCount: 0, earlyLeaveCount: 0, absentCount: 2, overtimeHours: 16, attendanceRate: '90.9%' },
  { name: '刘洋', company: '深圳市政', workType: '焊工', attendanceDays: 22, totalHours: 202, avgHours: 9.2, lateCount: 0, earlyLeaveCount: 0, absentCount: 0, overtimeHours: 20, attendanceRate: '100%' },
  { name: '陈静', company: '中铁建工', workType: '安全员', attendanceDays: 22, totalHours: 176, avgHours: 8.0, lateCount: 0, earlyLeaveCount: 0, absentCount: 0, overtimeHours: 4, attendanceRate: '100%' },
  { name: '周杰', company: '中建三局', workType: '架子工', attendanceDays: 19, totalHours: 168, avgHours: 8.8, lateCount: 3, earlyLeaveCount: 2, absentCount: 3, overtimeHours: 10, attendanceRate: '86.4%' },
]

export const attendanceTeamList = [
  { team: '钢筋一班', company: '中建三局', headcount: 32, presentDays: 680, avgRate: '96.2%', absentTotal: 12, overtimeHours: 86 },
  { team: '木工二班', company: '中建三局', headcount: 28, presentDays: 588, avgRate: '94.8%', absentTotal: 18, overtimeHours: 64 },
  { team: '机电班组', company: '广东建工', headcount: 24, presentDays: 512, avgRate: '97.1%', absentTotal: 6, overtimeHours: 120 },
  { team: '钢结构班', company: '深圳市政', headcount: 18, presentDays: 378, avgRate: '93.5%', absentTotal: 10, overtimeHours: 48 },
]

export const workTypes = ['钢筋工', '木工', '混凝土工', '架子工', '电工', '焊工', '起重工', '普工', '安全员']

/** 演示「今日」口径，与考勤/预警 mock 主数据日对齐 */
export const LABOR_HQ_STATS_TODAY = '2026-06-29'

/**
 * 指挥部 · 实名制统计（按项目）
 * 总人数 / 三类人员 / 今日出勤率（含分类）/ 今日与累计预警 / 未处置
 */
export function buildHqRealNameSupervisionStatsByProject(today = LABOR_HQ_STATS_TODAY) {
  const headcounts = buildHqRealNameStatsByProject()
  const attendance = Object.fromEntries(
    buildHqAttendanceStatsByProject(today).map((row) => [row.project_id, row]),
  )

  return headcounts.map((row) => {
    const att = attendance[row.project_id]
    const warnings = row.demoEmpty ? [] : getProjectWarnings(row.project_id)
    const todayWarnings = warnings.filter((w) => String(w.triggeredAt || '').startsWith(today))
    const pending = warnings.filter((w) => w.status === '待处理').length

    return {
      project_id: row.project_id,
      project_name: row.project_name,
      demoEmpty: row.demoEmpty,
      total: row.total,
      manage: row.manage,
      labor: row.labor,
      special: row.special,
      todayAttendanceRate: att?.allRate ?? 0,
      todayManageRate: att?.manageRate ?? 0,
      todayLaborRate: att?.laborRate ?? 0,
      todaySpecialRate: att?.specialRate ?? 0,
      todayWarningCount: todayWarnings.length,
      pendingWarningCount: pending,
      totalWarningCount: warnings.length,
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
  const rows = buildHqRealNameSupervisionStatsByProject(today).filter((r) => !r.demoEmpty)
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
    todayAttendanceRate: weightedRate(rows, 'todayAttendanceRate', 'total'),
    todayManageRate: weightedRate(rows, 'todayManageRate', 'manage'),
    todayWarningCount: rows.reduce((s, r) => s + r.todayWarningCount, 0),
    pendingWarningCount: rows.reduce((s, r) => s + r.pendingWarningCount, 0),
  }
}

/** 未处置预警最多的项目（用于指标卡下钻） */
export function pickProjectWithMostPendingWarnings(today = LABOR_HQ_STATS_TODAY) {
  const rows = buildHqRealNameSupervisionStatsByProject(today)
    .filter((r) => !r.demoEmpty && r.pendingWarningCount > 0)
    .sort((a, b) => b.pendingWarningCount - a.pendingWarningCount)
  return rows[0] || null
}
