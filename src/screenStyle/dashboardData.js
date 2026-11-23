import { buildCocProjectOptions } from '../config/projectOptions.js'
import { normalizeInspectionCategories } from '../config/inspectionManagement.js'
import { planData } from '../composables/useInspectionPlan.js'
import { listMobileInspectionTasks } from '../mock/mobileInspectionTasks.js'
import { listInspectionHazards } from '../mock/inspectionHazardQuery.js'
import { eligible, ensureSamplingExamples, sampling, taskProgress } from '../mock/hazardSampling.js'
import { getHazardIssueProjectOptions, getHazardIssueRows } from '../utils/hazardIssueSummary.js'
import {
  ensureDailyWorkSeed, getDailyWorkRecords, toDangerWorkListItem, toDispatchMajorWorkItem,
} from '../coc/utils/dailyWorkStorage.js'
import { buildDailyWorkExportRecords } from '../coc/utils/dailyWorkExport.js'
import { DANGER_WORK_CATEGORY_OPTIONS, MAJOR_PROJECT_CATEGORY_OPTIONS } from '../coc/config/dailyWorkSchema.js'
import { buildLedgerRows, getCalendarAlerts, getLedgerStatus, getMajorHazardData } from '../utils/majorHazardManualStorage.js'
import { buildRanking, listPeriodGroups } from '../mock/assessmentScore.js'

export const TIME_ZONE = 'Asia/Shanghai'
const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})
const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: TIME_ZONE, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
})

export const inspectionScopes = [
  { value: 'month', label: '本月' },
  { value: 'year', label: '本年' },
  { value: 'all', label: '全部' },
]

export const hazardStates = [
  { label: '待整改', color: '#ffa85f', tone: 'amber' },
  { label: '待验收', color: '#30d9e8', tone: 'cyan' },
  { label: '待复查', color: '#408fff', tone: 'blue' },
  { label: '已关闭', color: '#50ecb6', tone: 'green' },
]

const plotColors = ['#17bfff', '#4ee6ba', '#6193ff', '#ffb960', '#c1a4ff', '#4fe0ed', '#ff8194', '#a8bac9']
export const workCategories = {
  danger: DANGER_WORK_CATEGORY_OPTIONS.filter(label => label !== '不涉及危险作业'),
  major: [...MAJOR_PROJECT_CATEGORY_OPTIONS],
}
export function workColor(index) {
  return plotColors[index % plotColors.length]
}

export function dayKey(value = new Date()) {
  if (value instanceof Date) return dateFormatter.format(value)
  const text = String(value || '')
  if (/T.*(?:Z|[+\-]\d{2}:\d{2})$/.test(text)) {
    const instant = new Date(text)
    if (!Number.isNaN(instant.valueOf())) return dateFormatter.format(instant)
  }
  return text.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || ''
}

export function clockText(date) {
  return timeFormatter.format(date)
}

export function displayTime(value) {
  if (!value) return ''
  if (/T.*(?:Z|[+\-]\d{2}:\d{2})$/.test(value)) {
    const instant = new Date(value)
    if (!Number.isNaN(instant.valueOf())) return dayKey(instant) + ' ' + clockText(instant)
  }
  return String(value).replace('T', ' ')
}

export function percent(numerator, denominator) {
  return denominator > 0 ? Math.round(numerator * 1000 / denominator) / 10 + '%' : '—'
}

export function dateGap(later, earlier) {
  if (!dayKey(later) || !dayKey(earlier)) return 0
  return Math.round((Date.parse(dayKey(later)) - Date.parse(dayKey(earlier))) / 86400000)
}

function inMonth(value, today) {
  const day = dayKey(value)
  return day >= today.slice(0, 7) + '-01' && day <= today
}

