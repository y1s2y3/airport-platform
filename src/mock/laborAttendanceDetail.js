import { projectTree } from './laborRealName.js'
import { maskIdCard } from '../utils/mask.js'
import { appendOperationLog } from './systemLogs.js'
import {
  REALNAME_ENTRY_STATUS,
  ATTENDANCE_ENTRY_STATUS,
  getOnSiteStatus,
} from '../constants/laborPersonStatus.js'

export { projectTree }

const GATES = ['东门闸机', '西门闸机', '北门闸机', '南门闸机', '1号门', '2号门']

const detailTemplates = [
  { name: '张强', work_type: '钢筋工', team: '钢筋一班', unit_name: '中建三局' },
  { name: '李华', work_type: '木工', team: '木工二班', unit_name: '中建三局' },
  { name: '王芳', work_type: '普工', team: '综合班组', unit_name: '深圳市政' },
  { name: '赵磊', work_type: '特种-电工', team: '机电班组', unit_name: '广东建工' },
  { name: '刘洋', work_type: '特种-焊工', team: '钢结构班', unit_name: '广东建工' },
  { name: '陈静', work_type: '安全员', team: '安全管理组', unit_name: '中建三局' },
  { name: '周杰', work_type: '特种-架子工', team: '脚手架班', unit_name: '中铁建工' },
  { name: '吴敏', work_type: '测量员', team: '测量组', unit_name: '深圳市政' },
  { name: '郑伟', work_type: '混凝土工', team: '混凝土班', unit_name: '中建三局' },
  { name: '孙涛', work_type: '特种-起重工', team: '塔吊班', unit_name: '广东建工' },
  { name: '马超', work_type: '普工', team: '杂工班', unit_name: '中铁建工', roster_entry_status: REALNAME_ENTRY_STATUS.EXITED },
  { name: '黄丽', work_type: '钢筋工', team: '钢筋二班', unit_name: '深圳市政' },
]

function buildPunchRecord(project_id, project_name, index, tpl, date) {
  const seq = index + 1
  const idBase = 440300199001010000 + seq * 137
  const id_card_raw = String(idBase).padStart(18, '0')
  const roster_entry_status = tpl.roster_entry_status || REALNAME_ENTRY_STATUS.ENTERED

  let clock_in = ''
  let clock_out = ''
  let gate_in = ''
  let gate_out = ''

  if (roster_entry_status === REALNAME_ENTRY_STATUS.ENTERED) {
    const pattern = seq % 5
    if (pattern <= 2) {
      clock_in = `${date} 07:${String(30 + (seq % 25)).padStart(2, '0')}:00`
      gate_in = GATES[seq % GATES.length]
    } else if (pattern === 3) {
      clock_in = `${date} 07:45:00`
      clock_out = `${date} 17:${String(20 + (seq % 30)).padStart(2, '0')}:00`
      gate_in = GATES[seq % GATES.length]
      gate_out = GATES[(seq + 1) % GATES.length]
    }
  }

  const on_site_status =
    roster_entry_status === REALNAME_ENTRY_STATUS.EXITED
      ? '—'
      : getOnSiteStatus(clock_in ? clock_in.split(' ')[1] : '', clock_out ? clock_out.split(' ')[1] : '')

  // 进出场列：在岗人员按打卡派生；离场人员展示「离场」
  let entry_status = REALNAME_ENTRY_STATUS.EXITED
  if (roster_entry_status === REALNAME_ENTRY_STATUS.ENTERED) {
    entry_status = clock_out
      ? ATTENDANCE_ENTRY_STATUS.EXITED
      : ATTENDANCE_ENTRY_STATUS.ENTERED
  }

  return {
    id: `${project_id}-${date}-${seq}`,
    date,
    project_id,
    project_name,
    name: tpl.name,
    id_card_raw,
    id_card: maskIdCard(id_card_raw),
    work_type: tpl.work_type,
    team: tpl.team,
    unit_name: tpl.unit_name,
    entry_status,
    clock_in: clock_in || '—',
    clock_out: clock_out || '—',
    gate_in: gate_in || '—',
    gate_out: gate_out || '—',
    on_site_status,
    work_hours: clock_in && clock_out
      ? ((new Date(clock_out.replace(' ', 'T')) - new Date(clock_in.replace(' ', 'T'))) / 3600000).toFixed(1)
      : clock_in ? '—' : '0',
  }
}

function buildProjectDetails(project_id, project_name, count, date) {
  const list = []
  for (let i = 0; i < count; i++) {
    const tpl = detailTemplates[i % detailTemplates.length]
    list.push(buildPunchRecord(project_id, project_name, i, tpl, date))
  }
  return list
}

const TODAY = '2026-06-29'

