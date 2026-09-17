/**
 * 指挥部会议签到台账
 * 落库时点：指挥部顶栏「结束会议」（「开始会议」开会中态）
 * 字段：会议时间、调度项目、各项目参会人员清单（人员级 joinTime 不入库）
 */

const STORAGE_KEY = 'coc-admin-meeting-sign-in-v1'
const SEED_FLAG = 'coc-admin-meeting-sign-in-seed-v1'
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

/** 会议时间按起止周期展示，如同日则结束侧可省略日期 */
export function formatMeetingPeriod(start, end) {
  const s = String(start || '').trim()
  const e = String(end || '').trim()
  if (!s && !e) return '—'
  if (!e || e === s) return s || e
  const sDate = s.slice(0, 10)
  const eDate = e.slice(0, 10)
  if (sDate && eDate && sDate === eDate && e.length > 10) {
    return `${s} ~ ${e.slice(11)}`
  }
  return `${s} ~ ${e}`
}

export function normalizeMeetingSignInRecord(row = {}) {
  const projectGroups = Array.isArray(row.projectGroups)
    ? row.projectGroups.map((g) => ({
        projectId: g.projectId || '',
        projectName: g.projectName || '',
        attendees: Array.isArray(g.attendees)
          ? g.attendees.map((a) => ({
              id: a.id || '',
              name: a.name || '—',
              role: a.role || a.position || '—',
              joinTime: a.joinTime || '',
            }))
          : [],
      }))
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
    meetingTime,
    endedAt,
    meetingPeriod: formatMeetingPeriod(meetingTime, endedAt),
    dispatchProjects,
    projectGroups,
    attendeeTotal: projectGroups.reduce((n, g) => n + (g.attendees?.length || 0), 0),
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

export function ensureMeetingSignInSeed() {
  if (localStorage.getItem(SEED_FLAG) === '1' && readRaw().length) return
  const seed = [
    normalizeMeetingSignInRecord({
      id: 'msi-0001',
      meetingTime: '2026-09-15 09:00:00',
      endedAt: '2026-09-15 09:42:18',
      dispatchProjects: ['T3航站楼改扩建', '飞行区跑道工程'],
      projectGroups: [
        {
          projectId: 'p-000',
          projectName: 'T3航站楼改扩建',
          attendees: [
            { id: 'a1', name: '张伟', role: '项目经理', joinTime: '08:12:03' },
            { id: 'a2', name: '刘洋', role: '技术负责人', joinTime: '08:15:41' },
            { id: 'a3', name: '陈静', role: '施工员', joinTime: '08:20:10' },
          ],
        },
        {
          projectId: 'p-001',
          projectName: '飞行区跑道工程',
          attendees: [
            { id: 'b1', name: '王磊', role: '项目经理', joinTime: '08:18:22' },
            { id: 'b2', name: '杨军', role: '质量员', joinTime: '08:22:55' },
          ],
        },
      ],
    }),
  ]
  writeRaw(seed)
  localStorage.setItem(SEED_FLAG, '1')
}

export function onMeetingSignInChange(handler) {
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}
