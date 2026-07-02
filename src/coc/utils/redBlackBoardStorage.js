import { PROJECT_RED_BLACK_LIST } from '../mock/data.js'

const STORAGE_KEY = 'coc-admin-red-black-board'
const SEED_FLAG = 'coc-admin-red-black-board-v2'
const PERIOD_MIGRATION_FLAG = 'coc-admin-red-black-board-period-v1'
const RED_FOURTH_ITEM_FLAG = 'coc-admin-red-black-board-red4-v1'
const CHANGE_EVENT = 'coc-red-black-board-change'

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
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

function createId() {
  return `rb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** 将 YYYY-MM / YYYY-N 统一为 YYYY-N（期数序号） */
export function normalizePeriodKey(value) {
  if (!value) return ''
  const text = String(value).trim()
  const monthMatch = text.match(/^(\d{4})-(\d{2})$/)
  if (monthMatch) {
    return `${monthMatch[1]}-${parseInt(monthMatch[2], 10)}`
  }
  const periodMatch = text.match(/^(\d{4})-(\d{1,2})$/)
  if (periodMatch) {
    return `${periodMatch[1]}-${parseInt(periodMatch[2], 10)}`
  }
  return text
}

export function buildRedBlackPeriodKey(year, periodNo) {
  return `${year}-${Number(periodNo)}`
}

export function getCurrentRedBlackPeriodKey(date = new Date()) {
  return buildRedBlackPeriodKey(date.getFullYear(), date.getMonth() + 1)
}

export function parseRedBlackPeriod(periodKey) {
  const normalized = normalizePeriodKey(periodKey)
  const match = normalized.match(/^(\d{4})-(\d+)$/)
  if (!match) return { year: '', periodNo: 0, key: normalized }
  return {
    year: match[1],
    periodNo: parseInt(match[2], 10),
    key: normalized,
  }
}

export function formatRedBlackPeriod(periodKey) {
  const { year, periodNo, key } = parseRedBlackPeriod(periodKey)
  if (!year || !periodNo) return periodKey || '—'
  return `${year}年第${periodNo}期`
}

/** @deprecated 兼容旧调用 */
export function formatRedBlackMonth(periodKey) {
  return formatRedBlackPeriod(periodKey)
}

export function buildPlaceholderImage(hue = 145, label = '现场图') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue}, 30%, 82%)"/>
        <stop offset="100%" stop-color="hsl(${hue + 15}, 35%, 72%)"/>
      </linearGradient>
    </defs>
    <rect width="320" height="240" fill="url(#g)"/>
    <text x="160" y="128" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="18" font-family="sans-serif">${label}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function normalizeRecord(record) {
  const hue = Number.isFinite(record.imageHue) ? record.imageHue : 145
  return {
    id: record.id || createId(),
    period: normalizePeriodKey(record.period || record.month || ''),
    boardType: record.boardType === 'black' ? 'black' : 'red',
    shortName: record.shortName || '',
    fullName: record.fullName || '',
    description: record.description || '',
    image: record.image || buildPlaceholderImage(hue, record.boardType === 'black' ? '黑榜' : '红榜'),
    imageHue: hue,
    sortOrder: Number.isFinite(record.sortOrder) ? record.sortOrder : 0,
    sourcePenaltyId: record.sourcePenaltyId || '',
    updatedAt: record.updatedAt || new Date().toLocaleString('zh-CN', { hour12: false }),
  }
}

function comparePeriodKeys(a, b) {
  const pa = parseRedBlackPeriod(a)
  const pb = parseRedBlackPeriod(b)
  if (pa.year !== pb.year) return Number(pb.year) - Number(pa.year)
  return pb.periodNo - pa.periodNo
}

function buildSeedRecords() {
  const records = []
  const seedPeriod = '2026-6'
  const prevPeriod = '2026-5'

  PROJECT_RED_BLACK_LIST.red.forEach((item, index) => {
    records.push(
      normalizeRecord({
        ...item,
        period: seedPeriod,
        boardType: 'red',
        sortOrder: index,
        image: buildPlaceholderImage(item.imageHue || 145, '红榜'),
      }),
    )
  })
  PROJECT_RED_BLACK_LIST.black.forEach((item, index) => {
    records.push(
      normalizeRecord({
        ...item,
        period: seedPeriod,
        boardType: 'black',
        sortOrder: index,
        image: buildPlaceholderImage(item.imageHue || 8, '黑榜'),
      }),
    )
  })

  records.push(
    normalizeRecord({
      id: 'rb-prev-red-1',
      period: prevPeriod,
      boardType: 'red',
      shortName: '飞行区5号通道',
      fullName: 'T2航站区及配套设施工程飞行区5、6号下穿通道工程',
      description: '混凝土养护措施规范，样板验收一次通过。',
      imageHue: 155,
      sortOrder: 0,
      image: buildPlaceholderImage(155, '红榜'),
    }),
    normalizeRecord({
      id: 'rb-prev-black-1',
      period: prevPeriod,
      boardType: 'black',
      shortName: '航站区配套',
      fullName: 'T2航站区及配套设施工程',
      description: '材料堆放占用临时通道，已督促整改。',
      imageHue: 12,
      sortOrder: 0,
      image: buildPlaceholderImage(12, '黑榜'),
    }),
  )

  return records
}

function migrateRecordsToPeriod(list) {
  return list.map((item) => normalizeRecord(item))
}

function ensureRedFourthItem() {
  if (localStorage.getItem(RED_FOURTH_ITEM_FLAG)) return
  const seedItem = PROJECT_RED_BLACK_LIST.red.find((item) => item.id === 'red-4')
  if (!seedItem) {
    localStorage.setItem(RED_FOURTH_ITEM_FLAG, '1')
    return
  }
  const list = readList().map((item) => normalizeRecord(item))
  if (list.some((item) => item.id === 'red-4')) {
    localStorage.setItem(RED_FOURTH_ITEM_FLAG, '1')
    return
  }
  const periods = [...new Set(list.map((item) => item.period).filter(Boolean))].sort(comparePeriodKeys)
  const period = periods[0] || '2026-6'
  list.unshift(
    normalizeRecord({
      ...seedItem,
      period,
      boardType: 'red',
      sortOrder: list.filter((item) => item.period === period && item.boardType === 'red').length,
      image: buildPlaceholderImage(seedItem.imageHue || 150, '红榜'),
    }),
  )
  writeList(list)
  localStorage.setItem(RED_FOURTH_ITEM_FLAG, '1')
}

export function ensureRedBlackBoardSeed() {
  if (!localStorage.getItem(SEED_FLAG)) {
    writeList(buildSeedRecords())
    localStorage.setItem(SEED_FLAG, '1')
  }
  if (!localStorage.getItem(PERIOD_MIGRATION_FLAG)) {
    writeList(migrateRecordsToPeriod(readList()))
    localStorage.setItem(PERIOD_MIGRATION_FLAG, '1')
  }
  ensureRedFourthItem()
}

export function getRedBlackBoardRecords() {
  ensureRedBlackBoardSeed()
  return readList()
    .map((item) => normalizeRecord(item))
    .sort((a, b) => {
      if (a.period !== b.period) return comparePeriodKeys(a.period, b.period)
      if (a.boardType !== b.boardType) return a.boardType.localeCompare(b.boardType)
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    })
}

export function getRedBlackBoardPeriods() {
  return [...new Set(getRedBlackBoardRecords().map((item) => item.period).filter(Boolean))].sort(
    comparePeriodKeys,
  )
}

/** @deprecated */
export function getRedBlackBoardMonths() {
  return getRedBlackBoardPeriods()
}

export function getLatestRedBlackBoardPeriod() {
  const periods = getRedBlackBoardPeriods()
  return periods[0] || ''
}

/** @deprecated */
export function getLatestRedBlackBoardMonth() {
  return getLatestRedBlackBoardPeriod()
}

export function getRedBlackBoardByPeriod(period) {
  const key = normalizePeriodKey(period)
  const rows = getRedBlackBoardRecords().filter((item) => item.period === key)
  return {
    period: key,
    red: rows.filter((item) => item.boardType === 'red'),
    black: rows.filter((item) => item.boardType === 'black'),
  }
}

/** @deprecated */
export function getRedBlackBoardByMonth(month) {
  return getRedBlackBoardByPeriod(month)
}

export function getLatestRedBlackBoard() {
  const period = getLatestRedBlackBoardPeriod()
  if (!period) return { period: '', red: [], black: [] }
  return getRedBlackBoardByPeriod(period)
}

export function saveRedBlackBoardRecord(payload) {
  ensureRedBlackBoardSeed()
  const record = normalizeRecord({
    ...payload,
    period: normalizePeriodKey(payload.period || payload.month || ''),
    updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  const list = readList().map((item) => normalizeRecord(item))
  const index = list.findIndex((item) => item.id === record.id)
  if (index >= 0) list[index] = record
  else {
    if (!Number.isFinite(record.sortOrder)) {
      const sameGroup = list.filter(
        (item) => item.period === record.period && item.boardType === record.boardType,
      )
      record.sortOrder = sameGroup.length
    }
    list.unshift(record)
  }
  writeList(list)
  return record
}

export function removeRedBlackBoardRecord(id) {
  writeList(readList().filter((item) => item.id !== id))
}

export function importPenaltyToBlackBoard(penalty, period) {
  const reason = penalty.penaltyReason || penalty.title || ''
  const contentText = penalty.penaltyContent || penalty.content?.split('\n').find((line) => line.trim()) || ''
  const description = [
    reason,
    contentText,
    penalty.amount && penalty.amount !== '—' ? `处罚金额：${penalty.amount}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return saveRedBlackBoardRecord({
    period: normalizePeriodKey(period),
    boardType: 'black',
    shortName: penalty.project || penalty.executeDept || '未知项目',
    fullName: penalty.unit ? `${penalty.project || penalty.executeDept}（${penalty.unit}）` : penalty.project || penalty.executeDept || '',
    description,
    image: penalty.snapshot || buildPlaceholderImage(8, '处罚关联'),
    imageHue: 8,
    sourcePenaltyId: penalty.id,
  })
}

export { CHANGE_EVENT as RED_BLACK_BOARD_CHANGE_EVENT }
