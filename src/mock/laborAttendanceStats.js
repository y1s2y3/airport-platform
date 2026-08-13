import { projectTree } from './laborRealName.js'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'

export { projectTree }

const personTemplates = [
  { name: '张强', unit_name: '中建三局', work_type: '钢筋工', team: '钢筋一班' },
  { name: '李华', unit_name: '中建三局', work_type: '木工', team: '木工二班' },
  { name: '王芳', unit_name: '深圳市政', work_type: '普工', team: '综合班组' },
  { name: '赵磊', unit_name: '广东建工', work_type: '特种-电工', team: '机电班组' },
  { name: '刘洋', unit_name: '广东建工', work_type: '特种-焊工', team: '钢结构班' },
  { name: '陈静', unit_name: '中建三局', work_type: '安全员', team: '安全管理组' },
  { name: '周杰', unit_name: '中铁建工', work_type: '特种-架子工', team: '脚手架班' },
  { name: '吴敏', unit_name: '深圳市政', work_type: '测量员', team: '测量组' },
  { name: '郑伟', unit_name: '中建三局', work_type: '混凝土工', team: '混凝土班' },
  { name: '孙涛', unit_name: '广东建工', work_type: '特种-起重工', team: '塔吊班' },
  { name: '马超', unit_name: '中铁建工', work_type: '普工', team: '杂工班' },
  { name: '黄丽', unit_name: '深圳市政', work_type: '钢筋工', team: '钢筋二班' },
]

export const workTypes = [
  '钢筋工',
  '木工',
  '混凝土工',
  '特种-架子工',
  '特种-电工',
  '特种-焊工',
  '特种-起重工',
  '普工',
  '安全员',
  '测量员',
]

function buildPersonStat(project_id, index, tpl) {
  const seq = index + 1
  const seed = project_id.charCodeAt(project_id.length - 1) + seq
  const attendance_days = 22 - (seed % 4)
  const absent_count = seed % 4
  const late_count = seed % 3
  const early_leave_count = (seed + 1) % 2
  const avg_hours = 8 + (seed % 3) * 0.2
  const total_hours = Number((attendance_days * avg_hours).toFixed(1))
  const overtime_hours = (seed % 5) * 4
  const rate = ((attendance_days / 22) * 100).toFixed(1)

  return {
    id: `${project_id}-person-${seq}`,
    project_id,
    name: tpl.name,
    unit_name: tpl.unit_name,
    work_type: tpl.work_type,
    team: tpl.team,
    attendance_days,
    total_hours,
    avg_hours: Number(avg_hours.toFixed(1)),
    late_count,
    early_leave_count,
    absent_count,
    overtime_hours,
    attendance_rate: `${rate}%`,
  }
}

function buildTeamStat(project_id, team, unit_name, headcount, seed) {
  const present_days = headcount * (20 + (seed % 3))
  const absent_total = headcount * (seed % 3)
  const avg_rate = (92 + (seed % 8) + (seed % 10) / 10).toFixed(1)
  return {
    id: `${project_id}-team-${team}`,
    project_id,
    team,
    unit_name,
    headcount,
    present_days,
    avg_rate: `${avg_rate}%`,
    absent_total,
    overtime_hours: 40 + seed * 6,
  }
}

function buildProjectStats(project_id, size) {
  const personList = []
  for (let i = 0; i < size; i++) {
    personList.push(buildPersonStat(project_id, i, personTemplates[i % personTemplates.length]))
  }

  const teamMap = new Map()
  personList.forEach((row, i) => {
    const key = `${row.team}|${row.unit_name}`
    if (!teamMap.has(key)) {
      teamMap.set(key, { team: row.team, unit_name: row.unit_name, headcount: 0, seed: i })
    }
    const item = teamMap.get(key)
    item.headcount += 4 + (i % 5)
  })

  const teamList = [...teamMap.values()].map((item) =>
    buildTeamStat(project_id, item.team, item.unit_name, item.headcount, item.seed),
  )

  return { personList, teamList }
}

const statsByProject = Object.fromEntries(
  projectTree[0].children.map((item) => {
    const size = Math.min(item.count > 100 ? 10 : 8, 10)
    return [item.id, buildProjectStats(item.id, size)]
  }),
)

export function getPersonStats(project_id) {
  return statsByProject[project_id]?.personList.map((row) => ({ ...row })) || []
}

export function getTeamStats(project_id) {
  return statsByProject[project_id]?.teamList.map((row) => ({ ...row })) || []
}

export function getProjectPersonCount(project_id) {
  return getPersonStats(project_id).length
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

function clampRate(n) {
  return Math.max(0, Math.min(100, Number(n.toFixed(1))))
}

/**
 * 指挥部 · 按项目出勤率（单日；对齐 COC 全量项目）
 * @param {string} dateStr YYYY-MM-DD
 */
export function buildHqAttendanceStatsByProject(dateStr = '') {
  const day = String(dateStr || '2026-07-20').replace(/-/g, '')
  const daySeed = Number(day.slice(-4)) || 720
  const mockIds = new Set((projectTree[0]?.children || []).map((n) => n.id))
  return COC_PROJECT_OPTIONS.map((opt) => {
    if (!mockIds.has(opt.id)) {
      return {
        project_id: opt.id,
        project_name: opt.label,
        date: dateStr || '2026-07-20',
        today_attendance_rate: 0,
        today_manage_attendance_rate: 0,
        today_labor_attendance_rate: 0,
        today_special_attendance_rate: 0,
        demo_empty: true,
      }
    }
    const seed = opt.id.charCodeAt(opt.id.length - 1) + daySeed
    const today_attendance_rate = clampRate(88 + (seed % 12) + (seed % 7) / 10)
    const today_manage_attendance_rate = clampRate(today_attendance_rate + 2 + (seed % 3))
    const today_labor_attendance_rate = clampRate(today_attendance_rate - 1 - (seed % 4) / 2)
    const today_special_attendance_rate = clampRate(today_attendance_rate + 0.5 - (seed % 5) / 2)
    return {
      project_id: opt.id,
      project_name: opt.label,
      date: dateStr || '2026-07-20',
      today_attendance_rate,
      today_manage_attendance_rate,
      today_labor_attendance_rate,
      today_special_attendance_rate,
      demo_empty: false,
    }
  })
}