function inspectionGeneration(task, dispatchDate) {
  const explicit = dayKey(task.createdAt || '')
  if (explicit) return { generated: explicit, generatedFrom: '任务生成时间' }
  if (task.source === '系统自建') {
    const submitted = dayKey(task.submittedAt || '')
    if (submitted) return { generated: submitted, generatedFrom: '自建提交时间' }
  }
  if (task.source === '任务下发') {
    if (dispatchDate) return { generated: dispatchDate, generatedFrom: '下发记录' }

    // 下发任务编号在生成时编码日期，自建任务编号编码巡检日期。
    const parts = task.taskNo?.match(/^(?:AQXJ|ZLXJ|AZXJ|STWMXJ|QTXJ)(\d{4})(\d{2})(\d{2})\d{3,}$/)
    if (parts) {
      const date = parts.slice(1).join('-')
      const timestamp = Date.parse(date)
      if (Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date) {
        return { generated: date, generatedFrom: '历史下发编号' }
      }
    }
  }
  return { generated: '', generatedFrom: '' }
}

export function getGeneratedInspectionTasks(tasks, scope, today) {
  if (scope === 'all') return tasks
  const start = scope === 'year' ? today.slice(0, 4) + '-01-01' : today.slice(0, 7) + '-01'
  return tasks.filter(row => row.generated >= start && row.generated <= today)
}

