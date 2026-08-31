import { COC_PROJECT_OPTIONS, HQ_SELECTION_ID } from '../../config/projectOptions.js'
import { AI_CATEGORY_META, aiAlerts, getProjectAiSummary } from '../../mock/aiApp.js'
import { buildHqRealNameSupervisionStatsByProject } from '../../mock/laborManagement.js'
import { getProjectAccessRecords } from '../../mock/vehicleManagement.js'
import { getAlertRecords, getDeviceStats, getMonitorStats } from '../../mock/majorHazard.js'

export { HQ_SELECTION_ID }

export const SCREEN_PROJECTS = COC_PROJECT_OPTIONS

const HAZARD_TYPES = ['pit', 'subway', 'formwork']

const TYPE_META = {
  labor: { label: '人员', color: '#31e8ff', icon: '人' },
  vehicle: { label: '车辆', color: '#62d9a7', icon: '车' },
  inspection: { label: '巡检', color: '#4ba8ff', icon: '巡' },
  machine: { label: '机械', color: '#b78aff', icon: '机' },
  major: { label: '危大', color: '#ff6680', icon: '危' },
  ai: { label: 'AI预警', color: '#ff9a52', icon: 'AI' },
}

export const LAYER_OPTIONS = Object.entries(TYPE_META).map(([value, item]) => ({ value, ...item }))

const PROJECT_POINT_LAYOUT = [
  ['labor', 23, 24, '实名制作业区'],
  ['vehicle', 70, 77, '车辆出入口'],
  ['inspection', 35, 56, '巡检任务点'],
  ['machine', 75, 43, '机械监测点'],
  ['major', 53, 68, '危大监测区'],
  ['ai', 30, 76, 'AI识别点'],
]

