/**
 * COC 调度大屏 · 项目值班统计（指挥部层级）/ 项目值班（项目层级）
 *
 * 数据口径：
 * 1. 值班安排：取当日所在周的项目值班表当日排班（四个槽位）；无当周值班表时回退演示数据。
 * 2. 在场状态：按【姓名 + 手机号】查询实名制考勤流水（当日在场口径），**仅两态**：
 *    - 在场：当日已进场且未出场（有进场时间、无出场时间）
 *    - 不在场：当日已进场且已出场，或当日无进场记录（如夜班尚未到进场时间）
 *    值班人员直接取自实名制名册（原型为值班候选名册），考勤流水覆盖全部可排班人员，
 *    因此正常不存在「查不到考勤」；值班表内**手动输入人员**不核验考勤、不展示在场状态标签
 *    （`attendance.statusKey` 为空串）。
 *
 * 与 `src/mock/dutyRoster.js`（项目值班表）的口径一致：班次（白/夜）× 角色（施工/监理）四槽位、
 * 槽位中文名同为「白班 · 施工 / 白班 · 监理 / 夜班 · 施工 / 夜班 · 监理」。
 * 本模块是 COC 大屏展示用的「当日值班快照」mock；接入后端时改为读取项目值班表当日数据。
 */

import {
  ONSITE_STATUS,
  getOnSiteStatus,
} from '../../constants/laborPersonStatus.js'
import { findDutyWeek, toWeekStartMonday, isManualDutyPerson } from '../../mock/dutyRoster.js'

export const DUTY_SHIFT_DEFS = [
  { key: 'day', label: '白班', timeRange: '08:00 - 20:00' },
  { key: 'night', label: '夜班', timeRange: '20:00 - 次日 08:00' },
]

/** 槽位顺序：先班次（白/夜），再角色（施工/监理），与项目值班表一致 */
export const DUTY_SLOT_DEFS = [
  {
    key: 'constructionDay',
    shift: 'day',
    party: 'construction',
    shiftLabel: '白班',
    partyLabel: '施工',
    label: '白班 · 施工',
  },
  {
    key: 'supervisionDay',
    shift: 'day',
    party: 'supervision',
    shiftLabel: '白班',
    partyLabel: '监理',
    label: '白班 · 监理',
  },
  {
    key: 'constructionNight',
    shift: 'night',
    party: 'construction',
    shiftLabel: '夜班',
    partyLabel: '施工',
    label: '夜班 · 施工',
  },
  {
    key: 'supervisionNight',
    shift: 'night',
    party: 'supervision',
    shiftLabel: '夜班',
    partyLabel: '监理',
    label: '夜班 · 监理',
  },
]

export const PARTY_LABELS = {
  construction: '施工',
  supervision: '监理',
}

/**
 * 大屏在场状态：**仅在场 / 不在场两态**。
 * 未匹配到实名制考勤、手动输入人员一律为空串（不展示标签），核验原因见 attendance.detail。
 */
export const DUTY_ONSITE_STATUS = {
  ON_SITE: ONSITE_STATUS.ON_SITE,
  OFF_SITE: ONSITE_STATUS.OFF_SITE,
  NO_RECORD: '',
}

const CONSTRUCTION_UNIT_A = '中建八局项目部'
const CONSTRUCTION_UNIT_B = '中建一局项目部'
const SUPERVISION_UNIT_A = '上海建科工程咨询'
const SUPERVISION_UNIT_B = '合创建设工程顾问'

const CONSTRUCTION_DAY_POOL = [
  { userId: 'dd-sg-01', name: '何宏春', phone: '13800100011', position: '项目书记', unit: CONSTRUCTION_UNIT_A },
  { userId: 'dd-sg-02', name: '邹观来', phone: '13800100012', position: '土建工程师', unit: CONSTRUCTION_UNIT_A },
  { userId: 'dd-sg-03', name: '林智雄', phone: '13800100013', position: '安全工程师', unit: CONSTRUCTION_UNIT_A },
  { userId: 'dd-sg-04', name: '朱有权', phone: '13800100014', position: '技术工程师', unit: CONSTRUCTION_UNIT_A },
  { userId: 'dd-sg-05', name: '张鑫涛', phone: '13800100015', position: '商务经理', unit: CONSTRUCTION_UNIT_A },
  { userId: 'dd-sg-06', name: '薛润光', phone: '13800100016', position: '安全主管', unit: CONSTRUCTION_UNIT_B },
]