export function loadDashboard(today) {
  const masterProjects = buildCocProjectOptions()
  const projects = new Map(masterProjects.map(project => [project.id, project]))
  const byName = new Map(masterProjects.flatMap(project => [
    [project.label, project.id], [project.fullName, project.id],
  ]).filter(([name]) => name))
  const issueProjects = new Map(getHazardIssueProjectOptions().map(project => [project.key, project]))

  function projectId(id, label, fallback = '') {
    if (projects.has(id)) return id
    const known = byName.get(label)
    if (known) return known
    const key = fallback || id || (label ? 'name:' + label : 'unassigned')
    if (!projects.has(key)) projects.set(key, { id: key, label: label || '未匹配项目', fullName: label || '未匹配项目' })
    return key
  }

  function samplingProject(key, name) {
    const project = issueProjects.get(key)
    return projectId(project?.masterId, project?.label || name, key)
  }

  const dispatchDates = new Map()
  for (const plan of planData) {
    const date = dayKey(plan.createdAt || '')
    if (!date || !plan.planNo) continue
    for (const id of plan.projectIds || []) {
      const key = id + ':' + plan.planNo
      const previous = dispatchDates.get(key)
      if (!previous || date < previous) dispatchDates.set(key, date)
    }
  }
  const tasks = [...new Map(listMobileInspectionTasks().map(row => [row.id, row])).values()].map(row => ({
    id: row.id,
    projectId: projectId(row.projectId || row.project_id, row.project),
    source: row.source,
    ...inspectionGeneration(row, dispatchDates.get((row.projectId || row.project_id) + ':' + row.taskNo)),
    number: row.taskNo,
    categories: normalizeInspectionCategories(row.inspectionCategories || row.inspectionCategory).join('、'),
    executor: row.executor || row.inspector,
    deadline: dayKey(row.deadline),
    status: row.status,
    completed: row.status === '已完成',
  })).map(row => ({
    ...row, overdue: Boolean(row.deadline && row.deadline < today && !row.completed),
    dueThisMonth: inMonth(row.deadline, today),
  }))

  const hazards = listInspectionHazards().map(row => {
    const issued = dayKey(row.issuedAt || row.issueDate)
    const registered = dayKey(row.registeredAt || row.issueDate)
    const deadline = dayKey(row.deadline)
    const unconfirmed = row.managerConfirmationResult === '否'
    return {
      id: row.id,
      projectId: projectId(row.project_id, row.project),
      number: row.rectifyNo,
      description: row.desc,
      category: row.inspectionCategory,
      level: row.hazardLevel,
      status: row.status,
      node: row.currentNode,
      registered,
      issued,
      deadline,
      closed: dayKey(row.closeDate),
      issuedThisMonth: !unconfirmed && inMonth(issued, today),
      newThisMonth: !unconfirmed && inMonth(registered, today),
      overdue: Boolean(!unconfirmed && issued && deadline && deadline < today && ['待整改', '待验收'].includes(row.status)),
    }
  })

  const rawIssues = getHazardIssueRows()
  ensureSamplingExamples(rawIssues)
  const history = sampling.value.history
  const latestHqChecks = new Map()
  for (const log of history) {
    if (log.stage !== 'hq' || !['合格', '不合格'].includes(log.result) || dayKey(log.time) > today) continue
    const previous = latestHqChecks.get(log.rowId)
    if (!previous || String(log.time) > String(previous.time)) latestHqChecks.set(log.rowId, log)
  }
  const coverage = rawIssues.filter(row => eligible(row) && inMonth(row.registeredAt, today)).map(row => ({
    id: row.id,
    projectId: samplingProject(row.projectKey, row.projectName),
    source: row.sourceLabel,
    number: row.originalNo,
    description: row.title,
    registered: dayKey(row.registeredAt),
    check: latestHqChecks.get(row.id),
  }))
  const issuesById = new Map(rawIssues.map(row => [row.id, row]))
  const logsById = new Map(history.map(row => [row.id, row]))
  const batches = sampling.value.tasks.filter(row => ['supervisor', 'manager'].includes(row.stage)).map(row => {
    const project = samplingProject(row.projectKey, row.projectName)
    const entries = row.ids.map(id => {
      const issue = issuesById.get(id)
      const result = logsById.get(row.results?.[id])
      const valid = result?.rowId === id && result.taskId === row.id && result.stage === row.stage
        && ['合格', '不合格'].includes(result.result)
      return {
        id: row.id + ':' + id, projectId: project, batch: row.id, source: issue?.sourceLabel || '',
        number: issue?.originalNo || id, description: issue?.title,
        time: valid ? result.time : '', outcome: valid ? result.result : '',
      }
    })
    return {
      id: row.id,
      projectId: project,
      stage: row.stage,
      source: [...new Set(entries.map(item => item.source).filter(Boolean))].join('、'),
      recipient: row.recipient || row.assigneeName,
      sent: displayTime(row.createdAt),
      parent: row.parentTaskId,
      group: row.batchId,
      entries,
      ...taskProgress(row),
    }
  })
  const results = batches.filter(row => row.stage === 'supervisor')
    .flatMap(row => row.entries.filter(entry => entry.outcome && inMonth(entry.time, today)))

  ensureDailyWorkSeed()
  const rawWork = getDailyWorkRecords()
  const workProjectIds = new Map(rawWork.map(row => [row.id, projectId(row.projectId, row.projectName)]))

  const engineering = []
  const alerts = []
  for (const project of masterProjects) {
    const data = getMajorHazardData(project.id)
    const ledgers = buildLedgerRows(data)
    for (const row of ledgers) {
      const parts = (row.parts || []).map(part => {
        const acceptance = part.process?.acceptance
        const accepted = acceptance?.status === '已完成' && acceptance.result === '合格'
        return {
          id: part.id, name: part.name || part.wbsPath, due: dayKey(part.plannedEndDate),
          acceptance: accepted ? '合格' : acceptance?.result || acceptance?.status || '待验收',
          overdue: Boolean(part.plannedEndDate && dayKey(part.plannedEndDate) < today && !accepted),
        }
      })
      engineering.push({
        id: project.id + ':' + (row.sourceId || row.id), projectId: project.id, name: row.name,
        category: row.categoryName, superMajor: row.isSuperMajor === '是',
        status: getLedgerStatus(row), parts, overdue: parts.some(part => part.overdue),
      })
    }
    const uniqueAlerts = new Map(getCalendarAlerts(project.id, data, ledgers).map(row => [row.id, row]))
    for (const row of uniqueAlerts.values()) {
      alerts.push({
        id: project.id + ':' + row.id, projectId: project.id, name: row.ledgerName,
        part: row.part?.name || row.part?.wbsPath, kind: row.type,
        content: row.content, time: displayTime(row.occurredAt), status: row.status,
      })
    }
  }

  return { projects, tasks, hazards, coverage, results, batches, rawWork, workProjectIds, engineering, alerts }
}

