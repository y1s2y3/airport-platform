import {
  PROJECT_NAMES,
  PROJECT_SHORT_NAMES,
  FOCUS_PROJECT_ID,
  HQ_SELECTION_ID,
  getProjectShortName,
  getProjectFullName,
  projectNamePair,
} from '../../config/projectCatalog.js'
import { getHiddenProjectIdSet, findProjectById } from '../../mock/projectBasicInfo.js'

export const DESIGN_WIDTH = 1920
export const DESIGN_HEIGHT = 1080

export {
  PROJECT_NAMES,
  PROJECT_SHORT_NAMES,
  FOCUS_PROJECT_ID,
  HQ_SELECTION_ID,
  getProjectShortName,
  getProjectFullName,
}

/** 生成人员证件照风格占位图（会议签到缩略图/预览） */
export function buildPersonPhotoUrl(name = '人员', seed = 0) {
  const hue = (Math.abs(seed) * 47 + (name.charCodeAt(0) || 0) * 13) % 360
  const initial = name.slice(0, 1) || '人'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="hsl(${hue}, 24%, 92%)"/>
        <stop offset="100%" stop-color="hsl(${hue}, 30%, 78%)"/>
      </linearGradient>
    </defs>
    <rect width="120" height="160" rx="8" fill="url(#bg)"/>
    <circle cx="60" cy="56" r="24" fill="hsl(${hue}, 18%, 58%)"/>
    <ellipse cx="60" cy="124" rx="36" ry="28" fill="hsl(${hue}, 18%, 58%)"/>
    <text x="60" y="150" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-size="11" font-family="sans-serif">${initial}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** 工程指挥部会议签到 · 各部门负责人 */
export const HQ_DEPARTMENT_HEADS = [
  { id: 'hq-dept-safety', name: '王建军', role: '安全部负责人', department: '安全部', jobType: '管理', category: '部门负责人', photo: buildPersonPhotoUrl('王建军', 1) },
  { id: 'hq-dept-quality', name: '陈志明', role: '质量部负责人', department: '质量部', jobType: '管理', category: '部门负责人', photo: buildPersonPhotoUrl('陈志明', 2) },
  { id: 'hq-dept-engineering', name: '刘海峰', role: '工程部负责人', department: '工程部', jobType: '管理', category: '部门负责人', photo: buildPersonPhotoUrl('刘海峰', 3) },
  { id: 'hq-dept-schedule', name: '赵国强', role: '计划部负责人', department: '计划部', jobType: '管理', category: '部门负责人', photo: buildPersonPhotoUrl('赵国强', 4) },
  { id: 'hq-dept-material', name: '孙立新', role: '物资部负责人', department: '物资部', jobType: '管理', category: '部门负责人', photo: buildPersonPhotoUrl('孙立新', 5) },
]

/** 指挥部层级会议签到名单：部门负责人 + 各在建项目项目经理 */
export function buildHqMeetingPersonnel(projects, statusFilters = ['在建']) {
  const building = projects.filter((p) => statusFilters.includes(p.status))
  const deptHeads = HQ_DEPARTMENT_HEADS.map((head) => ({
    ...head,
    unit: head.department,
    position: head.role,
  }))
  const projectManagers = building.map((project, index) => {
    const pm = project.personnel?.find((person) => person.role === '项目经理')
    const projectLabel = project.shortName || project.name
    return {
      id: `hq-pm-${project.id}`,
      name: pm?.name || '—',
      role: '项目经理',
      position: '项目经理',
      projectName: projectLabel,
      unit: projectLabel,
      jobType: '管理',
      category: '项目经理',
      photo: pm?.photo || buildPersonPhotoUrl(pm?.name || projectLabel, index + 20),
    }
  })
  return [...deptHeads, ...projectManagers]
}

const MILESTONE_TEMPLATES = [
  { name: '前期准备', weight: 0.15 },
  { name: '基础施工', weight: 0.2 },
  { name: '主体结构', weight: 0.35 },
  { name: '设备安装', weight: 0.2 },
  { name: '竣工验收', weight: 0.1 },
]

/** 监控摄像头接入平台：海康 / 萤石 */
export const CAMERA_VENDOR_HIKVISION = 'hikvision'
export const CAMERA_VENDOR_EZVIZ = 'ezviz'

export function resolveCameraVendor(camera) {
  if (!camera) return ''
  const raw = camera.vendor || camera.platform || camera.brand || ''
  if (raw === CAMERA_VENDOR_HIKVISION || raw === '海康' || raw === '海康威视') return '海康'
  if (raw === CAMERA_VENDOR_EZVIZ || raw === '萤石' || raw === '萤石云') return '萤石'
  const key = String(camera.id || camera.name || '')
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash += key.charCodeAt(i)
  return hash % 2 === 0 ? '海康' : '萤石'
}

export const FOCUS_CAMERAS = [
  { id: 'c01', name: '地磅-枪机-1三', type: 'gun', vendor: CAMERA_VENDOR_HIKVISION, key: false, online: true, location: '地磅站' },
  { id: 'c02', name: '4号塔吊驾驶室', type: 'gun', vendor: CAMERA_VENDOR_EZVIZ, key: false, online: true, location: '4号塔吊作业区' },
  { id: 'c03', name: '1号门-枪机-1', type: 'gun', vendor: CAMERA_VENDOR_HIKVISION, key: false, online: true, location: '1号出入口' },
  { id: 'c04', name: '钢筋加工厂-枪机-2', type: 'gun', vendor: CAMERA_VENDOR_EZVIZ, key: false, online: true, location: '钢筋加工场' },
  { id: 'c05', name: '3号塔-球机-1', type: 'ptz', vendor: CAMERA_VENDOR_HIKVISION, key: true, online: true, location: '3号塔吊作业区' },
  { id: 'c06', name: '车辆通道-枪机-1', type: 'gun', vendor: CAMERA_VENDOR_EZVIZ, key: false, online: true, location: '车辆通道' },
  { id: 'c07', name: '钢筋加工场-枪机-1', type: 'gun', vendor: CAMERA_VENDOR_HIKVISION, key: false, online: false, location: '钢筋加工场' },
  { id: 'c08', name: '施工活跃区-枪机-1', type: 'gun', vendor: CAMERA_VENDOR_EZVIZ, key: false, online: true, location: '施工活跃区' },
  { id: 'c09', name: '4号机-球机-1 三', type: 'ptz', vendor: CAMERA_VENDOR_HIKVISION, key: true, online: true, location: '4号塔吊作业区' },
  { id: 'c10', name: '2号梯笼-球机-1', type: 'ptz', vendor: CAMERA_VENDOR_EZVIZ, key: false, online: true, location: '2号梯笼' },
  { id: 'c11', name: '1号梯笼-球机-1', type: 'ptz', vendor: CAMERA_VENDOR_HIKVISION, key: false, online: true, location: '1号梯笼' },
  { id: 'c12', name: '工人讲评-枪机-1', type: 'gun', vendor: CAMERA_VENDOR_EZVIZ, key: false, online: true, location: '工人讲评区' },
  { id: 'c13', name: '现场会议室-枪机-1', type: 'gun', vendor: CAMERA_VENDOR_HIKVISION, key: false, online: true, location: '现场会议室' },
  { id: 'c14', name: '3号塔吊驾驶室', type: 'gun', vendor: CAMERA_VENDOR_EZVIZ, key: false, online: true, location: '3号塔吊作业区' },
]

/** 各项目通用监控点位模版（用于生成全量假数据） */
const CAMERA_LOCATION_POOL = [
  '1号出入口',
  '2号出入口',
  '车辆通道',
  '地磅站',
  '钢筋加工场',
  '材料堆场',
  '基坑临边',
  '塔吊作业区',
  '施工活跃区',
  '工人讲评区',
  '现场会议室',
  '配电房',
  '生活区大门',
  '消防通道',
  '围墙转角',
  '梯笼作业区',
]

/**
 * 为单个项目生成监控摄像头假数据（含位置、在线状态、重点标记）
 */
export function buildProjectCameras(projectId, shortName, projectIndex = 0, rand = Math.random) {
  if (projectId === FOCUS_PROJECT_ID) {
    return FOCUS_CAMERAS.map((cam) => ({ ...cam }))
  }
  const count = 8 + (projectIndex % 5) // 8–12 路，覆盖全部项目
  const onlineCount = Math.max(1, Math.round(count * (0.78 + (projectIndex % 4) * 0.04)))
  return Array.from({ length: count }, (_, ci) => {
    const location = CAMERA_LOCATION_POOL[(projectIndex + ci) % CAMERA_LOCATION_POOL.length]
    const isPtz = ci % 4 === 0
    const typeLabel = isPtz ? '球机' : '枪机'
    const seq = ci + 1
    return {
      id: `${projectId}-cam-${String(seq).padStart(2, '0')}`,
      name: `${shortName}-${location}-${typeLabel}-${seq}`,
      type: isPtz ? 'ptz' : 'gun',
      vendor: ci % 2 === 0 ? CAMERA_VENDOR_HIKVISION : CAMERA_VENDOR_EZVIZ,
      key: ci === 0 || ci % 5 === 0,
      online: ci < onlineCount,
      location,
    }
  })
}

const ROLES = [
  { role: '项目经理', jobType: '管理' },
  { role: '安全员', jobType: '安全' },
  { role: '总监理工程师', jobType: '监理' },
  { role: '技术负责人', jobType: '管理' },
  { role: '施工员', jobType: '管理' },
  { role: '质量员', jobType: '管理' },
  { role: '班组长', jobType: '劳务' },
  { role: '钢筋工', jobType: '劳务' },
  { role: '木工', jobType: '劳务' },
  { role: '电工', jobType: '劳务' },
]
const SURNAMES = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴']
const UNITS = ['中建三局', '中建八局', '中铁建工', '中交一航', '上海建工', '广东建工', '深圳建安']

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function formatClockTime(hour, minute, second) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

function buildPunchRecords(rand, ri, isFocus) {
  if (isFocus && ri === 2) {
    return { clockIn: null, clockOut: null }
  }
  if (isFocus && ri === 6) {
    return { clockIn: '07:42:18', clockOut: '12:05:33' }
  }

  const r = rand()
  const isKeyRole = ri < 3

  if (r < (isKeyRole ? 0.08 : 0.2)) {
    return { clockIn: null, clockOut: null }
  }
  if (r < (isKeyRole ? 0.14 : 0.32)) {
    return {
      clockIn: formatClockTime(7 + Math.floor(rand() * 2), Math.floor(rand() * 60), Math.floor(rand() * 60)),
      clockOut: formatClockTime(16 + Math.floor(rand() * 3), Math.floor(rand() * 60), Math.floor(rand() * 60)),
    }
  }

  return {
    clockIn: formatClockTime(7 + Math.floor(rand() * 2), Math.floor(rand() * 60), Math.floor(rand() * 60)),
    clockOut: null,
  }
}

/** 在场：今日已进场且尚未出场 */
export function isPersonOnSite(person) {
  return Boolean(person.clockIn) && !person.clockOut
}

export function getPersonSiteLabel(person) {
  return isPersonOnSite(person) ? '在场' : '不在场'
}

export function classifyPerson(person) {
  if (['管理', '监理'].includes(person.jobType)) return 'manage'
  if (person.jobType === '安全' || person.role === '电工') return 'special'
  return 'labor'
}

export function countPersonnelByType(personnel) {
  const counts = { manage: 0, special: 0, labor: 0 }
  personnel.forEach((p) => {
    counts[classifyPerson(p)] += 1
  })
  return counts
}

export function scalePersonnelCounts(person, counts) {
  const base = Math.max(person.personnel.length, 1)
  const ratio = person.onSiteWorkers / base
  const manage = Math.round(counts.manage * ratio) || Math.round(person.onSiteWorkers * 0.052)
  const special = Math.round(counts.special * ratio) || Math.round(person.onSiteWorkers * 0.06)
  const labor = Math.max(0, person.onSiteWorkers - manage - special)
  return { manage, special, labor, total: person.onSiteWorkers }
}

export function calcLaborBreakdown(totalWorkers) {
  const manage = Math.round(totalWorkers * 0.052)
  const labor = totalWorkers - manage
  const todayRate = 0.952 + (totalWorkers % 7) * 0.003
  const allToday = Math.round(totalWorkers * todayRate)
  const manageToday = Math.round(manage * (todayRate + 0.005))
  const laborToday = Math.max(0, allToday - manageToday)
  return { manage, labor, allToday, manageToday, laborToday, todayRate }
}

export function shortenProjectName(name) {
  return getProjectShortName(name)
}

const GANTT_UNIT_TEMPLATES = [
  {
    name: '土建工程',
    startMonth: 0,
    duration: 16,
    divisions: [
      { name: '基坑支护与降水', offset: 0, duration: 3 },
      { name: '桩基工程', offset: 2, duration: 4 },
      { name: '地下结构', offset: 5, duration: 5 },
      { name: '地上主体结构', offset: 9, duration: 8 },
      { name: '屋面及防水工程', offset: 14, duration: 3 },
    ],
  },
  {
    name: '机电安装工程',
    startMonth: 10,
    duration: 10,
    divisions: [
      { name: '给排水系统', offset: 0, duration: 4 },
      { name: '通风空调系统', offset: 2, duration: 4 },
      { name: '电气照明系统', offset: 4, duration: 3 },
      { name: '弱电智能化', offset: 6, duration: 4 },
    ],
  },
  {
    name: '轨道铺架工程',
    startMonth: 8,
    duration: 12,
    divisions: [
      { name: '轨道路基处理', offset: 0, duration: 4 },
      { name: '轨道铺设', offset: 3, duration: 5 },
      { name: '接触网安装', offset: 7, duration: 4 },
    ],
  },
  {
    name: '附属配套工程',
    startMonth: 14,
    duration: 8,
    divisions: [
      { name: '室外管网', offset: 0, duration: 3 },
      { name: '道路铺装', offset: 2, duration: 3 },
      { name: '绿化景观', offset: 4, duration: 3 },
    ],
  },
]

function shiftMonth(base, months) {
  const d = new Date(base)
  d.setMonth(d.getMonth() + months)
  return d
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildGanttWbs(projectIndex, planRate, actualRate, lagDays, rand) {
  const baseStart = shiftMonth(new Date('2024-03-01'), projectIndex % 4)
  const lagFactor = lagDays > 0 ? 1 + lagDays / 30 : 1
  const progressRatio = planRate ? actualRate / planRate : 1

  const overallPlanEnd = shiftMonth(baseStart, 22)
  const overallActualEnd = shiftMonth(baseStart, Math.round(22 * progressRatio * lagFactor))

  const overall = {
    id: 'overall',
    name: '项目总体',
    level: 0,
    levelLabel: '总体',
    planStart: formatDate(baseStart),
    planEnd: formatDate(overallPlanEnd),
    actualStart: formatDate(baseStart),
    actualEnd: progressRatio >= 1 ? formatDate(overallActualEnd) : null,
    progress: actualRate,
    status: lagDays > 5 ? 'lag' : progressRatio >= 0.95 ? 'done' : progressRatio > 0 ? 'active' : 'pending',
  }

  const units = GANTT_UNIT_TEMPLATES.map((tpl, ui) => {
    const unitPlanStart = shiftMonth(baseStart, tpl.startMonth)
    const unitPlanEnd = shiftMonth(baseStart, tpl.startMonth + tpl.duration)
    const unitLag = Math.round((ui + 1) * lagFactor * (rand() * 0.8 + 0.6))
    const unitActualStart = shiftMonth(unitPlanStart, ui > 1 ? Math.round(unitLag * 0.3) : 0)
    const unitProgress = Math.min(1, progressRatio * (1.05 - ui * 0.08 + rand() * 0.1))
    const unitActualEndMonth = tpl.startMonth + Math.round(tpl.duration * unitProgress)
    const unitDone = unitProgress >= 0.98
    const unitActive = unitProgress > 0.05 && !unitDone

    const unit = {
      id: `unit-${ui}`,
      name: tpl.name,
      level: 1,
      levelLabel: '单位工程',
      planStart: formatDate(unitPlanStart),
      planEnd: formatDate(unitPlanEnd),
      actualStart: unitProgress > 0 ? formatDate(unitActualStart) : null,
      actualEnd: unitDone ? formatDate(shiftMonth(baseStart, unitActualEndMonth)) : null,
      progress: Math.round(unitProgress * 100),
      status: unitDone ? 'done' : unitLag > 12 ? 'lag' : unitActive ? 'active' : 'pending',
    }

    const divisions = tpl.divisions.map((div, di) => {
      const divPlanStart = shiftMonth(baseStart, tpl.startMonth + div.offset)
      const divPlanEnd = shiftMonth(baseStart, tpl.startMonth + div.offset + div.duration)
      const divLag = Math.round(divLagBase(ui, di, lagFactor, rand))
      const divProgress = Math.min(1, unitProgress * (0.9 + rand() * 0.25 - di * 0.06))
      const divDone = divProgress >= 0.97
      const divActive = divProgress > 0.08 && !divDone

      return {
        id: `unit-${ui}-div-${di}`,
        name: div.name,
        level: 2,
        levelLabel: '分部分项',
        planStart: formatDate(divPlanStart),
        planEnd: formatDate(divPlanEnd),
        actualStart: divProgress > 0 ? formatDate(shiftMonth(divPlanStart, Math.round(divLag * 0.25))) : null,
        actualEnd: divDone
          ? formatDate(shiftMonth(baseStart, tpl.startMonth + div.offset + Math.round(div.duration * divProgress)))
          : null,
        progress: Math.round(divProgress * 100),
        status: divDone ? 'done' : divLag > 8 ? 'lag' : divActive ? 'active' : 'pending',
      }
    })

    return { ...unit, divisions }
  })

  return { overall, units }
}

function divLagBase(ui, di, lagFactor, rand) {
  return (ui * 2 + di) * lagFactor * (0.5 + rand() * 0.5)
}

export function flattenGanttRows(ganttWbs) {
  if (!ganttWbs) return []
  const rows = [ganttWbs.overall]
  ganttWbs.units.forEach((unit) => {
    rows.push(unit)
    unit.divisions.forEach((div) => rows.push(div))
  })
  return rows
}

/** 甘特节点状态：未开始 / 进行中 / 已完成 / 滞后 */
export const GANTT_STATUS_LABELS = {
  pending: '未开始',
  active: '进行中',
  done: '已完成',
  lag: '滞后',
}

export function getGanttStatusLabel(status) {
  return GANTT_STATUS_LABELS[status] || GANTT_STATUS_LABELS.pending
}

export function getGanttStatusStats(ganttWbs) {
  const rows = flattenGanttRows(ganttWbs)
  const stats = { pending: 0, active: 0, done: 0, lag: 0 }
  rows.forEach((row) => {
    const key = row.status === 'warn' ? 'lag' : row.status
    if (stats[key] !== undefined) stats[key] += 1
  })
  return { rows, stats, total: rows.length }
}

/** @deprecated 指挥部统计仍使用滞后节点数 */
export function getGanttLagStats(ganttWbs) {
  const rows = flattenGanttRows(ganttWbs)
  const lagNodes = rows.filter((r) => r.status === 'lag' || r.status === 'warn').length
  const totalNodes = rows.length
  const lagNodeRate = totalNodes ? Math.round((lagNodes / totalNodes) * 1000) / 10 : 0
  return { lagNodes, totalNodes, lagNodeRate }
}

export function getGanttTimeRange(rows) {
  if (!rows.length) return { min: Date.now(), max: Date.now(), months: [] }
  let min = Infinity
  let max = -Infinity
  rows.forEach((row) => {
    ;[row.planStart, row.planEnd].forEach((d) => {
      if (!d) return
      const t = new Date(d).getTime()
      if (t < min) min = t
      if (t > max) max = t
    })
  })
  const start = new Date(min)
  start.setDate(1)
  const end = new Date(max)
  const months = []
  const cursor = new Date(start)
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}/${cursor.getMonth() + 1}`)
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return { min, max, months }
}

function buildMilestones(planRate, actualRate, rand) {
  let planAcc = 0
  let actualAcc = 0
  return MILESTONE_TEMPLATES.map((item, idx) => {
    planAcc += Math.round(item.weight * planRate)
    const actualPart = Math.round(item.weight * actualRate * (0.88 + rand() * 0.2))
    actualAcc += actualPart
    const done = actualAcc >= planAcc
    const active = !done && (idx === 0 || actualAcc > 0)
    return {
      name: item.name,
      plan: Math.min(100, planAcc),
      actual: Math.min(100, actualAcc),
      status: done ? 'done' : active ? 'active' : 'pending',
    }
  })
}

export function buildProjects() {
  const rand = seededRandom(42)
  const hiddenIds = getHiddenProjectIdSet()
  return PROJECT_NAMES.map((name, i) => {
    const id = `p-${String(i).padStart(3, '0')}`
    if (hiddenIds.has(id)) return null
    const isFocus = id === FOCUS_PROJECT_ID
    const basic = findProjectById(id)
    const status = basic?.status || (i < 6 ? '前期' : i < 34 ? '在建' : '历史')
    const planRate = Math.round(55 + rand() * 40)
    const actualRate = Math.round(planRate - rand() * 18)
    const deviation = Math.max(0, planRate - actualRate)
    const lagDays = deviation > 8 ? Math.round(deviation * 0.6) : 0
    const cameras = buildProjectCameras(id, PROJECT_SHORT_NAMES[i] || name, i, rand)
    const cameraCount = cameras.length
    const onlineCount = cameras.filter((c) => c.online).length

    const personnel = ROLES.map((item, ri) => {
      const punch = buildPunchRecords(rand, ri, isFocus)
      const name = `${SURNAMES[(i + ri) % SURNAMES.length]}${['伟', '强', '磊', '洋', '勇', '军', '杰', '涛', '鹏', '超'][(i + ri) % 10]}`
      return {
        id: `${id}-person-${ri}`,
        role: item.role,
        position: item.role,
        jobType: item.jobType,
        name,
        photo: buildPersonPhotoUrl(name, i * 10 + ri),
        unit: UNITS[i % UNITS.length],
        clockIn: punch.clockIn,
        clockOut: punch.clockOut,
        phone: `138${String(10000000 + i * 10 + ri).slice(0, 8)}`,
      }
    })

    const ganttWbs = buildGanttWbs(i, planRate, actualRate, lagDays, rand)
    const lagStats = getGanttLagStats(ganttWbs)

    return {
      id,
      name: basic?.projectName || name,
      shortName: basic?.shortName || PROJECT_SHORT_NAMES[i],
      status,
      planRate,
      actualRate,
      deviation,
      lagDays,
      lagLevel: lagDays > 15 ? 'red' : lagDays > 5 ? 'yellow' : 'green',
      lagNodeCount: lagStats.lagNodes,
      lagNodeRate: lagStats.lagNodeRate,
      totalNodeCount: lagStats.totalNodes,
      cameraCount,
      onlineCount,
      offlineCount: cameraCount - onlineCount,
      onSiteWorkers: Math.round(120 + rand() * 380),
      milestones: buildMilestones(planRate, actualRate, rand),
      ganttWbs,
      cameras,
      personnel,
    }
  }).filter(Boolean)
}

export const HAZARD_TYPES = ['动火', '高处', '深基坑', '夜间作业']

export const MOCK_TRANSCRIPTION_LINES = [
  '指挥中心：各位上午好，现在开始今日例行调度会。',
  '指挥中心：请各项目汇报关键岗位到岗情况。',
  '捷运线项目：项目经理在场，安全员在场。',
  '指挥中心：3号塔吊作业区视频显示警戒标识不足，请现场说明。',
  '捷运线项目：已安排人员补设警戒区域，预计30分钟内完成。',
  '指挥中心：今日动火作业务必落实旁站监督，散会。',
]

export const MOCK_MINUTES = {
  title: 'COC每日调度会议纪要',
  date: '2026年6月12日',
  time: '09:00 - 09:35',
  host: '指挥中心',
  attendees: [],
  topics: [
    '各在建项目关键岗位到岗情况通报',
    'T2捷运线项目3号塔吊作业区警戒标识整改要求',
    '今日危险作业（动火、高处）旁站监督强调',
  ],
  instructions: [
    '捷运线项目须在30分钟内完成警戒标识补设',
    '各项目安全员须在16:30前完成次日危险作业填报',
  ],
  tasks: [
    { project: getProjectShortName('T2航站区及配套设施工程空侧捷运线(延长段)项目'), content: '补设3号塔吊作业区警戒标识', deadline: '2026-06-12' },
  ],
}

export const MOCK_NOTICE = {
  id: 'GZ-20260612-001',
  project: getProjectShortName('T2航站区及配套设施工程空侧捷运线(延长段)项目'),
  type: '安全',
  description: '3号塔吊作业区未设置规范警戒标识，存在人员误入风险',
  unit: '中建三局（捷运线施工总承包）',
  deadline: '2026-06-15',
  issueTime: '2026-06-12 09:30',
  issuer: 'COC指挥中心',
}

export const CONSTRUCTION_PARTS = [
  { id: 'all', name: '全部部位' },
  { id: 'part-1', name: '捷运线延长段基坑' },
  { id: 'part-2', name: 'T2航站区主体结构' },
  { id: 'part-3', name: '飞行区5号通道' },
  { id: 'part-4', name: '钢筋加工场' },
  { id: 'part-5', name: '3号塔吊作业区' },
]

/** 巡检对讲设备：现场手持巡检 + App 端视频对讲 */
export const DISPATCH_DEVICES = [
  { id: 'dv-h1', name: '捷运线基坑巡检终端', type: 'handheld', category: '现场手持巡检设备', online: true, operator: '张安全', operatorRole: '安全员' },
  { id: 'dv-h2', name: '塔吊作业区巡检终端', type: 'handheld', category: '现场手持巡检设备', online: true, operator: '李巡检', operatorRole: '巡检员' },
  { id: 'dv-h3', name: '飞行区通道巡检终端', type: 'handheld', category: '现场手持巡检设备', online: false, operator: '王强', operatorRole: '施工员' },
  { id: 'dv-h4', name: '钢筋加工场巡检终端', type: 'handheld', category: '现场手持巡检设备', online: true, operator: '赵军', operatorRole: '质量员' },
  { id: 'dv-h5', name: '航站区主体巡检终端', type: 'handheld', category: '现场手持巡检设备', online: true, operator: '陈磊', operatorRole: '项目经理' },
  { id: 'dv-w1', name: '指挥部调度席', type: 'app', category: 'App端视频对讲', online: true, operator: '陈静', operatorRole: '调度员' },
  { id: 'dv-w2', name: '工程管理部对讲席', type: 'app', category: 'App端视频对讲', online: true, operator: '刘海峰', operatorRole: '工程部负责人' },
  { id: 'dv-w3', name: '安监部对讲席', type: 'app', category: 'App端视频对讲', online: false, operator: '王建军', operatorRole: '安全部负责人' },
  { id: 'dv-w4', name: '质量部对讲席', type: 'app', category: 'App端视频对讲', online: true, operator: '陈志明', operatorRole: '质量部负责人' },
]

/** 人员抽检场景：管理人员 / 特种作业核验对讲设备 */
export const PERSONNEL_DISPATCH_DEVICES = [
  { id: 'pd-h1', name: '管理人员核验手持终端', type: 'handheld', category: '管理人员现场核验', online: true, operator: '人事专员' },
  { id: 'pd-h2', name: '特种作业核验手持终端', type: 'handheld', category: '特种作业现场核验', online: true, operator: '安监员' },
  { id: 'pd-h3', name: '捷运线人员巡检终端', type: 'handheld', category: '管理人员现场核验', online: false, operator: '刘芳' },
  { id: 'pd-h4', name: '航站区特种核验终端', type: 'handheld', category: '特种作业现场核验', online: true, operator: '周强' },
  { id: 'pd-w1', name: '人员管理调度席', type: 'app', category: 'App端视频对讲', online: true },
  { id: 'pd-w2', name: '劳务管理对讲席', type: 'app', category: 'App端视频对讲', online: true },
  { id: 'pd-w3', name: '安监部人员核验席', type: 'app', category: 'App端视频对讲', online: true },
]

export function normalizeDispatchDeviceType(type) {
  return type === 'web' ? 'app' : type
}

export function getDispatchDeviceTypeLabel(type) {
  return normalizeDispatchDeviceType(type) === 'handheld' ? '手持' : 'App'
}

export function isAppDispatchDevice(type) {
  const normalized = normalizeDispatchDeviceType(type)
  return normalized === 'app'
}

export const DISPATCH_MEETING_SUMMARY = {
  status: 'recognizing',
  statusText: 'AI 正在识别会议内容…',
  summary: `本次远程调度于 10:00 启动，通过手持巡检终端与 Web 端视频对讲联动，围绕捷运线延长段基坑、塔吊作业区等重点部位开展现场核查。
AI 累计识别安全隐患 2 项（临边防护缺失、塔吊警戒标识不足），质量问题 2 项（钢筋绑扎间距偏差、混凝土养护不足）。
现场安全员已承诺今日 18:00 前完成基坑东侧防护加固，塔吊作业区 24 小时内补齐警戒标识并上传闭环照片。
质量工程师反馈钢筋绑扎复检将于明日完成，养护措施已按规范补充落实。
综合判定：建议生成限期整改处罚单 2 份、复检通知 1 份，待COC调度室确认后下发项目签收执行。`,
}

export const AI_INTERCOM_RECORDS = [
  { time: '09:58', speaker: '系统', role: 'ai', content: 'Web端视频对讲请求已发出，正在连接捷运线基坑手持巡检终端…' },
  { time: '09:59', speaker: '张安全', role: 'handheld', content: '手持终端已接通，当前位于捷运线延长段基坑东侧，正在进行安全巡检。' },
  { time: '10:01', speaker: 'AI识别', role: 'ai', content: '基于手持终端实时画面，识别临边防护缺失（较大隐患）1项。' },
  { time: '10:03', speaker: 'COC调度室', role: 'web', content: '请现场展示基坑周边防护情况，并说明今日整改计划。' },
  { time: '10:05', speaker: '张安全', role: 'handheld', content: '东侧防护栏部分缺失，下午完成加固，已拍照留存。' },
  { time: '10:07', speaker: 'AI识别', role: 'ai', content: '对讲过程中补充识别：塔吊作业区警戒标识不足（重大隐患）。' },
  { time: '10:09', speaker: 'COC调度室', role: 'web', content: '同意记录，请质量工程师同步说明钢筋绑扎复检进展。' },
  { time: '10:11', speaker: 'AI识别', role: 'ai', content: '对讲记录已归档，正在生成处罚单草稿…' },
]

/** @deprecated use AI_INTERCOM_RECORDS */
export const AI_MEETING_RECORDS = AI_INTERCOM_RECORDS

/** 调度指挥会议 · 参会设备（含项目归属，按项目分组排序） */
export const COMMAND_MEETING_DEVICES = [
  { ...DISPATCH_DEVICES[0], projectId: 'p-000', projectShortName: '捷运线延长段' },
  { ...DISPATCH_DEVICES[3], projectId: 'p-000', projectShortName: '捷运线延长段' },
  { ...DISPATCH_DEVICES[4], projectId: 'p-001', projectShortName: 'T2主体结构' },
  { ...DISPATCH_DEVICES[1], projectId: 'p-002', projectShortName: '3号塔吊区' },
  { ...DISPATCH_DEVICES[2], projectId: 'p-004', projectShortName: '飞行区5号通道', online: true },
  { ...DISPATCH_DEVICES[5], projectId: 'hq', projectShortName: '指挥部' },
  { ...DISPATCH_DEVICES[6], projectId: 'hq', projectShortName: '指挥部' },
  { ...DISPATCH_DEVICES[7], projectId: 'hq', projectShortName: '指挥部', online: true },
  { ...DISPATCH_DEVICES[8], projectId: 'hq', projectShortName: '指挥部' },
]

const DISPATCH_AREA_SUFFIXES = ['基坑', '通道', '塔吊区', '加工区', '东门', '西门', '主体区']
const DISPATCH_OPERATOR_PROFILES = [
  { name: '张安全', role: '安全员' },
  { name: '李巡检', role: '巡检员' },
  { name: '王强', role: '施工员' },
  { name: '赵军', role: '质量员' },
  { name: '陈磊', role: '项目经理' },
  { name: '刘芳', role: '人事专员' },
  { name: '周强', role: '安监员' },
  { name: '吴刚', role: '技术员' },
]
const DISPATCH_OPERATORS = DISPATCH_OPERATOR_PROFILES.map((item) => item.name)

export function resolveDispatchOperatorRole(operator = '') {
  return DISPATCH_OPERATOR_PROFILES.find((item) => item.name === operator)?.role || ''
}

export function formatDispatchOperatorLabel(device = {}) {
  if (!device.operator) return ''
  const role = device.operatorRole || resolveDispatchOperatorRole(device.operator)
  return role ? `${device.operator} · ${role}` : device.operator
}

/** 监控列表 · 各项目巡检对讲设备（预设 + 按项目生成假数据） */
export function getMonitorDispatchDevices(projectId, projectShortName = '') {
  const preset = COMMAND_MEETING_DEVICES.filter((d) => d.projectId === projectId)
  const seedNum = Number.parseInt(String(projectId).replace(/\D/g, ''), 10) || 0
  const rand = seededRandom(seedNum + 317)
  const label = projectShortName || getProjectShortName(projectId) || '项目'
  const result = preset.map((item) => ({
    ...item,
    type: normalizeDispatchDeviceType(item.type),
  }))

  const handheldTarget = 5 + (seedNum % 4)
  const appTarget = 2 + (seedNum % 2)
  let mockIdx = 0

  while (result.filter((d) => d.type === 'handheld').length < handheldTarget) {
    const suffix = DISPATCH_AREA_SUFFIXES[(seedNum + mockIdx) % DISPATCH_AREA_SUFFIXES.length]
    const id = `${projectId}-mock-dvh-${mockIdx}`
    if (!result.some((d) => d.id === id)) {
      const operator = DISPATCH_OPERATORS[(seedNum + mockIdx) % DISPATCH_OPERATORS.length]
      result.push({
        id,
        name: `${label}${suffix}巡检终端`,
        type: 'handheld',
        category: '现场手持巡检设备',
        online: rand() > 0.22,
        operator,
        operatorRole: resolveDispatchOperatorRole(operator),
        projectId,
        projectShortName: label,
      })
    }
    mockIdx += 1
  }

  mockIdx = 0
  while (result.filter((d) => isAppDispatchDevice(d.type)).length < appTarget) {
    const id = `${projectId}-mock-dva-${mockIdx}`
    if (!result.some((d) => d.id === id)) {
      result.push({
        id,
        name: `${label}App对讲席${mockIdx + 1}`,
        type: 'app',
        category: 'App端视频对讲',
        online: rand() > 0.15,
        projectId,
        projectShortName: label,
      })
    }
    mockIdx += 1
  }

  return result
}

/** 根据巡检对讲设备与当前选中项目，解析项目调度页应展示的项目 */
export function resolveDispatchProjectId(device, selectedProjectId = HQ_SELECTION_ID) {
  if (selectedProjectId && selectedProjectId !== HQ_SELECTION_ID) {
    return selectedProjectId
  }
  if (device?.projectId && device.projectId !== HQ_SELECTION_ID) {
    return device.projectId
  }
  const mapped = COMMAND_MEETING_DEVICES.find((item) => item.id === device?.id)
  if (mapped?.projectId && mapped.projectId !== HQ_SELECTION_ID) {
    return mapped.projectId
  }
  return FOCUS_PROJECT_ID
}

export function findDispatchDevice(deviceId) {
  if (!deviceId) return DISPATCH_DEVICES[0]
  return DISPATCH_DEVICES.find((item) => item.id === deviceId) || DISPATCH_DEVICES[0]
}

/** 调度指挥会议 · 实时识别记录 */
export const COMMAND_MEETING_LIVE_RECORDS = [
  { time: '09:58', speaker: '系统', role: 'ai', content: '调度指挥会议已创建，正在邀请各参会设备入会…' },
  { time: '09:59', speaker: '指挥部调度席', role: 'web', content: '各位现场终端，请确认入会，今日调度会正式开始。' },
  { time: '10:00', speaker: '张安全', role: 'handheld', content: '捷运线基坑巡检终端已入会，现场画面正常。' },
  { time: '10:02', speaker: 'AI识别', role: 'ai', content: '识别到捷运线延长段临边防护缺失（较大隐患）1项。' },
  { time: '10:04', speaker: '李巡检', role: 'handheld', content: '塔吊作业区终端已接入，警戒标识正在整改。' },
  { time: '10:06', speaker: 'AI识别', role: 'ai', content: '汇总今日待协调事项 3 项，已写入会议记录。' },
]

/** 调度指挥会议 · 历史记录 */
export const COMMAND_MEETING_HISTORY = [
  {
    id: 'cm-1',
    title: 'COC每日调度指挥会议',
    startTime: '2026-06-16 09:30',
    duration: '35分钟',
    host: 'COC调度室',
    joinedCount: 6,
    pendingCount: 3,
    summary: '围绕捷运线延长段、塔吊作业区等重点部位开展视频调度，确认隐患整改节点。',
  },
  {
    id: 'cm-2',
    title: '飞行区通道专项调度会',
    startTime: '2026-06-15 14:00',
    duration: '28分钟',
    host: '安监部',
    joinedCount: 5,
    pendingCount: 4,
    summary: '专项核查飞行区通道施工安全防护措施，下发复检通知 1 份。',
  },
  {
    id: 'cm-3',
    title: '航站区主体质量协调会',
    startTime: '2026-06-14 10:00',
    duration: '42分钟',
    host: '质量部',
    joinedCount: 7,
    pendingCount: 2,
    summary: '协调钢筋绑扎复检与混凝土养护措施落实，形成闭环清单。',
  },
  {
    id: 'cm-4',
    title: '捷运线延长段周调度会',
    startTime: '2026-06-13 09:00',
    duration: '32分钟',
    host: 'COC调度室',
    joinedCount: 8,
    pendingCount: 2,
    summary: '通报捷运线延长段本周施工进度及临边防护整改情况。',
  },
  {
    id: 'cm-5',
    title: '塔吊作业区安全专题会',
    startTime: '2026-06-12 15:30',
    duration: '25分钟',
    host: '安监部',
    joinedCount: 4,
    pendingCount: 5,
    summary: '针对3号塔吊区警戒标识不足问题开展专项调度。',
  },
  {
    id: 'cm-6',
    title: 'COC每日调度指挥会议',
    startTime: '2026-06-11 09:30',
    duration: '38分钟',
    host: 'COC调度室',
    joinedCount: 6,
    pendingCount: 3,
    summary: '汇总各标段隐患整改进度，明确当日重点盯控部位。',
  },
  {
    id: 'cm-7',
    title: '飞行区5号通道进度协调会',
    startTime: '2026-06-10 11:00',
    duration: '30分钟',
    host: '工程部',
    joinedCount: 5,
    pendingCount: 4,
    summary: '协调下穿通道施工与航班运行保障衔接方案。',
  },
  {
    id: 'cm-8',
    title: '钢筋加工场质量复检会',
    startTime: '2026-06-09 14:30',
    duration: '22分钟',
    host: '质量部',
    joinedCount: 4,
    pendingCount: 2,
    summary: '组织钢筋绑扎间距偏差复检，明确复检报告提交时限。',
  },
  {
    id: 'cm-9',
    title: 'COC每日调度指挥会议',
    startTime: '2026-06-06 09:30',
    duration: '36分钟',
    host: 'COC调度室',
    joinedCount: 7,
    pendingCount: 2,
    summary: '端午节前后施工安排及值班值守情况视频核查。',
  },
  {
    id: 'cm-10',
    title: '航站区配套工程协调会',
    startTime: '2026-06-05 10:30',
    duration: '40分钟',
    host: '工程部',
    joinedCount: 6,
    pendingCount: 3,
    summary: '协调配套工程施工交叉作业及文明施工措施。',
  },
  {
    id: 'cm-11',
    title: '基坑支护专项调度会',
    startTime: '2026-06-03 16:00',
    duration: '27分钟',
    host: '安监部',
    joinedCount: 5,
    pendingCount: 4,
    summary: '核查基坑周边监测数据及临边防护加固落实情况。',
  },
  {
    id: 'cm-12',
    title: 'COC每日调度指挥会议',
    startTime: '2026-05-28 09:30',
    duration: '33分钟',
    host: 'COC调度室',
    joinedCount: 6,
    pendingCount: 3,
    summary: '五月末各标段隐患清零情况汇总及六月部署。',
  },
  {
    id: 'cm-13',
    title: '飞行区通道质量交底会',
    startTime: '2026-05-26 13:30',
    duration: '29分钟',
    host: '质量部',
    joinedCount: 5,
    pendingCount: 2,
    summary: '飞行区通道混凝土浇筑前质量交底及样板确认。',
  },
  {
    id: 'cm-14',
    title: 'T2主体结构进度调度会',
    startTime: '2026-05-22 09:00',
    duration: '45分钟',
    host: '工程部',
    joinedCount: 8,
    pendingCount: 1,
    summary: '主体结构施工节点计划梳理及资源调配协调。',
  },
  {
    id: 'cm-15',
    title: '高风险作业许可联审会',
    startTime: '2026-05-20 15:00',
    duration: '24分钟',
    host: '安监部',
    joinedCount: 4,
    pendingCount: 5,
    summary: '联审本周动火、吊装等高风险作业许可申请。',
  },
  {
    id: 'cm-16',
    title: 'COC每日调度指挥会议',
    startTime: '2026-05-15 09:30',
    duration: '34分钟',
    host: 'COC调度室',
    joinedCount: 6,
    pendingCount: 4,
    summary: '五月半月各项目安全质量态势分析及重点督办。',
  },
  {
    id: 'cm-17',
    title: '捷运线延长段开工动员会',
    startTime: '2026-04-28 10:00',
    duration: '50分钟',
    host: '指挥部',
    joinedCount: 9,
    pendingCount: 0,
    summary: '捷运线延长段全面开工动员及安全质量要求宣贯。',
  },
  {
    id: 'cm-18',
    title: '飞行区施工保障协调会',
    startTime: '2026-04-18 14:00',
    duration: '31分钟',
    host: '工程部',
    joinedCount: 5,
    pendingCount: 3,
    summary: '飞行区施工与运行保障协调机制建立及职责划分。',
  },
]

export function parseMeetingStartMinutes(startTime) {
  const part = startTime.slice(11, 16)
  const [h, m] = part.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function formatMinutesToClock(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function parseDurationMinutes(duration = '') {
  const n = Number.parseInt(duration, 10)
  return Number.isNaN(n) ? 30 : n
}

/** 调度会议回放 · 时间轴节点（开会时间近→远） */
export function getDispatchMeetingPlaybackNodes() {
  return [...COMMAND_MEETING_HISTORY]
    .map((item) => ({
      ...item,
      date: item.startTime.slice(0, 10),
      timeLabel: item.startTime.slice(11, 16),
      minutesOfDay: parseMeetingStartMinutes(item.startTime),
      durationMinutes: parseDurationMinutes(item.duration),
      timestamp: new Date(item.startTime.replace(/-/g, '/')).getTime(),
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
}

export function getMeetingPlaybackDates() {
  return [...new Set(COMMAND_MEETING_HISTORY.map((m) => m.startTime.slice(0, 10)))]
}

export function getMeetingPlaybackMonths() {
  return [...new Set(COMMAND_MEETING_HISTORY.map((m) => m.startTime.slice(0, 7)))].sort((a, b) => b.localeCompare(a))
}

export function buildPenaltyDraft(device) {
  const name = typeof device === 'string' ? device : device.name
  const category = typeof device === 'string' ? '' : (device.category || '')
  const label = category ? `${name}（${category}）` : name
  return {
    id: `penalty-${Date.now()}`,
    title: '巡检对讲处罚单（AI草稿）',
    project: getProjectShortName('T2航站区及配套设施工程空侧捷运线(延长段)项目'),
    device: name,
    date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    aiGenerated: true,
    workType: '安全',
    penaltyContent:
      `根据 ${label} 现场巡检情况：基坑周边临边防护缺失，塔吊作业区警戒标识不足；钢筋绑扎间距偏差超标，混凝土养护时间不足。请限期整改并上传闭环材料。`,
    amount: '5000 元',
    unit: '中建三局（捷运线施工总承包）',
    assignee: '项目经理',
    executor: '项目经理',
    deadline: (() => {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      return d.toISOString().slice(0, 10)
    })(),
  }
}

export function buildReminderDraft(device) {
  const name = typeof device === 'string' ? device : device.name
  const category = typeof device === 'string' ? '' : (device.category || '')
  const label = category ? `${name}（${category}）` : name
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return {
    id: `reminder-${Date.now()}`,
    title: '巡检对讲提示函（草稿）',
    project: getProjectShortName('T2航站区及配套设施工程空侧捷运线(延长段)项目'),
    status: 'draft',
    aiGenerated: true,
    matterDescription: `根据 ${label} 现场巡检情况，请限期落实临边防护与警示标识复查，并反馈闭环情况。`,
    assignee: '项目经理',
    executor: '项目经理',
    deadline: d.toISOString().slice(0, 10),
  }
}

export function buildSamplingNoticeDraft(device) {
  const name = typeof device === 'string' ? device : device.name
  const category = typeof device === 'string' ? '' : (device.category || '')
  const label = category ? `${name}（${category}）` : name
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return {
    id: `notice-${Date.now()}`,
    title: '现场抽检任务单（AI草稿）',
    project: getProjectShortName('T2航站区及配套设施工程空侧捷运线(延长段)项目'),
    status: 'draft',
    aiGenerated: true,
    workType: '安全',
    workRequirement: `根据 ${label} 现场抽检视频对讲记录，1 项分部分项验收未通过须组织复检；2 名特种作业人员证件即将过期须 7 日内换证；1 台塔吊未接入安全监测须 3 日内完成接入。`,
    executor: '',
    executeDept: '',
    deadline: d.toISOString().slice(0, 10),
    remark: '',
  }
}

export {
  VIDEO_MONITOR_THUMB_URL,
  HANDHELD_DEVICE_THUMB_URL,
  isVideoMonitorFeed,
  isHandheldDeviceFeed,
  videoPlaceholderColor,
  videoPlaceholderClass,
  loadVideoMonitorThumbImage,
  loadHandheldDeviceThumbImage,
  resolveThumbImageLoader,
} from '../config/videoAssets.js'

/** @deprecated use DISPATCH_DEVICES */
export const DISPATCH_VIDEOS = DISPATCH_DEVICES

export const PROJECT_HAZARD_SUMMARY = buildProjectHazardSummary(36)

export const PENDING_RANK_SAFETY = [
  { name: '捷运线延长段', value: 5, projectId: 'p-011' },
  { name: '飞行区通道', value: 4, projectId: 'p-012' },
  { name: 'T2主体结构', value: 3, projectId: 'p-013' },
  { name: '钢筋加工场', value: 2, projectId: 'p-011' },
  { name: '3号塔吊区', value: 2, projectId: 'p-011' },
  { name: '航站区配套', value: 1, projectId: 'p-000' },
]

/** 指挥部首页 · 项目黑红榜 */
export const PROJECT_RED_BLACK_LIST = {
  red: [
    {
      id: 'red-1',
      shortName: '捷运线延长段',
      fullName: 'T2航站区及配套设施工程空侧捷运线(延长段)项目',
      description: '临边防护规范到位，警示标识清晰，现场文明施工示范段。',
      imageHue: 145,
    },
    {
      id: 'red-2',
      shortName: 'T2主体结构',
      fullName: 'T2航站区及配套设施工程航站楼基础工程',
      description: '关键岗位到岗率100%，质量样板引路执行到位。',
      imageHue: 165,
    },
    {
      id: 'red-3',
      shortName: '飞行区5号通道',
      fullName: 'T2航站区及配套设施工程飞行区5、6号下穿通道工程',
      description: '隐患排查闭环及时，周检整改率连续四周达100%。',
      imageHue: 130,
    },
    {
      id: 'red-4',
      shortName: '东北站坪软基',
      fullName: '深圳机场东北站坪软基处理工程',
      description: '软基处理工序衔接顺畅，监测数据均在控制范围内。',
      imageHue: 150,
    },
  ],
  black: [
    {
      id: 'black-1',
      shortName: '某某某工程项目',
      fullName: 'T2捷运线项目3号塔吊作业区',
      description: '3号塔吊作业区警戒标识不足，存在人员误入风险，已下发整改通知。',
      imageHue: 8,
    },
    {
      id: 'black-2',
      shortName: '某某某工程项目',
      fullName: '捷运线钢筋加工场',
      description: '料区物料堆放超高，消防通道临时占用，需立即腾挪。',
      imageHue: 18,
    },
    {
      id: 'black-3',
      shortName: '某某某工程项目',
      fullName: '深圳机场东北站坪项目',
      description: '夜间施工照明不足，特种作业旁站记录不完整。',
      imageHue: 5,
    },
  ],
}

/** 黑榜卡片展示用项目名（演示数据） */
export const BLACK_LIST_PROJECT_DISPLAY_NAME = '某某某工程项目'

export const PENDING_RANK_QUALITY = [
  { name: '捷运线延长段', value: 4, projectId: 'p-011' },
  { name: 'T2主体结构', value: 3, projectId: 'p-013' },
  { name: '3号塔吊区', value: 2, projectId: 'p-011' },
  { name: '飞行区通道', value: 2, projectId: 'p-012' },
  { name: '钢筋加工场', value: 1, projectId: 'p-011' },
]

export const DAILY_PENDING_SAFETY = [
  { label: '6/3', value: 4 },
  { label: '6/4', value: 5 },
  { label: '6/5', value: 3 },
  { label: '6/6', value: 6 },
  { label: '6/7', value: 4 },
  { label: '6/8', value: 5 },
  { label: '6/9', value: 3 },
  { label: '6/10', value: 4 },
  { label: '6/11', value: 5 },
  { label: '6/12', value: 3 },
]

export const DAILY_PENDING_QUALITY = [
  { label: '6/3', value: 2 },
  { label: '6/4', value: 3 },
  { label: '6/5', value: 2 },
  { label: '6/6', value: 4 },
  { label: '6/7', value: 3 },
  { label: '6/8', value: 2 },
  { label: '6/9', value: 3 },
  { label: '6/10', value: 2 },
  { label: '6/11', value: 3 },
  { label: '6/12', value: 2 },
]

export function calcRectRate(fixed, found) {
  return found ? `${((fixed / found) * 100).toFixed(1)}%` : '—'
}

/** 图表展示用简称 → 项目 ID（与 PROJECT_SHORT_NAMES 不完全一致） */
const PROJECT_DISPLAY_ALIASES = {
  捷运线延长段: 'p-011',
  飞行区通道: 'p-012',
  飞行区5号通道: 'p-012',
  T2主体结构: 'p-013',
  钢筋加工场: 'p-011',
  '3号塔吊区': 'p-011',
  航站区配套: 'p-000',
  T2航站区配套: 'p-000',
  T1航站区: 'p-001',
  航站楼基础: 'p-013',
  东北站坪: 'p-006',
}

export function findProjectIdByShortName(shortName) {
  if (!shortName) return null
  if (PROJECT_DISPLAY_ALIASES[shortName]) return PROJECT_DISPLAY_ALIASES[shortName]
  const summary = PROJECT_HAZARD_SUMMARY.find(
    (r) =>
      r.projectShortName === shortName
      || getProjectShortName(r) === shortName
      || r.projectShortName.includes(shortName)
      || shortName.includes(r.projectShortName),
  )
  if (summary) return summary.projectId
  const danger = PROJECT_DANGER_WORK_SUMMARY.find(
    (r) =>
      r.projectShortName === shortName
      || r.projectShortName.includes(shortName)
      || shortName.includes(r.projectShortName),
  )
  return danger?.projectId || null
}

export function mapRankBarData(items) {
  return items.map((item) => ({
    value: item.value,
    name: item.name,
    projectId: item.projectId,
  }))
}

export function resolveProjectIdFromChartClick(params, rankList) {
  const payload = params?.data
  if (payload && typeof payload === 'object' && payload.projectId) return payload.projectId
  const idx = params?.dataIndex
  if (typeof idx === 'number' && rankList?.[idx]?.projectId) return rankList[idx].projectId
  const name =
    (typeof params?.name === 'string' && params.name)
    || (typeof params?.value === 'string' && params.value)
    || null
  return name ? findProjectIdByShortName(name) : null
}

const ISSUE_LEVEL_ORDER = { 重大: 0, 较大: 1, 一般: 2 }

export function sortIssuesByLevel(list) {
  return [...list].sort((a, b) => {
    const levelDiff = (ISSUE_LEVEL_ORDER[a.level] ?? 9) - (ISSUE_LEVEL_ORDER[b.level] ?? 9)
    if (levelDiff !== 0) return levelDiff
    return (b.date || '').localeCompare(a.date || '')
  })
}

export function getProjectInspectionStats(projectId) {
  const row = PROJECT_HAZARD_SUMMARY.find((p) => p.projectId === projectId)
  if (!row) {
    return {
      safety: { ...SAFETY_INSPECTION_STATS, inspectCount: 8, foundCount: 4, fixedCount: 3, pendingCount: 1 },
      quality: { ...QUALITY_INSPECTION_STATS, inspectCount: 6, foundCount: 3, fixedCount: 2, pendingCount: 1 },
    }
  }
  return {
    safety: {
      taskCompleteRate: 91.2,
      hazardFindRate: 16.8,
      rectificationRate: parseFloat(calcRectRate(row.safetyFixed, row.safetyFound)),
      pendingCount: row.safetyPending,
      monthTasks: row.safetyInspect,
      foundCount: row.safetyFound,
      inspectCount: row.safetyInspect,
      fixedCount: row.safetyFixed,
    },
    quality: {
      taskCompleteRate: 88.5,
      hazardFindRate: 13.2,
      rectificationRate: parseFloat(calcRectRate(row.qualityFixed, row.qualityFound)),
      pendingCount: row.qualityPending,
      monthTasks: row.qualityInspect,
      foundCount: row.qualityFound,
      inspectCount: row.qualityInspect,
      fixedCount: row.qualityFixed,
    },
  }
}

export const DISPATCH_CURRENT_USER = 'COC调度室'

const DISPATCH_DOC_PENDING_STATUSES = ['待确认', '处理中', '待签收']

export const DISPATCH_DOC_TICKET_LIST = [
  { id: 'pt-01', title: '临边防护缺失限期整改通知', status: '待确认', handler: 'COC调度室', issuer: '安监部', time: '2026-06-12 10:12', docType: '任务单' },
  { id: 'pt-02', title: '塔吊警戒标识不足处罚单', status: '处理中', handler: '工程管理部', issuer: 'COC调度室', time: '2026-06-12 10:15', docType: '处罚单' },
  { id: 'pt-03', title: '钢筋绑扎复检通知', status: '处理中', handler: 'COC调度室', issuer: '质量部', time: '2026-06-12 10:18', docType: '任务单' },
  { id: 'pt-04', title: '混凝土养护措施补充通知', status: '待确认', handler: '质量部', issuer: 'COC调度室', time: '2026-06-12 10:20', docType: '任务单' },
  { id: 'pt-05', title: '文明施工违规处罚单', status: '处理中', handler: 'COC调度室', issuer: '工程管理部', time: '2026-06-11 16:40', docType: '处罚单' },
  { id: 'pt-06', title: '高处作业违规处罚单', status: '已关闭', handler: '安监部', issuer: 'COC调度室', time: '2026-06-10 11:05', docType: '处罚单' },
  { id: 'pt-07', title: '现场抽检任务单', status: '待签收', handler: 'COC调度室', issuer: '质量部', time: '2026-06-15 10:20', docType: '任务单', ccUsers: ['工程管理部'] },
  { id: 'pt-08', title: '复检通知任务单', status: '已下发', handler: '工程管理部', issuer: '安监部', time: '2026-06-14 14:00', docType: '任务单', ccUsers: ['COC调度室'] },
  { id: 'pt-09', title: '临边防护整改任务单', status: '已闭环', handler: '质量部', issuer: 'COC调度室', time: '2026-06-12 10:18', docType: '任务单' },
  {
    id: 'pt-10a',
    title: '临边防护复查提示函',
    matterDescription: '塔吊作业区临边防护与警示标识需限期复查，请项目经理组织落实并反馈。',
    status: '待确认',
    handler: '项目经理',
    issuer: 'COC调度室',
    time: '2026-06-13 09:10',
    docType: '提示函',
    executor: '项目经理',
  },
  { id: 'pt-10', title: '动火作业许可处罚单', status: '待下发', handler: 'COC调度室', issuer: 'COC调度室', time: '2026-06-13 09:30', docType: '处罚单' },
  {
    id: 'pt-11',
    title: '特种作业证件换证提示函',
    matterDescription: '2 名特种作业人员证件即将过期，请 7 日内完成换证并上传闭环材料。',
    status: '已下发',
    handler: '项目经理',
    issuer: '质量部',
    time: '2026-06-14 15:20',
    docType: '提示函',
    executor: '项目经理',
  },
]

/** @deprecated 使用 DISPATCH_DOC_TICKET_LIST */
export const PENALTY_TICKET_LIST = DISPATCH_DOC_TICKET_LIST

export function isDispatchDocRelatedToUser(item, user = DISPATCH_CURRENT_USER) {
  if (item.handler === user || item.issuer === user) return true
  return Array.isArray(item.ccUsers) && item.ccUsers.includes(user)
}

export function filterDispatchDocTickets(list, scope, user = DISPATCH_CURRENT_USER) {
  if (scope === '全部') return list
  if (scope === '与我相关') return list.filter((item) => isDispatchDocRelatedToUser(item, user))
  if (scope === '待我处理') {
    return list.filter(
      (item) => item.handler === user && DISPATCH_DOC_PENDING_STATUSES.includes(item.status),
    )
  }
  if (scope === '我发起的') return list.filter((item) => item.issuer === user)
  return list
}

export function hazardImageStyle(hue = 20) {
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 30%, 82%), hsl(${hue + 15}, 35%, 72%))`,
  }
}

