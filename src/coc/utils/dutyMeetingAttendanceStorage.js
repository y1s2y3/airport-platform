/**
 * 项目值班人员 · 会议参会状态（大屏标注 → 后台「会议记录」数据源）
 *
 * 存储：coc-duty-meeting-attendance-v1
 * {
 *   "2026-10-08": {
 *     "p-000": {
 *       "dd-sg-01": {
 *         personId, name, phone, role, shift, projectId, projectName,
 *         joined: boolean, manual: boolean, updatedAt: string
 *       }
 *     }
 *   }
 * }
 *
 * 口径（与 PRD 对齐）：
 * 1. 默认：在场 → 已参会；不在场 / 未查询到考勤 → 未参会。
 * 2. 会议进行中（「开始会议」后、「结束会议」前）：首次出现即落一条基线（manual=false）并冻结，
 *    此后**不再随考勤变化**。
 * 3. 大屏点击标签人工切换 → manual=true，会议进行中始终以人工值为准。
 * 4. 「结束会议」时按当日各项目值班人员状态落一条会议记录（沿用 meetingSignInStorage 台账结构与 key），
 *    随后清除当日全部标注（基线 + 人工）→ **散会后一律按考勤（在场）更新**。
 * 5. 「会议记录」即是会议签到功能的记录展示位。
 */

import { buildProjectDutyToday, todayYmd } from '../mock/dutyScreenData.js'
import { normalizeMeetingSignInRecord, saveMeetingSignInRecord } from './meetingSignInStorage.js'

const STORAGE_KEY = 'coc-duty-meeting-attendance-v1'
const SESSION_KEY = 'coc-duty-meeting-session-v1'
const CHANGE_EVENT = 'coc-duty-meeting-attendance-change'

function formatNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function timePart(datetime) {
  const s = String(datetime || '')
  return s.length > 11 ? s.slice(11) : ''
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    return
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { map } }))
}

/** 当日全部参会记录（扁平数组） */
export function listDutyJoinRecords(date = todayYmd()) {
  const day = readAll()[String(date).slice(0, 10)] || {}
  const out = []
  Object.values(day).forEach((byPerson) => {
    Object.values(byPerson || {}).forEach((row) => {
      if (row?.personId) out.push({ ...row })
    })
  })
  return out
}

export function getDutyJoinRecord(date, projectId, personId) {
  if (!projectId || !personId) return null
  const day = readAll()[String(date).slice(0, 10)] || {}
  return day[projectId]?.[personId] || null
}

export function isDutyJoinManual(date, projectId, personId) {
  return Boolean(getDutyJoinRecord(date, projectId, personId)?.manual)
}

/**
 * 落基线：仅对当日尚未有任何记录的值班人员生效（写一次即冻结，后续不随考勤变化）
 * @param {Array<{projectId, projectName, personId, name, phone, role, shift, onSite}>} entries
 */
export function ensureDutyJoinBaselines(date = todayYmd(), entries = []) {
  if (!Array.isArray(entries) || !entries.length) return false
  const dayKey = String(date).slice(0, 10)
  const all = readAll()
  const day = { ...(all[dayKey] || {}) }
  let changed = false
  const now = formatNow()
  entries.forEach((item) => {
    if (!item?.projectId || !item?.personId) return
    const project = { ...(day[item.projectId] || {}) }
    if (project[item.personId]) return
    project[item.personId] = {
      personId: item.personId,
      name: item.name || '',
      phone: item.phone || '',
      role: item.role || '',
      shift: item.shift || '',
      projectId: item.projectId,
      projectName: item.projectName || '',
      joined: Boolean(item.onSite),
      manual: false,
      updatedAt: now,
    }
    day[item.projectId] = project
    changed = true
  })
  if (!changed) return false
  writeAll({ ...all, [dayKey]: day })
  return true
}