export const attendanceDetailByProject = Object.fromEntries(
  projectTree[0].children.map((item) => [
    item.id,
    buildProjectDetails(item.id, item.label.replace(/\(\d+\)$/, ''), Math.min(item.count > 100 ? 12 : 8, 12), TODAY),
  ]),
)

export function getAttendanceDetails(project_id) {
  return attendanceDetailByProject[project_id] || []
}

export function getAttendanceDetailsByMonth(project_id, month) {
  const project_name = getProjectLabel(project_id)
  const node = projectTree[0].children.find((item) => item.id === project_id)
  const count = node ? Math.min(node.count > 100 ? 12 : 8, 12) : 8
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const sampleDays = [1, 5, 10, 15, 20, 25].filter((d) => d <= daysInMonth)
  const list = []
  sampleDays.forEach((day) => {
    const date = `${month}-${String(day).padStart(2, '0')}`
    list.push(...buildProjectDetails(project_id, project_name, count, date))
  })
  return list
}

export function getDefaultProjectId() {
  return 'p-000'
}

export function getProjectLabel(project_id) {
  for (const group of projectTree) {
    const node = group.children?.find((item) => item.id === project_id)
    if (node) return node.label.replace(/\(\d+\)$/, '')
  }
  return ''
}

function isValidPunchTime(value) {
  return Boolean(value) && value !== '—'
}

/** 从列表日汇总行展开进出场流水（首尾与列表 clock_in/out、闸机一致） */
function expandRowToAccessEvents(row) {
  const events = []
  const photo = (row.name || '').slice(0, 1) || '—'
  const gateIn = isValidPunchTime(row.gate_in) ? row.gate_in : GATES[0]
  const gateOut = isValidPunchTime(row.gate_out) ? row.gate_out : gateIn

  const push = (direction, record_time, gate_name, suffix) => {
    if (!isValidPunchTime(record_time)) return
    events.push({
      id: `${row.id}-${suffix}`,
      name: row.name,
      direction,
      record_time,
      gate_name,
      photo,
      date: row.date,
    })
  }

  // 列表「进场时间 / 进场闸机」→ 首条进场
  push('进场', row.clock_in, gateIn, 'in-0')

  // 有进场时补午间出场+再进场，演示一人一日多条；时间夹在首进与末出之间
  if (isValidPunchTime(row.clock_in)) {
    const seed = [...`${row.name}|${row.id_card_raw}|${row.date}`].reduce(
      (acc, ch) => acc + ch.charCodeAt(0),
      0,
    )
    if (seed % 2 === 0) {
      push('出场', `${row.date} 12:05:${String(10 + (seed % 40)).padStart(2, '0')}`, gateOut, 'out-mid')
      push('进场', `${row.date} 13:10:${String(20 + (seed % 30)).padStart(2, '0')}`, gateIn, 'in-mid')
    }
  }

  // 列表「出场时间 / 出场闸机」→ 末条出场
  push('出场', row.clock_out, gateOut, 'out-0')

  return events.sort((a, b) => String(a.record_time).localeCompare(String(b.record_time)))
}

function findOrBuildDayRow({ project_id, name, id_card_raw, date }) {
  const cached = (attendanceDetailByProject[project_id] || []).find(
    (row) =>
      row.date === date &&
      ((id_card_raw && row.id_card_raw === id_card_raw) || row.name === name),
  )
  if (cached) return cached

  const project_name = getProjectLabel(project_id)
  const tplIndex = detailTemplates.findIndex((item) => item.name === name)
  const tpl =
    tplIndex >= 0
      ? detailTemplates[tplIndex]
      : { name, work_type: '普工', team: '综合班组', unit_name: '—' }
  const index = tplIndex >= 0 ? tplIndex : 0
  return buildPunchRecord(project_id, project_name, index, tpl, date)
}

/**
 * 人员某日进出场刷卡流水（与考勤明细日汇总同源；一人一日可有多条进/出场）
 * @returns {{ id, name, direction, record_time, gate_name, photo, date }[]}
 */
export function getPersonAccessEvents({
  project_id = '',
  name = '',
  id_card_raw = '',
  date = TODAY,
} = {}) {
  if (!name || !date) return []
  const row = findOrBuildDayRow({ project_id, name, id_card_raw, date })
  return expandRowToAccessEvents(row)
}

/** 查看考勤明细证件号码并写入操作日志 */
export function logAttendanceIdCardView({ id, name, id_card_raw }) {
  appendOperationLog({
    module: '人员实名制管理',
    type: '查询',
    content: `查看考勤明细证件号码：${name || '—'}（${id_card_raw || id || '—'}）`,
    requestUrl: `/api/labor/attendance/${id}/id-card/view`,
  })
}