function withHazardDetail(item, type) {
  const hues = [12, 22, 32, 18, 28]
  const idx = parseInt(item.id.replace(/\D/g, ''), 10) || 0
  const ticketType = item.ticketType || HAZARD_TICKET_TYPES[idx % HAZARD_TICKET_TYPES.length]
  const isSupervisionMeeting = ticketType === '监理会议隐患'
  return {
    ...item,
    type,
    ticketType,
    // 监理会议隐患：上报人 / 整改人 / 图片均为空
    reporter: isSupervisionMeeting ? '' : item.reporter,
    rectifier: isSupervisionMeeting ? '' : item.rectifier,
    detail: {
      unit: '中建三局',
      deadline: '2026-06-18',
      measure: '限期完成整改并上传闭环照片',
      requirement: item.desc,
      ticketType,
      reporter: isSupervisionMeeting ? '' : item.reporter,
      rectifier: isSupervisionMeeting
        ? ''
        : item.rectifier || HAZARD_RECTIFIERS[idx % HAZARD_RECTIFIERS.length],
      reportTime: `${item.date} 09:30`,
      images: isSupervisionMeeting
        ? []
        : [
            { id: `${item.id}-img1`, label: '隐患现场图', ...hazardImageStyle(hues[idx % hues.length]) },
            { id: `${item.id}-img2`, label: '整改参照图', ...hazardImageStyle(hues[(idx + 2) % hues.length]) },
          ],
    },
  }
}

