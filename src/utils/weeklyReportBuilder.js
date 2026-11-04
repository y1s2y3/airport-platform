/**
 * 数字周报 · 生成器
 *
 * 职责：
 *  1. 演示周（2026-W41～W44）→ 使用 mock/weeklyReport.js 的演示数据工厂，保证首次演示有完整内容；
 *  2. 其余周次 → 从各业务模块台账实时取数汇总（会议记录／每日施工作业／隐患四源统一池／
 *     隐患抽检／巡检任务／质量验评／品牌报审／材料设备／实模一致），不新造数据。
 *  3. 环比：用上一周周报的概览指标计算差值。
 *
 * 说明：真实取数依赖各模块台账的日期字段；原型部分台账缺少「创建时间」，
 * 已按可用字段（inspectionDate / deadline / registeredAt / createdAt）近似，并在章节说明中标注。
 */
import {
  buildDemoWeeklyReport,
  isDemoWeek,
  getWeekInfo,
  addDays,
  previousWeekInfo,
  DEMO_PROJECTS,
  OVERVIEW_CARDS,
  METRIC_APPENDIX,
  dateAtMidnight,
} from '../mock/weeklyReport.js'
import { getMeetingSignInRecords } from '../coc/utils/meetingSignInStorage.js'
import { getDailyWorkRecords } from '../coc/utils/dailyWorkStorage.js'
import { getHazardIssueRows, isHazardIssueOverdue, getHazardIssueProjectOptions } from './hazardIssueSummary.js'
import { sampling } from '../mock/hazardSampling.js'
import { listMobileInspectionTasks } from '../mock/mobileInspectionTasks.js'
import { listApplications } from '../mock/brand.js'
import { getDashboard } from '../mock/mat.js'
import { listAsbuilt } from '../mock/asbuilt.js'
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

function computeHazardRows(projects, weekInfo) {
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

function computeSamplingRows(projects, weekInfo) {
  const state = sampling?.value || { tasks: [], history: [] }
  const tasks = (state.tasks || []).filter((task) =>
    inRange(task.createdAt || task.created || task.time, weekInfo.weekStart, weekInfo.weekEnd),
  )
  const history = (state.history || []).filter((log) =>
    inRange(log.createdAt || log.time, weekInfo.weekStart, weekInfo.weekEnd),
  )
  return projects.map((project) => {
    const projectTasks = tasks.filter((task) => String(task.projectKey || '').includes(project.key) || task.projectName === project.name)
    const projectLogs = history.filter((log) => projectTasks.some((task) => task.id === log.taskId))
    const pass = projectLogs.filter((log) => log.result === '合格').length
    const fail = projectLogs.filter((log) => log.result === '不合格').length
    const pending = Math.max(0, projectLogs.length - pass - fail)
    return {
      project: project.name,
      tasks: projectTasks.length,
      count: projectLogs.length,
      pass,
      fail,
      pending,
      rate: pct(pass, pass + fail),
      failPoints: projectLogs
        .filter((log) => log.result === '不合格')
        .slice(0, 2)
        .map((log) => log.opinion || '复核不通过')
        .join('；') || '--',
    }
  })
}

function computeSafetyTaskRows(projects, weekInfo) {
  const tasks = safeCall(() => listMobileInspectionTasks(), [])
  return projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.project === project.name)
    const weekTasks = projectTasks.filter(
      (task) => inRange(task.inspectionDate, weekInfo.weekStart, weekInfo.weekEnd) || inRange(task.deadline, weekInfo.weekStart, weekInfo.weekEnd),
    )
    const created = weekTasks.length
    const done = weekTasks.filter((task) => task.status === '已完成').length
    const withHazard = weekTasks.filter((task) => task.status === '已完成' && Number(task.hazardCount) > 0).length
    const overdueTasks = projectTasks.filter((task) => task.status !== '已完成' && inRange(task.deadline, '2000-01-01', weekInfo.weekEnd) && task.overdue)
    return {
      project: project.name,
      created,
      done,
      rate: pct(done, created),
      withHazard,
      overdue: overdueTasks.length,
      maxOverdueDays: overdueTasks.length ? 1 : 0,
      overdueNames: overdueTasks.slice(0, 2).map((task) => task.taskName).join('、') || '--',
    }
  })
}

