/**
 * 每周值班表（项目维护 / 指挥部汇总只读）
 * 粒度：项目 + 周（周一）→ 每日先白班/夜班，再施工/监理（0～30 人）
 * 值班照片：不在新增时上传，仅对今天及更早日期补录（image 档，0～9）
 */

import { nowStr } from '../utils/datetime.js'
import { formatApproverOptionLabel } from '../utils/approverDisplay.js'
import { getProjectSelectOptions, findProjectById, getHiddenProjectIdSet } from './projectBasicInfo.js'
import { PROJECT_NAMES, PROJECT_SHORT_NAMES } from '../config/projectCatalog.js'
import { getProjectPersonnel } from './laborRealName.js'
import { REALNAME_ENTRY_STATUS } from '../constants/laborPersonStatus.js'

/** 单槽位（班次 × 角色）值班人数上限 */
export const DUTY_SLOT_PERSON_LIMIT = 30

const STORAGE_KEY = 'coc-admin-duty-roster-v1'
const SEED_FLAG = 'coc-admin-duty-roster-seed-v1'

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 槽位顺序：先班次（白/夜），再角色（施工/监理） */
export const SLOT_DEFS = [
  { key: 'constructionDay', party: 'construction', shift: 'day', shiftLabel: '白班', partyLabel: '施工', label: '白班 · 施工' },
  { key: 'supervisionDay', party: 'supervision', shift: 'day', shiftLabel: '白班', partyLabel: '监理', label: '白班 · 监理' },
  { key: 'constructionNight', party: 'construction', shift: 'night', shiftLabel: '夜班', partyLabel: '施工', label: '夜班 · 施工' },
  { key: 'supervisionNight', party: 'supervision', shift: 'night', shiftLabel: '夜班', partyLabel: '监理', label: '夜班 · 监理' },
]

export const SHIFT_GROUPS = [
  { shift: 'day', label: '白班', slots: SLOT_DEFS.filter((s) => s.shift === 'day') },
  { shift: 'night', label: '夜班', slots: SLOT_DEFS.filter((s) => s.shift === 'night') },
]

/** 同班次内的「施工 / 监理」槽位配对（互斥校验用） */
const SHIFT_PARTY_PAIRS = [
  { shift: 'day', shiftLabel: '白班', constructionKey: 'constructionDay', supervisionKey: 'supervisionDay' },
  { shift: 'night', shiftLabel: '夜班', constructionKey: 'constructionNight', supervisionKey: 'supervisionNight' },
]

/**
 * 演示用「同一人」：模拟实名制数据把同一个人同时归入施工与监理候选，
 * 用于验证「同一班次内 施工 / 监理 不可为同一人」的置灰与保存拦截。
 * ⚠️ 仅演示数据；接入后端后删除本常量，改由接口返回的真实人员承担。
 */
const SHARED_DEMO_PERSON = {
  userId: 'dr-sh-01',
  name: '周建国',
  org: '中建八局项目部',
  position: '施工员',
}

/**
 * 演示用值班人员的实名制手机号（实名制身份信息一部分）。
 * 大屏按实名制考勤流水核验在场状态时需要手机号，故演示池人员也带手机号；
 * 未登记手机号或考勤未匹配的候选人在大屏不展示在场状态标签。
 * ⚠️ 仅演示数据；接入后端后由实名制接口返回真实人员与手机号。
 */
const DEMO_PERSON_PHONES = {
  'dr-sg-01': '13800100011',
  'dr-sg-02': '13800100012',
  'dr-sg-03': '13800100013',
  'dr-sg-04': '13800100014',
  'dr-sg-05': '13800100015',
  'dr-sg-06': '13800100016',
  'dr-sg-07': '13800100017',
  'dr-sg-08': '13800100018',
  'dr-sg-09': '13800100019',
  'dr-sg-10': '13800100020',
  'dr-jl-01': '13900100031',
  'dr-jl-02': '13900100032',
  'dr-jl-03': '13900100033',
  'dr-jl-04': '13900100034',
  'dr-jl-05': '13900100035',
  'dr-jl-06': '13900100036',
  'dr-jl-07': '13900100037',
  'dr-jl-08': '13900100038',
  'dr-jl-09': '13900100039',
  'dr-sh-01': '13800100023',
}

