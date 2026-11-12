import { isDangerWorkRecord } from './dailyWorkClassifier.js'
import { MAJOR_PROJECT_FIELDS } from '../config/dailyWorkSchema.js'

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

export const DAILY_WORK_EXPORT_SHEETS = Object.freeze([
  Object.freeze({ key: 'night', name: '夜间作业', description: '当日20:00至次日07:00，包含普通作业和危险作业', startMinute: 20 * 60, endMinute: 31 * 60 }),
  Object.freeze({ key: 'danger', name: '危险作业', description: '当日00:00至24:00，仅包含危险作业', startMinute: 0, endMinute: 24 * 60 }),
  Object.freeze({ key: 'major', name: '危大工程', description: '当日00:00至24:00，与所选日期有有效重叠的危大工程登记（清单）记录', startMinute: 0, endMinute: 24 * 60 }),
])

/** 与台账共用关键词条件；夜间扩大日期范围时仍保留这些筛选。 */
export function matchesDailyWorkKeyword(record, keyword = '') {
  const text = String(keyword ?? '').trim()
  if (!text) return true
  return [record?.projectName, record?.contractor, record?.workArea, record?.dangerWorkCategory, record?.leadUnit]
    .some((value) => String(value || '').includes(text))
}

/** 页面“当天”使用浏览器本地日期，不以UTC日期替代。 */
export function localDailyWorkDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

// UTC仅用于纯日历运算，填报的墙上时间不转换时区。
function calendarDate(value) {
  const key = String(value ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { key, time: date.getTime() }
}

function workTime(value, sourceDate) {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value ?? '').trim())
  if (!match || (sourceDate && match[1] !== sourceDate.key)) return null
  const date = calendarDate(match[1])
  if (!date) return null
  const hour = Number(match[2]), minute = Number(match[3]), second = Number(match[4] || 0)
  if (hour > 23 || minute > 59 || second > 59) return null
  return date.time + (hour * 60 + minute) * MINUTE_MS + second * 1000
}

export function dailyWorkStatisticsDate(value) {
  const date = calendarDate(value)
  return date ? Number(date.key.slice(5, 7)) + '月' + Number(date.key.slice(8, 10)) + '日' : ''
}

/** 只用正时长交集判断是否纳入；返回原记录，不截取时间或改写施工日期。 */
export function buildDailyWorkExportRecords(records, options = {}) {
  const definition = DAILY_WORK_EXPORT_SHEETS.find(item => item.key === options.sheet)
  const target = calendarDate(options.reportDate)
  if (!definition || !target) return []
  const targetStart = target.time + definition.startMinute * MINUTE_MS
  const targetEnd = target.time + definition.endMinute * MINUTE_MS
  return (Array.isArray(records) ? records : []).filter(record => {
    if (options.sheet === 'major') {
      // 登记模块与每日施工共用源记录；这里读取同一危大段，不按其开始日期截断候选记录。
      if (!MAJOR_PROJECT_FIELDS.some(field => String(record?.[field.key] ?? '').trim())) return false
      if (!matchesDailyWorkKeyword({ ...record, dangerWorkCategory: record.majorProjectCategory }, options.keyword)) return false
      const start = workTime(record.majorStartTime), end = workTime(record.majorEndTime)
      return start != null && end != null && start < end && start < targetEnd && end > targetStart
    }
    if (!matchesDailyWorkKeyword(record, options.keyword)) return false
    const sourceDate = calendarDate(record?.reportDate)
    if (!sourceDate || (sourceDate.time !== target.time &&
      !(options.sheet === 'night' && sourceDate.time === target.time + DAY_MS))) return false
    if (options.sheet === 'danger' && !isDangerWorkRecord(record)) return false
    const start = workTime(record.startTime, sourceDate), end = workTime(record.endTime, sourceDate)
    return start != null && end != null && start < end && start < targetEnd && end > targetStart
  })
}

function projectNames(records) {
  return new Set(records.map(record => String(record.projectName ?? '')).filter(name => name.trim()))
}

