import { findProjectIdByShortName, PROJECT_NAMES, DANGER_WORK_LIST, MAJOR_PROJECT_LIST } from '../mock/data.js'
import { findProjectById } from '../../mock/projectBasicInfo.js'
import dailyWorkSeed from '../mock/dailyWorkSeed.json'
import { DAILY_WORK_DEFAULT_LEAD_UNIT } from '../config/dailyWorkSchema.js'
import {
  classifyDailyWorkRecord,
  mapDangerCategoryToType,
  formatTimeRange,
  dangerWorkYesNoLabel,
  resolveDangerWork,
} from './dailyWorkClassifier.js'

const STORAGE_KEY = 'coc-admin-daily-work'
const SEED_VERSION_KEY = 'coc-daily-work-seed-version'
export const DAILY_WORK_CHANGE_EVENT = 'coc-daily-work-change'

function readList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeList(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent(DAILY_WORK_CHANGE_EVENT))
}

function createId() {
  return `dwe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function enrichRecord(record) {
  const cls = classifyDailyWorkRecord(record)
  return {
    ...record,
    classifyDanger: cls.danger,
    classifyMajor: cls.major,
  }
}

export function getDailyWorkRecords() {
  return readList().map(enrichRecord).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

/** 合并线下 Excel 模板种子数据（版本变更时覆盖旧 seed 记录） */
export function ensureDailyWorkSeed() {
  const seedRecords = dailyWorkSeed.records || []
  if (!seedRecords.length) return 0

  const seedVersion = dailyWorkSeed.meta?.version || dailyWorkSeed.meta?.generatedAt || '1'
  const storedVersion = localStorage.getItem(SEED_VERSION_KEY)
  let list = readList()

  if (storedVersion !== seedVersion) {
    list = list.filter((item) => item.source !== 'seed')
    list = [...seedRecords, ...list]
    localStorage.setItem(SEED_VERSION_KEY, seedVersion)
    writeList(list)
    return seedRecords.length
  }

  const existingIds = new Set(list.map((item) => item.id))
  const toAdd = seedRecords.filter((item) => item.id && !existingIds.has(item.id))
  if (!toAdd.length) return 0
  writeList([...toAdd, ...list])
  return toAdd.length
}

export function getDailyWorkSeedMeta() {
  return dailyWorkSeed.meta || null
}

export function saveDailyWorkRecord(payload) {
  const list = readList()
  const now = new Date().toISOString()
  const record = {
    ...payload,
    id: payload.id || createId(),
    createdAt: payload.createdAt || now,
    updatedAt: now,
    source: payload.source || 'manual',
  }
  const cls = classifyDailyWorkRecord(record)
  record.classifyDanger = cls.danger
  record.classifyMajor = cls.major

  const idx = list.findIndex((item) => item.id === record.id)
  if (idx >= 0) list[idx] = record
  else list.unshift(record)
  writeList(list)
  return record
}

export function saveDailyWorkRecords(records) {
  return records.map((r) => saveDailyWorkRecord({ ...r, source: r.source || 'import' }))
}

export function removeDailyWorkRecord(id) {
  writeList(readList().filter((item) => item.id !== id))
}

export function clearDailyWorkRecords() {
  writeList([])
}

export function getClassifiedRecords() {
  const all = getDailyWorkRecords()
  return {
    all,
    danger: all.filter((r) => r.classifyDanger),
    major: all.filter((r) => r.classifyMajor),
  }
}

function resolveProjectId(name) {
  if (!name) return 'p-000'
  const direct = findProjectIdByShortName(name) || findProjectIdByShortName(name.slice(0, 6))
  if (direct) return direct
  const text = String(name)
  if (text.includes('三跑道')) return 'p-015'
  if (text.includes('下穿通道') || text.includes('5/6号') || text.includes('5、6号')) return 'p-012'
  if (text.includes('捷运线')) return 'p-011'
  if (text.includes('T2航站') || text.includes('T2终端')) return 'p-000'
  if (text.includes('T1航站')) return 'p-001'
  if (text.includes('东北站坪')) return 'p-006'
  if (text.includes('软基')) return 'p-009'
  return 'p-000'
}

const MOCK_CONTRACTORS = [
  '中建三局机场建设分公司',
  '中国电建集团航空港建设有限公司',
  '中铁建工集团深圳分公司',
  '深圳市政集团有限公司',
]

function enrichDangerListItem(item, index = 0) {
  const idx = Number.parseInt(String(item.projectId || 'p-0').replace('p-', ''), 10)
  return {
    ...item,
    projectName: item.projectName || PROJECT_NAMES[idx] || '',
    contractor: item.contractor || MOCK_CONTRACTORS[index % MOCK_CONTRACTORS.length],
  }
}

function enrichMajorListItem(item) {
  const idx = Number.parseInt(String(item.projectId || 'p-0').replace('p-', ''), 10)
  return {
    ...item,
    projectName: item.projectName || PROJECT_NAMES[idx] || '',
  }
}

function mergeUniqueById(primary, secondary) {
  const seen = new Set(primary.map((item) => item.id))
  return [...primary, ...secondary.filter((item) => item.id && !seen.has(item.id))]
}

function isNightWork(start, end) {
  const text = `${start} ${end}`
  return /22:|23:|00:|01:|02:|03:|04:|05:|06:/.test(text)
}

function parseWorkDateTime(value) {
  if (!value) return null
  const text = String(value).trim().replace(/-/g, '/')
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 按作业起止时间推导：未开始 / 进行中 / 已结束 */
export function deriveDangerWorkStatus(startTime, endTime, now = new Date()) {
  const start = parseWorkDateTime(startTime)
  const end = parseWorkDateTime(endTime)
  if (start && now < start) return '未开始'
  if (end && now > end) return '已结束'
  if (start || end) return '进行中'
  return '未开始'
}

/** 转为前台危险作业清单结构 */
export function toDangerWorkListItem(record) {
  const cls = classifyDailyWorkRecord(record)
  if (!cls.danger) return null
  const type = record.dangerWorkCategory || mapDangerCategoryToType(record.dangerWorkCategory) || '危险作业'
  return {
    id: record.id,
    projectId: resolveProjectId(record.projectName),
    projectName: record.projectName,
    projectShortName: record.projectName,
    contractor: record.contractor,
    type,
    subType: record.workContent || record.dangerWorkCategory,
    date: record.reportDate,
    time: formatTimeRange(record.startTime, record.endTime),
    startTime: record.startTime,
    endTime: record.endTime,
    location: record.workArea,
    personnel: '--',
    measures: record.dangerControlMeasures,
    status: deriveDangerWorkStatus(record.startTime, record.endTime),
    isNight: isNightWork(record.startTime, record.endTime),
    isHighRisk: /动火|深基坑|有限空间/.test(String(type)),
    permitStatus: '待确认',
    reporter: record.contractorSafetyManager?.split(/[,，]/)[0] || '--',
    cameraId: 'c05',
    _fromDailyWork: true,
    detail: {
      unit: record.contractor,
      reporter: record.contractorProjectManager,
      reportTime: record.createdAt,
      measures: record.dangerControlMeasures,
      personnel: '--',
      cameraId: 'c05',
      leadUnit: record.leadUnit,
      ownerProjectManager: record.ownerProjectManager,
      ownerSafetyManager: record.ownerSafetyManager,
      contractorProjectManager: record.contractorProjectManager,
      contractorSafetyManager: record.contractorSafetyManager,
      supervisorProjectManager: record.supervisorProjectManager,
      supervisorSafetyManager: record.supervisorSafetyManager,
      checkItems: [
        { name: '方案交底', ok: false },
        { name: '监护人员', ok: false },
        { name: '警戒区域', ok: false },
        { name: '应急物资', ok: false },
      ],
    },
  }
}

/** 转为前台危大工程清单结构 */
export function toMajorProjectListItem(record) {
  const cls = classifyDailyWorkRecord(record)
  if (!cls.major) return null
  const category = record.majorProjectCategory
  return {
    id: `mp-${record.id}`,
    projectId: resolveProjectId(record.projectName),
    projectName: record.projectName,
    name: record.majorWorkContent?.split('\n')[0] || `${record.projectName}·${category}`,
    category,
    status: '施工中',
    monitorStatus: '正常',
    monitorData: '--',
    confirmStatus: '待确认',
    permitStatus: '待确认',
    scheme: `${category}专项施工方案`,
    specialScheme: `${category}监测专项方案`,
    lastCheck: record.reportDate,
    _fromDailyWork: true,
    detail: {
      workContent: record.majorWorkContent,
      controlMeasures: record.majorControlMeasures,
      ownerSafety: record.majorOwnerSafetyManager,
      contractorSafety: record.majorContractorSafetyManager,
    },
  }
}

export function getDerivedDangerWorkList(projectId, reportDate) {
  ensureDailyWorkSeed()
  const fromDaily = getDailyWorkRecords()
    .map(toDangerWorkListItem)
    .filter(Boolean)
    .filter((item) => {
      if (projectId && item.projectId !== projectId) return false
      if (reportDate && item.date !== reportDate) return false
      return true
    })
  if (fromDaily.length) return fromDaily

  const mock = DANGER_WORK_LIST
    .map((item, i) => enrichDangerListItem(item, i))
    .filter((item) => {
      if (projectId && item.projectId !== projectId) return false
      return true
    })
    .map((item) => ({
      ...item,
      type: item.type?.includes('作业') ? item.type : `${item.type || '危险'}作业`,
      status: deriveDangerWorkStatus(
        `${item.date} ${String(item.time || '08:00').split('-')[0] || '08:00'}`,
        `${item.date} ${String(item.time || '18:00').split('-')[1] || '18:00'}`,
      ),
    }))
  return mock
}

export function getDispatchDangerWorkToday(projectId) {
  ensureDailyWorkSeed()
  const calendarToday = formatCalendarDate(new Date())
  const dates = getDailyWorkRecords()
    .map((r) => r.reportDate)
    .filter(Boolean)
    .sort()
  const latestReportDate = dates.length ? dates[dates.length - 1] : null
  const hasCalendarToday = dates.includes(calendarToday)
  const reportDate = hasCalendarToday ? calendarToday : latestReportDate
  const list = getDerivedDangerWorkList(projectId, reportDate)
  return {
    list,
    reportDate,
    calendarToday,
    usingFallbackDate: Boolean(reportDate && reportDate !== calendarToday),
  }
}

function formatCalendarDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** @deprecated 兼容旧调用：仅返回列表 */
export function getDispatchDangerWorkTodayList(projectId) {
  return getDispatchDangerWorkToday(projectId).list
}

/* ---------- COC 项目调度 · 今日危大工程（当日 00:00–23:59） ---------- */

/** 作业时段是否与指定自然日（00:00–23:59）有交集；跨日作业按「当日仍在施工」计入 */
export function overlapsWorkDay(startTime, endTime, day) {
  const key = String(day || '').trim()
  if (!key) return false
  const dayStart = parseWorkDateTime(`${key} 00:00`)
  const dayEnd = parseWorkDateTime(`${key} 23:59`)
  if (!dayStart || !dayEnd) return false
  const start = parseWorkDateTime(startTime)
  const end = parseWorkDateTime(endTime)
  if (!start && !end) return false
  const from = start || end
  const to = end || start
  return from <= dayEnd && to >= dayStart
}

/** 危大段记录 → COC 项目调度·危大工程清单行（施工单位默认取项目施工总承包单位名称，取不到再用记录值） */
export function toDispatchMajorWorkItem(record, contractorDefault = '') {
  if (!hasMajorWorkSegment(record)) return null
  const startTime = String(record.majorStartTime || '').trim()
  const endTime = String(record.majorEndTime || '').trim()
  return {
    id: `mp-${record.id}`,
    recordId: record.id,
    projectId: record.projectId || resolveProjectId(record.projectName),
    projectName: record.projectName || '',
    contractor: String(contractorDefault || '').trim() || String(record.contractor || '').trim(),
    category: String(record.majorProjectCategory || '').trim(),
    workContent: String(record.majorWorkContent || '').trim(),
    date: deriveReportDateFromMajorStart(startTime) || record.reportDate || '',
    startTime,
    endTime,
    time: formatTimeRange(startTime, endTime),
    status: deriveDangerWorkStatus(startTime, endTime),
    leadUnit: record.leadUnit || '',
    ownerSafety: record.majorOwnerSafetyManager || '',
    contractorSafety: record.majorContractorSafetyManager || '',
    supervisorSafety: record.majorSupervisorSafetyManager || '',
    measures: record.majorControlMeasures || '',
    source: record.source || 'manual',
    updatedAt: record.updatedAt || record.createdAt || '',
  }
}

/**
 * 项目当日危大工程数据（作业时段落在当日 00:00–23:59，含跨日仍在施工的作业）。
 * 系统当日无数据时回落到最近一次危大填报日，并标记 usingFallbackDate（与危险作业清单口径一致）。
 */
export function getDispatchMajorWorkToday(projectId) {
  ensureDailyWorkSeed()
  const calendarToday = formatCalendarDate(new Date())
  const contractorDefault = String(findProjectById(projectId || '')?.contractorUnit || '').trim()
  const all = getDailyWorkRecords()
    .map((record) => toDispatchMajorWorkItem(record, contractorDefault))
    .filter(Boolean)
    .filter((item) => !projectId || item.projectId === projectId)

  const todayList = all.filter((item) => overlapsWorkDay(item.startTime, item.endTime, calendarToday))
  if (todayList.length) {
    return { list: todayList, reportDate: calendarToday, calendarToday, usingFallbackDate: false }
  }

  const dates = [...new Set(all.map((item) => item.date).filter(Boolean))].sort()
  const latest = dates.length ? dates[dates.length - 1] : ''
  const fallbackList = latest
    ? all.filter((item) => overlapsWorkDay(item.startTime, item.endTime, latest))
    : []
  return {
    list: fallbackList,
    reportDate: latest,
    calendarToday,
    usingFallbackDate: Boolean(latest && latest !== calendarToday),
  }
}

export function getDerivedMajorProjectList() {
  const fromDaily = getDailyWorkRecords().map(toMajorProjectListItem).filter(Boolean)
  const mock = MAJOR_PROJECT_LIST.map(enrichMajorListItem)
  return mergeUniqueById(fromDaily, mock)
}

export { dangerWorkYesNoLabel, resolveDangerWork, classifyDailyWorkRecord }

/* ---------- 危大工程信息登记（S1 同源：与每日施工作业共用记录，仅维护危大段） ---------- */

const MAJOR_SEGMENT_KEYS = [
  'majorWorkContent',
  'majorProjectCategory',
  'majorStartTime',
  'majorEndTime',
  'majorOwnerSafetyManager',
  'majorContractorSafetyManager',
  'majorSupervisorSafetyManager',
  'majorControlMeasures',
]

/** 危大工程段是否有内容 */
export function hasMajorWorkSegment(record) {
  if (!record) return false
  return MAJOR_SEGMENT_KEYS.some((key) => String(record[key] ?? '').trim())
}

/** 施工日期由作业开始时间派生（YYYY-MM-DD） */
export function deriveReportDateFromMajorStart(majorStartTime) {
  const text = String(majorStartTime || '').trim().replace(/\//g, '-')
  const m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!m) return ''
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
}

function normalizeProjectName(value) {
  return String(value || '').replace(/\s+/g, '').trim()
}

/** 项目名是否匹配（记录里存全称、页面按项目简称筛选，双向包含兜底） */
export function matchMajorWorkProject(recordProjectName, projectName) {
  if (!projectName) return true
  const a = normalizeProjectName(recordProjectName)
  const b = normalizeProjectName(projectName)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function toMajorWorkRegisterItem(record) {
  const cls = classifyDailyWorkRecord(record)
  const overview = deriveDangerWorkStatus(record.majorStartTime, record.majorEndTime)
  return {
    id: record.id,
    recordId: record.id,
    projectId: record.projectId || '',
    reportDate: deriveReportDateFromMajorStart(record.majorStartTime) || record.reportDate || '',
    leadUnit: record.leadUnit || DAILY_WORK_DEFAULT_LEAD_UNIT,
    projectName: record.projectName || '',
    contractor: record.contractor || '',
    workContent: record.majorWorkContent || '',
    category: record.majorProjectCategory || '',
    startTime: record.majorStartTime || '',
    endTime: record.majorEndTime || '',
    status: overview,
    ownerSafety: record.majorOwnerSafetyManager || '',
    contractorSafety: record.majorContractorSafetyManager || '',
    supervisorSafety: record.majorSupervisorSafetyManager || '',
    measures: record.majorControlMeasures || '',
    source: record.source || 'manual',
    hasDangerPart: cls.danger,
    updatedAt: record.updatedAt || record.createdAt || '',
  }
}

/**
 * 查询危大工程登记记录（仅含危大段数据的记录）
 * @param {{ projectId?: string, projectName?: string, dateStart?: string, dateEnd?: string }} filters
 */
export function getMajorWorkRegisterRecords(filters = {}) {
  ensureDailyWorkSeed()
  const { projectId = '', projectName = '', dateStart = '', dateEnd = '' } = filters
  return getDailyWorkRecords()
    .filter((record) => hasMajorWorkSegment(record))
    .map(toMajorWorkRegisterItem)
    .filter((item) => {
      if (projectId && item.projectId !== projectId) return false
      return matchMajorWorkProject(item.projectName, projectName)
    })
    .filter((item) => {
      if (dateStart && item.reportDate && item.reportDate < dateStart) return false
      if (dateEnd && item.reportDate && item.reportDate > dateEnd) return false
      return true
    })
    .sort((a, b) => String(b.startTime || b.reportDate || '').localeCompare(String(a.startTime || a.reportDate || '')))
}

/**
 * 保存危大工程登记记录（新增 / 编辑）
 * 编辑时仅覆盖危大段与共享字段，保留同一记录上的危险作业段数据。
 * 不做重复校验：同一「施工项目 + 危大工程作业类别 + 作业开始时间」允许多条（手工新增与导入口径一致）。
 * @param {object} payload 表单值（MAJOR_WORK_REGISTER_FIELDS 的 key）+ 可选 id/source
 * @returns {{ ok: boolean, record?: object, code?: string, msg?: string }}
 */
export function saveMajorWorkRegisterRecord(payload = {}) {
  const list = readList()
  const existing = payload.id ? list.find((item) => item.id === payload.id) : null
  if (payload.id && !existing) return { ok: false, msg: '记录不存在或已被删除' }

  const startTime = String(payload.majorStartTime || '').trim()
  const endTime = String(payload.majorEndTime || '').trim()
  if (!startTime || !endTime) return { ok: false, msg: '请填写作业开始时间与结束时间' }
  if (endTime <= startTime) return { ok: false, msg: '作业结束时间必须晚于开始时间' }
  const reportDate = deriveReportDateFromMajorStart(startTime)
  if (!reportDate) return { ok: false, msg: '作业开始时间格式不正确' }

  const majorValues = {}
  MAJOR_SEGMENT_KEYS.forEach((key) => {
    majorValues[key] = String(payload[key] ?? '').trim()
  })

  const record = {
    ...(existing || {}),
    ...majorValues,
    leadUnit: String(payload.leadUnit || '').trim() || DAILY_WORK_DEFAULT_LEAD_UNIT,
    projectName: String(payload.projectName || existing?.projectName || '').trim(),
    projectId: String(payload.projectId || existing?.projectId || '').trim(),
    contractor: String(payload.contractor || '').trim(),
    reportDate,
    source: existing?.source || payload.source || 'manual',
  }
  const saved = saveDailyWorkRecord(record)
  return { ok: true, record: saved }
}

/**
 * 删除危大工程登记记录
 * 若同一记录还含危险作业段数据，则只清空危大段、保留记录（避免误删危险作业）。
 * @returns {{ ok: boolean, mode: 'removed' | 'major-cleared' | 'missing' }}
 */
export function removeMajorWorkRegisterRecord(id) {
  const record = readList().find((item) => item.id === id)
  if (!record) return { ok: false, mode: 'missing' }
  const cls = classifyDailyWorkRecord(record)
  if (cls.danger) {
    const cleared = { ...record }
    MAJOR_SEGMENT_KEYS.forEach((key) => {
      cleared[key] = ''
    })
    saveDailyWorkRecord(cleared)
    return { ok: true, mode: 'major-cleared' }
  }
  removeDailyWorkRecord(id)
  return { ok: true, mode: 'removed' }
}