export const HAZARD_LEVELS = ['一般', '较大', '重大']
const HAZARD_STATUSES = ['待整改', '整改中', '已闭合']
export const HAZARD_REPORTERS = ['张安全', '李巡检', '王强', '赵军', '陈磊', '刘洋', '周质量', '吴检', '郑伟', '孙涛', '钱鹏', '马检']
export const HAZARD_RECTIFIERS = ['王强', '赵军', '陈磊', '刘洋', '周质量', '吴检', '郑伟', '孙涛', '钱鹏', '马检', '张安全', '李巡检']
/** 隐患单号类型 */
export const HAZARD_TICKET_TYPES = ['调度隐患', '监理会议隐患']

/** 任务单/提示函 · 执行人候选（姓名 + 岗位） */
export const TASK_EXECUTOR_OPTIONS = [
  { name: '陈静', position: 'COC调度员' },
  { name: '张安全', position: '安监专员' },
  { name: '李巡检', position: '巡检工程师' },
  { name: '王强', position: '项目经理' },
  { name: '赵军', position: '质量工程师' },
  { name: '陈磊', position: '安全员' },
  { name: '刘洋', position: '施工员' },
  { name: '周质量', position: '质量员' },
  { name: '吴检', position: '监理工程师' },
  { name: '郑伟', position: '技术负责人' },
  { name: '孙涛', position: '项目副经理' },
  { name: '钱鹏', position: '机电工程师' },
  { name: '马检', position: '试验员' },
]