function computeSafetyHazardRows(projects, weekInfo) {
  const rowsSource = safeCall(() => getHazardIssueRows(), [])
  return projects.map((project) => {
    const projectRows = rowsSource.filter((row) => row.projectName === project.name && row.source === 'inspection')
    const created = projectRows.filter((row) => inRange(row.registeredAt, weekInfo.weekStart, weekInfo.weekEnd)).length
    const closed = projectRows.filter((row) => inRange(row.registeredAt, weekInfo.weekStart, weekInfo.weekEnd) && row.closed).length
    const openRows = projectRows.filter((row) => !row.closed)
    return {
      project: project.name,
      created,
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
}

function computeQmIssueRows(projects, weekInfo) {
  const rowsSource = safeCall(() => getHazardIssueRows(), [])
  return projects.map((project) => {
    const projectRows = rowsSource.filter((row) => row.projectName === project.name && row.source === 'externalQuality')
    const created = projectRows.filter((row) => inRange(row.registeredAt, weekInfo.weekStart, weekInfo.weekEnd)).length
    const closed = projectRows.filter((row) => inRange(row.registeredAt, weekInfo.weekStart, weekInfo.weekEnd) && row.closed).length
    const open = projectRows.filter((row) => !row.closed).length
    const overdue = projectRows.filter((row) => isHazardIssueOverdue(row)).length
    return {
      project: project.name,
      created,
      platform: created,
      bim: 0,
      closed,
      open,
      overdue,
      rate: pct(closed, created),
    }
  })
}

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

function computeQmMatRows(projects) {
  const projectOptions = safeCall(() => COC_PROJECT_OPTIONS, [])
  return projects.map((project) => {
    const option = projectOptions.find((item) => item.label === project.name)
    const dashboard = option ? safeCall(() => getDashboard(option.id), {}) : {}
    const pick = (snake, camel) => dashboard?.[snake] ?? dashboard?.[camel] ?? 0
    return {
      project: project.name,
      total: pick('total_batches', 'totalBatches'),
      matIn: pick('material_count', 'materialCount'),
      matOut: pick('material_exited_count', 'materialExitedCount'),
      eqIn: pick('equipment_count', 'equipmentCount'),
      eqOut: pick('equipment_exited_count', 'equipmentExitedCount'),
      approving: pick('approving_count', 'approvingCount'),
      approved: pick('approved_count', 'approvedCount'),
      rejected: pick('rejected_count', 'rejectedCount'),
    }
  })
}

function computeQmAsbuiltRows(projects) {
  const projectOptions = safeCall(() => COC_PROJECT_OPTIONS, [])
  return projects.map((project) => {
    const option = projectOptions.find((item) => item.label === project.name)
    const list = option ? safeCall(() => listAsbuilt(option.id), []) : []
    const approved = list.filter((item) => item.status === 'approved').length
    const rejected = list.filter((item) => item.status === 'rejected').length
    return {
      project: project.name,
      count: list.length,
      approved,
      rejected,
      rate: pct(approved, list.length),
      failPoints: '--',
    }
  })
}

/** 排名章节（与演示版同规则） */
function buildRank(section, { key, chapter, title, rateLabel }) {
  const ranked = [...(section?.rows || [])]
    .filter((row) => (row.created || 0) > 0 || (row.closed || 0) > 0)
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || String(a.project).localeCompare(String(b.project), 'zh-CN'))
  let lastRate = null
  let lastRank = 0
  const rows = ranked.map((row, index) => {
    const rank = lastRate !== null && row.rate === lastRate ? lastRank : index + 1
    lastRate = row.rate
    lastRank = rank
    return {
      rank,
      project: row.project,
      rate: row.rate,
      closedCreated: `${row.closed || 0}/${row.created || 0}`,
      overdue: row.overdue || 0,
      open: row.open || 0,
      mark: row.rate === null ? '未纳入' : row.rate >= 90 ? '优' : row.rate >= 80 ? '良' : '需关注',
    }
  })
  return {
    key,
    chapter,
    title,
    summary: `排名口径：按${rateLabel}降序、同值并列（1、2、2、4）；本周未上报项目不参与排名。`,
    columns: [
      { prop: 'rank', label: '名次', width: 64, align: 'center' },
      { prop: 'project', label: '项目', minWidth: 132 },
      { prop: 'rate', label: rateLabel, unit: '%', width: 96, align: 'center', format: 'pct' },
      { prop: 'closedCreated', label: '闭环/新增', width: 100, align: 'center' },
      { prop: 'overdue', label: '逾期数', unit: '条', width: 84, align: 'center' },
      { prop: 'open', label: '未闭环', unit: '条', width: 84, align: 'center' },
      { prop: 'mark', label: '标记', width: 92, align: 'center' },
    ],
    rows,
  }
}

/* ------------------------------------------------------------------ *
 * 真实台账周报组装
 * ------------------------------------------------------------------ */

const SECTION_ORDER = [
  'cocMeeting',
  'cocDangerWork',
  'cocHazard',
  'cocSampling',
  'safetyTask',
  'safetyHazard',
  'safetyRank',
  'safetyOverdue',
  'qmIssue',
  'qmInspect',
  'qmBrand',
  'qmMat',
  'qmAsbuilt',
  'qmRank',
  'overviewProject',
  'platformGap',
  'nextWatch',
]

function totalsOf(rows, keys) {
  const totals = {}
  keys.forEach((key) => {
    const sum = rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)
    totals[key] = sum
  })
  return totals
}

function buildRealReport(weekInfo, prevReport) {
  const template = buildDemoWeeklyReport(weekInfo.weekKey) // 复用列定义与章节骨架
  const projects = resolveProjects()
  const meeting = computeMeetingRows(projects, weekInfo)
  const dangerWorkRows = computeDangerWorkRows(projects, weekInfo)
  const hazardRows = computeHazardRows(projects, weekInfo)
  const samplingRows = computeSamplingRows(projects, weekInfo)
  const safetyTaskRows = computeSafetyTaskRows(projects, weekInfo)
  const safetyHazardRows = computeSafetyHazardRows(projects, weekInfo)
  const qmIssueRows = computeQmIssueRows(projects, weekInfo)
  const qmInspectRows = computeQmInspectRows(projects)
  const qmBrandRows = computeQmBrandRows(projects)
  const qmMatRows = computeQmMatRows(projects)
  const qmAsbuiltRows = computeQmAsbuiltRows(projects)

  const sections = { ...template.sections }

  sections.cocMeeting = {
    ...template.sections.cocMeeting,
    rows: meeting.rows,
    totals: {
      project: '合计',
      dispatched: totalsOf(meeting.rows, ['dispatched']).dispatched,
      shouldAttend: totalsOf(meeting.rows, ['shouldAttend']).shouldAttend,
      joined: totalsOf(meeting.rows, ['joined']).joined,
      absent: totalsOf(meeting.rows, ['absent']).absent,
      rate: pct(totalsOf(meeting.rows, ['joined']).joined, totalsOf(meeting.rows, ['shouldAttend']).shouldAttend),
      absentNames: '—',
      dutyStatus: '—',
    },
    summary:
      meeting.meetings.length === 0
        ? `本周（${weekInfo.rangeLabel}）无调度会议记录；建议核对指挥调度会议的「结束会议」操作是否已执行。`
        : `本周开展调度会议 ${meeting.meetings.length} 场，覆盖项目 ${meeting.rows.filter((row) => row.dispatched > 0).length} 个；` +
          `应参会 ${totalsOf(meeting.rows, ['shouldAttend']).shouldAttend} 人次、已参会 ${totalsOf(meeting.rows, ['joined']).joined} 人次、` +
          `未参会 ${totalsOf(meeting.rows, ['absent']).absent} 人次，参会率 ${fmtPct(pct(totalsOf(meeting.rows, ['joined']).joined, totalsOf(meeting.rows, ['shouldAttend']).shouldAttend))}。`,
    extra: { meetings: meeting.meetings, coverage: meeting.rows.filter((row) => row.dispatched > 0).length },
  }

  sections.cocDangerWork = {
    ...template.sections.cocDangerWork,
    rows: dangerWorkRows,
    totals: {
      project: '合计',
      shouldDays: totalsOf(dangerWorkRows, ['shouldDays']).shouldDays,
      actualDays: totalsOf(dangerWorkRows, ['actualDays']).actualDays,
      rate: pct(totalsOf(dangerWorkRows, ['actualDays']).actualDays, totalsOf(dangerWorkRows, ['shouldDays']).shouldDays),
      dangerCount: totalsOf(dangerWorkRows, ['dangerCount']).dangerCount,
      mainTypes: '—',
      missDates: '—',
      remark: '—',
    },
    summary:
      `本周应报 ${projects.length} 个项目 × 7 天 = ${totalsOf(dangerWorkRows, ['shouldDays']).shouldDays} 天次，实报 ${totalsOf(dangerWorkRows, ['actualDays']).actualDays} 天次，` +
      `上报率 ${fmtPct(pct(totalsOf(dangerWorkRows, ['actualDays']).actualDays, totalsOf(dangerWorkRows, ['shouldDays']).shouldDays))}；危险作业 ${totalsOf(dangerWorkRows, ['dangerCount']).dangerCount} 条。`,
  }

  sections.cocHazard = {
    ...template.sections.cocHazard,
    rows: hazardRows,
    totals: {
      project: '合计',
      total: totalsOf(hazardRows, ['total']).total,
      dispatchSrc: totalsOf(hazardRows, ['dispatchSrc']).dispatchSrc,
      supervisionSrc: totalsOf(hazardRows, ['supervisionSrc']).supervisionSrc,
      safety: totalsOf(hazardRows, ['safety']).safety,
      quality: totalsOf(hazardRows, ['quality']).quality,
      low: totalsOf(hazardRows, ['low']).low,
      mid: totalsOf(hazardRows, ['mid']).mid,
      high: totalsOf(hazardRows, ['high']).high,
      closed: totalsOf(hazardRows, ['closed']).closed,
      open: totalsOf(hazardRows, ['open']).open,
      overdue: totalsOf(hazardRows, ['overdue']).overdue,
      mainHazards: '—',
    },
    summary:
      `本周调度过程新增隐患 ${totalsOf(hazardRows, ['total']).total} 条（调度隐患 ${totalsOf(hazardRows, ['dispatchSrc']).dispatchSrc} 条、` +
      `监理会议 ${totalsOf(hazardRows, ['supervisionSrc']).supervisionSrc} 条），已闭环 ${totalsOf(hazardRows, ['closed']).closed} 条、` +
      `未闭环 ${totalsOf(hazardRows, ['open']).open} 条。`,
  }

  sections.cocSampling = {
    ...template.sections.cocSampling,
    rows: samplingRows,
    totals: {
      project: '合计',
      tasks: totalsOf(samplingRows, ['tasks']).tasks,
      count: totalsOf(samplingRows, ['count']).count,
      pass: totalsOf(samplingRows, ['pass']).pass,
      fail: totalsOf(samplingRows, ['fail']).fail,
      pending: totalsOf(samplingRows, ['pending']).pending,
      rate: pct(totalsOf(samplingRows, ['pass']).pass, totalsOf(samplingRows, ['pass']).pass + totalsOf(samplingRows, ['fail']).fail),
      failPoints: '—',
    },
    summary:
      `本周抽检任务 ${totalsOf(samplingRows, ['tasks']).tasks} 个，抽检隐患 ${totalsOf(samplingRows, ['count']).count} 条：` +
      `合格 ${totalsOf(samplingRows, ['pass']).pass} 条、不合格 ${totalsOf(samplingRows, ['fail']).fail} 条、未复核 ${totalsOf(samplingRows, ['pending']).pending} 条。`,
  }

  sections.safetyTask = {
    ...template.sections.safetyTask,
    rows: safetyTaskRows,
    totals: {
      project: '合计',
      created: totalsOf(safetyTaskRows, ['created']).created,
      done: totalsOf(safetyTaskRows, ['done']).done,
      rate: pct(totalsOf(safetyTaskRows, ['done']).done, totalsOf(safetyTaskRows, ['created']).created),
      withHazard: totalsOf(safetyTaskRows, ['withHazard']).withHazard,
      overdue: totalsOf(safetyTaskRows, ['overdue']).overdue,
      maxOverdueDays: 0,
      overdueNames: '—',
    },
    summary:
      `本周巡检任务 ${totalsOf(safetyTaskRows, ['created']).created} 个、完成 ${totalsOf(safetyTaskRows, ['done']).done} 个` +
      `（完成率 ${fmtPct(pct(totalsOf(safetyTaskRows, ['done']).done, totalsOf(safetyTaskRows, ['created']).created))}）、` +
      `有隐患任务 ${totalsOf(safetyTaskRows, ['withHazard']).withHazard} 个、逾期任务 ${totalsOf(safetyTaskRows, ['overdue']).overdue} 个。` +
      `（原型巡检任务缺少「创建时间」，本周范围按执行日期／截止日期近似）`,
  }

  sections.safetyHazard = {
    ...template.sections.safetyHazard,
    rows: safetyHazardRows,
    totals: {
      project: '合计',
      created: totalsOf(safetyHazardRows, ['created']).created,
      closed: totalsOf(safetyHazardRows, ['closed']).closed,
      open: totalsOf(safetyHazardRows, ['open']).open,
      pendingFix: totalsOf(safetyHazardRows, ['pendingFix']).pendingFix,
      pendingReview: totalsOf(safetyHazardRows, ['pendingReview']).pendingReview,
      reviewed: totalsOf(safetyHazardRows, ['reviewed']).reviewed,
      overdue: totalsOf(safetyHazardRows, ['overdue']).overdue,
      rate: pct(totalsOf(safetyHazardRows, ['closed']).closed, totalsOf(safetyHazardRows, ['created']).created),
      avgDays: null,
    },
    summary:
      `本周发现隐患 ${totalsOf(safetyHazardRows, ['created']).created} 条、闭环 ${totalsOf(safetyHazardRows, ['closed']).closed} 条` +
      `（闭环率 ${fmtPct(pct(totalsOf(safetyHazardRows, ['closed']).closed, totalsOf(safetyHazardRows, ['created']).created))}）、` +
      `未闭环存量 ${totalsOf(safetyHazardRows, ['open']).open} 条、逾期 ${totalsOf(safetyHazardRows, ['overdue']).overdue} 条。`,
  }

  sections.safetyRank = buildRank(sections.safetyHazard, {
    key: 'safetyRank',
    chapter: '三、安全管理',
    title: '3.3 项目排名（隐患整改率）',
    rateLabel: '隐患整改率',
  })

  const overdueRows = []
  safeCall(() => getHazardIssueRows(), []).forEach((row) => {
    if (!isHazardIssueOverdue(row)) return
    overdueRows.push({
      project: row.projectName,
      hazardNo: row.originalNo || row.id,
      title: row.title || '--',
      type: String(row.categoryLabel || '').includes('质量') ? '质量' : '安全',
      level: row.level || '一般',
      owner: row.rectifier || '--',
      deadline: row.deadline || '--',
      overdueDays: row.deadline
        ? Math.max(1, Math.floor((dateAtMidnight('2026-11-02').getTime() - dateAtMidnight(row.deadline).getTime()) / 86400000))
        : 0,
      status: row.status || '--',
      isLegacy: '—',
    })
  })
  sections.safetyOverdue = {
    ...template.sections.safetyOverdue,
    rows: overdueRows,
    summary: `本周逾期未闭环 ${overdueRows.length} 条；跨周遗留判断依据历史周报快照，首次生成时显示「—」。`,
  }

  sections.qmIssue = {
    ...template.sections.qmIssue,
    rows: qmIssueRows,
    totals: {
      project: '合计',
      created: totalsOf(qmIssueRows, ['created']).created,
      platform: totalsOf(qmIssueRows, ['platform']).platform,
      bim: totalsOf(qmIssueRows, ['bim']).bim,
      closed: totalsOf(qmIssueRows, ['closed']).closed,
      open: totalsOf(qmIssueRows, ['open']).open,
      overdue: totalsOf(qmIssueRows, ['overdue']).overdue,
      rate: pct(totalsOf(qmIssueRows, ['closed']).closed, totalsOf(qmIssueRows, ['created']).created),
    },
    summary:
      `本周新增质量问题 ${totalsOf(qmIssueRows, ['created']).created} 条、闭环 ${totalsOf(qmIssueRows, ['closed']).closed} 条` +
      `（整改率 ${fmtPct(pct(totalsOf(qmIssueRows, ['closed']).closed, totalsOf(qmIssueRows, ['created']).created))}）、` +
      `未整改存量 ${totalsOf(qmIssueRows, ['open']).open} 条、逾期 ${totalsOf(qmIssueRows, ['overdue']).overdue} 条。`,
  }

  sections.qmInspect = { ...template.sections.qmInspect, rows: qmInspectRows, summary: `本周验收任务 ${totalsOf(qmInspectRows, ['tasks']).tasks} 个；数据取自质量验评看板实时统计。` }
  sections.qmBrand = { ...template.sections.qmBrand, rows: qmBrandRows, summary: `本周品牌报审 ${totalsOf(qmBrandRows, ['applications']).applications} 项；数据取自品牌报审台账。` }
  sections.qmMat = { ...template.sections.qmMat, rows: qmMatRows, summary: `本周材料设备进场 ${totalsOf(qmMatRows, ['total']).total} 批；数据取自材料设备进场看板。` }
  sections.qmAsbuilt = { ...template.sections.qmAsbuilt, rows: qmAsbuiltRows, summary: `本周实模一致验收 ${totalsOf(qmAsbuiltRows, ['count']).count} 项；数据取自已验收台账。` }

  sections.qmRank = buildRank(sections.qmIssue, {
    key: 'qmRank',
    chapter: '四、质量管理',
    title: '4.6 项目排名（质量问题整改率）',
    rateLabel: '质量问题整改率',
  })

  const overviewCards = [
    { key: 'meetings', value: meeting.meetings.length },
    { key: 'coverage', value: meeting.rows.filter((row) => row.dispatched > 0).length, extra: `／在建 ${projects.length} 个` },
    { key: 'attendRate', value: sections.cocMeeting.totals.rate },
    { key: 'reportRate', value: sections.cocDangerWork.totals.rate },
    { key: 'newHazard', value: totalsOf(hazardRows, ['total']).total + totalsOf(qmIssueRows, ['created']).created },
    {
      key: 'closeRate',
      value: pct(
        totalsOf(hazardRows, ['closed']).closed + totalsOf(safetyHazardRows, ['closed']).closed,
        totalsOf(hazardRows, ['total']).total + totalsOf(safetyHazardRows, ['created']).created,
      ),
    },
    { key: 'taskRate', value: sections.safetyTask.totals.rate },
    { key: 'overdueHazard', value: sections.safetyHazard.totals.overdue + sections.cocHazard.totals.overdue },
    { key: 'qmRectifyRate', value: sections.qmIssue.totals.rate },
    { key: 'gapProjects', value: 0 },
  ].map((card) => {
    const meta = OVERVIEW_CARDS.find((item) => item.key === card.key) || {}
    const prevValue = prevReport?.overview?.cards?.find((item) => item.key === card.key)?.value ?? null
    const delta = typeof card.value === 'number' && typeof prevValue === 'number' ? Math.round((card.value - prevValue) * 10) / 10 : null
    return { ...meta, value: card.value, extra: card.extra || '', prevValue, delta }
  })

  // 应报未报：本地计算（每日作业漏报 + 巡检任务为 0）
  const gapRows = projects
    .map((project, index) => {
      const danger = dangerWorkRows.find((row) => row.project === project.name)
      const task = safetyTaskRows.find((row) => row.project === project.name)
      const modules = []
      if (danger && danger.actualDays < danger.shouldDays) modules.push('每日施工作业')
      if (task && task.created === 0) modules.push('巡检任务')
      if (!modules.length) return null
      return { project: project.name, modules: modules.join('、'), days: danger ? danger.shouldDays - danger.actualDays : 1, impact: '影响上报率与任务完成率指标' }
    })
    .filter(Boolean)
  sections.platformGap = { ...template.sections.platformGap, rows: gapRows, summary: `本周 ${gapRows.length} 个项目存在应报未报。` }
  sections.nextWatch = { ...template.sections.nextWatch, rows: overdueRows.slice(0, 5).map((row, index) => ({ seq: index + 1, item: `督办逾期隐患：${row.title}`, project: row.project, basis: `已逾期 ${row.overdueDays} 天` })) }

  const overview = {
    title: '一、本周概览',
    summary:
      `本周（${weekInfo.rangeLabel}）共开展调度 ${meeting.meetings.length} 次、覆盖 ${meeting.rows.filter((row) => row.dispatched > 0).length} 个在建项目；` +
      `新增隐患 ${overviewCards.find((card) => card.key === 'newHazard')?.value || 0} 条、闭环率 ${fmtPct(overviewCards.find((card) => card.key === 'closeRate')?.value)}；` +
      `巡检任务完成率 ${fmtPct(sections.safetyTask.totals.rate)}；质量问题整改率 ${fmtPct(sections.qmIssue.totals.rate)}；` +
      `${sections.safetyHazard.totals.overdue} 条隐患逾期未闭环，${gapRows.length} 个项目存在应报未报。`,
    cards: overviewCards,
    warnRows: gapRows.map((row) => ({ project: row.project, type: '应报未报', count: row.days, detail: row.detail || `${row.modules} 未报 ${row.days} 天` })),
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
export function buildWeeklyReport({ weekInfo, prevReport }) {
  const report = isDemoWeek(weekInfo.weekKey)
    ? buildDemoWeeklyReport(weekInfo.weekKey)
    : buildRealReport(weekInfo, prevReport)
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
  return { ...report, overview: { ...report.overview, cards } }
}

/** 章节顺序（详情页渲染用） */
export const WEEKLY_SECTION_ORDER = SECTION_ORDER

/** 章节分组（详情页导航用） */
export const WEEKLY_CHAPTERS = [
  { id: 'overview', title: '一、本周概览' },
  { id: 'chapter-coc', title: '二、COC 调度' },
  { id: 'chapter-safety', title: '三、安全管理' },
  { id: 'chapter-quality', title: '四、质量管理' },
  { id: 'chapter-overview', title: '五、综合运行' },
  { id: 'appendix', title: '附：指标口径' },
]

/** 章节 → 分组映射 */
export const SECTION_CHAPTER = {
  cocMeeting: 'chapter-coc',
  cocDangerWork: 'chapter-coc',
  cocHazard: 'chapter-coc',
  cocSampling: 'chapter-coc',
  safetyTask: 'chapter-safety',
  safetyHazard: 'chapter-safety',
  safetyRank: 'chapter-safety',
  safetyOverdue: 'chapter-safety',
  qmIssue: 'chapter-quality',
  qmInspect: 'chapter-quality',
  qmBrand: 'chapter-quality',
  qmMat: 'chapter-quality',
  qmAsbuilt: 'chapter-quality',
  qmRank: 'chapter-quality',
  overviewProject: 'chapter-overview',
  platformGap: 'chapter-overview',
  nextWatch: 'chapter-overview',
}

export { getWeekInfo, addDays, previousWeekInfo }