export function dailyWorkExportStatistics(records) {
  const dangerous = records.filter(isDangerWorkRecord)
  const categories = [...new Set(dangerous.map(record => String(record.dangerWorkCategory).trim()))]
  return {
    projectCount: projectNames(records).size,
    workCount: records.length,
    dangerProjectCount: projectNames(dangerous).size,
    dangerWorkCount: dangerous.length,
    categories,
    categoryCount: categories.length,
  }
}

/** 危大工程 Sheet 按模板示例输出：只取数，不做汇总统计、不加统计行。 */
export function dailyWorkExportSummary(date, sheet, statistics) {
  const label = dailyWorkStatisticsDate(date), s = statistics
  const categories = s.categories.length ? s.categories.join('、') + '等' + s.categoryCount + '个类别' : '0个类别'
  if (sheet === 'night') {
    return label + '夜间作业计划：' + s.projectCount + '个项目共计' + s.workCount + '项作业，其中危险作业' + s.dangerProjectCount + '个项目' + s.dangerWorkCount + '项，涉及' + categories + '。（备注：数据来源为各项目所报危险作业计划，实际危险作业可能与计划有出入，需晚上指挥部研判会时与各项目部进一步确认。）'
  }
  return label + '危险作业：' + s.projectCount + '个项目共计' + s.workCount + '项危险作业，涉及' + categories + '。（备注：数据来源为各项目所报危险作业计划，实际危险作业可能有所调整。）'
}

/** 项目只作导出分组，不复制或新增任何持久化实体。 */
export function groupDailyWorkExportRecords(records) {
  const groups = new Map()
  for (const record of records) {
    const name = String(record.projectName ?? '')
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(record)
  }
  return [...groups.entries()].map(([name, rows]) => ({ name, rows }))
}

/** 按日期及所选表单生成取数、分组和标题；标题序号按实际输出顺序连续编号。 */
export function buildDailyWorkExportPlan(records, options = {}) {
  const inputDates = Array.isArray(options.dates) ? options.dates : []
  if (!inputDates.length) return { ok: false, error: '请选择至少一个导出日期', files: [] }
  if (inputDates.some(value => !calendarDate(value))) return { ok: false, error: '导出日期无效，请重新选择', files: [] }
  const dates = [...new Set(inputDates.map(value => calendarDate(value).key))].sort()
  const keys = Array.isArray(options.sheets) ? options.sheets : DAILY_WORK_EXPORT_SHEETS.map(item => item.key)
  if (keys.some(key => !DAILY_WORK_EXPORT_SHEETS.some(item => item.key === key))) return { ok: false, error: '无法识别导出表单', files: [] }
  const definitions = DAILY_WORK_EXPORT_SHEETS.filter(item => keys.includes(item.key))
  if (!definitions.length) return { ok: false, error: '请选择至少一种导出表单', files: [] }
  const files = dates.map(date => ({
    date,
    fileName: '每日施工作业_' + date + '.xlsx',
    sheets: definitions.map((definition, index) => {
      const rows = buildDailyWorkExportRecords(records, { sheet: definition.key, reportDate: date, keyword: options.keyword })
      const statistics = definition.key === 'major' ? undefined : dailyWorkExportStatistics(rows)
      const label = dailyWorkStatisticsDate(date)
      const range = definition.key === 'night' ? label + '20:00-次日07:00' : label + '00:00-24:00'
      return {
        ...definition, rows, statistics, groups: groupDailyWorkExportRecords(rows),
        title: (index + 1) + '建设工程指挥部' + label + definition.name + '计划统计表（计划施工日期：' + range + '）',
        ...(statistics ? { summary: dailyWorkExportSummary(date, definition.key, statistics) } : {}),
      }
    }),
  }))
  return {
    ok: true, dates, files, fileCount: files.length, sheetCount: files.length * definitions.length,
    fileName: files.length === 1 ? files[0].fileName : '每日施工作业_' + dates[0] + '至' + dates.at(-1) + '_' + dates.length + '天.zip',
  }
}