export const TASK_WORK_TYPES = ['安全', '质量']
export const TASK_WORK_SOURCES = ['实时监控', '视频回放', '调度会议', '视频截屏']
export const TASK_EXECUTE_DEPARTMENTS = ['安监部', '质量部', '工程管理部', 'COC调度室', '责任单位']
export const TASK_LEDGER_HANDLING_OPTIONS = ['纳入任务单台账', '同步隐患台账', '仅问题截图存档']

export const PENALTY_CLAUSE_OPTIONS = [
  '《建设工程施工合同》违约处罚条款',
  '《安全生产责任制》考核条款',
  '《文明施工管理办法》处罚条款',
  '指挥部调度会决议处罚条款',
]

const SAFETY_DESC_TEMPLATES = [
  '基坑周边临边防护缺失', '塔吊作业区警戒标识不足', '加工场消防器材过期', '高处作业未系安全带',
  '通道口堆放建材', '深基坑监测数据异常', '配电箱门未关闭', '脚手架连墙件不足',
  '动火作业区域未设监护', '临边洞口防护不到位', '施工电梯限位器失效', '氧气乙炔瓶间距不足',
  '安全网破损未及时更换', '工人未佩戴安全帽进入现场', '起重吊装区域无专人指挥', '电缆线拖地敷设',
  '基坑边堆载超限', '模板支撑体系验收资料不全', '有限空间作业未审批', '夜间施工照明不足',
  '塔吊附墙装置松动', '施工便道积水未设置警示', '危险品仓库通风不良', '交叉作业未设隔离区',
]

const QUALITY_DESC_TEMPLATES = [
  '混凝土养护时间不足', '钢筋绑扎间距偏差超标', '原材料合格证缺失', '模板拼缝漏浆',
  '预埋件位置偏差', '砌体灰缝不饱满', '防水层搭接宽度不足', '回填土压实度不达标',
  '梁柱节点箍筋缺失', '现浇板厚度偏差', '砂浆强度试块不足', '外墙面砖空鼓',
  '混凝土蜂窝麻面', '钢筋保护层厚度不足', '砌体拉结筋设置不规范', '防水卷材空鼓起泡',
  '桩基垂直度偏差超标', '钢结构焊缝探伤不合格', '地面平整度偏差过大', '给排水管道坡度不足',
  '幕墙打胶不连续', '保温板粘贴面积不足', '钢筋机械连接接头未送检', '抹灰层空鼓开裂',
]