function numberFromId(id = '') {
  return Number.parseInt(String(id).replace(/\D/g, ''), 10) || 0
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function sum(rows, key) {
  return rows.reduce((total, item) => total + Number(item[key] || 0), 0)
}

function getLaborRows() {
  return new Map(buildHqRealNameSupervisionStatsByProject().map((row) => [row.project_id, row]))
}

function getVehicleStats(projectId) {
  const records = getProjectAccessRecords(projectId)
  const vehicleIn = records.filter((item) => item.direction === '进场').length
  const vehicleOut = records.filter((item) => item.direction === '出场').length
  return { vehicleIn, vehicleOut, vehicles: Math.max(0, vehicleIn - vehicleOut) }
}

function getMajorStats(projectId) {
  const monitorStats = HAZARD_TYPES.map((type) => getMonitorStats(projectId, type))
  const alerts = HAZARD_TYPES.flatMap((type) => getAlertRecords(projectId, type, {}))
  const today = new Date().toISOString().slice(0, 10)
  const devices = getDeviceStats(projectId)
  return {
    majorRegions: monitorStats.reduce((total, item) => total + item.regions, 0),
    majorPoints: monitorStats.reduce((total, item) => total + item.points, 0),
    majorDevices: devices.total,
    majorOnline: devices.online,
    majorOffline: devices.offline,
    majorTodayAlerts: alerts.filter((item) => String(item.time || '').startsWith(today)).length,
    majorUnhandled: alerts.filter((item) => item.status === '未处置').length,
    majorAlerts: alerts,
  }
}

export function buildProjectRows() {
  const laborRows = getLaborRows()
  return SCREEN_PROJECTS.map((project, index) => {
    const seed = numberFromId(project.id) + index + 1
    const labor = laborRows.get(project.id)
    const vehicle = getVehicleStats(project.id)
    const ai = getProjectAiSummary(project.id)
    const major = getMajorStats(project.id)
    const inspectionTotal = 18 + ((seed * 3) % 13)
    const inspectionDone = Math.max(0, inspectionTotal - (1 + (seed % 5)))
    const inspectionHazards = 7 + ((seed * 4) % 15)
    const hazardClosed = Math.max(0, inspectionHazards - (1 + (seed % 4)))
    const machineDevices = 12 + ((seed * 5) % 22)
    const machineOffline = seed % 4
    const machineOnline = Math.max(0, machineDevices - machineOffline)

    return {
      ...project,
      index,
      status: '在建',
      mapX: 10 + (index % 8) * 11.5 + (Math.floor(index / 8) % 2 ? 3 : 0),
      mapY: 18 + Math.floor(index / 8) * 17 + ((index % 3) - 1) * 2,
      people: labor?.demo_empty ? 0 : Number(labor?.total || 0),
      managers: labor?.demo_empty ? 0 : Number(labor?.manage || 0),
      workers: labor?.demo_empty ? 0 : Number(labor?.labor || 0),
      specialPeople: labor?.demo_empty ? 0 : Number(labor?.special || 0),
      attendanceRate: labor?.demo_empty ? 0 : Number(labor?.today_attendance_rate || 0),
      manageAttendanceRate: labor?.demo_empty ? 0 : Number(labor?.today_manage_attendance_rate || 0),
      laborTodayWarnings: labor?.demo_empty ? 0 : Number(labor?.today_warning_count || 0),
      laborPendingWarnings: labor?.demo_empty ? 0 : Number(labor?.pending_warning_count || 0),
      ...vehicle,
      inspectionTotal,
      inspectionDone,
      inspectionPending: inspectionTotal - inspectionDone,
      inspectionOverdue: seed % 3,
      inspectionRate: inspectionTotal ? Math.round((inspectionDone / inspectionTotal) * 100) : 0,
      inspectionHazards,
      hazardClosed,
      hazardPending: inspectionHazards - hazardClosed,
      hazardOverdue: seed % 3,
      hazardClosureRate: inspectionHazards ? Math.round((hazardClosed / inspectionHazards) * 100) : 0,
      machineDevices,
      machineOnline,
      machineOffline,
      machineAlerts: 3 + ((seed * 2) % 8),
      machineUnhandled: seed % 4,
      machineMajorAlerts: seed % 2,
      aiTotal: ai.total,
      aiUnhandled: ai.unhandled,
      aiHandled: ai.handled,
      aiHandlingRate: ai.handlingRate,
      aiProcessed: ai.processed,
      aiFalseAlarm: ai.falseAlarm,
      ...major,
    }
  })
}

export function buildScopeSummary(selectedProject, projectRows) {
  const rows = selectedProject ? [selectedProject] : projectRows
  const people = sum(rows, 'people')
  const managers = sum(rows, 'managers')
  const inspectionTotal = sum(rows, 'inspectionTotal')
  const inspectionDone = sum(rows, 'inspectionDone')
  const inspectionHazards = sum(rows, 'inspectionHazards')
  const hazardClosed = sum(rows, 'hazardClosed')
  const machineDevices = sum(rows, 'machineDevices')
  const machineOnline = sum(rows, 'machineOnline')
  const majorDevices = sum(rows, 'majorDevices')
  const majorOnline = sum(rows, 'majorOnline')
  const aiTotal = sum(rows, 'aiTotal')
  const aiHandled = sum(rows, 'aiHandled')

  return {
    projectCount: rows.length,
    people,
    managers,
    workers: sum(rows, 'workers'),
    specialPeople: sum(rows, 'specialPeople'),
    attendanceRate: people ? Math.round(rows.reduce((total, item) => total + item.attendanceRate * item.people, 0) / people) : 0,
    manageAttendanceRate: managers ? Math.round(rows.reduce((total, item) => total + item.manageAttendanceRate * item.managers, 0) / managers) : 0,
    laborTodayWarnings: sum(rows, 'laborTodayWarnings'),
    laborPendingWarnings: sum(rows, 'laborPendingWarnings'),
    vehicleIn: sum(rows, 'vehicleIn'),
    vehicleOut: sum(rows, 'vehicleOut'),
    vehicles: sum(rows, 'vehicles'),
    inspectionTotal,
    inspectionDone,
    inspectionPending: sum(rows, 'inspectionPending'),
    inspectionOverdue: sum(rows, 'inspectionOverdue'),
    inspectionRate: inspectionTotal ? Math.round((inspectionDone / inspectionTotal) * 100) : 0,
    inspectionHazards,
    hazardPending: sum(rows, 'hazardPending'),
    hazardOverdue: sum(rows, 'hazardOverdue'),
    hazardClosureRate: inspectionHazards ? Math.round((hazardClosed / inspectionHazards) * 100) : 0,
    machineDevices,
    machineOnline,
    machineOffline: sum(rows, 'machineOffline'),
    machineOnlineRate: machineDevices ? Math.round((machineOnline / machineDevices) * 100) : 0,
    machineAlerts: sum(rows, 'machineAlerts'),
    machineUnhandled: sum(rows, 'machineUnhandled'),
    machineMajorAlerts: sum(rows, 'machineMajorAlerts'),
    majorRegions: sum(rows, 'majorRegions'),
    majorPoints: sum(rows, 'majorPoints'),
    majorDevices,
    majorOnline,
    majorOnlineRate: majorDevices ? Math.round((majorOnline / majorDevices) * 100) : 0,
    majorTodayAlerts: sum(rows, 'majorTodayAlerts'),
    majorUnhandled: sum(rows, 'majorUnhandled'),
    aiTotal,
    aiUnhandled: sum(rows, 'aiUnhandled'),
    aiHandled,
    aiHandlingRate: aiTotal ? Math.round((aiHandled / aiTotal) * 1000) / 10 : 0,
    aiProcessed: sum(rows, 'aiProcessed'),
    aiFalseAlarm: sum(rows, 'aiFalseAlarm'),
  }
}

export function buildMapPoints(projectId, rows) {
  if (projectId === HQ_SELECTION_ID) {
    return rows.map((row) => {
      const attention = row.aiUnhandled + row.machineUnhandled + row.majorUnhandled + row.inspectionOverdue
      const type = row.aiUnhandled > 0 ? 'ai' : row.majorUnhandled > 0 ? 'major' : row.machineUnhandled > 0 ? 'machine' : 'inspection'
      return {
        id: `project-${row.id}`,
        projectId: row.id,
        type,
        title: row.label,
        subtitle: `巡检待执行 ${row.inspectionPending} · AI未处置 ${row.aiUnhandled}`,
        x: row.mapX,
        y: row.mapY,
        value: attention,
        detail: `在岗 ${row.people}人｜在场车辆 ${row.vehicles}辆｜监测未处置 ${row.machineUnhandled + row.majorUnhandled}条`,
      }
    })
  }

  const row = rows.find((item) => item.id === projectId) || rows[0]
  const aiRows = aiAlerts.value.filter((item) => item.projectId === row.id)
  const latestAi = [...aiRows].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
  return PROJECT_POINT_LAYOUT.map(([type, x, y, title], index) => {
    const content = {
      labor: { value: row.people, subtitle: `今日出勤率 ${row.attendanceRate}% · 特种作业 ${row.specialPeople}人`, detail: '人员实名制管理 > 实名制统计' },
      vehicle: { value: row.vehicles, subtitle: `今日进场 ${row.vehicleIn}辆 · 出场 ${row.vehicleOut}辆`, detail: '车辆管理 > 车辆管理看板 / 进出场记录' },
      inspection: { value: row.inspectionPending, subtitle: `待执行 ${row.inspectionPending}项 · 逾期 ${row.inspectionOverdue}项`, detail: '巡检管理 > 巡检看板 / 巡检任务' },
      machine: { value: row.machineUnhandled, subtitle: `在线设备 ${row.machineOnline}台 · 未处置预警 ${row.machineUnhandled}条`, detail: '机械设备监管 > 运行监管 / 预警记录' },
      major: { value: row.majorUnhandled, subtitle: `监测点 ${row.majorPoints}个 · 未处置预警 ${row.majorUnhandled}条`, detail: '危大工程监测 > 各安全监管页面 / 预警记录' },
      ai: { value: row.aiUnhandled, subtitle: latestAi ? `${latestAi.alertType} · ${latestAi.location}` : '当前项目暂无AI预警', detail: latestAi ? `${latestAi.camera}｜${latestAi.occurredAt}` : 'AI应用三类预警台账' },
    }[type]
    return {
      id: `${row.id}-${type}-${index}`,
      projectId: row.id,
      type,
      title,
      x: clamp(x + ((row.index % 3) - 1) * 1.6, 8, 92),
      y: clamp(y + (row.index % 2 ? 1.8 : -1.8), 10, 88),
      ...content,
    }
  })
}

export function getTypeMeta(type) {
  return TYPE_META[type] || TYPE_META.inspection
}

export function getAiOverview(projectId = HQ_SELECTION_ID) {
  const source = projectId === HQ_SELECTION_ID
    ? aiAlerts.value.filter((item) => SCREEN_PROJECTS.some((project) => project.id === item.projectId))
    : aiAlerts.value.filter((item) => item.projectId === projectId)
  const handled = source.filter((item) => item.status === '已处置').length
  const processed = source.filter((item) => item.disposition === '已处理').length
  const falseAlarm = source.filter((item) => item.disposition === '误报').length
  return {
    total: source.length,
    handled,
    unhandled: source.length - handled,
    handlingRate: source.length ? Math.round((handled / source.length) * 1000) / 10 : 0,
    processed,
    falseAlarm,
    categories: Object.values(AI_CATEGORY_META).map((meta) => ({ ...meta, value: source.filter((item) => item.category === meta.key).length })),
    latest: [...source].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 8),
  }
}

