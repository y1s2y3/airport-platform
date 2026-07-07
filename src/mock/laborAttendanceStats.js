import { projectTree } from './laborRealName.js'

export { projectTree }

const personTemplates = [
  { name: '张强', company: '中建三局', workType: '钢筋工', team: '钢筋一班' },
  { name: '李华', company: '中建三局', workType: '木工', team: '木工二班' },
  { name: '王芳', company: '深圳市政', workType: '普工', team: '综合班组' },
  { name: '赵磊', company: '广东建工', workType: '电工', team: '机电班组' },
  { name: '刘洋', company: '广东建工', workType: '焊工', team: '钢结构班' },
  { name: '陈静', company: '中建三局', workType: '安全员', team: '安全管理组' },
  { name: '周杰', company: '中铁建工', workType: '架子工', team: '脚手架班' },
  { name: '吴敏', company: '深圳市政', workType: '测量员', team: '测量组' },
  { name: '郑伟', company: '中建三局', workType: '混凝土工', team: '混凝土班' },
  { name: '孙涛', company: '广东建工', workType: '起重工', team: '塔吊班' },
  { name: '马超', company: '中铁建工', workType: '普工', team: '杂工班' },
  { name: '黄丽', company: '深圳市政', workType: '钢筋工', team: '钢筋二班' },
]

export const workTypes = ['钢筋工', '木工', '混凝土工', '架子工', '电工', '焊工', '起重工', '普工', '安全员', '测量员']

function buildPersonStat(projectId, index, tpl) {
  const seq = index + 1
  const seed = projectId.charCodeAt(projectId.length - 1) + seq
  const attendanceDays = 22 - (seed % 4)
  const absentCount = seed % 4
  const lateCount = seed % 3
  const earlyLeaveCount = (seed + 1) % 2
  const avgHours = 8 + (seed % 3) * 0.2
  const totalHours = Number((attendanceDays * avgHours).toFixed(1))
  const overtimeHours = (seed % 5) * 4
  const rate = ((attendanceDays / 22) * 100).toFixed(1)

  return {
    id: `${projectId}-person-${seq}`,
    projectId,
    name: tpl.name,
    company: tpl.company,
    workType: tpl.workType,
    team: tpl.team,
    attendanceDays,
    totalHours,
    avgHours: Number(avgHours.toFixed(1)),
    lateCount,
    earlyLeaveCount,
    absentCount,
    overtimeHours,
    attendanceRate: `${rate}%`,
  }
}

function buildTeamStat(projectId, team, company, headcount, seed) {
  const presentDays = headcount * (20 + (seed % 3))
  const absentTotal = headcount * (seed % 3)
  const avgRate = (92 + (seed % 8) + (seed % 10) / 10).toFixed(1)
  return {
    id: `${projectId}-team-${team}`,
    projectId,
    team,
    company,
    headcount,
    presentDays,
    avgRate: `${avgRate}%`,
    absentTotal,
    overtimeHours: 40 + seed * 6,
  }
}

function buildProjectStats(projectId, size) {
  const personList = []
  for (let i = 0; i < size; i++) {
    personList.push(buildPersonStat(projectId, i, personTemplates[i % personTemplates.length]))
  }

  const teamMap = new Map()
  personList.forEach((row, i) => {
    const key = `${row.team}|${row.company}`
    if (!teamMap.has(key)) {
      teamMap.set(key, { team: row.team, company: row.company, headcount: 0, seed: i })
    }
    const item = teamMap.get(key)
    item.headcount += 4 + (i % 5)
  })

  const teamList = [...teamMap.values()].map((item) =>
    buildTeamStat(projectId, item.team, item.company, item.headcount, item.seed),
  )

  return { personList, teamList }
}

const statsByProject = Object.fromEntries(
  projectTree[0].children.map((item) => {
    const size = Math.min(item.count > 100 ? 10 : 8, 10)
    return [item.id, buildProjectStats(item.id, size)]
  }),
)

export function getPersonStats(projectId) {
  return statsByProject[projectId]?.personList.map((row) => ({ ...row })) || []
}

export function getTeamStats(projectId) {
  return statsByProject[projectId]?.teamList.map((row) => ({ ...row })) || []
}

export function getProjectPersonCount(projectId) {
  return getPersonStats(projectId).length
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