/**
 * 人员来源：
 * - realname：来自实名制（含选拔池），在大屏按实名制考勤核验在场状态
 * - manual：值班表内手动输入的「姓名 + 岗位」，非实名制人员，大屏不展示在场状态标签
 */
export const DUTY_PERSON_SOURCE = {
  REAL_NAME: 'realname',
  MANUAL: 'manual',
}

function demoPhoneOf(userId) {
  return DEMO_PERSON_PHONES[String(userId || '')] || ''
}

let manualPersonSeq = 0

/** 手动输入人员：值班表内直接录入「姓名 + 岗位」，不关联实名制 */
export function buildManualDutyPerson(name, position) {
  const n = String(name || '').trim()
  const pos = String(position || '').trim()
  if (!n) return null
  manualPersonSeq += 1
  const userId = `dr-manual-${Date.now().toString(36)}-${manualPersonSeq}`
  return enrichPerson({
    userId,
    name: n,
    org: '',
    position: pos,
    phone: '',
    source: DUTY_PERSON_SOURCE.MANUAL,
  })
}

/** 人员来源判定：手动输入的人员不做实名制考勤核验、不展示在场状态 */
export function isManualDutyPerson(person) {
  return person?.source === DUTY_PERSON_SOURCE.MANUAL
}

/** 是否已存在的值班人员（重名 + 同岗位视为同一人） */
export function hasDutyPerson(list, name, position) {
  const n = String(name || '').trim()
  const pos = String(position || '').trim()
  if (!n) return false
  return (Array.isArray(list) ? list : []).some(
    (p) => String(p?.name || '').trim() === n && String(p?.position || '').trim() === pos,
  )
}

const CONSTRUCTION_POOL = [
  { userId: 'dr-sg-01', name: '何宏春', org: '中建八局项目部', position: '项目书记', party: 'construction' },
  { userId: 'dr-sg-02', name: '邹观来', org: '中建八局项目部', position: '土建工程师', party: 'construction' },
  { userId: 'dr-sg-03', name: '林智雄', org: '中建八局项目部', position: '安全工程师', party: 'construction' },
  { userId: 'dr-sg-04', name: '朱有权', org: '中建八局项目部', position: '技术工程师', party: 'construction' },
  { userId: 'dr-sg-05', name: '张鑫涛', org: '中建八局项目部', position: '商务经理', party: 'construction' },
  { userId: 'dr-sg-06', name: '薛润光', org: '中建八局项目部', position: '安全主管', party: 'construction' },
  { userId: 'dr-sg-07', name: '高腾腾', org: '中建八局项目部', position: '质量总监', party: 'construction' },
  { userId: 'dr-sg-08', name: '许金福', org: '中建八局项目部', position: '项目总工', party: 'construction' },
  { userId: 'dr-sg-09', name: '常亮', org: '中建八局项目部', position: '生产经理', party: 'construction' },
  { userId: 'dr-sg-10', name: '田佳乐', org: '中建一局项目部', position: '安全总监', party: 'construction' },
  { ...SHARED_DEMO_PERSON, party: 'construction' },
]

const SUPERVISION_POOL = [
  { userId: 'dr-jl-01', name: '何鹏飞', org: '上海建科工程咨询', position: '标段负责人', party: 'supervision' },
  { userId: 'dr-jl-02', name: '郭勇', org: '上海建科工程咨询', position: '监理工程师', party: 'supervision' },
  { userId: 'dr-jl-03', name: '郑永明', org: '上海建科工程咨询', position: '监理工程师', party: 'supervision' },
  { userId: 'dr-jl-04', name: '刘闯', org: '上海建科工程咨询', position: '安全总监', party: 'supervision' },
  { userId: 'dr-jl-05', name: '谢满元', org: '上海建科工程咨询', position: '监理工程师', party: 'supervision' },
  { userId: 'dr-jl-06', name: '程子龙', org: '合创建设工程顾问', position: '总监', party: 'supervision' },
  { userId: 'dr-jl-07', name: '刘家红', org: '合创建设工程顾问', position: '安全专监', party: 'supervision' },
  { userId: 'dr-jl-08', name: '谭明伟', org: '上海建科工程咨询', position: '监理专监', party: 'supervision' },
  { userId: 'dr-jl-09', name: '朱博', org: '上海建科工程咨询', position: '监理专监', party: 'supervision' },
  { ...SHARED_DEMO_PERSON, party: 'supervision' },
]