export function buildTrend(selectedProject, projectRows, range = 7) {
  const rows = selectedProject ? [selectedProject] : projectRows
  const sourceAi = aiAlerts.value.filter((item) => rows.some((row) => row.id === item.projectId))
  const latestAiDate = sourceAi.reduce((latest, item) => String(item.occurredAt || '').slice(0, 10) > latest ? String(item.occurredAt).slice(0, 10) : latest, '')
  const anchor = latestAiDate ? new Date(`${latestAiDate}T12:00:00`) : new Date()
  const inspectionBase = Math.max(1, sum(rows, 'inspectionPending'))
  const machineBase = sum(rows, 'machineUnhandled')
  const majorBase = sum(rows, 'majorUnhandled')
  return Array.from({ length: range }, (_, index) => {
    const date = new Date(anchor)
    date.setDate(date.getDate() - (range - 1 - index))
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const seed = index + (selectedProject?.index || 2)
    return {
      label: dateKey.slice(5),
      inspection: Math.max(0, inspectionBase + ((seed % 5) - 2)),
      machine: Math.max(0, machineBase + ((seed % 3) - 1)),
      major: Math.max(0, majorBase + ((seed % 4) - 2)),
      ai: sourceAi.filter((item) => String(item.occurredAt || '').startsWith(dateKey)).length,
    }
  })
}