const CONSTRUCTION_NIGHT_POOL = [
  { userId: 'dd-sg-07', name: '高腾腾', phone: '13800100017', position: '质量总监', unit: CONSTRUCTION_UNIT_A },
  { userId: 'dd-sg-08', name: '许金福', phone: '13800100018', position: '项目总工', unit: CONSTRUCTION_UNIT_A },
  { userId: 'dd-sg-09', name: '常亮', phone: '13800100019', position: '生产经理', unit: CONSTRUCTION_UNIT_B },
  { userId: 'dd-sg-10', name: '田佳乐', phone: '13800100020', position: '安全总监', unit: CONSTRUCTION_UNIT_B },
  { userId: 'dd-sg-11', name: '刘振宇', phone: '13800100021', position: '施工员', unit: CONSTRUCTION_UNIT_A },
  { userId: 'dd-sg-12', name: '陈嘉豪', phone: '13800100022', position: '测量员', unit: CONSTRUCTION_UNIT_B },
]

const SUPERVISION_DAY_POOL = [
  { userId: 'dd-jl-01', name: '何鹏飞', phone: '13900100031', position: '标段负责人', unit: SUPERVISION_UNIT_A },
  { userId: 'dd-jl-02', name: '郭勇', phone: '13900100032', position: '监理工程师', unit: SUPERVISION_UNIT_A },
  { userId: 'dd-jl-03', name: '郑永明', phone: '13900100033', position: '监理工程师', unit: SUPERVISION_UNIT_A },
  { userId: 'dd-jl-04', name: '刘闯', phone: '13900100034', position: '安全总监', unit: SUPERVISION_UNIT_A },
  { userId: 'dd-jl-05', name: '谢满元', phone: '13900100035', position: '监理工程师', unit: SUPERVISION_UNIT_A },
]

const SUPERVISION_NIGHT_POOL = [
  { userId: 'dd-jl-06', name: '程子龙', phone: '13900100036', position: '总监', unit: SUPERVISION_UNIT_B },
  { userId: 'dd-jl-07', name: '刘家红', phone: '13900100037', position: '安全专监', unit: SUPERVISION_UNIT_B },
  { userId: 'dd-jl-08', name: '谭明伟', phone: '13900100038', position: '监理专监', unit: SUPERVISION_UNIT_A },
  { userId: 'dd-jl-09', name: '朱博', phone: '13900100039', position: '监理专监', unit: SUPERVISION_UNIT_A },
  { userId: 'dd-jl-10', name: '徐立新', phone: '13900100040', position: '监理员', unit: SUPERVISION_UNIT_B },
]

/** 各「班次 × 角色」人员池 */
const POOL_BY_SLOT_KEY = {
  constructionDay: CONSTRUCTION_DAY_POOL,
  constructionNight: CONSTRUCTION_NIGHT_POOL,
  supervisionDay: SUPERVISION_DAY_POOL,
  supervisionNight: SUPERVISION_NIGHT_POOL,
}

const SLOT_META_BY_KEY = Object.fromEntries(DUTY_SLOT_DEFS.map((d) => [d.key, d]))

/* ------------------------------------------------------------------ *
 * 实名制考勤流水（演示）
 * 结构：{ date, name, phone, clockIn, clockOut, gate }
 * 查询键：姓名 + 手机号（+ 日期）
 * ------------------------------------------------------------------ */

function pad(n) {
  return String(n).padStart(2, '0')
}