function pad(n) {
  return String(n).padStart(2, '0')
}

export function formatDateYmd(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 将任意日期归一到当周周一（本地时区） */
export function toWeekStartMonday(input) {
  const d = input instanceof Date ? new Date(input) : new Date(String(input).slice(0, 10))
  if (Number.isNaN(d.getTime())) return ''
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return formatDateYmd(d)
}

export function addDaysYmd(ymd, days) {
  const d = new Date(`${String(ymd).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + days)
  return formatDateYmd(d)
}

export function weekEndFromStart(weekStart) {
  return addDaysYmd(weekStart, 6)
}

export function formatWeekRange(weekStart) {
  const start = String(weekStart || '').slice(0, 10)
  if (!start) return '--'
  return `${start} ～ ${weekEndFromStart(start)}`
}

export function todayYmd() {
  return formatDateYmd(new Date())
}

/** 是否允许补录值班照片：今天及更早 */
export function canBackfillPhotoForDate(dateYmd) {
  const d = String(dateYmd || '').slice(0, 10)
  if (!d) return false
  return d <= todayYmd()
}

export function enrichPerson(raw) {
  if (!raw) return null
  const name = raw.name || ''
  const org = raw.org || raw.orgName || ''
  const position = raw.position || raw.post_label || raw.postLabel || ''
  const userId = raw.userId || raw.user_id || ''
  const source =
    raw.source === DUTY_PERSON_SOURCE.MANUAL || raw.manual
      ? DUTY_PERSON_SOURCE.MANUAL
      : DUTY_PERSON_SOURCE.REAL_NAME
  const phone = source === DUTY_PERSON_SOURCE.MANUAL ? '' : raw.phone || demoPhoneOf(userId) || ''
  return {
    userId,
    name,
    org,
    position,
    phone,
    source,
    party: raw.party || '',
    optionLabel: raw.optionLabel || formatApproverOptionLabel(name, org, position),
  }
}

/**
 * 槽位人员候选 = 实名制人员（当前项目，已退场人员除外）+ 演示选拔池。
 * 实名制人员带手机号，可直接按实名制考勤核验在场状态；演示池人员用于演示「考勤未匹配（不展示在场标签）」。
 */
export function listDutyPersonOptions(projectId, party) {
  if (!projectId) return []
  const pool = party === 'supervision' ? SUPERVISION_POOL : CONSTRUCTION_POOL
  const demoOptions = pool
    .map((p) => enrichPerson(p))
    .map((p) => ({ ...p, projectId }))
  const seen = new Set(demoOptions.map((p) => p.userId))
  const realNameOptions = getProjectPersonnel(projectId)
    .filter((row) => row?.entry_status !== REALNAME_ENTRY_STATUS.EXITED)
    .map((row) =>
      enrichPerson({
        userId: row.id,
        name: row.basic?.name || '',
        org: row.unit?.unit_name || '',
        position: row.unit?.work_type || '',
        phone: row.basic?.phone || '',
      }),
    )
    .filter((p) => p?.name && !seen.has(p.userId))
    .map((p) => ({ ...p, projectId }))
  return [...realNameOptions, ...demoOptions]
}

function emptyDay(dateYmd, weekdayIndex) {
  return {
    date: dateYmd,
    weekday: weekdayIndex + 1,
    weekdayLabel: WEEKDAY_LABELS[weekdayIndex] || '',
    constructionDay: [],
    constructionNight: [],
    supervisionDay: [],
    supervisionNight: [],
    dayPhotos: [],
    nightPhotos: [],
  }
}

export function buildEmptyWeekDays(weekStart) {
  const start = toWeekStartMonday(weekStart)
  if (!start) return []
  return Array.from({ length: 7 }, (_, i) => emptyDay(addDaysYmd(start, i), i))
}

export function emptyDutyWeek(projectId = '', projectName = '', weekStart = '') {
  const ws = weekStart ? toWeekStartMonday(weekStart) : toWeekStartMonday(todayYmd())
  return {
    id: '',
    projectId: projectId || '',
    projectName: projectName || '',
    weekStart: ws,
    weekEnd: weekEndFromStart(ws),
    days: buildEmptyWeekDays(ws),
    updatedAt: '',
    updatedBy: '',
  }
}

function normalizePersonList(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []
  for (const item of list) {
    const p = enrichPerson(item)
    if (!p?.userId || seen.has(p.userId)) continue
    seen.add(p.userId)
    out.push(p)
    if (out.length >= DUTY_SLOT_PERSON_LIMIT) break
  }
  return out
}

function normalizePhotos(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((f) => ({
      name: f?.name || '',
      url: f?.url || '',
      size: f?.size || 0,
      kind: f?.kind || 'image',
    }))
    .filter((f) => f.name)
    .slice(0, 9)
}

export function normalizeDutyWeek(row = {}) {
  const weekStart = toWeekStartMonday(row.weekStart || row.week_start || todayYmd())
  const template = buildEmptyWeekDays(weekStart)
  const byDate = new Map((Array.isArray(row.days) ? row.days : []).map((d) => [String(d.date || '').slice(0, 10), d]))
  const days = template.map((tpl) => {
    const src = byDate.get(tpl.date) || {}
    // 兼容旧字段 dutyPhotos → 归入白班照片
    const legacyPhotos = normalizePhotos(src.dutyPhotos)
    return {
      ...tpl,
      constructionDay: normalizePersonList(src.constructionDay),
      constructionNight: normalizePersonList(src.constructionNight),
      supervisionDay: normalizePersonList(src.supervisionDay),
      supervisionNight: normalizePersonList(src.supervisionNight),
      dayPhotos: normalizePhotos(src.dayPhotos?.length ? src.dayPhotos : legacyPhotos),
      nightPhotos: normalizePhotos(src.nightPhotos),
    }
  })
  const projectId = row.projectId || ''
  const fromBasic = projectId ? findProjectById(projectId) : null
  return {
    id: row.id || '',
    projectId,
    projectName: row.projectName || fromBasic?.shortName || fromBasic?.projectName || '',
    weekStart,
    weekEnd: weekEndFromStart(weekStart),
    days,
    updatedAt: row.updatedAt || '',
    updatedBy: row.updatedBy || '',
  }
}

function countSlotPeople(day) {
  return SLOT_DEFS.reduce((sum, def) => sum + (day?.[def.key]?.length || 0), 0)
}

export function summarizeDutyWeek(row) {
  const week = normalizeDutyWeek(row)
  let construction = 0
  let supervision = 0
  let photoDays = 0
  let dayPhotoCount = 0
  let nightPhotoCount = 0
  let filledSlots = 0
  for (const day of week.days) {
    construction += (day.constructionDay?.length || 0) + (day.constructionNight?.length || 0)
    supervision += (day.supervisionDay?.length || 0) + (day.supervisionNight?.length || 0)
    const dN = day.dayPhotos?.length || 0
    const nN = day.nightPhotos?.length || 0
    dayPhotoCount += dN
    nightPhotoCount += nN
    if (dN || nN) photoDays += 1
    for (const def of SLOT_DEFS) {
      if ((day[def.key] || []).length > 0) filledSlots += 1
    }
  }
  return {
    ...week,
    constructionCount: construction,
    supervisionCount: supervision,
    photoDayCount: photoDays,
    dayPhotoCount,
    nightPhotoCount,
    filledSlotCount: filledSlots,
    totalSlotCount: 7 * SLOT_DEFS.length,
    personTotal: construction + supervision,
  }
}

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((r) => normalizeDutyWeek(r)) : []
  } catch {
    return []
  }
}

function writeRaw(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function nextId(list) {
  const max = list.reduce((acc, row) => {
    const n = Number(String(row.id || '').replace(/\D/g, ''))
    return Number.isFinite(n) ? Math.max(acc, n) : acc
  }, 0)
  return `drw-${String(max + 1).padStart(4, '0')}`
}

function pickPeople(pool, indexes) {
  return indexes.map((i) => enrichPerson(pool[i % pool.length])).filter(Boolean)
}

/** 播种候选池：排除演示共用人员，保证种子数据本身满足「同班次施工/监理互斥」 */
function seedPool(pool) {
  return pool.filter((p) => p.userId !== SHARED_DEMO_PERSON.userId)
}

function buildSeedWeek(projectId, projectName, weekStart, variant = 0) {
  const week = emptyDutyWeek(projectId, projectName, weekStart)
  const constructionPool = seedPool(CONSTRUCTION_POOL)
  const supervisionPool = seedPool(SUPERVISION_POOL)
  week.days = week.days.map((day, idx) => {
    const cOff = (variant + idx) % constructionPool.length
    const sOff = (variant + idx * 2) % supervisionPool.length
    const canPhoto = canBackfillPhotoForDate(day.date)
    const dayPhotos =
      canPhoto && idx % 3 === 0
        ? [{ name: `白班值班-${day.date}.jpg`, url: '', size: 0, kind: 'image' }]
        : []
    const nightPhotos =
      canPhoto && idx % 3 === 1
        ? [{ name: `夜班值班-${day.date}.jpg`, url: '', size: 0, kind: 'image' }]
        : []
    return {
      ...day,
      constructionDay: pickPeople(constructionPool, [cOff, cOff + 1]),
      constructionNight: idx === 6 ? [] : pickPeople(constructionPool, [cOff + 2]),
      supervisionDay: pickPeople(supervisionPool, [sOff, sOff + 1]),
      supervisionNight: pickPeople(supervisionPool, [sOff + 2]),
      dayPhotos,
      nightPhotos,
    }
  })
  week.updatedAt = nowStr()
  week.updatedBy = '系统演示'
  return week
}

/**
 * 值班表所属项目清单：以 COC 大屏项目主键（p-000～p-0NN，取自项目名录）为准，
 * 覆盖全部在建项目 —— 大屏当日值班按 projectId 读值班表，未播种的项目会整项目「未排班」。
 * 已登记项目主数据的项目沿用其简称；其余用项目名录简称。
 */
function dutyRosterProjectList() {
  const hidden = getHiddenProjectIdSet()
  const masterOptions = getProjectSelectOptions()
  const masterById = new Map(masterOptions.map((p) => [p.id, p]))
  const out = []
  const seen = new Set()
  PROJECT_NAMES.forEach((name, i) => {
    const id = `p-${String(i).padStart(3, '0')}`
    if (hidden.has(id) || seen.has(id)) return
    seen.add(id)
    const master = masterById.get(id)
    out.push({ id, name: master?.shortName || PROJECT_SHORT_NAMES[i] || name })
  })
  // 主数据里存在但不在项目名录内的项目（如 p-pump-002 / p-east-terminal）兜底补上
  masterOptions.forEach((p) => {
    if (seen.has(p.id)) return
    seen.add(p.id)
    out.push({ id: p.id, name: p.shortName || p.name })
  })
  return out
}

export function ensureDutyRosterSeed() {
  if (typeof localStorage === 'undefined') return
  const thisWeek = toWeekStartMonday(todayYmd())
  const lastWeek = addDaysYmd(thisWeek, -7)
  const list = readRaw()
  const seededProjectIds = new Set(list.map((row) => row.projectId))
  const projects = dutyRosterProjectList()
  // 项目名单扩充后，只为「尚无任何值班表」的项目补种，不覆盖既有排班
  const missing = projects.filter((p) => !seededProjectIds.has(p.id))
  if (localStorage.getItem(SEED_FLAG) === '1' && list.length && !missing.length) return
  let nextIdSeq = list.length
  missing.forEach((p) => {
    const i = projects.findIndex((x) => x.id === p.id)
    const last = buildSeedWeek(p.id, p.name, lastWeek, i)
    const current = buildSeedWeek(p.id, p.name, thisWeek, i + 1)
    for (const row of [last, current]) {
      nextIdSeq += 1
      list.push({ ...normalizeDutyWeek(row), id: `drw-${String(nextIdSeq).padStart(4, '0')}` })
    }
  })
  writeRaw(list)
  localStorage.setItem(SEED_FLAG, '1')
}

export function listDutyWeeks({ projectId = '', weekStart = '', keyword = '' } = {}) {
  ensureDutyRosterSeed()
  let rows = readRaw().map(summarizeDutyWeek)
  if (projectId) rows = rows.filter((r) => r.projectId === projectId)
  if (weekStart) {
    const ws = toWeekStartMonday(weekStart)
    rows = rows.filter((r) => r.weekStart === ws)
  }
  const kw = String(keyword || '').trim()
  if (kw) {
    rows = rows.filter((r) =>
      [r.projectName, r.weekStart, r.weekEnd].some((f) => String(f || '').includes(kw)),
    )
  }
  return rows.sort((a, b) => {
    const byWeek = String(b.weekStart).localeCompare(String(a.weekStart))
    if (byWeek) return byWeek
    return String(a.projectName).localeCompare(String(b.projectName), 'zh-CN')
  })
}

export function getDutyWeekById(id) {
  if (!id) return null
  ensureDutyRosterSeed()
  const hit = readRaw().find((r) => r.id === id)
  return hit ? summarizeDutyWeek(hit) : null
}

export function findDutyWeek(projectId, weekStart) {
  const ws = toWeekStartMonday(weekStart)
  if (!projectId || !ws) return null
  ensureDutyRosterSeed()
  const hit = readRaw().find((r) => r.projectId === projectId && r.weekStart === ws)
  return hit ? summarizeDutyWeek(hit) : null
}

/**
 * 同班次内「施工 / 监理 不可为同一人」的冲突明细（跨班次允许同一人）
 * @returns {Array<{date, weekdayLabel, shift, shiftLabel, person}>}
 */
export function findSameShiftPartyConflicts(row = {}) {
  const week = normalizeDutyWeek(row)
  const out = []
  for (const day of week.days) {
    for (const pair of SHIFT_PARTY_PAIRS) {
      const supervisionIds = new Set((day[pair.supervisionKey] || []).map((p) => p.userId))
      for (const person of day[pair.constructionKey] || []) {
        if (!person?.userId || !supervisionIds.has(person.userId)) continue
        out.push({
          date: day.date,
          weekdayLabel: day.weekdayLabel,
          shift: pair.shift,
          shiftLabel: pair.shiftLabel,
          person,
        })
      }
    }
  }
  return out
}

export function validateDutyWeekPayload(payload, { isCreate = false } = {}) {
  const week = normalizeDutyWeek(payload)
  if (!week.projectId) return { ok: false, msg: '请选择项目' }
  if (!week.weekStart) return { ok: false, msg: '请选择周次' }
  for (const day of week.days) {
    for (const def of SLOT_DEFS) {
      const n = (day[def.key] || []).length
      if (n > DUTY_SLOT_PERSON_LIMIT) {
        return { ok: false, msg: `${day.weekdayLabel}${def.label}最多 ${DUTY_SLOT_PERSON_LIMIT} 人` }
      }
    }
    if ((day.dayPhotos || []).length > 9) {
      return { ok: false, msg: `${day.weekdayLabel}白班照片最多 9 张` }
    }
    if ((day.nightPhotos || []).length > 9) {
      return { ok: false, msg: `${day.weekdayLabel}夜班照片最多 9 张` }
    }
  }
  const conflict = findSameShiftPartyConflicts(week)[0]
  if (conflict) {
    return {
      ok: false,
      msg: `${conflict.weekdayLabel}${conflict.shiftLabel}「${conflict.person.name}」已作为施工值班，同一班次内不能同时作为监理值班`,
    }
  }
  if (isCreate) {
    const exists = findDutyWeek(week.projectId, week.weekStart)
    if (exists) return { ok: false, msg: '本周值班表已存在，请直接修改' }
  }
  return { ok: true, data: week }
}

/** 保存整周排班（保存即生效）；创建时清空照片，编辑保留原照片 */
export function saveDutyWeek(payload, { mode = 'edit', updatedBy = '项目值班员' } = {}) {
  const isCreate = mode === 'create'
  const check = validateDutyWeekPayload(payload, { isCreate })
  if (!check.ok) return check
  const list = readRaw()
  let week = check.data

  if (isCreate) {
    week = {
      ...week,
      id: nextId(list),
      days: week.days.map((d) => ({ ...d, dayPhotos: [], nightPhotos: [] })),
      updatedAt: nowStr(),
      updatedBy,
    }
    list.unshift(week)
    writeRaw(list)
    return { ok: true, data: summarizeDutyWeek(week) }
  }

  const idx = list.findIndex((r) => r.id === week.id)
  if (idx < 0) return { ok: false, msg: '值班表不存在' }
  const prev = normalizeDutyWeek(list[idx])
  // 编辑排班时默认保留既有白班/夜班照片（抽屉不改照片）
  const mergedDays = week.days.map((d) => {
    const old = (prev.days || []).find((x) => x.date === d.date)
    return {
      ...d,
      dayPhotos: normalizePhotos(old?.dayPhotos),
      nightPhotos: normalizePhotos(old?.nightPhotos),
    }
  })
  const next = {
    ...prev,
    ...week,
    days: mergedDays,
    updatedAt: nowStr(),
    updatedBy,
  }
  list[idx] = normalizeDutyWeek(next)
  writeRaw(list)
  return { ok: true, data: summarizeDutyWeek(list[idx]) }
}

/** 补录某一天的白班/夜班值班照片（今天及更早） */
export function saveDutyDayPhotos(
  { weekId, date, dayPhotos, nightPhotos },
  { updatedBy = '项目值班员' } = {},
) {
  const list = readRaw()
  const idx = list.findIndex((r) => r.id === weekId)
  if (idx < 0) return { ok: false, msg: '值班表不存在' }
  const dateYmd = String(date || '').slice(0, 10)
  if (!canBackfillPhotoForDate(dateYmd)) {
    return { ok: false, msg: '仅可补录今天及更早日期的值班照片' }
  }
  const week = normalizeDutyWeek(list[idx])
  const dayIdx = week.days.findIndex((d) => d.date === dateYmd)
  if (dayIdx < 0) return { ok: false, msg: '日期不在本周范围内' }
  const nextDayPhotos = normalizePhotos(dayPhotos)
  const nextNightPhotos = normalizePhotos(nightPhotos)
  if (nextDayPhotos.length > 9) return { ok: false, msg: '白班照片最多 9 张' }
  if (nextNightPhotos.length > 9) return { ok: false, msg: '夜班照片最多 9 张' }
  week.days[dayIdx] = {
    ...week.days[dayIdx],
    dayPhotos: nextDayPhotos,
    nightPhotos: nextNightPhotos,
  }
  week.updatedAt = nowStr()
  week.updatedBy = updatedBy
  list[idx] = week
  writeRaw(list)
  return { ok: true, data: summarizeDutyWeek(week) }
}

export function removeDutyWeek(id) {
  if (!id) return { ok: false, msg: '参数无效' }
  const list = readRaw()
  const next = list.filter((r) => r.id !== id)
  if (next.length === list.length) return { ok: false, msg: '值班表不存在' }
  writeRaw(next)
  return { ok: true }
}

/** 复制上周人员到目标周结构（不含照片） */
export function cloneDutyWeekFromPrevious(projectId, targetWeekStart) {
  const target = toWeekStartMonday(targetWeekStart)
  const prevStart = addDaysYmd(target, -7)
  const prev = findDutyWeek(projectId, prevStart)
  const base = emptyDutyWeek(
    projectId,
    findProjectById(projectId)?.shortName || findProjectById(projectId)?.projectName || '',
    target,
  )
  if (!prev) return { ok: false, msg: '未找到上周值班表', data: base }
  base.days = base.days.map((day, i) => {
    const src = prev.days[i] || {}
    return {
      ...day,
      constructionDay: normalizePersonList(src.constructionDay),
      constructionNight: normalizePersonList(src.constructionNight),
      supervisionDay: normalizePersonList(src.supervisionDay),
      supervisionNight: normalizePersonList(src.supervisionNight),
      dayPhotos: [],
      nightPhotos: [],
    }
  })
  return { ok: true, data: base, fromWeekStart: prevStart }
}

export function formatPersonChips(list) {
  const arr = normalizePersonList(list)
  if (!arr.length) return '无施工'
  return arr.map((p) => p.optionLabel || p.name).join('、')
}

export function slotPeopleCount(day) {
  return countSlotPeople(day)
}
