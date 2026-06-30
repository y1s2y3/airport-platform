import { findProjectIdByShortName, PROJECT_NAMES, DANGER_WORK_LIST, MAJOR_PROJECT_LIST, DANGER_WORK_STATUSES } from '../mock/data.js'
import dailyWorkSeed from '../mock/dailyWorkSeed.json'
import {
  classifyDailyWorkRecord,
  mapDangerCategoryToType,
  formatTimeRange,
  bucketLabel,
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

export function getDailyWorkRecords() {
  return readList().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
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
  record.classifyBucket = cls.bucket
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

function hashPick(list, key) {
  let h = 0
  for (const c of String(key || '')) h = (h + c.charCodeAt(0)) % list.length
  return list[h]
}

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

/** 转为前台危险作业清单结构 */
export function toDangerWorkListItem(record) {
  const cls = classifyDailyWorkRecord(record)
  if (!cls.danger) return null
  const type = mapDangerCategoryToType(record.dangerWorkCategory)
  return {
    id: record.id,
    projectId: resolveProjectId(record.projectName),
    projectName: record.projectName,
    contractor: record.contractor,
    type,
    subType: record.workContent || record.dangerWorkCategory,
    date: record.reportDate,
    time: formatTimeRange(record.startTime, record.endTime),
    location: record.workArea,
    personnel: '—',
    measures: record.dangerControlMeasures,
    status: hashPick(DANGER_WORK_STATUSES, record.id),
    isNight: isNightWork(record.startTime, record.endTime),
    isHighRisk: type === '动火' || type === '深基坑' || type === '有限空间',
    permitStatus: '待确认',
    reporter: record.contractorSafetyManager?.split(/[,，]/)[0] || '—',
    cameraId: 'c05',
    _fromDailyWork: true,
    detail: {
      unit: record.contractor,
      reporter: record.contractorProjectManager,
      reportTime: record.createdAt,
      measures: record.dangerControlMeasures,
      personnel: '—',
      cameraId: 'c05',
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
    monitorData: '—',
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

export function getDerivedDangerWorkList() {
  const fromDaily = getDailyWorkRecords().map(toDangerWorkListItem).filter(Boolean)
  const mock = DANGER_WORK_LIST.map((item, i) => enrichDangerListItem(item, i))
  return mergeUniqueById(fromDaily, mock)
}

export function getDerivedMajorProjectList() {
  const fromDaily = getDailyWorkRecords().map(toMajorProjectListItem).filter(Boolean)
  const mock = MAJOR_PROJECT_LIST.map(enrichMajorListItem)
  return mergeUniqueById(fromDaily, mock)
}

export { bucketLabel, classifyDailyWorkRecord }
