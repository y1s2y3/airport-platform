/**
 * 会议记录台账（会议记录＝签到记录展示位）
 * 落库时点：指挥部顶栏「结束会议」（数据源：大屏「项目值班」人员参会标注）
 * 字段：会议时间、调度项目、各项目已参会 / 未参会人员清单（人员级 joinTime 不入库）
 */

const STORAGE_KEY = 'coc-admin-meeting-sign-in-v1'
const CHANGE_EVENT = 'coc-meeting-sign-in-change'

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { list } }))
}

function formatNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function nextId(list) {
  const max = list.reduce((acc, row) => {
    const n = Number(String(row.id || '').replace(/\D/g, ''))
    return Number.isFinite(n) ? Math.max(acc, n) : acc
  }, 0)
  return `msi-${String(max + 1).padStart(4, '0')}`
}

/** 会议时间按起止周期展示，如同日则结束侧可省略日期（兼容 2026-10-08 09:00 与 2026/10/8 09:00 两种格式） */
function splitDateTime(value) {
  const s = String(value || '').trim()
  const idx = s.indexOf(' ')
  if (idx < 0) return { date: s, time: '' }
  return { date: s.slice(0, idx), time: s.slice(idx + 1) }
}

export function formatMeetingPeriod(start, end) {
  const s = String(start || '').trim()
  const e = String(end || '').trim()
  if (!s && !e) return '—'
  if (!e || e === s) return s || e
  const a = splitDateTime(s)
  const b = splitDateTime(e)
  if (a.date && b.date && a.date === b.date && b.time) {
    return `${s} ~ ${b.time}`
  }
  return `${s} ~ ${e}`
}

export function normalizeMeetingSignInRecord(row = {}) {
  const projectGroups = Array.isArray(row.projectGroups)
    ? row.projectGroups.map((g) => {
        const attendees = Array.isArray(g.attendees)
          ? g.attendees.map((a) => ({
              id: a.id || '',
              name: a.name || '—',
              role: a.role || a.position || '—',
              joinTime: a.joinTime || '',
            }))
          : []
        const absentees = Array.isArray(g.absentees)
          ? g.absentees.map((a) => ({
              id: a.id || '',
              name: a.name || '—',
              role: a.role || a.position || '—',
              reason: a.reason || '',
            }))
          : []
        return {
          projectId: g.projectId || '',
          projectName: g.projectName || '',
          attendees,
          absentees,
          attendeeCount: attendees.length,
          absenteeCount: absentees.length,
        }
      })
    : []
  const dispatchProjects = Array.isArray(row.dispatchProjects) && row.dispatchProjects.length
    ? row.dispatchProjects.map((p) =>
        typeof p === 'string'
          ? p
          : p?.projectName || p?.name || '',
      ).filter(Boolean)
    : projectGroups.map((g) => g.projectName).filter(Boolean)

  const meetingTime = row.meetingTime || ''
  const endedAt = row.endedAt || row.meetingTime || ''
  return {
    id: row.id || '',
    date: row.date || String(meetingTime).slice(0, 10),
    ongoing: Boolean(row.ongoing),
    meetingTime,
    endedAt,
    meetingPeriod: formatMeetingPeriod(meetingTime, endedAt),
    dispatchProjects,
    projectGroups,
    attendeeTotal: projectGroups.reduce((n, g) => n + (g.attendees?.length || 0), 0),
    absenteeTotal: projectGroups.reduce((n, g) => n + (g.absentees?.length || 0), 0),
  }
}

export function getMeetingSignInRecords() {
  return readRaw().map(normalizeMeetingSignInRecord)
}

export function saveMeetingSignInRecord(payload) {
  const list = readRaw()
  const record = normalizeMeetingSignInRecord({
    ...payload,
    id: payload.id || nextId(list),
    meetingTime: payload.meetingTime || formatNow(),
    endedAt: payload.endedAt || formatNow(),
  })
  list.unshift(record)
  writeRaw(list)
  return record
}

/** 记录变更订阅（会议记录数据源已改为大屏项目值班人员参会标注，不再播种演示台账） */
export function onMeetingSignInChange(handler) {
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}
