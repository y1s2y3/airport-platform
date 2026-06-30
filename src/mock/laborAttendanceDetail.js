import { projectTree } from './laborRealName.js'
import { ATTENDANCE_ENTRY_STATUS, getOnSiteStatus } from '../constants/laborPersonStatus.js'

export { projectTree }

const GATES = ['东门闸机', '西门闸机', '北门闸机', '南门闸机', '1号门', '2号门']

const detailTemplates = [
  { name: '张强', workType: '钢筋工', team: '钢筋一班', subcontractor: '中建三局' },
  { name: '李华', workType: '木工', team: '木工二班', subcontractor: '中建三局' },
  { name: '王芳', workType: '普工', team: '综合班组', subcontractor: '深圳市政' },
  { name: '赵磊', workType: '电工', team: '机电班组', subcontractor: '广东建工' },
  { name: '刘洋', workType: '焊工', team: '钢结构班', subcontractor: '广东建工' },
  { name: '陈静', workType: '安全员', team: '安全管理组', subcontractor: '中建三局' },
  { name: '周杰', workType: '架子工', team: '脚手架班', subcontractor: '中铁建工' },
  { name: '吴敏', workType: '测量员', team: '测量组', subcontractor: '深圳市政' },
  { name: '郑伟', workType: '混凝土工', team: '混凝土班', subcontractor: '中建三局' },
  { name: '孙涛', workType: '起重工', team: '塔吊班', subcontractor: '广东建工' },
  { name: '马超', workType: '普工', team: '杂工班', subcontractor: '中铁建工', entryStatus: ATTENDANCE_ENTRY_STATUS.EXITED },
  { name: '黄丽', workType: '钢筋工', team: '钢筋二班', subcontractor: '深圳市政' },
]

function maskIdCard(id) {
  return `${id.slice(0, 6)}********${id.slice(-4)}`
}

function buildPunchRecord(projectId, projectName, index, tpl, date) {
  const seq = index + 1
  const idBase = 440300199001010000 + seq * 137
  const idCardRaw = String(idBase).padStart(18, '0')
  const entryStatus = tpl.entryStatus || ATTENDANCE_ENTRY_STATUS.ENTERED

  let clockIn = ''
  let clockOut = ''
  let gateIn = ''
  let gateOut = ''

  if (entryStatus === ATTENDANCE_ENTRY_STATUS.ENTERED) {
    const pattern = seq % 5
    if (pattern <= 2) {
      clockIn = `${date} 07:${String(30 + (seq % 25)).padStart(2, '0')}:00`
      gateIn = GATES[seq % GATES.length]
    } else if (pattern === 3) {
      clockIn = `${date} 07:45:00`
      clockOut = `${date} 17:${String(20 + (seq % 30)).padStart(2, '0')}:00`
      gateIn = GATES[seq % GATES.length]
      gateOut = GATES[(seq + 1) % GATES.length]
    }
  }

  const onSiteStatus = entryStatus === ATTENDANCE_ENTRY_STATUS.ENTERED
    ? getOnSiteStatus(clockIn ? clockIn.split(' ')[1] : '', clockOut ? clockOut.split(' ')[1] : '')
    : '—'

  return {
    id: `${projectId}-${date}-${seq}`,
    date,
    projectId,
    projectName,
    name: tpl.name,
    idCard: maskIdCard(idCardRaw),
    workType: tpl.workType,
    team: tpl.team,
    subcontractor: tpl.subcontractor,
    entryStatus,
    clockIn: clockIn || '—',
    clockOut: clockOut || '—',
    gateIn: gateIn || '—',
    gateOut: gateOut || '—',
    onSiteStatus,
    workHours: clockIn && clockOut
      ? ((new Date(clockOut.replace(' ', 'T')) - new Date(clockIn.replace(' ', 'T'))) / 3600000).toFixed(1)
      : clockIn ? '—' : '0',
  }
}

function buildProjectDetails(projectId, projectName, count, date) {
  const list = []
  for (let i = 0; i < count; i++) {
    const tpl = detailTemplates[i % detailTemplates.length]
    list.push(buildPunchRecord(projectId, projectName, i, tpl, date))
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

export function getAttendanceDetails(projectId) {
  return attendanceDetailByProject[projectId] || []
}

export function getDefaultProjectId() {
  return 'p-000'
}

export function getProjectLabel(projectId) {
  for (const group of projectTree) {
    const node = group.children?.find((item) => item.id === projectId)
    if (node) return node.label.replace(/\(\d+\)$/, '')
  }
  return ''
}
