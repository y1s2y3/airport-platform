/**
 * 每周值班表（项目维护 / 指挥部汇总只读）
 * 粒度：项目 + 周（周一）→ 每日先白班/夜班，再施工/监理（0～9 人）
 * 值班照片：不在新增时上传，仅对今天及更早日期补录（image 档，0～9）
 */

import { nowStr } from '../utils/datetime.js'
import { formatApproverOptionLabel } from '../utils/approverDisplay.js'
import { getProjectSelectOptions, findProjectById } from './projectBasicInfo.js'

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
  return {
    userId: raw.userId || raw.user_id || '',
    name,
    org,
    position,
    party: raw.party || '',
    optionLabel: raw.optionLabel || formatApproverOptionLabel(name, org, position),
  }
}

export function listDutyPersonOptions(projectId, party) {
  if (!projectId) return []
  const pool = party === 'supervision' ? SUPERVISION_POOL : CONSTRUCTION_POOL
  // 演示：各项目共用池，按项目微扰姓名后缀保证「项目范围内」可区分
  return pool.map((p) => {
    const base = enrichPerson(p)
    return {
      ...base,
      projectId,
      optionLabel: formatApproverOptionLabel(base.name, base.org, base.position),
    }
  })
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
    if (out.length >= 9) break
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

function buildSeedWeek(projectId, projectName, weekStart, variant = 0) {
  const week = emptyDutyWeek(projectId, projectName, weekStart)
  week.days = week.days.map((day, idx) => {
    const cOff = (variant + idx) % CONSTRUCTION_POOL.length
    const sOff = (variant + idx * 2) % SUPERVISION_POOL.length
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
      constructionDay: pickPeople(CONSTRUCTION_POOL, [cOff, cOff + 1]),
      constructionNight: idx === 6 ? [] : pickPeople(CONSTRUCTION_POOL, [cOff + 2]),
      supervisionDay: pickPeople(SUPERVISION_POOL, [sOff, sOff + 1]),
      supervisionNight: pickPeople(SUPERVISION_POOL, [sOff + 2]),
      dayPhotos,
      nightPhotos,
    }
  })
  week.updatedAt = nowStr()
  week.updatedBy = '系统演示'
  return week
}

export function ensureDutyRosterSeed() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(SEED_FLAG) === '1' && readRaw().length) return
  const options = getProjectSelectOptions().slice(0, 4)
  const thisWeek = toWeekStartMonday(todayYmd())
  const lastWeek = addDaysYmd(thisWeek, -7)
  const seeds = []
  options.forEach((p, i) => {
    seeds.push(buildSeedWeek(p.id, p.shortName || p.name, lastWeek, i))
    seeds.push(buildSeedWeek(p.id, p.shortName || p.name, thisWeek, i + 1))
  })
  const withIds = seeds.map((row, i) => ({
    ...normalizeDutyWeek(row),
    id: `drw-${String(i + 1).padStart(4, '0')}`,
  }))
  writeRaw(withIds)
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

export function validateDutyWeekPayload(payload, { isCreate = false } = {}) {
  const week = normalizeDutyWeek(payload)
  if (!week.projectId) return { ok: false, msg: '请选择项目' }
  if (!week.weekStart) return { ok: false, msg: '请选择周次' }
  for (const day of week.days) {
    for (const def of SLOT_DEFS) {
      const n = (day[def.key] || []).length
      if (n > 9) return { ok: false, msg: `${day.weekdayLabel}${def.label}最多 9 人` }
    }
    if ((day.dayPhotos || []).length > 9) {
      return { ok: false, msg: `${day.weekdayLabel}白班照片最多 9 张` }
    }
    if ((day.nightPhotos || []).length > 9) {
      return { ok: false, msg: `${day.weekdayLabel}夜班照片最多 9 张` }
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