function hazardDate(offset) {
  const d = new Date(2026, 5, 12)
  d.setDate(d.getDate() - (offset % 24))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mockProjectId(i) {
  return `p-${String(i % 36).padStart(3, '0')}`
}

function buildIssuesForType(type, projectsCount = 36) {
  const prefix = type === 'safety' ? 'sh' : 'qh'
  const templates = type === 'safety' ? SAFETY_DESC_TEMPLATES : QUALITY_DESC_TEMPLATES
  const parts = CONSTRUCTION_PARTS.filter((p) => p.id !== 'all')
  const levelWeights = ['一般', '一般', '一般', '较大', '较大', '严重', '重大']
  const statusWeights = ['待整改', '待整改', '整改中', '整改中', '已闭合', '已闭合', '已闭合']
  const issues = []
  let seq = 1
  for (let pIdx = 0; pIdx < projectsCount; pIdx++) {
    const projectId = mockProjectId(pIdx)
    const perProject = 10 + (pIdx % 6)
    for (let j = 0; j < perProject; j++) {
      const i = seq - 1
      issues.push(withHazardDetail({
        id: `${prefix}-${String(seq).padStart(3, '0')}`,
        projectId,
        partId: parts[(i + j) % parts.length].id,
        date: hazardDate(i + j),
        level: levelWeights[(i + j + pIdx) % levelWeights.length],
        desc: templates[(i + j) % templates.length],
        status: statusWeights[(i + j + pIdx) % statusWeights.length],
        location: parts[(i + pIdx + j) % parts.length].name,
        reporter: HAZARD_REPORTERS[(i + j) % HAZARD_REPORTERS.length],
        rectifier: HAZARD_RECTIFIERS[(i + j + 3) % HAZARD_RECTIFIERS.length],
        ticketType: HAZARD_TICKET_TYPES[(i + j) % HAZARD_TICKET_TYPES.length],
      }, type))
      seq += 1
    }
  }
  return issues
}

function buildSafetyHazards() {
  return buildIssuesForType('safety')
}

function buildQualityHazards() {
  return buildIssuesForType('quality')
}

function buildProjectHazardSummary(count = 36) {
  return Array.from({ length: count }, (_, i) => {
    const base = 6 + (i % 9)
    return {
      projectId: mockProjectId(i),
      ...projectNamePair(i),
      safetyInspect: base + 4,
      safetyFound: base,
      safetyFixed: Math.max(1, base - 2),
      safetyPending: 1 + (i % 4),
      qualityInspect: base + 2,
      qualityFound: Math.max(2, base - 1),
      qualityFixed: Math.max(1, base - 2),
      qualityPending: i % 3,
    }
  })
}

export const SAFETY_INSPECTION_STATS = {
  taskCompleteRate: 92.5,
  hazardFindRate: 18.2,
  rectificationRate: 87.3,
  pendingCount: 5,
  monthTasks: 48,
  foundCount: 12,
}

export const QUALITY_INSPECTION_STATS = {
  taskCompleteRate: 89.8,
  hazardFindRate: 14.6,
  rectificationRate: 91.2,
  pendingCount: 3,
  monthTasks: 36,
  foundCount: 8,
}

export const SAFETY_HAZARDS = buildSafetyHazards()

export const QUALITY_HAZARDS = buildQualityHazards()

/**
 * COC 隐患清单 · 确认关闭（仅「监理会议隐患」）
 * 状态与后台对齐：待整改 → 已闭合（后台侧为「已关闭」）
 */
export function closeCocSupervisionMeetingHazard(hazardId, payload = {}) {
  const id = String(hazardId || '')
  if (!id) return { ok: false, msg: '隐患不存在' }

  const target =
    SAFETY_HAZARDS.find((item) => item.id === id) ||
    QUALITY_HAZARDS.find((item) => item.id === id)
  if (!target) return { ok: false, msg: '隐患不存在' }

  const ticket = target.ticketType || target.detail?.ticketType || ''
  if (ticket !== '监理会议隐患') {
    return { ok: false, msg: '仅监理会议隐患支持确认关闭' }
  }
  if (target.status !== '待整改') {
    return { ok: false, msg: '仅「待整改」状态可确认关闭' }
  }

  target.status = '已闭合'
  if (target.detail && typeof target.detail === 'object') {
    target.detail.closedAt =
      payload.closedAt ||
      new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    target.detail.closedBy = payload.operator || '指挥部用户'
  }
  return { ok: true, hazard: target }
}

export function getProjectIssuesByType(type, projectId) {
  const list = type === 'safety' ? SAFETY_HAZARDS : QUALITY_HAZARDS
  if (!projectId || projectId === HQ_SELECTION_ID) return list
  return list.filter((item) => item.projectId === projectId)
}

/** 隐患来源分类（待整改顶栏统计用） */
export const HAZARD_CHANNEL_OPTIONS = [
  { key: 'safety', label: '安全隐患', color: '#E6A23C' },
  { key: 'quality', label: '质量隐患', color: '#409EFF' },
  { key: 'snapshot', label: '随手拍', color: '#67C23A' },
  { key: 'supervision', label: '监理例会登记', color: '#B37FEB' },
]

export const HAZARD_STATUS_SEGMENTS = [
  { name: '待整改', color: '#F56C6C' },
  { name: '整改中', color: '#409EFF' },
  { name: '已闭合', color: '#67C23A' },
]

export function getPendingProjectIssues(type, projectId) {
  return sortIssuesByLevel(
    getProjectIssuesByType(type, projectId).filter((item) => item.status !== '已闭合'),
  )
}

/** 指挥部 · 隐患分析环图分段（质量+安全巡检） */
export const HQ_HAZARD_LEVEL_SEGMENTS = [
  { name: '一般', filter: '一般', color: '#1498F6' },
  { name: '较大', filter: '较大', color: '#E5E5E5' },
  { name: '严重', filter: '严重', color: '#47D391' },
  { name: '重大', filter: '重大', color: '#F6C575' },
]

/**
 * 项目级「隐患统计」：待整改总量 + 分类 + 整改状态环 + 等级环
 */
export function getProjectHazardStats(projectId) {
  const all = [
    ...getProjectIssuesByType('safety', projectId).map((item, index) => ({
      ...item,
      channel: index % 7 === 0 ? 'snapshot' : 'safety',
    })),
    ...getProjectIssuesByType('quality', projectId).map((item, index) => ({
      ...item,
      channel: index % 6 === 0 ? 'supervision' : 'quality',
    })),
  ]

  const pending = all.filter((item) => item.status === '待整改')
  const byChannel = Object.fromEntries(HAZARD_CHANNEL_OPTIONS.map((c) => [c.key, 0]))
  pending.forEach((item) => {
    if (byChannel[item.channel] != null) byChannel[item.channel] += 1
  })

  const byStatus = Object.fromEntries(HAZARD_STATUS_SEGMENTS.map((s) => [s.name, 0]))
  all.forEach((item) => {
    if (byStatus[item.status] != null) byStatus[item.status] += 1
  })

  const byLevel = Object.fromEntries(HQ_HAZARD_LEVEL_SEGMENTS.map((s) => [s.filter, 0]))
  all.forEach((item) => {
    if (byLevel[item.level] != null) byLevel[item.level] += 1
  })

  return {
    pendingTotal: pending.length,
    total: all.length,
    channels: HAZARD_CHANNEL_OPTIONS.map((c) => ({
      ...c,
      value: byChannel[c.key] || 0,
    })),
    statusSegments: HAZARD_STATUS_SEGMENTS.map((s) => ({
      ...s,
      value: byStatus[s.name] || 0,
    })),
    levelSegments: HQ_HAZARD_LEVEL_SEGMENTS.map((s) => ({
      name: s.name,
      color: s.color,
      value: byLevel[s.filter] || 0,
    })),
  }
}

export function getHqOpenHazards() {
  return [...SAFETY_HAZARDS, ...QUALITY_HAZARDS].filter((h) => h.status !== '已闭合')
}

/** 指挥部 · 隐患分析 Top 项目展示名（演示数据） */
export const HQ_HAZARD_TOP_PROJECT_DISPLAY_NAME = '机场扩建项目指挥部某某某施工工程项目'

export function getHqPendingTopProjects(limit = 3) {
  return [...PROJECT_HAZARD_SUMMARY]
    .map((r) => ({
      projectId: r.projectId,
      shortName: HQ_HAZARD_TOP_PROJECT_DISPLAY_NAME,
      fullName: HQ_HAZARD_TOP_PROJECT_DISPLAY_NAME,
      value: r.safetyPending + r.qualityPending,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

export function calcHqCertWarningCount() {
  return (PERSONNEL_CERT_STATS.certExpire ?? 0) + (PERSONNEL_CERT_STATS.noCert ?? 0)
}

// ── 高风险作业 / 危大工程 ──

export const DANGER_WORK_STATUSES = ['待开工', '作业中', '已完成']
export const MAJOR_PROJECT_STATUSES = ['筹备中', '监测中', '施工中', '已验收']
export const PERMIT_STATUSES = ['待确认', '已许可', '已驳回']

export const DANGER_WORK_STATS = {
  reportRate: 96.5,
  dayWorkCount: 18,
  nightWorkCount: 4,
  highRiskCount: 6,
  permitIssued: 14,
  spotCheckRate: 82.3,
}

export const MAJOR_PROJECT_STATS = {
  totalCount: 8,
  monitoringCount: 5,
  alertCount: 1,
  confirmedCount: 6,
  permitRate: 88.9,
}

export const PROJECT_DANGER_WORK_SUMMARY = Array.from({ length: 36 }, (_, i) => {
  const base = 2 + (i % 6)
  return {
    projectId: mockProjectId(i),
    ...projectNamePair(i),
    todayCount: base,
    nightCount: i % 4 === 0 ? 1 : 0,
    highRisk: 1 + (i % 3),
    inProgress: Math.max(1, base - 1),
    permitDone: Math.max(1, base),
    majorCount: 1 + (i % 3),
  }
})

export const MAJOR_PROJECT_PROJECT_RANK = [...PROJECT_DANGER_WORK_SUMMARY]
  .map((row) => ({
    name: row.projectShortName,
    value: row.majorCount,
    projectId: row.projectId,
  }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 8)

export const DANGER_WORK_TYPE_DIST = [
  { name: '动火', value: 8 },
  { name: '高处', value: 12 },
  { name: '深基坑', value: 5 },
  { name: '夜间作业', value: 4 },
]

export const DANGER_WORK_PROJECT_RANK = [
  { name: '捷运线延长段', value: 6, projectId: 'p-011' },
  { name: 'T2航站区配套', value: 4, projectId: 'p-000' },
  { name: '飞行区通道', value: 3, projectId: 'p-012' },
  { name: 'T1航站区', value: 3, projectId: 'p-001' },
  { name: '航站楼基础', value: 2, projectId: 'p-013' },
]

export const DAILY_DANGER_WORK_TREND = [
  { label: '6/3', value: 14 },
  { label: '6/4', value: 16 },
  { label: '6/5', value: 15 },
  { label: '6/6', value: 19 },
  { label: '6/7', value: 17 },
  { label: '6/8', value: 18 },
  { label: '6/9', value: 16 },
  { label: '6/10', value: 20 },
  { label: '6/11', value: 17 },
  { label: '6/12', value: 18 },
]

export const MAJOR_PROJECT_TYPE_DIST = [
  { name: '深基坑', value: 3 },
  { name: '高支模', value: 2 },
  { name: '起重吊装', value: 2 },
  { name: '暗挖工程', value: 1 },
]

export const MAJOR_PROJECT_MONITOR_TREND = [
  { label: '6/3', value: 2.1 },
  { label: '6/4', value: 2.3 },
  { label: '6/5', value: 2.0 },
  { label: '6/6', value: 2.5 },
  { label: '6/7', value: 2.2 },
  { label: '6/8', value: 2.4 },
  { label: '6/9', value: 2.1 },
  { label: '6/10', value: 2.6 },
  { label: '6/11', value: 2.3 },
  { label: '6/12', value: 2.4 },
]

function withDangerWorkDetail(item) {
  const idx = parseInt(item.id.replace(/\D/g, ''), 10) || 0
  const hues = [8, 18, 28, 14, 24]
  return {
    ...item,
    detail: {
      unit: '中建三局',
      reporter: item.reporter,
      reportTime: `${item.date} 16:20`,
      measures: item.measures,
      personnel: item.personnel,
      cameraId: item.cameraId || 'c05',
      checkItems: [
        { name: '支护措施', ok: item.permitStatus === '已许可' },
        { name: '监测数据', ok: item.permitStatus === '已许可' },
        { name: '警戒区域', ok: item.status !== '待开工' },
        { name: '应急物资', ok: item.permitStatus !== '待确认' },
      ],
      images: [
        { id: `${item.id}-img1`, label: '作业现场图', ...hazardImageStyle(hues[idx % hues.length]) },
        { id: `${item.id}-img2`, label: '许可证件图', ...hazardImageStyle(hues[(idx + 2) % hues.length]) },
      ],
    },
  }
}

function withMajorProjectDetail(item) {
  return {
    ...item,
    detail: {
      unit: '中建三局',
      scheme: item.scheme,
      specialScheme: item.specialScheme,
      monitorData: item.monitorData,
      lastCheck: item.lastCheck,
      checkItems: [
        { name: '支护验收', ok: item.confirmStatus === '已确认' },
        { name: '监测布点', ok: item.monitorStatus !== '正常' || item.status !== '筹备中' },
        { name: '警戒区设置', ok: item.confirmStatus === '已确认' },
        { name: '应急物资', ok: item.permitStatus === '已许可' },
      ],
    },
  }
}

function buildDangerWorkList(count = 36) {
  const types = HAZARD_TYPES
  const subTypes = {
    动火: ['一级动火', '二级动火', '焊接切割'],
    高处: ['外架搭设', '高处模板安装', '幕墙安装'],
    深基坑: ['深基坑开挖', '下穿通道基坑', '土方开挖'],
    夜间作业: ['夜间混凝土浇筑', '夜间土方外运', '夜间设备安装'],
  }
  const statuses = DANGER_WORK_STATUSES
  const permits = PERMIT_STATUSES
  const locations = CONSTRUCTION_PARTS.filter((p) => p.id !== 'all').map((p) => p.name)
  const cameras = ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c08']
  const times = ['08:00-12:00', '14:00-18:00', '全天', '22:00-06:00', '09:00-11:30', '08:30-17:00']

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length]
    const isNight = type === '夜间作业'
    const isHighRisk = type === '动火' || type === '深基坑' || isNight
    const status = statuses[i % statuses.length]
    const permitStatus = permits[i % 2 === 0 ? 1 : 0]
    return withDangerWorkDetail({
      id: `dw-${String(i + 1).padStart(2, '0')}`,
      projectId: mockProjectId(i),
      ...projectNamePair(i),
      contractor: i % 2 === 0 ? '中建三局深圳机场项目部' : '中交一航局机场工程公司',
      type,
      subType: subTypes[type][i % subTypes[type].length],
      date: hazardDate(i % 10),
      time: times[i % times.length],
      location: locations[i % locations.length],
      personnel: `作业${4 + (i % 8)}人`,
      measures: '专项方案交底、监护到位、应急物资齐备',
      status,
      isNight,
      isHighRisk,
      permitStatus,
      reporter: HAZARD_REPORTERS[i % HAZARD_REPORTERS.length],
      cameraId: cameras[i % cameras.length],
    })
  })
}

function buildMajorProjectList(count = 36) {
  const categories = ['深基坑', '高支模', '起重吊装', '暗挖工程']
  const statuses = MAJOR_PROJECT_STATUSES
  const monitorStatuses = ['正常', '预警', '待布点', '已结束']
  const names = [
    '深基坑工程', '高支模工程', '塔吊安拆工程', '暗挖通道工程', '起重吊装工程',
    '基坑支护工程', '模板支撑工程', '大型设备吊装', '下穿暗挖工程',
  ]

  return Array.from({ length: count }, (_, i) => {
    const category = categories[i % categories.length]
    const status = statuses[i % statuses.length]
    const monitorStatus = monitorStatuses[i % monitorStatuses.length]
    const confirmed = i % 3 !== 0
    return withMajorProjectDetail({
      id: `mp-${String(i + 1).padStart(2, '0')}`,
      projectId: mockProjectId(i),
      name: `${PROJECT_SHORT_NAMES[i % PROJECT_SHORT_NAMES.length]}·${names[i % names.length]}`,
      category,
      status,
      monitorStatus,
      monitorData: monitorStatus === '待布点' ? '—' : `位移 ${(1.5 + (i % 5) * 0.6).toFixed(1)}mm`,
      confirmStatus: confirmed ? '已确认' : '待确认',
      permitStatus: confirmed ? '已许可' : '待确认',
      scheme: `${category}专项施工方案 V${1 + (i % 3)}.${i % 5}`,
      specialScheme: `${category}监测专项方案`,
      lastCheck: status === '筹备中' ? '—' : `2026-06-${String(12 - (i % 5)).padStart(2, '0')} 08:00`,
    })
  })
}

export const DANGER_WORK_LIST = buildDangerWorkList(36)

export const MAJOR_PROJECT_LIST = buildMajorProjectList(36)

export function filterByProjectId(list, projectId) {
  if (!projectId || projectId === HQ_SELECTION_ID) return list
  return list.filter((item) => item.projectId === projectId)
}

export function getProjectDangerWorkStats(projectId) {
  const row = PROJECT_DANGER_WORK_SUMMARY.find((p) => p.projectId === projectId)
  if (!row) {
    return { ...DANGER_WORK_STATS, dayWorkCount: 3, nightWorkCount: 1, highRiskCount: 1, permitIssued: 2 }
  }
  return {
    reportRate: 94.2,
    dayWorkCount: row.todayCount,
    nightWorkCount: row.nightCount,
    highRiskCount: row.highRisk,
    permitIssued: row.permitDone,
    spotCheckRate: 79.5,
  }
}

export function getProjectMajorProjectStats(projectId) {
  const row = PROJECT_DANGER_WORK_SUMMARY.find((p) => p.projectId === projectId)
  const majors = filterByProjectId(MAJOR_PROJECT_LIST, projectId)
  const alertCount = majors.filter((m) => m.monitorStatus === '预警').length
  if (!row) {
    return { totalCount: majors.length || 1, monitoringCount: 1, alertCount, confirmedCount: 0, permitRate: 0 }
  }
  return {
    totalCount: row.majorCount,
    monitoringCount: majors.filter((m) => ['监测中', '施工中'].includes(m.status)).length,
    alertCount,
    confirmedCount: majors.filter((m) => m.confirmStatus === '已确认').length,
    permitRate: row.majorCount ? Math.round((majors.filter((m) => m.permitStatus === '已许可').length / row.majorCount) * 1000) / 10 : 0,
  }
}

// ── 环状图状态分段 ──
export const DANGER_WORK_RING_SEGMENTS = [
  { name: '待开工', filter: '待开工', color: '#909399' },
  { name: '作业中', filter: '作业中', color: '#409eff' },
  { name: '已完成', filter: '已完成', color: '#67c23a' },
]

export const MAJOR_PROJECT_RING_SEGMENTS = [
  { name: '筹备中', filter: '筹备中', color: '#909399' },
  { name: '监测中', filter: '监测中', color: '#409eff' },
  { name: '施工中', filter: '施工中', color: '#e6a23c' },
  { name: '已验收', filter: '已验收', color: '#67c23a' },
]

export const WORK_PERMIT_LIST = [
  { id: 'wp-01', title: '捷运线延长段一级动火作业许可', status: '已许可', handler: '工程管理部', time: '2026-06-12 08:15' },
  { id: 'wp-02', title: '深基坑开挖作业电子许可', status: '已许可', handler: 'COC调度室', time: '2026-06-12 07:40' },
  { id: 'wp-03', title: '夜间混凝土浇筑作业许可', status: '待确认', handler: '安监部', time: '2026-06-12 16:20' },
  { id: 'wp-04', title: '3号塔吊安拆条件确认许可', status: '已许可', handler: '工程管理部', time: '2026-06-11 17:00' },
  { id: 'wp-05', title: '飞行区通道暗挖开工许可', status: '处理中', handler: '质量部', time: '2026-06-12 09:30' },
]

export function buildWorkPermitDraft(device) {
  const name = typeof device === 'string' ? device : device.name
  return {
    id: `permit-${Date.now()}`,
    title: '电子作业许可（AI草稿）',
    status: 'draft',
    content: `根据 ${name} 远程调度确认记录，汇总作业许可条件如下：

一、危险作业确认
1. 动火作业：灭火器、防火毯、监护人已到位；
2. 深基坑：边坡监测数据正常，临边防护完整。

二、危大工程确认
1. 支护验收合格，监测布点已完成；
2. 警戒区设置规范，应急物资备齐。

三、许可意见
经远程视频核验，同意按申报计划开展作业。`,
  }
}

// ── 质量 / 人员 / 设备抽检 ──
const SAMPLE_RESULTS = ['合格', '不合格', '待复检']
const SAMPLE_STATUSES = ['待整改', '整改中', '已闭合']
const PERSONNEL_ANOMALY_TYPES = ['无证上岗', '证件过期', '人证不符', '未培训']
const EQUIPMENT_ANOMALY_TYPES = ['检验过期', '维保逾期', '限位失效', '标识缺失']

function buildProjectSampleSummary(prefix, count = 36) {
  return Array.from({ length: count }, (_, i) => {
    const base = 4 + (i % 8)
    return {
      projectId: mockProjectId(i),
      ...projectNamePair(i),
      taskCount: base + 2,
      passCount: base,
      failCount: 1 + (i % 3),
      pendingCount: i % 3,
      anomalyCount: 1 + (i % 4),
    }
  })
}

function buildQualitySampleTasks(count = 36) {
  const items = ['混凝土强度', '钢筋保护层', '模板垂直度', '防水层厚度', '砂浆配合比', '预埋件偏差']
  const parts = CONSTRUCTION_PARTS.filter((p) => p.id !== 'all')
  return Array.from({ length: count }, (_, i) => ({
    id: `qs-${String(i + 1).padStart(2, '0')}`,
    projectId: mockProjectId(i),
    date: hazardDate(i % 12),
    part: parts[i % parts.length].name,
    item: items[i % items.length],
    result: SAMPLE_RESULTS[i % 3],
    status: SAMPLE_STATUSES[i % 3],
    inspector: HAZARD_REPORTERS[i % HAZARD_REPORTERS.length],
  }))
}

// ── 质量抽检四类业务 ──
export const QUALITY_EVAL_TYPES = ['检验批验收', '分部分项验收', '竣工验收', '专项验收']
export const QUALITY_EVAL_STATUSES = ['待验收', '验收中', '已通过', '未通过']
export const BRAND_SUPPLIER_STATUSES = ['合格', '观察使用', '不合格', '已退场']
export const MATERIAL_ENTRY_STATUSES = ['待核验', '一致', '不一致', '已退场']
export const QUALITY_EQUIP_ENTRY_STATUSES = ['待验收', '已进场', '不一致', '已退场']

const SUPPLIER_NAMES = ['大金空调', '格力机电', '美的暖通', '三菱电梯', '奥的斯电梯', '海螺水泥', '华润建材', '中建钢构']
const MATERIAL_NAMES = ['HRB400钢筋', 'C30商品混凝土', 'SBS防水卷材', '预拌砂浆', '防火涂料', '电缆YJV', '加气混凝土砌块', '模板木方']
const HVAC_EQUIP_NAMES = ['VRV多联机', '离心式冷水机组', '组合式空调箱', '风机盘管', '新风机组', '冷却塔', '排烟风机', '风冷热泵']
const EVAL_ITEMS = ['捷运线主体结构', '飞行区通道底板', 'T2航站区幕墙', '基坑支护工程', '机电安装工程', '屋面防水工程']

function buildQualityEvalList(count = 36) {
  const parts = CONSTRUCTION_PARTS.filter((p) => p.id !== 'all')
  return Array.from({ length: count }, (_, i) => ({
    id: `qe-${String(i + 1).padStart(2, '0')}`,
    projectId: mockProjectId(i),
    date: hazardDate(i % 14),
    evalType: QUALITY_EVAL_TYPES[i % 4],
    item: EVAL_ITEMS[i % EVAL_ITEMS.length],
    location: parts[i % parts.length].name,
    result: i % 7 === 0 ? '未通过' : '已通过',
    status: QUALITY_EVAL_STATUSES[i % 4],
    inspector: HAZARD_REPORTERS[i % HAZARD_REPORTERS.length],
  }))
}

function buildBrandSupplierList(count = 36) {
  const categories = ['暖通设备', '电梯', '建材', '钢结构', '机电', '消防']
  return Array.from({ length: count }, (_, i) => ({
    id: `bs-${String(i + 1).padStart(2, '0')}`,
    projectId: mockProjectId(i),
    date: hazardDate(i % 10),
    supplier: SUPPLIER_NAMES[i % SUPPLIER_NAMES.length],
    brand: SUPPLIER_NAMES[i % SUPPLIER_NAMES.length],
    category: categories[i % categories.length],
    contractNo: `HT-2026-${String(1000 + i)}`,
    status: BRAND_SUPPLIER_STATUSES[i % 4],
    matchSite: i % 5 !== 0,
  }))
}

function buildMaterialEntryList(count = 36) {
  return Array.from({ length: count }, (_, i) => ({
    id: `me-${String(i + 1).padStart(2, '0')}`,
    projectId: mockProjectId(i),
    date: hazardDate(i % 12),
    material: MATERIAL_NAMES[i % MATERIAL_NAMES.length],
    spec: `规格${(i % 5) + 1}`,
    batchNo: `PC${String(20260600 + i)}`,
    siteMatch: i % 6 === 0 ? '不一致' : '一致',
    status: MATERIAL_ENTRY_STATUSES[i % 4],
    supplier: SUPPLIER_NAMES[(i + 2) % SUPPLIER_NAMES.length],
  }))
}

function buildQualityEquipEntryList(count = 36) {
  return Array.from({ length: count }, (_, i) => ({
    id: `ee-${String(i + 1).padStart(2, '0')}`,
    projectId: mockProjectId(i),
    date: hazardDate(i % 10),
    name: HVAC_EQUIP_NAMES[i % HVAC_EQUIP_NAMES.length],
    model: `Model-${(i % 8) + 1}`,
    quantity: 1 + (i % 4),
    siteMatch: i % 7 === 0 ? '不一致' : '一致',
    status: QUALITY_EQUIP_ENTRY_STATUSES[i % 4],
    supplier: SUPPLIER_NAMES[i % SUPPLIER_NAMES.length],
  }))
}

function buildProjectQualityModuleSummary(count = 36) {
  return Array.from({ length: count }, (_, i) => {
    const base = 4 + (i % 8)
    return {
      projectId: mockProjectId(i),
      ...projectNamePair(i),
      evalTotal: base + 3,
      evalPass: base,
      evalPending: 1 + (i % 3),
      brandTotal: 3 + (i % 4),
      brandQualified: 2 + (i % 3),
      materialTotal: base + 2,
      materialMismatch: i % 4,
      equipTotal: 2 + (i % 5),
      equipPending: i % 3,
    }
  })
}

export const QUALITY_EVAL_LIST = buildQualityEvalList(36)
export const BRAND_SUPPLIER_LIST = buildBrandSupplierList(36)
export const MATERIAL_ENTRY_LIST = buildMaterialEntryList(36)
export const QUALITY_EQUIP_ENTRY_LIST = buildQualityEquipEntryList(36)
export const PROJECT_QUALITY_MODULE_SUMMARY = buildProjectQualityModuleSummary(36)

export const QUALITY_EVAL_HQ_STATS = { total: 248, passRate: 93.2, pending: 18, failed: 6, monthCount: 52, passCount: 224 }
export const BRAND_SUPPLIER_HQ_STATS = { total: 86, qualified: 78, unqualified: 4, observe: 4, monthAudit: 22, passRate: 90.7 }
export const MATERIAL_ENTRY_HQ_STATS = { total: 312, matched: 296, mismatch: 16, pending: 12, monthBatch: 68, matchRate: 94.9 }
export const QUALITY_EQUIP_ENTRY_HQ_STATS = { total: 124, entered: 112, mismatch: 8, pending: 10, monthUnits: 36, passRate: 91.1 }

export const QUALITY_EVAL_TYPE_DIST = QUALITY_EVAL_TYPES.map((name, i) => ({ name, value: 18 + i * 6 }))
export const BRAND_CATEGORY_DIST = [
  { name: '暖通设备', value: 22 }, { name: '电梯', value: 14 }, { name: '建材', value: 28 }, { name: '机电', value: 16 },
]
export const MATERIAL_TYPE_DIST = [
  { name: '钢筋', value: 18 }, { name: '混凝土', value: 16 }, { name: '防水材料', value: 12 }, { name: '其他', value: 14 },
]
export const QUALITY_EQUIP_TYPE_DIST = [
  { name: '空调机组', value: 12 }, { name: '新风/风机', value: 10 }, { name: '冷水机组', value: 8 }, { name: '其他', value: 6 },
]

export function getProjectQualityEvalStats(projectId) {
  const row = PROJECT_QUALITY_MODULE_SUMMARY.find((p) => p.projectId === projectId)
  const list = filterByProjectId(QUALITY_EVAL_LIST, projectId)
  if (!row) {
    return { total: list.length || 8, passRate: 92, pending: 2, failed: 1, monthCount: 6, passCount: 5 }
  }
  return {
    total: row.evalTotal,
    passRate: Math.round((row.evalPass / row.evalTotal) * 1000) / 10,
    pending: row.evalPending,
    failed: row.evalTotal - row.evalPass,
    monthCount: row.evalTotal,
    passCount: row.evalPass,
  }
}

const MANAGEMENT_ROLES = ['项目经理', '安全员', '总监理工程师', '技术负责人', '施工员', '质量员']
const REGISTER_DOC_PAIRS = [
  { register: '已通过', doc: '验评资料未上传', inconsistency: '登记已通过，验评资料未上传' },
  { register: '验收中', doc: '资料已归档', inconsistency: '登记为验收中，资料库已归档为完成' },
  { register: '已通过', doc: '缺监理签字页', inconsistency: '登记已通过，资料缺少监理签字' },
  { register: '已登记', doc: '验收项名称不一致', inconsistency: '登记名称与验评资料名称不一致' },
  { register: '已通过', doc: '数量记录不符', inconsistency: '登记数量与验评资料记录不符' },
  { register: '验收中', doc: '资料版本过期', inconsistency: '登记验收中，资料仍为旧版模板' },
]

function buildManagementPersonnelList(count = 36) {
  const names = ['张伟', '李强', '王磊', '刘洋', '陈静', '杨军', '赵杰', '黄涛', '周鹏', '吴超']
  return Array.from({ length: count }, (_, i) => {
    const projectIndex = i % count
    return {
      id: `mgmt-${String(i + 1).padStart(3, '0')}`,
      projectId: mockProjectId(projectIndex),
      name: names[i % names.length],
      role: MANAGEMENT_ROLES[i % MANAGEMENT_ROLES.length],
      unit: UNITS[projectIndex % UNITS.length],
      phone: `138${String(10000000 + i).slice(0, 8)}`,
      onSite: i % 4 !== 3,
      clockIn: i % 4 === 3 ? '--' : `0${7 + (i % 2)}:${String(10 + (i % 40)).padStart(2, '0')}`,
    }
  })
}

/** 质量验评风险：验评资料与登记数据不一致项 */
function buildQualityEvalRiskList(count = 36) {
  const parts = CONSTRUCTION_PARTS.filter((p) => p.id !== 'all')
  return Array.from({ length: count }, (_, i) => {
    const pair = REGISTER_DOC_PAIRS[i % REGISTER_DOC_PAIRS.length]
    return {
      id: `qer-${String(i + 1).padStart(2, '0')}`,
      projectId: mockProjectId(i),
      date: hazardDate(i % 14),
      evalType: QUALITY_EVAL_TYPES[i % 4],
      item: EVAL_ITEMS[i % EVAL_ITEMS.length],
      location: parts[i % parts.length].name,
      registerStatus: pair.register,
      docStatus: pair.doc,
      inconsistency: pair.inconsistency,
    }
  })
}

export const MANAGEMENT_PERSONNEL_LIST = buildManagementPersonnelList(36)
export const QUALITY_EVAL_RISK_LIST = buildQualityEvalRiskList(36)

export function getProjectManagementPersonnel(projectId) {
  return filterByProjectId(MANAGEMENT_PERSONNEL_LIST, projectId)
}

export function getProjectQualityEvalRisks(projectId) {
  return filterByProjectId(QUALITY_EVAL_RISK_LIST, projectId)
}

const PERSONNEL_RISK_LEVELS = { 高: 0, 中: 1, 低: 2 }

/** 人员风险核验：基于实名制、安全教育、特种作业等数据分析风险项 */
export function getProjectPersonnelRiskItems(projectId) {
  const people = filterByProjectId(SPECIAL_PERSONNEL_LIST, projectId)
  const risks = []

  people.forEach((person) => {
    const seq = person.seq ?? 0
    if (person.certStatus === '已过期') {
      risks.push({
        id: `prk-${person.id}-expired`,
        projectId,
        personName: person.name,
        workType: person.workType,
        riskType: '特种作业',
        level: '高',
        date: hazardDate(seq % 14),
        source: '实名制·证件核验',
        desc: `${person.workType}操作证已过期，系统判定禁止上岗`,
      })
    } else if (person.certStatus === '即将过期') {
      risks.push({
        id: `prk-${person.id}-warn`,
        projectId,
        personName: person.name,
        workType: person.workType,
        riskType: '特种作业',
        level: '中',
        date: hazardDate(seq % 14),
        source: '实名制·证件核验',
        desc: `${person.workType}操作证 30 日内到期，需完成续证`,
      })
    }

    if (seq % 9 === 0) {
      risks.push({
        id: `prk-${person.id}-train`,
        projectId,
        personName: person.name,
        workType: person.workType,
        riskType: '安全教育',
        level: seq % 18 === 0 ? '高' : '中',
        date: hazardDate((seq + 3) % 14),
        source: '实名制·培训记录',
        desc: '未参加本月入场/专项安全教育，培训记录缺失',
      })
    }

    if (seq % 11 === 0) {
      risks.push({
        id: `prk-${person.id}-work`,
        projectId,
        personName: person.name,
        workType: person.workType,
        riskType: '特种作业',
        level: '中',
        date: hazardDate((seq + 1) % 14),
        source: '实名制·作业登记',
        desc: '现场作业类型与实名制登记工种不一致',
      })
    }

    if (!person.onDuty && seq % 7 === 0) {
      risks.push({
        id: `prk-${person.id}-duty`,
        projectId,
        personName: person.name,
        workType: person.workType,
        riskType: '在岗核验',
        level: '低',
        date: hazardDate((seq + 2) % 14),
        source: '实名制·考勤数据',
        desc: '考勤显示离岗，但视频监控识别到同区域作业',
      })
    }

    if (seq % 15 === 0) {
      risks.push({
        id: `prk-${person.id}-realname`,
        projectId,
        personName: person.name,
        workType: person.workType,
        riskType: '实名制',
        level: '高',
        date: hazardDate((seq + 4) % 14),
        source: '实名制·人证比对',
        desc: '人脸识别与实名制登记信息不一致，需复核',
      })
    }
  })

  return risks.sort(
    (a, b) => (PERSONNEL_RISK_LEVELS[a.level] ?? 9) - (PERSONNEL_RISK_LEVELS[b.level] ?? 9),
  )
}

export function getProjectBrandSupplierStats(projectId) {
  const row = PROJECT_QUALITY_MODULE_SUMMARY.find((p) => p.projectId === projectId)
  const list = filterByProjectId(BRAND_SUPPLIER_LIST, projectId)
  if (!row) return { total: list.length || 4, qualified: 3, unqualified: 1, observe: 0, monthAudit: 2, passRate: 88 }
  return {
    total: row.brandTotal,
    qualified: row.brandQualified,
    unqualified: row.brandTotal - row.brandQualified,
    observe: Math.max(0, row.brandTotal - row.brandQualified - 1),
    monthAudit: row.brandTotal,
    passRate: Math.round((row.brandQualified / row.brandTotal) * 1000) / 10,
  }
}

export function getProjectMaterialEntryStats(projectId) {
  const row = PROJECT_QUALITY_MODULE_SUMMARY.find((p) => p.projectId === projectId)
  const list = filterByProjectId(MATERIAL_ENTRY_LIST, projectId)
  if (!row) return { total: list.length || 6, matched: 5, mismatch: 1, pending: 1, monthBatch: 4, matchRate: 91 }
  return {
    total: row.materialTotal,
    matched: row.materialTotal - row.materialMismatch,
    mismatch: row.materialMismatch,
    pending: row.materialMismatch,
    monthBatch: row.materialTotal,
    matchRate: Math.round(((row.materialTotal - row.materialMismatch) / row.materialTotal) * 1000) / 10,
  }
}

export function getProjectQualityEquipEntryStats(projectId) {
  const row = PROJECT_QUALITY_MODULE_SUMMARY.find((p) => p.projectId === projectId)
  const list = filterByProjectId(QUALITY_EQUIP_ENTRY_LIST, projectId)
  if (!row) return { total: list.length || 4, entered: 3, mismatch: 1, pending: 1, monthUnits: 2, passRate: 90 }
  return {
    total: row.equipTotal,
    entered: row.equipTotal - row.equipPending,
    mismatch: Math.max(0, row.equipPending - 1),
    pending: row.equipPending,
    monthUnits: row.equipTotal,
    passRate: Math.round(((row.equipTotal - row.equipPending) / Math.max(row.equipTotal, 1)) * 1000) / 10,
  }
}

export function buildQualitySampleDraft(device) {
  const name = typeof device === 'string' ? device : device.name
  return {
    id: `qsd-${Date.now()}`,
    title: '质量抽检报告（AI草稿）',
    status: 'draft',
    content: `根据 ${name} 远程抽检记录汇总：

一、质量验评：检验批及分部分项验收进度正常，1 项专项验收待复检。
二、品牌管理：暖通设备供应商资质核验通过，1 家观察使用。
三、材料进场：钢筋、混凝土批次信息与现场一致；1 批防水材料规格不一致。
四、设备进场：VRV 空调机组型号与报审一致，新风机组待复核。

建议下发材料不一致整改通知并安排复检。`,
  }
}

function buildQualitySampleIssues(count = 36) {
  const descs = QUALITY_DESC_TEMPLATES
  const parts = CONSTRUCTION_PARTS.filter((p) => p.id !== 'all')
  return Array.from({ length: count }, (_, i) => ({
    id: `qi-${String(i + 1).padStart(2, '0')}`,
    projectId: mockProjectId(i),
    date: hazardDate(i),
    location: parts[i % parts.length].name,
    desc: descs[i % descs.length],
    level: HAZARD_LEVELS[i % 3],
    status: SAMPLE_STATUSES[i % 3],
  }))
}

function buildPersonnelSampleRecords(count = 36) {
  const roles = ['架子工', '电工', '焊工', '塔吊司机', '信号工', '普工']
  return Array.from({ length: count }, (_, i) => ({
    id: `pr-${String(i + 1).padStart(2, '0')}`,
    projectId: mockProjectId(i),
    date: hazardDate(i % 10),
    name: `${HAZARD_REPORTERS[i % HAZARD_REPORTERS.length].charAt(0)}某`,
    role: roles[i % roles.length],
    certNo: `4403${String(100000 + i).slice(-6)}`,
    result: i % 5 === 0 ? '异常' : '正常',
    status: i % 5 === 0 ? SAMPLE_STATUSES[i % 3] : '已闭合',
  }))
}

function buildPersonnelAnomalies(count = 36) {
  return Array.from({ length: count }, (_, i) => ({
    id: `pa-${String(i + 1).padStart(2, '0')}`,
    projectId: mockProjectId(i),
    date: hazardDate(i),
    name: `人员${i + 1}`,
    type: PERSONNEL_ANOMALY_TYPES[i % 4],
    desc: `${PERSONNEL_ANOMALY_TYPES[i % 4]}，需立即处理`,
    status: SAMPLE_STATUSES[i % 3],
  }))
}

const MGMT_POSITIONS = ['项目经理', '安全总监', '质量工程师', '施工员', '技术负责人', '材料员']
const SPECIAL_WORK_TYPES = ['电工', '焊工', '架子工', '塔吊司机', '信号工', '起重工', '爆破工', '高处作业']
const CERT_STATUSES = ['有效', '即将过期', '已过期']

function withPersonnelDetail(item, isSpecial) {
  const idx = item.seq ?? (parseInt(String(item.id).replace(/\D/g, ''), 10) || 0)
  const certs = isSpecial
    ? [
        { name: '特种作业操作证', no: `T4403${String(100000 + idx)}`, type: item.workType, issueDate: '2024-03-15', expireDate: item.certStatus === '已过期' ? '2025-12-31' : '2027-08-20', status: item.certStatus },
        { name: '安全培训合格证', no: `AQ${String(100000 + idx)}`, type: '通用', issueDate: '2025-01-10', expireDate: '2026-01-09', status: '有效' },
      ]
    : [
        { name: '安全生产考核合格证', no: `AQC${String(200000 + idx)}`, type: 'B证', issueDate: '2023-06-01', expireDate: '2026-05-31', status: item.certStatus },
        { name: '岗位资格证书', no: `GW${String(300000 + idx)}`, type: item.position, issueDate: '2024-01-20', expireDate: '2028-01-19', status: '有效' },
      ]
  return {
    ...item,
    idCard: `4403${String(19850101 + idx * 137).slice(0, 8)}${String(1000 + idx).slice(-4)}`,
    phone: `138${String(10005678 + idx).slice(-8)}`,
    company: ['中建三局', '中建八局', '上海建工', '中铁建工'][idx % 4],
    entryDate: `2025-${String((idx % 9) + 1).padStart(2, '0')}-12`,
    nativePlace: ['广东深圳', '湖南长沙', '湖北武汉', '四川成都'][idx % 4],
    certs,
  }
}

const PERSONNEL_PER_PROJECT = 24

function buildSpecialPersonnelList(projectCount = 36, perProject = PERSONNEL_PER_PROJECT) {
  const surnames = ['张', '李', '王', '赵', '陈', '刘', '杨', '黄', '周', '吴']
  const given = ['伟', '强', '磊', '军', '勇', '斌', '杰', '涛', '明', '华']
  const list = []
  let seq = 0
  for (let p = 0; p < projectCount; p++) {
    const projectId = `p-${String(p).padStart(3, '0')}`
    for (let j = 0; j < perProject; j++) {
      seq += 1
      const certStatus = CERT_STATUSES[seq % 13 === 0 ? 2 : seq % 7 === 0 ? 1 : 0]
      const base = {
        id: `sp-${String(seq).padStart(4, '0')}`,
        seq,
        projectId,
        name: `${surnames[(seq + j) % surnames.length]}${given[(seq + p) % given.length]}`,
        workType: SPECIAL_WORK_TYPES[seq % SPECIAL_WORK_TYPES.length],
        certStatus,
        onDuty: seq % 10 !== 0,
      }
      const item = withPersonnelDetail(base, true)
      item.gender = seq % 5 === 0 ? '女' : '男'
      item.idCard = `4401${String(19900201 + seq * 211).slice(0, 8)}${String(2000 + seq).slice(-4)}`
      item.phone = `139${String(20005678 + seq).slice(-8)}`
      list.push(item)
    }
  }
  return list
}

function buildProjectPersonnelMgmtSummary(projectCount = 36, perProject = PERSONNEL_PER_PROJECT) {
  return Array.from({ length: projectCount }, (_, i) => ({
    projectId: `p-${String(i).padStart(3, '0')}`,
    ...projectNamePair(i),
    mgmtCount: perProject,
    mgmtOnDuty: perProject - 2,
    specialCount: perProject,
    specialOnDuty: perProject - 3,
    certExpire: 1 + (i % 3),
  }))
}

const EQUIPMENT_PER_PROJECT = 24

function buildEquipmentSampleRecords(projectCount = 36, perProject = EQUIPMENT_PER_PROJECT) {
  const types = ['塔吊', '施工电梯', '履带吊', '汽车泵', '挖掘机', '装载机', '汽车吊', '压路机']
  const list = []
  let seq = 0
  for (let p = 0; p < projectCount; p++) {
    const projectId = `p-${String(p).padStart(3, '0')}`
    for (let j = 0; j < perProject; j++) {
      seq += 1
      const type = types[seq % types.length]
      const isAbnormal = seq % 7 === 0
      list.push({
        id: `er-${String(seq).padStart(4, '0')}`,
        projectId,
        date: hazardDate(j % 14),
        name: `${type}${(j % 5) + 1}号`,
        type,
        inspectResult: isAbnormal ? '异常' : '正常',
        result: isAbnormal ? '异常' : '正常',
        status: isAbnormal ? SAMPLE_STATUSES[seq % 3] : '已闭合',
        monitorConnected: seq % 4 !== 0,
      })
    }
  }
  return list
}

function buildEquipmentAnomalies(projectCount = 36, perProject = EQUIPMENT_PER_PROJECT) {
  const types = ['塔吊', '施工电梯', '履带吊', '汽车泵', '挖掘机', '装载机']
  const list = []
  let seq = 0
  for (let p = 0; p < projectCount; p++) {
    const projectId = `p-${String(p).padStart(3, '0')}`
    for (let j = 0; j < perProject; j++) {
      seq += 1
      const anomalyType = EQUIPMENT_ANOMALY_TYPES[seq % EQUIPMENT_ANOMALY_TYPES.length]
      list.push({
        id: `ea-${String(seq).padStart(4, '0')}`,
        projectId,
        date: hazardDate(j % 12),
        name: `${types[seq % types.length]}${(j % 4) + 1}号`,
        type: anomalyType,
        desc: `${anomalyType}，限期整改`,
        status: SAMPLE_STATUSES[seq % 3],
      })
    }
  }
  return list
}

function buildProjectEquipmentSampleSummary(projectCount = 36, perProject = EQUIPMENT_PER_PROJECT) {
  return Array.from({ length: projectCount }, (_, i) => {
    const failCount = Math.max(2, Math.floor(perProject / 6))
    return {
      projectId: `p-${String(i).padStart(3, '0')}`,
      ...projectNamePair(i),
      taskCount: perProject,
      passCount: perProject - failCount,
      failCount,
      pendingCount: 1 + (i % 3),
      anomalyCount: failCount,
    }
  })
}

export const QUALITY_SAMPLE_STATS = { taskTotal: 156, passRate: 91.8, failCount: 13, pendingCount: 8, monthTasks: 48, rectRate: 86.5 }
export const QUALITY_ISSUE_STATS = { issueTotal: 42, majorCount: 6, pendingCount: 11, fixedCount: 28, rectRate: 88.2, weekNew: 9 }

export const PERSONNEL_SAMPLE_STATS = { checkTotal: 320, passRate: 94.2, anomalyCount: 18, certExpire: 7, onDutyRate: 96.8, weekChecks: 86 }
export const PERSONNEL_CERT_STATS = { totalWorkers: 1280, certValid: 1195, certExpire: 52, noCert: 33, trainingRate: 92.4, specialCount: 186 }

export const EQUIPMENT_SAMPLE_STATS = { inspectTotal: 98, passRate: 89.5, anomalyCount: 10, maintainDue: 6, onlineRate: 97.2, weekInspect: 24 }
export const EQUIPMENT_MAINTAIN_STATS = { totalDevices: 156, normalCount: 142, maintainDue: 8, inspectExpire: 6, repairCount: 4, utilization: 78.6 }

export const PROJECT_QUALITY_SAMPLE_SUMMARY = buildProjectSampleSummary('q')
export const PROJECT_PERSONNEL_SAMPLE_SUMMARY = buildProjectSampleSummary('p')
export const PROJECT_EQUIPMENT_SAMPLE_SUMMARY = buildProjectEquipmentSampleSummary()

export const QUALITY_SAMPLE_TASKS = buildQualitySampleTasks(36)
export const QUALITY_SAMPLE_ISSUES = buildQualitySampleIssues(36)
export const PERSONNEL_SAMPLE_RECORDS = buildPersonnelSampleRecords(36)
export const PERSONNEL_ANOMALIES = buildPersonnelAnomalies(36)
export const SPECIAL_PERSONNEL_LIST = buildSpecialPersonnelList()
export const PROJECT_PERSONNEL_MGMT_SUMMARY = buildProjectPersonnelMgmtSummary()
export const EQUIPMENT_SAMPLE_RECORDS = buildEquipmentSampleRecords()
export const EQUIPMENT_ANOMALIES = buildEquipmentAnomalies()

export const QUALITY_SAMPLE_TYPE_DIST = [
  { name: '混凝土', value: 12 }, { name: '钢筋', value: 10 }, { name: '模板', value: 8 }, { name: '防水', value: 6 },
]
export const PERSONNEL_ROLE_DIST = [
  { name: '特种作业', value: 18 }, { name: '一般工种', value: 22 }, { name: '管理人员', value: 8 }, { name: '监理人员', value: 4 },
]
export const EQUIPMENT_TYPE_DIST = [
  { name: '起重机械', value: 8 }, { name: '土方设备', value: 6 }, { name: '混凝土设备', value: 5 }, { name: '其他', value: 4 },
]

export const QUALITY_SAMPLE_TREND = DAILY_DANGER_WORK_TREND.map((d) => ({ ...d, value: Math.max(2, d.value - 10) }))
export const PERSONNEL_SAMPLE_TREND = DAILY_DANGER_WORK_TREND.map((d) => ({ ...d, value: Math.max(4, Math.round(d.value * 0.6)) }))
export const EQUIPMENT_SAMPLE_TREND = DAILY_DANGER_WORK_TREND.map((d) => ({ ...d, value: Math.max(2, Math.round(d.value * 0.35)) }))

export function getProjectQualitySampleStats(projectId) {
  const row = PROJECT_QUALITY_SAMPLE_SUMMARY.find((p) => p.projectId === projectId)
  if (!row) return { ...QUALITY_SAMPLE_STATS, taskTotal: 12, failCount: 2, pendingCount: 1, monthTasks: 8 }
  return { taskTotal: row.taskCount, passRate: Math.round((row.passCount / row.taskCount) * 1000) / 10, failCount: row.failCount, pendingCount: row.pendingCount, monthTasks: row.taskCount, rectRate: 85 + (row.passCount % 10) }
}

export function getProjectQualityIssueStats(projectId) {
  const issues = filterByProjectId(QUALITY_SAMPLE_ISSUES, projectId)
  return { issueTotal: issues.length || 3, majorCount: issues.filter((i) => i.level === '重大').length, pendingCount: issues.filter((i) => i.status !== '已闭合').length, fixedCount: issues.filter((i) => i.status === '已闭合').length, rectRate: 87, weekNew: 2 }
}

export function getProjectPersonnelSampleStats(projectId) {
  const row = PROJECT_PERSONNEL_SAMPLE_SUMMARY.find((p) => p.projectId === projectId)
  if (!row) return { ...PERSONNEL_SAMPLE_STATS, checkTotal: 28, anomalyCount: 2, weekChecks: 8 }
  return { checkTotal: row.taskCount * 3, passRate: 93 + (row.passCount % 5), anomalyCount: row.anomalyCount, certExpire: row.failCount, onDutyRate: 95.5, weekChecks: row.taskCount }
}

export function getProjectPersonnelCertStats(projectId) {
  return { totalWorkers: 120 + (projectId.charCodeAt(2) % 40), certValid: 110, certExpire: 5, noCert: 3, trainingRate: 91.5, specialCount: 24 }
}

export function getProjectEquipmentSampleStats(projectId) {
  const row = PROJECT_EQUIPMENT_SAMPLE_SUMMARY.find((p) => p.projectId === projectId)
  if (!row) return { ...EQUIPMENT_SAMPLE_STATS, inspectTotal: 8, anomalyCount: 1, weekInspect: 4 }
  return { inspectTotal: row.taskCount, passRate: 88 + (row.passCount % 8), anomalyCount: row.anomalyCount, maintainDue: row.failCount, onlineRate: 96, weekInspect: row.taskCount }
}

export function getProjectEquipmentMaintainStats(projectId) {
  return { totalDevices: 18 + (projectId.charCodeAt(2) % 10), normalCount: 16, maintainDue: 2, inspectExpire: 1, repairCount: 1, utilization: 75 + (projectId.charCodeAt(3) % 15) }
}

export function buildPersonnelSampleDraft(device) {
  const name = typeof device === 'string' ? device : device.name
  return {
    id: `psd-${Date.now()}`,
    title: '人员抽检通报（AI草稿）',
    status: 'draft',
    content: `根据 ${name} 远程抽检记录：

在场特种作业人员证件齐全，1 人证件即将过期；一般工种 2 人未参加本月安全培训。
建议督促相关单位完成证件续期及补训，无证人员不得上岗。`,
  }
}

export function buildEquipmentSampleDraft(device) {
  const name = typeof device === 'string' ? device : device.name
  return { id: `esd-${Date.now()}`, title: '设备抽检处理单（AI草稿）', status: 'draft', content: `根据 ${name} 远程核验，塔吊检验报告即将到期，请安排复检并暂停使用直至合格。` }
}

// ── 应急演练 ──

export const DRILL_TYPES = ['消防应急', '防台防汛', '高处坠落', '触电事故', '有限空间', '综合演练']
export const DRILL_STATUSES = ['已完成', '进行中', '待开展', '逾期']

export const DRILL_HQ_STATS = {
  totalPlans: 216,
  completed: 198,
  inProgress: 8,
  overdue: 10,
  completionRate: 91.7,
  avgScore: 92.4,
}

export const DRILL_STEPS = [
  {
    id: 1, title: '演练准备', duration: '10 min',
    desc: '核对演练方案、人员分工及物资装备，完成现场集结与签到。',
    requirements: ['参演人员全部签到，核对名单与岗位分工', '物资装备清单逐项点检，缺失项立即报备', '演练区域警戒布置完成，无关人员清场'],
    attachments: [{ name: '消防应急演练方案.pdf', type: 'pdf', size: '2.4 MB' }, { name: '人员分工表.xlsx', type: 'doc', size: '186 KB' }],
  },
  {
    id: 2, title: '发布指令', duration: '5 min',
    desc: '指挥长发布演练开始指令，各小组进入预定岗位。',
    requirements: ['指挥长宣布演练开始并记录时间', '各应急小组确认就位并回报', '通讯联络通道测试正常'],
    attachments: [{ name: '演练指令模板.docx', type: 'doc', size: '92 KB' }],
  },
  {
    id: 3, title: '模拟告警', duration: '8 min',
    desc: '模拟事故场景触发告警，监控中心接收并核实信息。',
    requirements: ['按预案触发模拟告警信号', '监控中心核实画面与现场信息', '初步判定事故类型与影响范围'],
    attachments: [{ name: '告警处置流程图.png', type: 'img', size: '1.1 MB' }, { name: '监控点位图.pdf', type: 'pdf', size: '3.2 MB' }],
  },
  {
    id: 4, title: '启动响应', duration: '10 min',
    desc: '启动应急预案，通知相关单位和救援力量赶赴现场。',
    requirements: ['启动对应级别应急响应', '通知建设、监理、救援等单位', '指挥体系各岗位按职责开展工作'],
    attachments: [{ name: '应急预案（节选）.pdf', type: 'pdf', size: '5.6 MB' }],
  },
  {
    id: 5, title: '人员疏散', duration: '15 min',
    desc: '组织危险区域人员有序疏散，设置警戒隔离区。',
    requirements: ['疏散路线畅通，引导员到位', '危险区域人员清点完毕', '警戒隔离区设置符合方案要求'],
    attachments: [{ name: '疏散路线图.pdf', type: 'pdf', size: '1.8 MB' }, { name: '集合点示意图.png', type: 'img', size: '640 KB' }],
  },
  {
    id: 6, title: '现场处置', duration: '20 min',
    desc: '救援组开展现场处置，控制事态并实施初步救援。',
    requirements: ['救援组佩戴防护装备进入现场', '按方案开展灭火/堵漏/抢险作业', '现场指挥持续汇报处置进展'],
    attachments: [{ name: '现场处置卡.pdf', type: 'pdf', size: '420 KB' }, { name: '救援器材清单.xlsx', type: 'doc', size: '156 KB' }],
  },
  {
    id: 7, title: '医救保障', duration: '12 min',
    desc: '医疗组对伤员进行检伤分类与转运，后勤组保障物资。',
    requirements: ['伤员检伤分类与登记', '医疗转运路线畅通', '后勤物资补给到位'],
    attachments: [{ name: '医疗救护流程.pdf', type: 'pdf', size: '890 KB' }],
  },
  {
    id: 8, title: '总结讲评', duration: '15 min',
    desc: '演练结束，指挥长组织讲评，记录问题与改进措施。',
    requirements: ['各小组汇报演练执行情况', '记录存在问题与改进建议', '形成演练总结并签字确认'],
    attachments: [{ name: '演练总结模板.docx', type: 'doc', size: '128 KB' }, { name: '问题整改单.pdf', type: 'pdf', size: '256 KB' }],
  },
]

function buildProjectDrillSummary(projectCount = 36) {
  return Array.from({ length: projectCount }, (_, i) => {
    const planned = 6 + (i % 4)
    const completed = planned - (i % 3 === 0 ? 1 : 0)
    const overdue = i % 5 === 0 ? 1 : 0
    const score = 88 + (i % 10)
    return {
      projectId: `p-${String(i).padStart(3, '0')}`,
      ...projectNamePair(i),
      planned,
      completed,
      inProgress: i % 7 === 0 ? 1 : 0,
      overdue,
      completionRate: Math.round((completed / planned) * 1000) / 10,
      avgScore: score,
      rank: 0,
    }
  }).sort((a, b) => b.completionRate - a.completionRate || b.avgScore - a.avgScore)
    .map((row, idx) => ({ ...row, rank: idx + 1 }))
}

function buildDrillRecords(projectCount = 36, perProject = 24) {
  const list = []
  let seq = 0
  for (let p = 0; p < projectCount; p++) {
    const projectId = `p-${String(p).padStart(3, '0')}`
    for (let j = 0; j < perProject; j++) {
      seq += 1
      const status = DRILL_STATUSES[seq % 4]
      list.push({
        id: `dr-${String(seq).padStart(4, '0')}`,
        projectId,
        date: hazardDate(j % 20),
        name: `${DRILL_TYPES[seq % DRILL_TYPES.length]}演练`,
        type: DRILL_TYPES[seq % DRILL_TYPES.length],
        status,
        participants: 20 + (seq % 30),
        score: status === '已完成' ? 85 + (seq % 14) : null,
        commander: HAZARD_REPORTERS[seq % HAZARD_REPORTERS.length],
        location: CONSTRUCTION_PARTS.filter((c) => c.id !== 'all')[seq % 5].name,
      })
    }
  }
  return list
}

export const PROJECT_DRILL_SUMMARY = buildProjectDrillSummary()
export const DRILL_PROJECT_RANK = PROJECT_DRILL_SUMMARY.slice(0, 10).map((r) => ({
  name: r.projectShortName,
  value: r.completionRate,
  score: r.avgScore,
}))

export const DRILL_TYPE_DIST = DRILL_TYPES.slice(0, 5).map((name, i) => ({ name, value: 12 + i * 4 }))
export const DRILL_MONTHLY_TREND = [
  { label: '1月', value: 14 }, { label: '2月', value: 16 }, { label: '3月', value: 18 },
  { label: '4月', value: 15 }, { label: '5月', value: 20 }, { label: '6月', value: 22 },
]

export const DRILL_RECORDS = buildDrillRecords()

export const DRILL_MEETING_SUMMARY = {
  status: 'recognizing',
  statusText: 'AI 正在识别演练过程…',
  summary: `本次应急演练远程指挥于 14:30 启动，通过巡检对讲设备联动现场，按预案完成消防应急演练全流程指挥。
AI 识别各步骤执行到位，人员疏散用时 8 分钟，现场处置响应及时；发现 1 项改进点：警戒区标识需加强。
综合评定：演练效果良好，建议形成闭环整改单 1 份。`,
}

export const AI_DRILL_MEETING_RECORDS = [
  { time: '14:28', speaker: '系统', role: 'ai', content: '应急演练远程指挥已连接现场手持终端，等待指挥长指令…' },
  { time: '14:30', speaker: '指挥长', role: 'web', content: '各小组注意，消防应急演练正式开始，请按步骤执行。' },
  { time: '14:32', speaker: '现场安全员', role: 'handheld', content: '人员已集结完毕，物资装备检查正常。' },
  { time: '14:35', speaker: 'AI识别', role: 'ai', content: '识别：模拟告警已触发，监控画面显示烟雾模拟装置启动。' },
  { time: '14:40', speaker: '指挥长', role: 'web', content: '请疏散组引导人员至集合点，救援组做好进场准备。' },
  { time: '14:48', speaker: '现场安全员', role: 'handheld', content: '危险区域人员已全部疏散，警戒隔离区已设置。' },
  { time: '14:55', speaker: 'AI识别', role: 'ai', content: '识别：现场处置完成，建议记录警戒标识不足问题。' },
  { time: '15:05', speaker: '指挥长', role: 'web', content: '演练结束，请各组集合进行总结讲评。' },
]

export function getProjectDrillStats(projectId) {
  const row = PROJECT_DRILL_SUMMARY.find((p) => p.projectId === projectId)
  const records = filterByProjectId(DRILL_RECORDS, projectId)
  if (!row) {
    return { planned: 6, completed: 5, inProgress: 1, overdue: 0, completionRate: 90, avgScore: 91, monthCount: records.length }
  }
  return {
    planned: row.planned,
    completed: row.completed,
    inProgress: row.inProgress,
    overdue: row.overdue,
    completionRate: row.completionRate,
    avgScore: row.avgScore,
    monthCount: records.filter((r) => r.date.startsWith('2026-06')).length,
  }
}

export function getProjectDrillMonthlyTrend(projectId) {
  const records = filterByProjectId(DRILL_RECORDS, projectId)
  const counts = new Array(12).fill(0)
  records.forEach((r) => {
    const m = parseInt(r.date.slice(5, 7), 10) - 1
    if (m >= 0 && m < 12) counts[m] += 1
  })
  const hasData = counts.some((c) => c > 0)
  if (!hasData) return DRILL_MONTHLY_TREND.map((d) => ({ ...d }))
  return ['1月', '2月', '3月', '4月', '5月', '6月'].map((label, i) => ({
    label,
    value: counts[i] || 0,
  }))
}

export function buildDrillDraft(device, drill) {
  const devName = typeof device === 'string' ? device : device?.name || '现场终端'
  const drillName = drill?.name || '应急演练'
  return {
    id: `drd-${Date.now()}`,
    title: '应急演练总结（AI草稿）',
    status: 'draft',
    content: `根据 ${devName} 远程指挥 ${drillName} 过程记录：

一、演练概况
参与 ${drill?.participants || 32} 人，指挥长 ${drill?.commander || '—'}，演练地点 ${drill?.location || '—'}。

二、步骤执行
各步骤按预案推进，人员疏散与现场处置响应及时。

三、发现问题
警戒区标识不足，建议 3 日内完成整改并复查。

四、结论
演练效果评定：良好。`,
  }
}
