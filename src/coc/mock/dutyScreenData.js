/**
 * COC 调度大屏 · 项目值班统计（指挥部层级）/ 项目值班（项目层级）
 *
 * 数据口径：
 * 1. 值班安排：项目值班表按「周 + 日期 + 白班/夜班 + 施工/监理」排班，本模块取“今日”值班人员；
 *    演示数据按项目 ID 稳定生成，其中约 1/5 在建项目未排班，部分项目个别槽位未排班。
 * 2. 在场状态：按【姓名 + 手机号】查询实名制考勤流水（当日在场口径），派生：
 *    - 在场：当日已进场且未出场（有进场时间、无出场时间）
 *    - 不在场（已出场）：当日已进场且已出场
 *    - 不在场（未进场）：当日无进场记录（夜班尚未到进场时间）
 *    - 未查询到考勤：实名制考勤流水中未匹配到该「姓名 + 手机号」
 *
 * 与 `src/mock/dutyRoster.js`（项目值班表）的口径一致：班次（白/夜）× 角色（施工/监理）四槽位、
 * 槽位中文名同为「白班 · 施工 / 白班 · 监理 / 夜班 · 施工 / 夜班 · 监理」。
 * 本模块是 COC 大屏展示用的「当日值班快照」mock；接入后端时改为读取项目值班表当日数据。
 */

import {
  ONSITE_STATUS,
  getOnSiteStatus,
} from '../../constants/laborPersonStatus.js'

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

/** 实名制考勤状态（在场口径与劳务实名制一致，见 constants/laborPersonStatus.js） */
export const DUTY_ONSITE_STATUS = {
  ON_SITE: ONSITE_STATUS.ON_SITE,
  OFF_SITE: ONSITE_STATUS.OFF_SITE,
  NO_RECORD: '未查询到考勤',
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
  if (p.length < 7) return p || '—'
  return `${p.slice(0, 3)}****${p.slice(-4)}`
}

export { maskPhone }

/**
 * 生成某「班次 × 角色」池的当日在场考勤流水。
 * 白班：已进场（个别已出场 / 个别无记录）；夜班：尚未到进场时间（个别无记录）。
 */
function buildLedgerForPool(pool, shift, date) {
  return pool.map((person, idx) => {
    const seed = hashStr(`${person.userId}-${date}`)
    // 约 1/8 人员在实名制考勤流水中无记录 → 未查询到考勤
    if (seed % 8 === 3) return null
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

/** 当日实名制考勤流水（按 姓名 + 手机号 可查） */
export function getRealNameAttendanceLedger(date = todayYmd()) {
  const key = String(date).slice(0, 10)
  if (LEDGER_CACHE.has(key)) return LEDGER_CACHE.get(key)
  const ledger = [
    ...buildLedgerForPool(CONSTRUCTION_DAY_POOL, 'day', key),
    ...buildLedgerForPool(SUPERVISION_DAY_POOL, 'day', key),
    ...buildLedgerForPool(CONSTRUCTION_NIGHT_POOL, 'night', key),
    ...buildLedgerForPool(SUPERVISION_NIGHT_POOL, 'night', key),
  ].filter(Boolean)
  LEDGER_CACHE.set(key, ledger)
  return ledger
}

/**
 * 按【姓名 + 手机号】查询实名制考勤，返回在场状态
 * @returns {{ matched: boolean, status: string, statusKey: 'onSite'|'offSite'|'noRecord',
 *   clockIn: string, clockOut: string, gate: string, detail: string }}
 */
export function queryRealNameAttendance({ name, phone, date = todayYmd() } = {}) {
  const n = String(name || '').trim()
  const p = String(phone || '').trim()
  if (!n || !p) {
    return {
      matched: false,
      status: DUTY_ONSITE_STATUS.NO_RECORD,
      statusKey: 'noRecord',
      clockIn: '',
      clockOut: '',
      gate: '',
      detail: n || p ? '缺少姓名或手机号，无法核验' : '未提供核验信息',
    }
  }
  const ledger = getRealNameAttendanceLedger(date)
  // 匹配口径：姓名 + 手机号 完全一致
  const hit = ledger.find((row) => row.name === n && row.phone === p)
  if (!hit) {
    return {
      matched: false,
      status: DUTY_ONSITE_STATUS.NO_RECORD,
      statusKey: 'noRecord',
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

/** 项目未排班判定 */
export function isProjectDutyScheduled(projectId) {
  return hashStr(`${projectId}-duty-week`) % 5 !== 0
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

/** 已排班项目的个别槽位（如夜班监理）可能未排班 */
function isSlotEmpty(projectId, slotKey) {
  const h = hashStr(`${projectId}-empty-${slotKey}`)
  if (slotKey === 'supervisionNight') return h % 7 === 0
  if (slotKey === 'constructionNight') return h % 11 === 0
  return false
}

function enrichDutyPerson(person, slotKey, date) {
  const meta = SLOT_META_BY_KEY[slotKey]
  return {
    ...person,
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
 * @returns {{ projectId, projectName, date, weekdayLabel, weekStart, scheduled: boolean,
 *   slots: Record<string, Array>, counts: Record<string, number>, personTotal: number }}
 */
export function buildProjectDutyToday(project, { date = todayYmd() } = {}) {
  const projectId = project?.id || ''
  const projectName = project?.shortName || project?.name || ''
  const scheduled = isProjectDutyScheduled(projectId)
  const slots = {}
  const counts = {}

  for (const def of DUTY_SLOT_DEFS) {
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
    weekStart: weekStartOf(date),
    scheduled,
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
