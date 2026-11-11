/**
 * 数字周报 · 生成器
 *
 * 职责：
 *  1. 演示周（2026-W41～W44）→ 使用 mock/weeklyReport.js 的演示数据工厂，保证首次演示有完整内容；
 *  2. 其余周次 → 从各业务模块台账实时取数汇总（会议记录／每日施工作业／每周值班表／监理例会／
 *     隐患四源统一池／隐患抽检／巡检任务／质量验评／品牌报审／材料设备），不新造数据。
 *  3. 环比：用上一周周报的概览指标计算差值。
 *
 * 说明：真实取数依赖各模块台账的日期字段；原型部分台账缺少「创建时间」，
 * 已按可用字段（inspectionDate / deadline / registeredAt / createdAt / meetingDate）近似，并在章节说明中标注。
 */
import {
  buildDemoWeeklyReport,
  isDemoWeek,
  getWeekInfo,
  addDays,
  previousWeekInfo,
  DEMO_PROJECTS,
  OVERVIEW_GROUPS,
  METRIC_APPENDIX,
  WEEKLY_SECTION_ORDER,
  SECTION_CHAPTER,
  CHAPTER_TITLES,
  DUTY_SLOTS,
  OVERDUE_HAZARD_COLUMNS,
  buildHazardLevelChart,
  buildRectifyStatusChart,
  buildHazardTrendChart,
  dateAtMidnight,
} from '../mock/weeklyReport.js'
// 命名空间导入新增能力：即使开发环境命中旧版 mock 模块，也只降级不抛 SyntaxError
import * as weeklyMock from '../mock/weeklyReport.js'
import { getMeetingSignInRecords } from '../coc/utils/meetingSignInStorage.js'
import { getDailyWorkRecords } from '../coc/utils/dailyWorkStorage.js'
import { getHazardIssueRows, isHazardIssueOverdue, getHazardIssueProjectOptions } from './hazardIssueSummary.js'
import { getSupervisionMeetings } from './cocAdminDeviceStorage.js'
import { listDutyWeeks } from '../mock/dutyRoster.js'
import { sampling } from '../mock/hazardSampling.js'
import { listMobileInspectionTasks } from '../mock/mobileInspectionTasks.js'
import { listApplications } from '../mock/brand.js'
import { getDashboard } from '../mock/mat.js'
import { buildQmDashboardPanels } from '../mock/qm.js'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'

/* ------------------------------------------------------------------ *
 * 通用工具
 * ------------------------------------------------------------------ */