export function formatDateYmd(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayYmd() {
  return formatDateYmd(new Date())
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayLabelOf(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return WEEKDAY_LABELS[d.getDay()]
}

/** 将任意日期归一到当周周一 */
export function weekStartOf(date) {
  const d = date instanceof Date ? new Date(date) : new Date(String(date).slice(0, 10))
  if (Number.isNaN(d.getTime())) return ''
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return formatDateYmd(d)
}

function hashStr(input) {
  const s = String(input || '')
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function maskPhone(phone) {
  const p = String(phone || '')
  if (p.length < 7) return p || '--'
  return `${p.slice(0, 3)}****${p.slice(-4)}`
}

export { maskPhone }

/**
 * 生成某「班次 × 角色」池的当日在场考勤流水（全部有记录，不设「无记录」分支）。
 * 白班：已进场（个别已出场）；夜班：尚未到进场时间。
 */
function buildLedgerForPool(pool, shift, date) {
  return pool.map((person, idx) => {
    const seed = hashStr(`${person.userId}-${date}`)
    if (shift === 'day') {
      const clockIn = `${pad(7)}:${pad(30 + (seed % 25))}`
      const leaveEarly = seed % 4 === 1
      return {
        date,
        name: person.name,
        phone: person.phone,
        clockIn,
        clockOut: leaveEarly ? `${pad(16 + (idx % 2))}:${pad(20 + (seed % 30))}` : '',
        gate: ['1号门', '2号门', '东门闸机', '西门闸机'][seed % 4],
      }
    }
    return {
      date,
      name: person.name,
      phone: person.phone,
      clockIn: '',
      clockOut: '',
      gate: '',
      remark: '夜班尚未到进场时间',
    }
  })
}

const LEDGER_CACHE = new Map()

/** 值班表候选人（各项目共用）：用于把考勤流水覆盖到全部可排班人员 */
let DUTY_ROSTER_CANDIDATES = null

function dutyRosterCandidates() {
  if (DUTY_ROSTER_CANDIDATES) return DUTY_ROSTER_CANDIDATES
  const seen = new Set()
  const out = []
  for (const pool of [CONSTRUCTION_DAY_POOL, CONSTRUCTION_NIGHT_POOL, SUPERVISION_DAY_POOL, SUPERVISION_NIGHT_POOL]) {
    for (const person of pool) {
      const key = `${person.name}|${person.phone}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(person)
    }
  }
  DUTY_ROSTER_CANDIDATES = out
  return out
}

/** 当日实名制考勤流水（按 姓名 + 手机号 可查） */
export function getRealNameAttendanceLedger(date = todayYmd()) {
  const key = String(date).slice(0, 10)
  if (LEDGER_CACHE.has(key)) return LEDGER_CACHE.get(key)
  const ledger = [
    ...buildLedgerForPool(CONSTRUCTION_DAY_POOL, 'day', key),
    ...buildLedgerForPool(SUPERVISION_DAY_POOL, 'day', key),
    ...buildLedgerForPool(CONSTRUCTION_NIGHT_POOL, 'night', key),
    ...buildLedgerForPool(SUPERVISION_NIGHT_POOL, 'night', key),
    // 值班表候选人（只补未覆盖到的人）：保证「值班人员 → 在场状态」必定可查，不出现无记录
    ...buildLedgerForPool(dutyRosterCandidates(), 'day', key),
  ].filter(Boolean)
  LEDGER_CACHE.set(key, ledger)
  return ledger
}

/**
 * 按【姓名 + 手机号】查询实名制考勤，返回在场状态
 * 仅在场 / 不在场两态；未匹配到考勤返回空 status/statusKey（大屏不展示标签）
 * @returns {{ matched: boolean, status: string, statusKey: 'onSite'|'offSite'|'',
 *   clockIn: string, clockOut: string, gate: string, detail: string }}
 */
export function queryRealNameAttendance({ name, phone, date = todayYmd() } = {}) {
  const n = String(name || '').trim()
  const p = String(phone || '').trim()
  if (!n || !p) {
    return {
      matched: false,
      status: DUTY_ONSITE_STATUS.NO_RECORD,
      statusKey: '',
      clockIn: '',
      clockOut: '',
      gate: '',
      detail: n || p ? '缺少姓名或手机号，无法核验' : '未提供核验信息',
    }
  }
  const ledger = getRealNameAttendanceLedger(date)
  // 匹配口径：姓名 + 手机号 完全一致（值班人员取自实名制名册，正常必能查到）
  const hit = ledger.find((row) => row.name === n && row.phone === p)
  if (!hit) {
    return {
      matched: false,
      status: DUTY_ONSITE_STATUS.NO_RECORD,
      statusKey: '',
      clockIn: '',
      clockOut: '',
      gate: '',
      detail: `实名制考勤未匹配到「${n} · ${maskPhone(p)}」`,
    }
  }
  // 在场口径复用劳务实名制判定：已进场且未出场 = 在场
  if (getOnSiteStatus(hit.clockIn, hit.clockOut) === ONSITE_STATUS.ON_SITE) {
    return {
      matched: true,
      status: ONSITE_STATUS.ON_SITE,
      statusKey: 'onSite',
      clockIn: hit.clockIn,
      clockOut: '',
      gate: hit.gate,
      detail: `${hit.clockIn} 进场 · ${hit.gate || '闸机'}`,
    }
  }
  if (hit.clockIn && hit.clockOut) {
    return {
      matched: true,
      status: ONSITE_STATUS.OFF_SITE,
      statusKey: 'offSite',
      clockIn: hit.clockIn,
      clockOut: hit.clockOut,
      gate: hit.gate,
      detail: `${hit.clockIn} 进场 · ${hit.clockOut} 出场`,
    }
  }
  return {
    matched: true,
    status: ONSITE_STATUS.OFF_SITE,
    statusKey: 'offSite',
    clockIn: '',
    clockOut: '',
    gate: '',
    detail: hit.remark || '当日无进场记录',
  }
}

/* ------------------------------------------------------------------ *
 * 值班安排（演示：按项目稳定生成）
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * 值班安排：数据源 = 项目「每周值班表」当日排班
 * ------------------------------------------------------------------ */

/** 项目未排班判定（仅用于无值班表时的演示回退） */
export function isProjectDutyScheduled(projectId) {
  return hashStr(`${projectId}-duty-week`) % 5 !== 0
}

/**
 * 取项目某日值班表当日排班（四个槽位）。
 * 仅认「当天所在周 ±6 天」范围：只补录历史周 / 只新增未来周时，不影响当日大屏展示。
 * @returns {null | { weekStart: string, day: object }}
 */
export function buildDutyDayFromRoster(projectId, date) {
  const dayKey = String(date).slice(0, 10)
  if (!dayKey) return null
  // 只在「当天 ±7 天」内认排班：只补录历史周 / 只新增未来周时，不影响当日大屏
  const dayMs = Date.parse(dayKey)
  const todayMs = Date.parse(todayYmd())
  if (!Number.isFinite(dayMs) || !Number.isFinite(todayMs)) return null
  if (Math.abs(dayMs - todayMs) > 7 * 86400000) return null
  const week = projectId ? findDutyWeek(projectId, toWeekStartMonday(dayKey)) : null
  if (!week) return null
  const day = (week.days || []).find((d) => String(d.date).slice(0, 10) === dayKey)
  if (!day) return null
  return { weekStart: week.weekStart, day }
}

/**
 * 值班表人员 → 大屏值班人员。
 * - 实名制人员：带手机号，按实名制考勤核验在场状态
 * - 手动输入人员：非实名制人员，不核验考勤（大屏不展示在场状态标签），保留手机号占位
 */
function enrichRosterDutyPerson(person, slotKey, date) {
  const meta = SLOT_META_BY_KEY[slotKey]
  const manual = isManualDutyPerson(person)
  return {
    userId: person.userId,
    name: person.name || '',
    position: person.position || '',
    unit: person.org || '',
    phone: person.phone || '',
    source: person.source || 'realname',
    manual,
    party: meta.party,
    partyLabel: meta.partyLabel,
    shift: meta.shift,
    shiftLabel: meta.shiftLabel,
    slotKey,
    partyKey: `duty-party--${meta.party}`,
    phoneMasked: person.phone ? maskPhone(person.phone) : '',
    attendance: manual
      ? { manual: true, statusKey: '', status: '', detail: '手动输入人员，不核验实名制考勤' }
      : queryRealNameAttendance({ name: person.name, phone: person.phone, date }),
  }
}

function pickFromPool(pool, projectId, count, salt) {
  if (!pool.length || count <= 0) return []
  const offset = hashStr(`${projectId}-${salt}`) % pool.length
  const size = Math.min(count, pool.length)
  return Array.from({ length: size }, (_, i) => pool[(offset + i) % pool.length])
}

function slotQuota(projectId, slotKey) {
  const h = hashStr(`${projectId}-${slotKey}`)
  switch (slotKey) {
    case 'constructionDay':
      return 2 + (h % 3) // 2 ~ 4
    case 'constructionNight':
      return 1 + (h % 2) // 1 ~ 2
    case 'supervisionDay':
      return 1 + (h % 2) // 1 ~ 2
    case 'supervisionNight':
      return 1 + ((h >> 3) % 2) // 1 ~ 2
    default:
      return 1
  }
}

/** 已排班项目的个别槽位（如夜班监理）可能未排班（仅用于演示回退） */
function isSlotEmpty(projectId, slotKey) {
  const h = hashStr(`${projectId}-empty-${slotKey}`)
  if (slotKey === 'supervisionNight') return h % 7 === 0
  if (slotKey === 'constructionNight') return h % 11 === 0
  return false
}

/** 演示回退人员（无该周值班表时使用） */
function enrichDutyPerson(person, slotKey, date) {
  const meta = SLOT_META_BY_KEY[slotKey]
  return {
    ...person,
    source: 'demo',
    manual: false,
    party: meta.party,
    partyLabel: meta.partyLabel,
    shift: meta.shift,
    shiftLabel: meta.shiftLabel,
    slotKey,
    partyKey: `duty-party--${meta.party}`,
    phoneMasked: maskPhone(person.phone),
    attendance: queryRealNameAttendance({ name: person.name, phone: person.phone, date }),
  }
}

/**
 * 某项目今日值班（含在场核验）
 * 数据源优先取「每周值班表」当日排班；无该周值班表时回退到演示数据。
 * @returns {{ projectId, projectName, date, weekdayLabel, weekStart, scheduled: boolean,
 *   fromRoster: boolean, slots: Record<string, Array>, counts: Record<string, number>, personTotal: number }}
 */
export function buildProjectDutyToday(project, { date = todayYmd() } = {}) {
  const projectId = project?.id || ''
  const projectName = project?.shortName || project?.name || ''
  const rosterDay = buildDutyDayFromRoster(projectId, date)
  const slots = {}
  const counts = {}

  for (const def of DUTY_SLOT_DEFS) {
    const rosterPeople = rosterDay ? rosterDay.day[def.key] || [] : []
    if (rosterDay) {
      // 有值班表：以值班表为准，空槽位即「未排班」，不再用演示数据填充
      slots[def.key] = rosterPeople.map((p) => enrichRosterDutyPerson(p, def.key, date))
      counts[def.key] = slots[def.key].length
      continue
    }
    const scheduled = isProjectDutyScheduled(projectId)
    if (!scheduled || isSlotEmpty(projectId, def.key)) {
      slots[def.key] = []
      counts[def.key] = 0
      continue
    }
    const pool = POOL_BY_SLOT_KEY[def.key] || []
    const people = pickFromPool(pool, projectId, slotQuota(projectId, def.key), def.key)
    slots[def.key] = people.map((p) => enrichDutyPerson(p, def.key, date))
    counts[def.key] = slots[def.key].length
  }

  const personTotal = DUTY_SLOT_DEFS.reduce((sum, def) => sum + (slots[def.key]?.length || 0), 0)

  return {
    projectId,
    projectName,
    date: String(date).slice(0, 10),
    weekdayLabel: weekdayLabelOf(date),
    weekStart: toWeekStartMonday(String(date).slice(0, 10)),
    scheduled: personTotal > 0,
    fromRoster: Boolean(rosterDay),
    slots,
    counts,
    personTotal,
    dayPeople: [...(slots.constructionDay || []), ...(slots.supervisionDay || [])],
    nightPeople: [...(slots.constructionNight || []), ...(slots.supervisionNight || [])],
  }
}

/** 指挥部 · 在建项目值班人员列表（每行一个在建项目，4 个槽位人数或未排班） */
export function buildHqDutyRows(projects = [], { date = todayYmd() } = {}) {
  return projects
    .filter((p) => p.status === '在建')
    .map((p) => {
      const duty = buildProjectDutyToday(p, { date })
      return {
        projectId: p.id,
        projectName: p.shortName || p.name,
        fullName: p.name,
        scheduled: duty.scheduled,
        counts: duty.counts,
        personTotal: duty.personTotal,
      }
    })
}

/** 指挥部 · 项目值班统计（左侧 4 项指标） */
export function buildHqDutyStats(projects = [], { date = todayYmd() } = {}) {
  const rows = buildHqDutyRows(projects, { date })
  const scheduled = rows.filter((r) => r.scheduled).length
  return {
    total: projects.length,
    building: rows.length,
    scheduled,
    unscheduled: rows.length - scheduled,
    personTotal: rows.reduce((sum, r) => sum + r.personTotal, 0),
  }
}