export function buildProjectCompareRows(rows) {
  return [...rows]
    .map((row) => ({ ...row, attention: row.inspectionOverdue + row.machineUnhandled + row.majorUnhandled + row.aiUnhandled }))
    .sort((a, b) => b.attention - a.attention)
    .slice(0, 6)
}

export function buildMonitorRows(selectedProject, projectRows) {
  const rows = selectedProject ? [selectedProject] : projectRows
  const majorRows = rows.flatMap((row) => row.majorAlerts.filter((item) => item.status === '未处置').slice(0, 2).map((item) => ({
    id: item.id,
    type: '危大',
    project: row.label,
    title: item.alertType,
    position: item.region || item.point || '监测区域',
    time: String(item.time || '').slice(11, 16),
    level: item.level || '预警',
  })))
  const machineRows = rows.slice(0, 4).filter((row) => row.machineUnhandled > 0).map((row) => ({
    id: `machine-${row.id}`,
    type: '机械',
    project: row.label,
    title: row.machineMajorAlerts ? '机械设备重大预警' : '机械设备运行预警',
    position: `${1 + (row.index % 5)}号设备`,
    time: `${String(9 + (row.index % 8)).padStart(2, '0')}:20`,
    level: row.machineMajorAlerts ? '重大预警' : '一般预警',
  }))
  return [...majorRows, ...machineRows].slice(0, 5)
}