function inRange(dateText, startYmd, endYmd) {
  const text = String(dateText || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  return text >= startYmd && text <= endYmd
}

function pct(numerator, denominator) {
  if (!denominator) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

function fmtPct(value) {
  return value === null || value === undefined ? '--' : `${value}%`
}

function sumOf(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)
}

function safeCall(fn, fallback) {
  try {
    const result = fn()
    return result === undefined || result === null ? fallback : result
  } catch (error) {
    return fallback
  }
}

/** 周报项目列：优先沿用演示项目（8 个在建项目），无数据时也保留表结构 */
function resolveProjects() {
  const options = safeCall(() => getHazardIssueProjectOptions(), [])
  const names = options.map((item) => item.label).filter(Boolean)
  const merged = [...new Set([...DEMO_PROJECTS.map((item) => item.name), ...names])]
  return merged.map((name, index) => ({
    name,
    key: options.find((item) => item.label === name)?.key || '',
    index,
  }))
}

/* ------------------------------------------------------------------ *
 * 各章节真实取数
 * ------------------------------------------------------------------ */

/* ---------- 2.1 危险作业上报 ---------- */

function computeDangerWorkRows(projects, weekInfo) {
  const records = safeCall(() => getDailyWorkRecords(), [])
  return projects.map((project) => {
    const projectRecords = records.filter((record) => {
      const name = record.projectName || record.project || ''
      return name === project.name && inRange(record.reportDate || record.date || record.workDate, weekInfo.weekStart, weekInfo.weekEnd)
    })
    const dangerRecords = projectRecords.filter((record) => record.classifyDanger || record.isDanger)
    const days = new Set(projectRecords.map((record) => String(record.reportDate || record.date || record.workDate).slice(0, 10)))
    const shouldDays = 7
    const actualDays = Math.min(shouldDays, days.size)
    const typeMap = new Map()
    dangerRecords.forEach((record) => {
      const type = record.dangerWorkCategory || record.dangerType || '其他危险作业'
      typeMap.set(type, (typeMap.get(type) || 0) + 1)
    })
    const mainTypes = [...typeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${type} ${count}`)
      .join('、')
    const missDates = []
    for (let i = 0; i < shouldDays; i += 1) {
      const ymd = addDays(weekInfo.weekStart, i)
      if (!days.has(ymd)) missDates.push(ymd.slice(5))
    }
    return {
      project: project.name,
      shouldDays,
      actualDays,
      rate: pct(actualDays, shouldDays),
      dangerCount: dangerRecords.length,
      mainTypes: mainTypes || '--',
      missDates: missDates.length ? missDates.slice(0, 3).join('、') : '--',
      remark: actualDays < shouldDays ? '存在漏报' : '按日上报',
    }
  })
}

/* ---------- 2.2 值班表登记 ---------- */

function computeDutyRows(projects, weekInfo) {
  const weeks = safeCall(() => listDutyWeeks({ weekStart: weekInfo.weekStart }), [])
  const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return projects.map((project) => {
    const week = weeks.find((row) => row.projectName === project.name || row.projectId === project.id)
    const shouldSlots = 7 * DUTY_SLOTS.length
    if (!week) {
      return {
        project: project.name,
        shouldSlots,
        filledSlots: 0,
        rate: 0,
        filledDays: 0,
        personTotal: 0,
        status: '未登记',
        missingSlots: '本周未登记值班表',
      }
    }
    const filledSlots = Number(week.filledSlotCount) || 0
    const days = Array.isArray(week.days) ? week.days : []
    const filledDays = days.filter((day) => DUTY_SLOTS.some((slot) => (day?.[slot.key] || []).length > 0)).length
    const missingSlots = []
    days.forEach((day, dayIndex) => {
      DUTY_SLOTS.forEach((slot) => {
        if (!(day?.[slot.key] || []).length) {
          missingSlots.push(`${weekdayLabels[dayIndex] || `第${dayIndex + 1}天`} ${slot.label}`)
        }
      })
    })
    return {
      project: project.name,
      shouldSlots,
      filledSlots,
      rate: pct(filledSlots, shouldSlots),
      filledDays,
      personTotal: Number(week.personTotal) || 0,
      status: filledDays === 7 && filledSlots === shouldSlots ? '已排满' : filledDays === 0 ? '未登记' : `缺 ${7 - filledDays} 天`,
      missingSlots: missingSlots.length ? missingSlots.slice(0, 8).join('、') : '--',
    }
  })
}

/* ---------- 2.3 监理例会登记 ---------- */

function computeSupervisionMeetingRows(projects, weekInfo) {
  const meetings = safeCall(() => getSupervisionMeetings(), [])
  return projects.map((project) => {
    const projectMeetings = meetings.filter(
      (item) =>
        (item.projectName === project.name || item.projectId === project.id) &&
        inRange(item.meetingDate || item.uploadTime, weekInfo.weekStart, weekInfo.weekEnd),
    )
    const reported = projectMeetings.length ? 1 : 0
    const latest = projectMeetings[0]
    const hazardParsed = projectMeetings.reduce((sum, item) => sum + (Number(item.hazardCount) || 0), 0)
    const hasMinutes = projectMeetings.some((item) => (item.minutesFiles || []).length > 0 || item.minutesFile)
    return {
      project: project.name,
      shouldCount: 1,
      reported,
      status: reported ? '已上报' : '未上报',
      meetingDate: reported ? String(latest?.meetingDate || latest?.uploadTime || '').slice(0, 10) : '--',
      minutes: reported ? (hasMinutes ? '已上传' : '待补传') : '--',
      hazardParsed,
      remark: reported ? '纪要已归档' : '缺本周例会纪要',
    }
  })
}

/* ---------- 2.4 会议记录统计 ---------- */

function computeMeetingRows(projects, weekInfo) {
  const records = safeCall(() => getMeetingSignInRecords(), []).filter((record) =>
    inRange(record.meetingTime || record.date, weekInfo.weekStart, weekInfo.weekEnd),
  )
  return {
    meetings: records,
    rows: projects.map((project) => {
      const groups = records
        .flatMap((record) => record.projectGroups || [])
        .filter((group) => group.projectName === project.name)
      const dispatched = groups.length
      const shouldAttend = groups.reduce((sum, group) => sum + (group.attendeeCount || 0) + (group.absenteeCount || 0), 0)
      const joined = groups.reduce((sum, group) => sum + (group.attendeeCount || 0), 0)
      const absent = groups.reduce((sum, group) => sum + (group.absenteeCount || 0), 0)
      const absentNames = groups
        .flatMap((group) => (group.absentees || []).map((person) => `${person.name}（${person.role || '—'}）`))
        .slice(0, 4)
      return {
        project: project.name,
        dispatched,
        shouldAttend,
        joined,
        absent,
        rate: pct(joined, shouldAttend),
        absentNames: absentNames.length ? absentNames.join('、') : '--',
        dutyStatus: dispatched ? '已排班' : '未覆盖',
      }
    }),
  }
}

/* ---------- 2.5 调度隐患 ---------- */

function computeCocHazardRows(projects, weekInfo) {
  const rowsSource = safeCall(() => getHazardIssueRows(), [])
  return projects.map((project) => {
    const projectRows = rowsSource.filter((row) => row.projectName === project.name)
    const weekNew = projectRows.filter((row) => inRange(row.registeredAt, weekInfo.weekStart, weekInfo.weekEnd))
    const dispatchSrc = weekNew.filter((row) => row.source === 'dispatch').length
    const supervisionSrc = weekNew.filter((row) => row.source === 'supervision').length
    const safety = weekNew.filter((row) => !String(row.categoryLabel || '').includes('质量')).length
    const quality = weekNew.length - safety
    const levelOf = (row) => row.level || row.severity || '一般'
    const low = weekNew.filter((row) => levelOf(row) === '一般').length
    const mid = weekNew.filter((row) => levelOf(row) === '较大').length
    const high = weekNew.filter((row) => levelOf(row) === '重大').length
    const closed = weekNew.filter((row) => row.closed).length
    const open = weekNew.length - closed
    const overdue = projectRows.filter((row) => isHazardIssueOverdue(row)).length
    return {
      project: project.name,
      total: weekNew.length,
      dispatchSrc,
      supervisionSrc,
      safety,
      quality,
      low,
      mid,
      high,
      closed,
      open,
      overdue,
      mainHazards: weekNew.slice(0, 2).map((row) => row.title).filter(Boolean).join('；') || '--',
    }
  })
}

/* ---------- 2.6 隐患抽检（指挥部抽检 → 监理抽检任务 → 项目全面复查任务） ---------- */

function computeSamplingRows(projects, weekInfo) {
  const state = safeCall(() => sampling?.value, null) || { tasks: [], history: [] }
  const tasks = state.tasks || []
  const history = state.history || []
  const hazardRows = safeCall(() => getHazardIssueRows(), [])
  const rowProjectName = (rowId) => hazardRows.find((row) => row.id === rowId)?.projectName || ''
  const inWeek = (text) => inRange(text, weekInfo.weekStart, weekInfo.weekEnd)
  const hqLogs = history.filter((log) => log.stage === 'hq' && inWeek(log.time || log.createdAt))
  return projects.map((project) => {
    // ① 指挥部抽检（本周内抽检记录，按隐患所属项目归属）
    const projectHqLogs = hqLogs.filter((log) => rowProjectName(log.rowId) === project.name)
    const hqCount = projectHqLogs.length
    const hqPass = projectHqLogs.filter((log) => log.result === '合格').length
    const hqFail = projectHqLogs.filter((log) => log.result === '不合格').length

    // ② 监理抽检任务（本周下发，抽检对象＝任务单据）
    const supervisorTaskList = tasks.filter(
      (task) => task.stage === 'supervisor' && task.projectKey === project.key && inWeek(task.createdAt || task.created),
    )
    const supervisorTaskIds = new Set(supervisorTaskList.map((task) => task.id))
    const supervisorHazards = supervisorTaskList.reduce((sum, task) => sum + (task.ids?.length || 0), 0)
    const supervisorLogs = history.filter((log) => log.stage === 'supervisor' && supervisorTaskIds.has(log.taskId))
    const supervisorPass = supervisorLogs.filter((log) => log.result === '合格').length
    const supervisorFail = supervisorLogs.filter((log) => log.result === '不合格').length
    const supervisorPending = Math.max(0, supervisorHazards - supervisorPass - supervisorFail)

    // ③ 项目全面复查任务（本周下发）
    const reviewTaskList = tasks.filter(
      (task) => task.stage === 'manager' && task.projectKey === project.key && inWeek(task.createdAt || task.created),
    )
    const reviewTasks = reviewTaskList.length
    const reviewCompleted = reviewTaskList.filter((task) => {
      if (task.submittedAt) return true
      const ids = task.ids || []
      return (
        ids.length > 0 &&
        ids.every((id) =>
          history.some((log) => log.taskId === task.id && log.rowId === id && log.stage === 'manager' && log.result),
        )
      )
    }).length

    return {
      project: project.name,
      hqCount,
      hqPass,
      hqFail,
      supervisorTasks: supervisorTaskList.length,
      supervisorHazards,
      supervisorPass,
      supervisorFail,
      supervisorPending,
      reviewTasks,
      reviewCompleted,
      reviewPending: Math.max(0, reviewTasks - reviewCompleted),
    }
  })
}

/* ---------- 3.1 巡检任务（含自行登记） ---------- */

function computeAnziTaskRows(projects, weekInfo) {
  const tasks = safeCall(() => listMobileInspectionTasks(), [])
  return projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.project === project.name)
    const weekTasks = projectTasks.filter(
      (task) => inRange(task.inspectionDate, weekInfo.weekStart, weekInfo.weekEnd) || inRange(task.deadline, weekInfo.weekStart, weekInfo.weekEnd),
    )
    const dispatched = weekTasks.filter((task) => task.source !== '系统自建').length
    const selfCreated = weekTasks.filter((task) => task.source === '系统自建').length
    const created = weekTasks.length
    const done = weekTasks.filter((task) => task.status === '已完成').length
    const withHazard = weekTasks.filter((task) => task.status === '已完成' && Number(task.hazardCount) > 0).length
    const overdueTasks = projectTasks.filter((task) => task.status !== '已完成' && task.overdue)
    return {
      project: project.name,
      dispatched,
      selfCreated,
      created,
      done,
      rate: pct(done, created),
      selfRate: pct(selfCreated, created),
      withHazard,
      overdue: overdueTasks.length,
      maxOverdueDays: overdueTasks.length ? 1 : 0,
      overdueNames: overdueTasks.slice(0, 2).map((task) => task.taskName).join('、') || '--',
    }
  })
}

/* ---------- 3.2 隐患整改（含整改率排名） ---------- */

function computeAnziHazardRows(projects, weekInfo) {
  const rowsSource = safeCall(() => getHazardIssueRows(), [])
  const base = projects.map((project) => {
    const projectRows = rowsSource.filter((row) => row.projectName === project.name && row.source === 'inspection')
    const weekNew = projectRows.filter((row) => inRange(row.registeredAt, weekInfo.weekStart, weekInfo.weekEnd))
    const qualityCreated = weekNew.filter((row) => String(row.categoryLabel || '').includes('质量')).length
    const created = weekNew.length
    const closed = weekNew.filter((row) => row.closed).length
    const openRows = projectRows.filter((row) => !row.closed)
    return {
      project: project.name,
      created,
      safetyCreated: created - qualityCreated,
      qualityCreated,
      closed,
      open: openRows.length,
      pendingFix: openRows.filter((row) => row.status === '待整改').length,
      pendingReview: openRows.filter((row) => row.status === '待验收').length,
      reviewed: openRows.filter((row) => row.status === '待复查').length,
      overdue: openRows.filter((row) => isHazardIssueOverdue(row)).length,
      rate: pct(closed, created),
      avgDays: null,
    }
  })
  const ranked = [...base]
    .filter((row) => (row.created || 0) > 0 || (row.closed || 0) > 0)
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || String(a.project).localeCompare(String(b.project), 'zh-CN'))
  let lastRate = null
  let lastRank = 0
  return ranked.map((row, index) => {
    const rank = lastRate !== null && row.rate === lastRate ? lastRank : index + 1
    lastRate = row.rate
    lastRank = rank
    return { ...row, rank, mark: row.rate === null ? '未纳入' : row.rate >= 90 ? '优' : row.rate >= 80 ? '良' : '需关注' }
  })
}

/* ---------- 4.1 质量验评 ---------- */

function computeQmInspectRows(projects) {
  const projectOptions = safeCall(() => COC_PROJECT_OPTIONS, [])
  return projects.map((project) => {
    const option = projectOptions.find((item) => item.label === project.name)
    if (!option) {
      return { project: project.name, tasks: 0, pending: 0, approving: 0, approved: 0, rejected: 0, firstPassRate: null, nodeTotal: 0, nodeDone: 0, nodeRate: null }
    }
    const panels = safeCall(() => buildQmDashboardPanels(option.id), null)
    const physical = panels?.physical || {}
    return {
      project: project.name,
      tasks: physical.task_total ?? physical.taskTotal ?? 0,
      pending: physical.pending_count ?? physical.pendingCount ?? 0,
      approving: physical.approving_count ?? physical.approvingCount ?? 0,
      approved: physical.approved_count ?? physical.approvedCount ?? 0,
      rejected: physical.rejected_count ?? physical.rejectedCount ?? 0,
      firstPassRate: physical.pass_rate ?? physical.passRate ?? null,
      nodeTotal: physical.node_total ?? physical.nodeTotal ?? 0,
      nodeDone: physical.node_completed ?? physical.nodeCompleted ?? 0,
      nodeRate: physical.node_complete_rate ?? physical.nodeCompleteRate ?? null,
    }
  })
}

/* ---------- 4.2 品牌报审 ---------- */

function computeQmBrandRows(projects) {
  const projectOptions = safeCall(() => COC_PROJECT_OPTIONS, [])
  return projects.map((project) => {
    const option = projectOptions.find((item) => item.label === project.name)
    if (!option) return { project: project.name, brandTotal: 0, applications: 0, approving: 0, approved: 0, rejected: 0, firstPassRate: null }
    const applications = safeCall(() => listApplications(option.id), [])
    const approved = applications.filter((item) => item.status === 'approved').length
    const rejected = applications.filter((item) => item.status === 'rejected').length
    const approving = applications.filter((item) => item.status === 'approving' || item.status === 'pending').length
    return {
      project: project.name,
      brandTotal: applications.length,
      applications: applications.length,
      approving,
      approved,
      rejected,
      firstPassRate: pct(approved, applications.length),
    }
  })
}

/* ---------- 4.3 材料设备进场 ---------- */

function computeQmMatRows(projects) {
  const projectOptions = safeCall(() => COC_PROJECT_OPTIONS, [])
  return projects.map((project) => {
    const option = projectOptions.find((item) => item.label === project.name)
    const dashboard = option ? safeCall(() => getDashboard(option.id), {}) : {}
    const pickValue = (snake, camel) => dashboard?.[snake] ?? dashboard?.[camel] ?? 0
    return {
      project: project.name,
      total: pickValue('total_batches', 'totalBatches'),
      matIn: pickValue('material_count', 'materialCount'),
      matOut: pickValue('material_exited_count', 'materialExitedCount'),
      eqIn: pickValue('equipment_count', 'equipmentCount'),
      eqOut: pickValue('equipment_exited_count', 'equipmentExitedCount'),
      approving: pickValue('approving_count', 'approvingCount'),
      approved: pickValue('approved_count', 'approvedCount'),
      rejected: pickValue('rejected_count', 'rejectedCount'),
    }
  })
}

/* ------------------------------------------------------------------ *
 * 真实台账周报组装
 * ------------------------------------------------------------------ */

const HAZARD_SOURCE_LABELS = {
  inspection: '安质巡检',
  supervision: '监理会议',
  dispatch: '调度隐患',
  externalQuality: '施工质量问题',
}

/** 真实台账：按来源筛选逾期隐患，生成逾期隐患清单（按逾期天数降序，最多列 20 条） */
function buildOverdueHazardTable(hazardRows, sources, title, weekInfo, limit = 20) {
  const weekEndTime = new Date(`${weekInfo.weekEnd}T23:59:59`).getTime()
  const list = hazardRows
    .filter((row) => sources.includes(row.source) && isHazardIssueOverdue(row) === true)
    .map((row) => {
      const deadlineText = String(row.deadline || '').slice(0, 10)
      const deadlineTime = /^\d{4}-\d{2}-\d{2}$/.test(deadlineText)
        ? new Date(`${deadlineText}T23:59:59`).getTime()
        : NaN
      return {
        project: row.projectName || '--',
        hazardNo: row.id || '--',
        title: row.title || '--',
        category: String(row.categoryLabel || '').includes('质量') ? '质量' : '安全',
        level: row.level || '一般',
        source: HAZARD_SOURCE_LABELS[row.source] || row.source || '--',
        deadline: deadlineText || '--',
        overdueDays: Number.isNaN(deadlineTime) ? '--' : Math.max(1, Math.ceil((weekEndTime - deadlineTime) / 86400000)),
        status: row.status || '--',
      }
    })
    .sort((a, b) => (Number(b.overdueDays) || 0) - (Number(a.overdueDays) || 0))
  return {
    title,
    summary: list.length
      ? `截至统计截止日共 ${list.length} 条逾期未闭环隐患，按逾期天数降序排列${list.length > limit ? `（仅列示逾期最长的 ${limit} 条）` : ''}。`
      : '本周无逾期未闭环隐患。',
    columns: OVERDUE_HAZARD_COLUMNS,
    rows: list.slice(0, limit).map((row, index) => ({ seq: index + 1, ...row })),
  }
}

function buildRealSection(template, key, rows, totals, summary) {
  // 模板来自演示周报，图表与明细必须清掉，避免真实周报继承演示数据（由 SECTION_EXTRA_KEYS 按真实 rows 重建）
  const base = { ...template.sections[key] }
  delete base.charts
  delete base.extraTables
  return { ...base, rows, totals, summary }
}

function buildRealReport(weekInfo, prevReport, trendContext = []) {
  const template = buildDemoWeeklyReport(weekInfo.weekKey) // 复用列定义与章节骨架
  const projects = resolveProjects()

  const dangerRows = computeDangerWorkRows(projects, weekInfo)
  const dutyRows = computeDutyRows(projects, weekInfo)
  const supervisionMeetingRows = computeSupervisionMeetingRows(projects, weekInfo)
  const meeting = computeMeetingRows(projects, weekInfo)
  const cocHazardRows = computeCocHazardRows(projects, weekInfo)
  const hazardPool = safeCall(() => getHazardIssueRows(), [])
  const samplingRows = computeSamplingRows(projects, weekInfo)
  const anziTaskRows = computeAnziTaskRows(projects, weekInfo)
  const anziHazardRows = computeAnziHazardRows(projects, weekInfo)
  const qmInspectRows = computeQmInspectRows(projects)
  const qmBrandRows = computeQmBrandRows(projects)
  const qmMatRows = computeQmMatRows(projects)

  const sections = { ...template.sections }

  // 模板来自演示周报，先清掉演示图表与明细，避免真实周报继承假数据（后续按真实 rows 重建）
  Object.keys(sections).forEach((key) => {
    delete sections[key].charts
    delete sections[key].extraTables
  })

  // 2.1 危险作业上报
  sections.cocDangerWork = buildRealSection(
    template,
    'cocDangerWork',
    dangerRows,
    {
      project: '合计',
      shouldDays: sumOf(dangerRows, 'shouldDays'),
      actualDays: sumOf(dangerRows, 'actualDays'),
      rate: pct(sumOf(dangerRows, 'actualDays'), sumOf(dangerRows, 'shouldDays')),
      dangerCount: sumOf(dangerRows, 'dangerCount'),
      mainTypes: '—',
      missDates: '—',
      remark: '—',
    },
    `本周应报 ${projects.length} 个项目 × 7 天 = ${sumOf(dangerRows, 'shouldDays')} 天次，实报 ${sumOf(dangerRows, 'actualDays')} 天次，` +
      `上报率 ${fmtPct(pct(sumOf(dangerRows, 'actualDays'), sumOf(dangerRows, 'shouldDays')))}；危险作业 ${sumOf(dangerRows, 'dangerCount')} 条。`,
  )

  // 2.2 值班表登记
  sections.cocDuty = buildRealSection(
    template,
    'cocDuty',
    dutyRows,
    {
      project: '合计',
      shouldSlots: sumOf(dutyRows, 'shouldSlots'),
      filledSlots: sumOf(dutyRows, 'filledSlots'),
      rate: pct(sumOf(dutyRows, 'filledSlots'), sumOf(dutyRows, 'shouldSlots')),
      filledDays: sumOf(dutyRows, 'filledDays'),
      personTotal: sumOf(dutyRows, 'personTotal'),
      status: '—',
      missingSlots: '—',
    },
    `本周应排 ${projects.length} 张周表、共 ${sumOf(dutyRows, 'shouldSlots')} 个槽位，已排 ${sumOf(dutyRows, 'filledSlots')} 个，` +
      `登记完整率 ${fmtPct(pct(sumOf(dutyRows, 'filledSlots'), sumOf(dutyRows, 'shouldSlots')))}；` +
      `${dutyRows.filter((row) => row.filledDays === 7).length} 个项目排满。`,
  )

  // 2.3 监理例会登记
  sections.cocSupervisionMeeting = buildRealSection(
    template,
    'cocSupervisionMeeting',
    supervisionMeetingRows,
    {
      project: '合计',
      shouldCount: sumOf(supervisionMeetingRows, 'shouldCount'),
      reported: sumOf(supervisionMeetingRows, 'reported'),
      status: '—',
      meetingDate: '—',
      minutes: '—',
      hazardParsed: sumOf(supervisionMeetingRows, 'hazardParsed'),
      remark: '—',
    },
    `本周应召开监理例会 ${sumOf(supervisionMeetingRows, 'shouldCount')} 次，已上报 ${sumOf(supervisionMeetingRows, 'reported')} 次，` +
      `上报率 ${fmtPct(pct(sumOf(supervisionMeetingRows, 'reported'), sumOf(supervisionMeetingRows, 'shouldCount')))}；` +
      `解析隐患 ${sumOf(supervisionMeetingRows, 'hazardParsed')} 条。`,
  )

  // 2.4 会议记录统计
  sections.cocMeeting = {
    ...template.sections.cocMeeting,
    rows: meeting.rows,
    totals: {
      project: '合计',
      dispatched: sumOf(meeting.rows, 'dispatched'),
      shouldAttend: sumOf(meeting.rows, 'shouldAttend'),
      joined: sumOf(meeting.rows, 'joined'),
      absent: sumOf(meeting.rows, 'absent'),
      rate: pct(sumOf(meeting.rows, 'joined'), sumOf(meeting.rows, 'shouldAttend')),
      absentNames: '—',
      dutyStatus: '—',
    },
    summary:
      meeting.meetings.length === 0
        ? `本周（${weekInfo.rangeLabel}）无调度会议记录；建议核对指挥调度会议的「结束会议」操作是否已执行。`
        : `本周开展调度会议 ${meeting.meetings.length} 场，覆盖项目 ${meeting.rows.filter((row) => row.dispatched > 0).length} 个；` +
          `应参会 ${sumOf(meeting.rows, 'shouldAttend')} 人次、已参会 ${sumOf(meeting.rows, 'joined')} 人次、` +
          `未参会 ${sumOf(meeting.rows, 'absent')} 人次，参会率 ${fmtPct(pct(sumOf(meeting.rows, 'joined'), sumOf(meeting.rows, 'shouldAttend')))}。`,
    extra: { meetings: meeting.meetings, coverage: meeting.rows.filter((row) => row.dispatched > 0).length },
  }

  // 2.5 调度隐患
  sections.cocHazard = buildRealSection(
    template,
    'cocHazard',
    cocHazardRows,
    {
      project: '合计',
      total: sumOf(cocHazardRows, 'total'),
      dispatchSrc: sumOf(cocHazardRows, 'dispatchSrc'),
      supervisionSrc: sumOf(cocHazardRows, 'supervisionSrc'),
      safety: sumOf(cocHazardRows, 'safety'),
      quality: sumOf(cocHazardRows, 'quality'),
      low: sumOf(cocHazardRows, 'low'),
      mid: sumOf(cocHazardRows, 'mid'),
      high: sumOf(cocHazardRows, 'high'),
      closed: sumOf(cocHazardRows, 'closed'),
      open: sumOf(cocHazardRows, 'open'),
      overdue: sumOf(cocHazardRows, 'overdue'),
      mainHazards: '—',
    },
    `本周调度过程新增隐患 ${sumOf(cocHazardRows, 'total')} 条（调度隐患 ${sumOf(cocHazardRows, 'dispatchSrc')} 条、` +
      `监理会议 ${sumOf(cocHazardRows, 'supervisionSrc')} 条），已闭环 ${sumOf(cocHazardRows, 'closed')} 条、` +
      `未闭环 ${sumOf(cocHazardRows, 'open')} 条。`,
  )

  sections.cocHazard.extraTables = [buildOverdueHazardTable(hazardPool, ['dispatch', 'supervision'], '逾期隐患清单', weekInfo)]
  sections.cocHazard.charts = [buildHazardLevelChart(cocHazardRows)]

  // 2.6 隐患抽检（指挥部抽检 → 监理抽检任务 → 项目全面复查任务）
  const samplingTotals = {
    project: '合计',
    hqCount: sumOf(samplingRows, 'hqCount'),
    hqPass: sumOf(samplingRows, 'hqPass'),
    hqFail: sumOf(samplingRows, 'hqFail'),
    supervisorTasks: sumOf(samplingRows, 'supervisorTasks'),
    supervisorHazards: sumOf(samplingRows, 'supervisorHazards'),
    supervisorPass: sumOf(samplingRows, 'supervisorPass'),
    supervisorFail: sumOf(samplingRows, 'supervisorFail'),
    supervisorPending: sumOf(samplingRows, 'supervisorPending'),
    reviewTasks: sumOf(samplingRows, 'reviewTasks'),
    reviewCompleted: sumOf(samplingRows, 'reviewCompleted'),
    reviewPending: sumOf(samplingRows, 'reviewPending'),
  }
  const sampledProjects = samplingRows.filter((row) => row.hqCount > 0).length
  sections.cocSampling = {
    ...buildRealSection(
      template,
      'cocSampling',
      samplingRows,
      samplingTotals,
      `本周指挥部抽检项目 ${sampledProjects} 个、抽检隐患 ${samplingTotals.hqCount} 条（合格 ${samplingTotals.hqPass} 条、不合格 ${samplingTotals.hqFail} 条）；` +
        `下发监理抽检任务 ${samplingTotals.supervisorTasks} 个，监理抽检隐患 ${samplingTotals.supervisorHazards} 条（合格 ${samplingTotals.supervisorPass} 条、` +
        `不合格 ${samplingTotals.supervisorFail} 条、未抽检 ${samplingTotals.supervisorPending} 条）；` +
        `下发项目全面复查任务 ${samplingTotals.reviewTasks} 个（已完成 ${samplingTotals.reviewCompleted} 个、未完成 ${samplingTotals.reviewPending} 个）。`,
    ),
    extra: { sampledProjects },
  }

  // 3.1 巡检任务
  sections.anziTask = buildRealSection(
    template,
    'anziTask',
    anziTaskRows,
    {
      project: '合计',
      dispatched: sumOf(anziTaskRows, 'dispatched'),
      selfCreated: sumOf(anziTaskRows, 'selfCreated'),
      created: sumOf(anziTaskRows, 'created'),
      done: sumOf(anziTaskRows, 'done'),
      rate: pct(sumOf(anziTaskRows, 'done'), sumOf(anziTaskRows, 'created')),
      selfRate: pct(sumOf(anziTaskRows, 'selfCreated'), sumOf(anziTaskRows, 'created')),
      withHazard: sumOf(anziTaskRows, 'withHazard'),
      overdue: sumOf(anziTaskRows, 'overdue'),
      maxOverdueDays: 0,
      overdueNames: '—',
    },
    `本周巡检任务 ${sumOf(anziTaskRows, 'created')} 个（任务下发 ${sumOf(anziTaskRows, 'dispatched')} 个、自行登记 ${sumOf(anziTaskRows, 'selfCreated')} 个），` +
      `完成 ${sumOf(anziTaskRows, 'done')} 个（完成率 ${fmtPct(pct(sumOf(anziTaskRows, 'done'), sumOf(anziTaskRows, 'created')))}）、` +
      `有隐患任务 ${sumOf(anziTaskRows, 'withHazard')} 个、逾期任务 ${sumOf(anziTaskRows, 'overdue')} 个。` +
      `（原型巡检任务缺少「创建时间」，本周范围按执行日期／截止日期近似）`,
  )

  // 3.2 隐患整改
  sections.anziHazard = buildRealSection(
    template,
    'anziHazard',
    anziHazardRows,
    {
      project: '合计',
      created: sumOf(anziHazardRows, 'created'),
      safetyCreated: sumOf(anziHazardRows, 'safetyCreated'),
      qualityCreated: sumOf(anziHazardRows, 'qualityCreated'),
      closed: sumOf(anziHazardRows, 'closed'),
      open: sumOf(anziHazardRows, 'open'),
      pendingFix: sumOf(anziHazardRows, 'pendingFix'),
      pendingReview: sumOf(anziHazardRows, 'pendingReview'),
      reviewed: sumOf(anziHazardRows, 'reviewed'),
      overdue: sumOf(anziHazardRows, 'overdue'),
      rate: pct(sumOf(anziHazardRows, 'closed'), sumOf(anziHazardRows, 'created')),
      avgDays: null,
      mark: '—',
    },
    `本周发现隐患 ${sumOf(anziHazardRows, 'created')} 条（安全 ${sumOf(anziHazardRows, 'safetyCreated')} 条、质量 ${sumOf(anziHazardRows, 'qualityCreated')} 条）、` +
      `闭环 ${sumOf(anziHazardRows, 'closed')} 条（整改率 ${fmtPct(pct(sumOf(anziHazardRows, 'closed'), sumOf(anziHazardRows, 'created')))}）、` +
      `未闭环存量 ${sumOf(anziHazardRows, 'open')} 条、逾期 ${sumOf(anziHazardRows, 'overdue')} 条。下表按整改率降序排列并给出项目名次。`,
  )

  sections.anziHazard.extraTables = [buildOverdueHazardTable(hazardPool, ['inspection'], '逾期隐患清单', weekInfo)]
  sections.anziHazard.charts = [
    buildHazardTrendChart(weekInfo.weekKey, {
      history: [
        ...(trendContext || []).map((item) => ({ label: item.label, created: item.created, closed: item.closed })),
        { label: `第 ${weekInfo.weekNo} 周`, created: sumOf(anziHazardRows, 'created'), closed: sumOf(anziHazardRows, 'closed') },
      ],
    }),
    buildRectifyStatusChart(anziHazardRows),
  ]

  // 四、质量
  const qmInspectTotals = {
    project: '合计',
    tasks: sumOf(qmInspectRows, 'tasks'),
    pending: sumOf(qmInspectRows, 'pending'),
    approving: sumOf(qmInspectRows, 'approving'),
    approved: sumOf(qmInspectRows, 'approved'),
    rejected: sumOf(qmInspectRows, 'rejected'),
    firstPassRate: pct(sumOf(qmInspectRows, 'approved'), sumOf(qmInspectRows, 'tasks')),
    nodeTotal: sumOf(qmInspectRows, 'nodeTotal'),
    nodeDone: sumOf(qmInspectRows, 'nodeDone'),
    nodeRate: pct(sumOf(qmInspectRows, 'nodeDone'), sumOf(qmInspectRows, 'nodeTotal')),
  }
  sections.qmInspect = buildRealSection(template, 'qmInspect', qmInspectRows, qmInspectTotals, `本周验收任务 ${qmInspectTotals.tasks} 个、通过率 ${fmtPct(qmInspectTotals.firstPassRate)}；数据取自质量验评看板实时统计。`)

  const qmBrandTotals = {
    project: '合计',
    brandTotal: sumOf(qmBrandRows, 'brandTotal'),
    applications: sumOf(qmBrandRows, 'applications'),
    approving: sumOf(qmBrandRows, 'approving'),
    approved: sumOf(qmBrandRows, 'approved'),
    rejected: sumOf(qmBrandRows, 'rejected'),
    firstPassRate: pct(sumOf(qmBrandRows, 'approved'), sumOf(qmBrandRows, 'applications')),
  }
  sections.qmBrand = buildRealSection(template, 'qmBrand', qmBrandRows, qmBrandTotals, `本周品牌报审 ${qmBrandTotals.applications} 项；数据取自品牌报审台账。`)

  const qmMatTotals = {
    project: '合计',
    total: sumOf(qmMatRows, 'total'),
    matIn: sumOf(qmMatRows, 'matIn'),
    matOut: sumOf(qmMatRows, 'matOut'),
    eqIn: sumOf(qmMatRows, 'eqIn'),
    eqOut: sumOf(qmMatRows, 'eqOut'),
    approving: sumOf(qmMatRows, 'approving'),
    approved: sumOf(qmMatRows, 'approved'),
    rejected: sumOf(qmMatRows, 'rejected'),
  }
  sections.qmMat = buildRealSection(template, 'qmMat', qmMatRows, qmMatTotals, `本周材料设备进场 ${qmMatTotals.total} 批；数据取自材料设备进场看板。`)

  // 五、下周关注（真实版）
  const overdueRows = []
  safeCall(() => getHazardIssueRows(), []).forEach((row) => {
    if (!isHazardIssueOverdue(row)) return
    overdueRows.push(row)
  })
  const watchRows = []
  overdueRows.slice(0, 5).forEach((row) => {
    watchRows.push({
      item: `督办逾期隐患整改：${row.title || '--'}`,
      project: row.projectName,
      basis: `截止日 ${row.deadline || '--'}，当前状态 ${row.status || '--'}`,
    })
  })
  dutyRows
    .filter((row) => row.filledDays < 7)
    .slice(0, 3)
    .forEach((row) => {
      watchRows.push({ item: '补齐下周值班表缺排槽位', project: row.project, basis: `本周缺排 ${7 - row.filledDays} 天` })
    })
  supervisionMeetingRows
    .filter((row) => row.reported === 0)
    .slice(0, 3)
    .forEach((row) => {
      watchRows.push({ item: '补报监理例会纪要', project: row.project, basis: '本周未上报（应召开 1 次）' })
    })
  dangerRows
    .filter((row) => row.actualDays < row.shouldDays)
    .slice(0, 2)
    .forEach((row) => {
      watchRows.push({ item: '补报每日施工作业（危险作业上报）', project: row.project, basis: `漏报日期 ${row.missDates}` })
    })
  watchRows.push({ item: '核对下周值班表排班完整性（7 天 × 4 槽位）', project: '全部项目', basis: '值班表需在调度会前排满' })
  sections.nextWatch = buildRealSection(
    template,
    'nextWatch',
    watchRows.map((row, index) => ({ seq: index + 1, ...row })),
    undefined,
    `根据本周逾期未闭环、值班表缺排、监理例会未报、危险作业漏报等情况，自动生成下周关注事项 ${watchRows.length} 条。`,
  )

  // 概览（三组）
  const values = {
    meetings: meeting.meetings.length,
    coverage: meeting.rows.filter((row) => row.dispatched > 0).length,
    attendRate: pct(sumOf(meeting.rows, 'joined'), sumOf(meeting.rows, 'shouldAttend')),
    dutyRate: pct(sumOf(dutyRows, 'filledSlots'), sumOf(dutyRows, 'shouldSlots')),
    meetingReportRate: pct(sumOf(supervisionMeetingRows, 'reported'), sumOf(supervisionMeetingRows, 'shouldCount')),
    reportRate: pct(sumOf(dangerRows, 'actualDays'), sumOf(dangerRows, 'shouldDays')),
    taskRate: pct(sumOf(anziTaskRows, 'done'), sumOf(anziTaskRows, 'created')),
    selfTaskCount: sumOf(anziTaskRows, 'selfCreated'),
    newHazard: sumOf(anziHazardRows, 'created'),
    closeRate: pct(sumOf(anziHazardRows, 'closed'), sumOf(anziHazardRows, 'created')),
    overdueHazard: sumOf(anziHazardRows, 'overdue'),
    qmInspectTasks: sumOf(qmInspectRows, 'tasks'),
    qmPassRate: pct(sumOf(qmInspectRows, 'approved'), sumOf(qmInspectRows, 'tasks')),
    qmBrandCount: sumOf(qmBrandRows, 'applications'),
    qmMatCount: sumOf(qmMatRows, 'total'),
  }
  const prevCards = prevReport?.overview?.cards || []
  const cards = []
  const groups = OVERVIEW_GROUPS.map((group) => ({
    key: group.key,
    title: group.title,
    cards: group.cards.map((card) => {
      const value = values[card.key] ?? null
      const prevValue = prevCards.find((item) => item.key === card.key)?.value ?? null
      const delta = typeof value === 'number' && typeof prevValue === 'number' ? Math.round((value - prevValue) * 10) / 10 : null
      const item = { ...card, group: group.key, groupTitle: group.title, value, prevValue, delta }
      cards.push(item)
      return item
    }),
  }))
  const find = (key) => cards.find((card) => card.key === key)?.value

  const overview = {
    title: '一、本周概览',
    summary:
      `本周（${weekInfo.rangeLabel}）COC 调度方面：调度会议 ${find('meetings') ?? '--'} 场、覆盖 ${find('coverage') ?? '--'} 个在建项目，` +
      `值班表登记完整率 ${fmtPct(find('dutyRate'))}、监理例会上报率 ${fmtPct(find('meetingReportRate'))}、危险作业上报率 ${fmtPct(find('reportRate'))}；` +
      `安质巡检方面：巡检任务完成率 ${fmtPct(find('taskRate'))}（自行登记 ${find('selfTaskCount') ?? '--'} 个），新增隐患 ${find('newHazard') ?? '--'} 条、整改率 ${fmtPct(find('closeRate'))}，` +
      `逾期未闭环 ${find('overdueHazard') ?? '--'} 条；质量方面：验收任务 ${find('qmInspectTasks') ?? '--'} 个、通过率 ${fmtPct(find('qmPassRate'))}，` +
      `品牌报审 ${find('qmBrandCount') ?? '--'} 项、材料设备进场 ${find('qmMatCount') ?? '--'} 批。`,
    groups,
    cards,
  }

  // 三件套补齐（真实台账）：环形图 + 近 6 周折线图 + 明细数据表
  const extraKeys = weeklyMock.SECTION_EXTRA_KEYS || []
  const buildExtras = weeklyMock.buildSectionExtras
  if (typeof buildExtras === 'function' && extraKeys.length) {
    extraKeys.forEach((key) => {
      const section = sections[key]
      if (!section) return
      const extras = buildExtras(key, section, weekInfo.weekKey) || {}
      section.charts = [...(section.charts || []), ...(extras.charts || [])]
      section.extraTables = [...(section.extraTables || []), ...(extras.extraTables || [])]
    })
  }

  return {
    id: `wkr-${weekInfo.weekKey}`,
    weekKey: weekInfo.weekKey,
    weekStart: weekInfo.weekStart,
    weekEnd: weekInfo.weekEnd,
    weekLabel: weekInfo.label,
    rangeLabel: weekInfo.rangeLabel,
    status: 'frozen',
    version: 1,
    isDemo: false,
    generatedAt: `${addDays(weekInfo.weekEnd, 1)} 08:00`,
    generatedBy: '系统自动生成',
    projectCount: projects.length,
    overview,
    sections,
    appendix: METRIC_APPENDIX,
    prevWeekId: prevReport?.id || '',
  }
}

/* ------------------------------------------------------------------ *
 * 对外入口
 * ------------------------------------------------------------------ */

/**
 * 构建周报快照
 * @param {{ weekInfo: object, prevReport?: object }} params
 */
export function buildWeeklyReport({ weekInfo, prevReport, trendContext = [] }) {
  const report = isDemoWeek(weekInfo.weekKey)
    ? buildDemoWeeklyReport(weekInfo.weekKey)
    : buildRealReport(weekInfo, prevReport, trendContext)
  return applyOverviewDelta(report, prevReport)
}

/** 用上一份周报覆盖概览卡的环比（演示数据自带环比，真实数据按上一份周报算） */
function applyOverviewDelta(report, prevReport) {
  if (!prevReport?.overview?.cards?.length) return report
  if (!report?.overview?.cards?.length) return report
  const cards = report.overview.cards.map((card) => {
    const prevValue = prevReport.overview.cards.find((item) => item.key === card.key)?.value ?? null
    const delta = typeof card.value === 'number' && typeof prevValue === 'number' ? Math.round((card.value - prevValue) * 10) / 10 : null
    return { ...card, prevValue, delta }
  })
  const groups = (report.overview.groups || []).map((group) => ({
    ...group,
    cards: group.cards.map((card) => cards.find((item) => item.key === card.key) || card),
  }))
  return { ...report, overview: { ...report.overview, cards, groups } }
}

export { WEEKLY_SECTION_ORDER, SECTION_CHAPTER, CHAPTER_TITLES, getWeekInfo, addDays, previousWeekInfo, dateAtMidnight }