export function getInspectionPeriod(tasks, today) {
  const current = tasks.filter(row => row.dueThisMonth)
  if (current.length) return { rows: current, exampleMonth: '' }

  const months = [...new Set(tasks.map(row => row.deadline.slice(0, 7)).filter(month => month && month < today.slice(0, 7)))].sort().reverse()
  const samples = months.map(month => ({
    rows: tasks.filter(row => row.deadline.startsWith(month)),
    exampleMonth: month,
  }))
  return samples.find(sample => sample.rows.some(row => row.completed)) || samples[0] || { rows: [], exampleMonth: '' }
}

export function getWorkRows(data, date, type) {
  if (!date) return []
  const selected = buildDailyWorkExportRecords(data.rawWork, { reportDate: date, sheet: type })
  return selected.flatMap(raw => {
    const item = type === 'danger' ? toDangerWorkListItem(raw) : toDispatchMajorWorkItem(raw)
    if (!item) return []
    return [{
      id: item.id, projectId: data.workProjectIds.get(raw.id), category: item.type || item.category || '未分类',
      contractor: item.contractor, content: item.subType || item.workContent, area: item.location,
      time: item.time, measures: item.measures,
    }]
  })
}

export function getDisplayedWork(data, date, type, today) {
  const rows = getWorkRows(data, date, type)
  if (rows.length || date !== today) return { rows, exampleDate: '' }

  const dates = [...new Set(data.rawWork.map(row => dayKey(type === 'major' ? row.majorStartTime : row.reportDate))
    .filter(day => day && day < today))].sort().reverse()
  let example = { rows, exampleDate: '' }
  let projectCount = 0
  for (const day of dates) {
    const candidates = getWorkRows(data, day, type)
    const count = new Set(candidates.map(row => row.projectId)).size
    if (count > projectCount || (count === projectCount && candidates.length > example.rows.length)) {
      example = { rows: candidates, exampleDate: day }
      projectCount = count
    }
  }
  return example
}

export function groupProjects(rows, projects) {
  const groups = new Map()
  for (const row of rows) {
    if (!groups.has(row.projectId)) {
      groups.set(row.projectId, {
        id: row.projectId, name: projects.get(row.projectId)?.label || '未匹配项目', rows: [],
      })
    }
    groups.get(row.projectId).rows.push(row)
  }
  return [...groups.values()]
}

export function getWorkGroups(rows, projects, type) {
  const categories = [...new Set([...workCategories[type], ...rows.map(row => row.category)])]
  const groups = groupProjects(rows, projects).map(group => ({
    ...group,
    counts: categories.map(label => ({
      label, value: group.rows.filter(row => row.category === label).length,
    })),
    total: group.rows.length,
  })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'zh-CN'))
  return { categories, groups }
}

export function assessmentPeriods() {
  return listPeriodGroups().find(group => group.id === 'month')?.options || []
}

export function assessmentPoints(score, maximum) {
  return maximum ? Math.round(score * 1000 / maximum) / 10 : null
}

// 现有考核模块只提供原型分数，且不具备正式成绩查询接口。
export function getAssessmentPreview(period, type) {
  return buildRanking(period)
    .filter(row => !type || row.assessment_type === type)
    .flatMap(row => {
      const lines = row.lines.filter(line => ['inspect', 'hazard'].includes(line.indicator_id))
      const involved = lines.filter(line => line.involved)
      const maximum = involved.reduce((sum, line) => sum + line.cap, 0)
      const deduct = involved.reduce((sum, line) => sum + line.deduct, 0)
      if (!maximum) return []
      const score = Math.round((maximum - deduct) * 10) / 10
      return [{
        id: row.project_id, name: row.project_name, type: row.assessment_type_name, score, maximum,
        rate: score / maximum, points: assessmentPoints(score, maximum), lines,
      }]
    }).sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name, 'zh-CN'))
}