/** 人工切换参会状态（manual=true，之后不再被考勤覆盖） */
export function setDutyJoinStatus({
  date = todayYmd(),
  projectId,
  projectName = '',
  person = {},
  joined,
} = {}) {
  const personId = person.userId || person.personId
  if (!projectId || !personId) return null
  const dayKey = String(date).slice(0, 10)
  const all = readAll()
  const day = { ...(all[dayKey] || {}) }
  const project = { ...(day[projectId] || {}) }
  const prev = project[personId]
  const next = {
    personId,
    name: person.name || prev?.name || '',
    phone: person.phone || prev?.phone || '',
    role: person.position || person.role || prev?.role || '',
    shift: person.shiftLabel || prev?.shift || '',
    projectId,
    projectName: projectName || prev?.projectName || '',
    joined: Boolean(joined),
    manual: true,
    updatedAt: formatNow(),
  }
  project[personId] = next
  day[projectId] = project
  writeAll({ ...all, [dayKey]: day })
  return next
}

export function onDutyJoinChange(handler) {
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

/* ---------------- 会议会话：进行中冻结参会状态，结束后恢复按考勤 ---------------- */

function readSessions() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeSessions(map) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(map))
  } catch {
    return
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { map } }))
}

export function getDutyMeetingSession(date = todayYmd()) {
  const hit = readSessions()[String(date).slice(0, 10)]
  return hit || { active: false, startedAt: '', endedAt: '' }
}

/** 会议是否进行中（进行中才冻结参会状态） */
export function isDutyMeetingActive(date = todayYmd()) {
  return Boolean(getDutyMeetingSession(date).active)
}

/** 当日值班人员参会基线（用于「开始会议」时一次性冻结所有项目） */
export function buildDutyJoinEntries({ projects = [], date = todayYmd() } = {}) {
  const dayKey = String(date).slice(0, 10)
  const out = []
  projects
    .filter((p) => p?.status === '在建')
    .forEach((project) => {
      const duty = buildProjectDutyToday(project, { date: dayKey })
      if (!duty.scheduled) return
      ;[...duty.dayPeople, ...duty.nightPeople].forEach((person) => {
        out.push({
          projectId: project.id,
          projectName: project.shortName || project.name,
          personId: person.userId,
          name: person.name,
          phone: person.phone,
          role: person.position,
          shift: person.shiftLabel,
          onSite: person.attendance?.statusKey === 'onSite',
        })
      })
    })
  return out
}

/** 开始会议：登记会话并把当日值班人员参会状态冻结为基线 */
export function startDutyMeetingSession({ projects = [], date = todayYmd() } = {}) {
  const dayKey = String(date).slice(0, 10)
  const all = readSessions()
  all[dayKey] = { active: true, startedAt: formatNow(), endedAt: '' }
  writeSessions(all)
  ensureDutyJoinBaselines(dayKey, buildDutyJoinEntries({ projects, date: dayKey }))
  return all[dayKey]
}

/** 结束会议：登记会话结束并清除当日全部标注（含人工），散会后一律按考勤更新 */
export function endDutyMeetingSession(date = todayYmd()) {
  const dayKey = String(date).slice(0, 10)
  const all = readSessions()
  all[dayKey] = { ...(all[dayKey] || {}), active: false, endedAt: formatNow() }
  writeSessions(all)
  clearDutyJoinRecords(dayKey)
  return all[dayKey]
}

/** 清除某日全部参会标注（基线 + 人工） */
export function clearDutyJoinRecords(date = todayYmd()) {
  const dayKey = String(date).slice(0, 10)
  const all = readAll()
  if (!all[dayKey]) return false
  delete all[dayKey]
  writeAll(all)
  return true
}

/**
 * 当日值班人员参会明细（默认值 = 在场，已被人工/基线覆盖的取其值）
 * @returns {Array<{projectId, projectName, persons: Array}>}
 */
export function collectDutyMeetingRows({ projects = [], date = todayYmd() } = {}) {
  const dayKey = String(date).slice(0, 10)
  const sessionActive = isDutyMeetingActive(dayKey)
  return projects
    .filter((p) => p?.status === '在建')
    .map((project) => {
      const duty = buildProjectDutyToday(project, { date: dayKey })
      if (!duty.scheduled || !duty.personTotal) return null
      const persons = [...duty.dayPeople, ...duty.nightPeople].map((person) => {
        const hit = getDutyJoinRecord(dayKey, project.id, person.userId)
        const onSite = person.attendance?.statusKey === 'onSite'
        // 人工标注始终有效；自动基线仅在会议进行中生效，其余按考勤（在场）更新
        const effective = hit && (hit.manual || sessionActive) ? hit : null
        const joined = effective ? Boolean(effective.joined) : onSite
        const manual = Boolean(effective?.manual)
        // 参会时间：人工标注取标注时刻；默认已参会取实名制考勤进场时间
        const joinTime = !joined
          ? ''
          : manual
            ? timePart(effective?.updatedAt)
            : onSite
              ? person.attendance?.clockIn || ''
              : timePart(effective?.updatedAt)
        return {
          personId: person.userId,
          name: person.name,
          phone: person.phone,
          role: person.position,
          shift: person.shiftLabel,
          partyLabel: person.partyLabel,
          onSite,
          joined,
          manual,
          updatedAt: effective?.updatedAt || '',
          joinTime,
        }
      })
      return {
        projectId: project.id,
        projectName: project.shortName || project.name,
        fullName: project.name,
        persons,
      }
    })
    .filter(Boolean)
}

/** 由当日值班人员参会状态合成一条后台「会议记录」 */
export function buildDutyMeetingRecord({
  projects = [],
  date = todayYmd(),
  ongoing = false,
  meetingTime = '',
  endedAt = '',
} = {}) {
  const dayKey = String(date).slice(0, 10)
  const rows = collectDutyMeetingRows({ projects, date: dayKey })
  const projectGroups = rows.map((row) => {
    const joined = row.persons.filter((p) => p.joined)
    const absent = row.persons.filter((p) => !p.joined)
    return {
      projectId: row.projectId,
      projectName: row.projectName,
      attendees: joined.map((p) => ({
        id: p.personId,
        name: p.name,
        role: p.role || '--',
        shift: p.shift || '--',
        partyRole: p.partyLabel || '--',
        joinTime: p.joinTime,
      })),
      absentees: absent.map((p) => ({
        id: p.personId,
        name: p.name,
        role: p.role || '--',
        shift: p.shift || '--',
        partyRole: p.partyLabel || '--',
        reason: p.onSite ? '人工标记未参会' : '不在场',
      })),
    }
  })
  const now = formatNow()
  const record = normalizeMeetingSignInRecord({
    id: ongoing ? `duty-live-${dayKey}` : '',
    date: dayKey,
    ongoing,
    meetingTime: meetingTime || (ongoing ? `${dayKey} 会议进行中` : now),
    endedAt: endedAt || now,
    dispatchProjects: projectGroups.map((g) => g.projectName),
    projectGroups,
  })
  return record
}

/** 「结束会议」落库：按当日值班人员参会状态生成台账记录 */
export function snapshotDutyMeetingRecord({
  projects = [],
  date = todayYmd(),
  meetingTime = '',
  endedAt = '',
} = {}) {
  const record = buildDutyMeetingRecord({ projects, date, ongoing: false, meetingTime, endedAt })
  if (!record.projectGroups.length) return null
  return saveMeetingSignInRecord({
    meetingTime: record.meetingTime,
    endedAt: record.endedAt,
    date: record.date,
    dispatchProjects: record.dispatchProjects,
    projectGroups: record.projectGroups.map((g) => ({
      projectId: g.projectId,
      projectName: g.projectName,
      attendees: g.attendees,
      absentees: g.absentees,
    })),
  })
}
