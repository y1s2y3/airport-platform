import { projectTree, getProjectLabel, getDefaultProjectId } from './laborRealName.js'

export { projectTree, getProjectLabel, getDefaultProjectId }

export const vehicleTypeOptions = ['渣土车', '混凝土车', '材料运输车', '特种车辆', '其他']
export const vehicleDeviceTypeOptions = ['道闸车牌识别设备']
export const vehicleWarningStatusOptions = ['待处置', '处置中', '已关闭']
export const vehicleRegulationWarningTypes = ['黑名单车辆', '证件过期', '无定位信号', '未授权道闸']

/** 项目是否对接轨迹/定位子系统（无对接则不做轨迹硬性要求） */
const defaultProjectTrackCapability = {
  'p-000': { enabled: true, systemName: 'T2 车辆定位系统', url: 'https://example.com/vehicle-track/p-000' },
  'p-001': { enabled: true, systemName: 'T1 车辆定位系统', url: 'https://example.com/vehicle-track/p-001' },
  'p-003': { enabled: false, systemName: '', url: '' },
  'p-004': { enabled: true, systemName: '市政车辆定位', url: 'https://example.com/vehicle-track/p-004' },
  'p-005': { enabled: false, systemName: '', url: '' },
}

let projectTrackCapabilityStore = structuredClone(defaultProjectTrackCapability)

export function getProjectVehicleTrackCapability(projectId) {
  const item = projectTrackCapabilityStore[projectId]
  return {
    enabled: Boolean(item?.enabled),
    systemName: item?.systemName || '',
    url: item?.url || '',
  }
}

export function saveProjectVehicleTrackCapability(projectId, payload = {}) {
  if (!projectId || projectId === 'hq') return null
  projectTrackCapabilityStore[projectId] = {
    enabled: Boolean(payload.enabled),
    systemName: String(payload.systemName || '').trim(),
    url: String(payload.url || '').trim(),
  }
  return getProjectVehicleTrackCapability(projectId)
}

/** 车辆轨迹：平台仅提供按项目跳转至自有车辆定位系统，不做统一轨迹回放 */
export function listProjectVehicleTrackJumpConfigs() {
  return (projectTree[0]?.children || []).map((item) => {
    const cfg = getProjectVehicleTrackCapability(item.id)
    return {
      projectId: item.id,
      projectName: item.label.replace(/\(\d+\)$/, ''),
      ...cfg,
    }
  })
}

const units = ['中建三局', '深圳市政', '广东建工', '中铁建工', '城建集团']
const drivers = ['王强', '李明', '张伟', '刘洋', '陈刚', '赵磊', '周杰']

const projectIds = projectTree[0].children.map((item) => item.id)

function seededCount(projectId, salt) {
  const base = Number(projectId.replace(/\D/g, '')) || 0
  return 32 + ((base + salt) % 16)
}

function getProjectGateDeviceIds(projectId) {
  const gateCount = 4 + (Number(projectId.replace(/\D/g, '')) % 3)
  return Array.from({ length: gateCount }, (_, i) => `${projectId}-dev-gate-${i + 1}`)
}

function buildDevices(projectId, vehicles = []) {
  const seed = Number(projectId.replace(/\D/g, '')) || 0
  const gateCount = 4 + (seed % 3)
  const locations = ['东门', '西门', '材料堆场', '拌合站', '南门', '北门']
  const devices = []

  for (let i = 0; i < gateCount; i += 1) {
    devices.push({
      id: `${projectId}-dev-gate-${i + 1}`,
      projectId,
      name: `道闸识别-${i + 1}`,
      deviceType: '道闸车牌识别设备',
      deviceNo: `DEV-G-${projectId}-${String(i + 1).padStart(3, '0')}`,
      location: locations[i % locations.length],
      online: i % 4 !== 0,
      bindPlateNo: '',
      updatedAt: `2026-06-28 ${String(10 + (i % 12)).padStart(2, '0')}:30:00`,
    })
  }

  return devices
}

function buildVehicles(projectId) {
  const gateIds = getProjectGateDeviceIds(projectId)
  const count = seededCount(projectId, 1)
  return Array.from({ length: count }, (_, i) => {
    const platePrefix = ['粤B', '粤A', '粤S', '粤L'][i % 4]
    const plateSeed = Number(projectId.replace(/\D/g, '')) || 0
    return {
      id: `${projectId}-veh-${i + 1}`,
      projectId,
      plateNo: `${platePrefix}${String(10000 + i * 137 + plateSeed * 17).slice(-5)}`,
      vehicleType: vehicleTypeOptions[i % vehicleTypeOptions.length],
      unitName: units[i % units.length],
      driverName: drivers[(i + Number(projectId.replace(/\D/g, ''))) % drivers.length],
      driverPhone: `138${String(10000000 + i * 321).slice(0, 8)}`,
      permitNo: `PZ-${projectId}-${String(i + 1).padStart(4, '0')}`,
      permitValidTo: '2026-12-31',
      status: i % 7 === 0 ? '已退场' : '已准入',
      authorizedGateIds: i % 5 === 0 ? [] : gateIds.slice(0, 1 + (i % Math.max(gateIds.length, 1))),
      updatedAt: `2026-06-${String(10 + (i % 18)).padStart(2, '0')} 10:00`,
    }
  })
}

const vehiclesByProject = Object.fromEntries(projectIds.map((id) => [id, buildVehicles(id)]))

function buildAccessRecords(projectId) {
  const vehicles = vehiclesByProject[projectId] || []
  const gates = ['东门', '西门', '南门']
  return vehicles.slice(0, 22).flatMap((veh, i) => [
    {
      id: `${projectId}-in-${i + 1}`,
      projectId,
      plateNo: veh.plateNo,
      vehicleType: veh.vehicleType,
      direction: '进场',
      gateName: `${gates[i % gates.length]}道闸`,
      recordTime: `2026-06-29 ${String(8 + i).padStart(2, '0')}:${String(i * 7 % 60).padStart(2, '0')}:00`,
    },
    {
      id: `${projectId}-out-${i + 1}`,
      projectId,
      plateNo: veh.plateNo,
      vehicleType: veh.vehicleType,
      direction: '出场',
      gateName: `${gates[i % gates.length]}道闸`,
      recordTime: `2026-06-29 ${String(16 + (i % 4)).padStart(2, '0')}:${String(i * 5 % 60).padStart(2, '0')}:00`,
    },
  ])
}

function buildVehicleRegulationWarnings(projectId) {
  const vehicles = vehiclesByProject[projectId] || []
  return vehicles.slice(0, 6).map((veh, i) => ({
    id: `${projectId}-warn-${i + 1}`,
    warningNo: `VW-${projectId}-${String(i + 1).padStart(3, '0')}`,
    projectId,
    plateNo: veh.plateNo,
    warningType: vehicleRegulationWarningTypes[i % vehicleRegulationWarningTypes.length],
    source: '车辆监管',
    relatedInfo: veh.unitName,
    status: i === 0 ? '待处置' : '处置中',
    triggeredAt: `2026-06-29 ${String(10 + i).padStart(2, '0')}:30:00`,
  }))
}

const regulationWarningsByProject = Object.fromEntries(
  projectIds.map((id) => [id, buildVehicleRegulationWarnings(id)]),
)

const accessByProject = Object.fromEntries(projectIds.map((id) => [id, buildAccessRecords(id)]))

const devicesByProject = Object.fromEntries(
  projectIds.map((id) => [id, buildDevices(id, vehiclesByProject[id] || [])]),
)

/** 轨迹类预警仅保留超速等非围栏类型；禁行偏离由施工方子系统处理 */
function buildTrackAlerts(projectId) {
  if (!getProjectVehicleTrackCapability(projectId).enabled) return []
  const vehicles = vehiclesByProject[projectId] || []
  return vehicles.slice(0, 3).map((veh, i) => ({
    id: `${projectId}-track-${i + 1}`,
    projectId,
    plateNo: veh.plateNo,
    alertType: '超速提醒',
    routeName: `运输路线-${i + 1}`,
    status: i === 0 ? '处置中' : '待处置',
    alertTime: `2026-06-29 ${String(11 + i).padStart(2, '0')}:20:00`,
  }))
}

const trackAlertsByProject = Object.fromEntries(projectIds.map((id) => [id, buildTrackAlerts(id)]))

export function vehicleWarningStatusTagClass(status) {
  if (status === '已关闭') return 'ap-tag-enabled'
  if (status === '处置中') return 'ap-tag-draft'
  return 'ap-tag-high'
}

export function getProjectVehicleWarnings(projectId) {
  const regulationWarnings = regulationWarningsByProject[projectId] || []

  const trackWarnings = getProjectTrackAlerts(projectId).map((row, index) => ({
    id: row.id,
    warningNo: `VT-${projectId}-${String(index + 1).padStart(3, '0')}`,
    projectId,
    plateNo: row.plateNo,
    warningType: row.alertType,
    source: '轨迹监管',
    relatedInfo: row.routeName,
    status: row.status === '已关闭' ? '已关闭' : row.status,
    triggeredAt: row.alertTime,
  }))

  return [...regulationWarnings, ...trackWarnings].sort((a, b) =>
    (b.triggeredAt || '').localeCompare(a.triggeredAt || ''),
  )
}

export function getVehicleWarningStats(projectId) {
  const list = getProjectVehicleWarnings(projectId)
  return {
    total: list.length,
    pending: list.filter((item) => item.status === '待处置').length,
    processing: list.filter((item) => item.status === '处置中').length,
    closed: list.filter((item) => item.status === '已关闭').length,
    track: list.filter((item) => item.source === '轨迹监管').length,
    vehicle: list.filter((item) => item.source === '车辆监管').length,
  }
}

export function getProjectVehicles(projectId) {
  return vehiclesByProject[projectId] || []
}

export function getProjectAccessRecords(projectId) {
  return accessByProject[projectId] || []
}

export function getProjectVehicleDevices(projectId) {
  return devicesByProject[projectId] || []
}

export function getProjectTrackAlerts(projectId) {
  return trackAlertsByProject[projectId] || []
}

function vehiclePositionSeed(vehicleId) {
  const seed = Number(String(vehicleId).replace(/\D/g, '')) || 0
  return {
    x: 14 + (seed % 62),
    y: 16 + ((seed * 7) % 58),
  }
}

export function getVehicleRealtimePosition(vehicleId) {
  return vehiclePositionSeed(vehicleId)
}

export function getVehicleTrackHistory(vehicleId, dateStr) {
  const seed = Number(String(vehicleId).replace(/\D/g, '')) || 0
  const start = vehiclePositionSeed(vehicleId)
  const pointCount = 10 + (seed % 6)
  return Array.from({ length: pointCount }, (_, i) => ({
    x: Math.min(92, Math.max(8, start.x + i * 2.8 + Math.sin(i + seed) * 2.5)),
    y: Math.min(88, Math.max(10, start.y + Math.sin(i * 0.75 + seed) * 3.5 + i * 1.1)),
    time: `${dateStr} ${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${String((i * 13 + seed) % 60).padStart(2, '0')}:00`,
  }))
}

export function getProjectTrackVehicles(projectId) {
  if (!getProjectVehicleTrackCapability(projectId).enabled) return []
  const devices = getProjectVehicleDevices(projectId)
  return getProjectVehicles(projectId)
    .filter((veh) => veh.status !== '已退场')
    .map((veh) => {
      const device = devices.find(
        (item) => item.bindPlateNo === veh.plateNo && item.deviceType === '轨迹监测设备',
      )
      if (!device) return null
      const position = getVehicleRealtimePosition(veh.id)
      return {
        ...veh,
        deviceId: device.id,
        deviceName: device.name,
        online: device.online,
        position,
      }
    })
    .filter(Boolean)
}

function aggregateProjectStats(projectId) {
  const vehicles = getProjectVehicles(projectId)
  const access = getProjectAccessRecords(projectId)
  const todayIn = access.filter((r) => r.direction === '进场').length
  const todayOut = access.filter((r) => r.direction === '出场').length
  const onSite = Math.max(0, todayIn - todayOut)
  const inTransit = Math.max(1, Math.round(onSite * 0.25))
  const warnings = getProjectVehicleWarnings(projectId)
  const vehicleWarnings = warnings.filter((w) => w.source === '车辆监管' && w.status !== '已关闭').length
  const trackWarnings = warnings.filter((w) => w.source === '轨迹监管' && w.status !== '已关闭').length
  return {
    projectId,
    projectName: getProjectLabel(projectId),
    todayIn,
    todayOut,
    onSite,
    inTransit,
    registered: vehicles.length,
    vehicleWarnings,
    trackWarnings,
    totalWarnings: vehicleWarnings + trackWarnings,
  }
}

export function getVehicleDashboardData(scopeId) {
  if (scopeId === 'hq') {
    const projectStats = projectIds.map(aggregateProjectStats)
    const summary = projectStats.reduce(
      (acc, row) => {
        acc.todayIn += row.todayIn
        acc.todayOut += row.todayOut
        acc.onSite += row.onSite
        acc.inTransit += row.inTransit
        acc.registered += row.registered
        acc.vehicleWarnings += row.vehicleWarnings
        acc.trackWarnings += row.trackWarnings
        acc.totalWarnings += row.totalWarnings
        return acc
      },
      {
        todayIn: 0,
        todayOut: 0,
        onSite: 0,
        inTransit: 0,
        registered: 0,
        vehicleWarnings: 0,
        trackWarnings: 0,
        totalWarnings: 0,
      },
    )
    return {
      summary,
      projectStats,
      recentWarnings: projectIds
        .flatMap((id) =>
          getProjectVehicleWarnings(id).map((r) => ({
            id: r.id,
            projectName: getProjectLabel(id),
            plateNo: r.plateNo,
            warningType: r.warningType,
            source: r.source,
            time: r.triggeredAt,
          })),
        )
        .slice(0, 8),
    }
  }

  const projectStats = [aggregateProjectStats(scopeId)]
  const summary = { ...projectStats[0] }
  delete summary.projectId
  delete summary.projectName
  return {
    summary,
    projectStats,
    recentWarnings: getProjectVehicleWarnings(scopeId)
      .map((r) => ({
        id: r.id,
        projectName: getProjectLabel(scopeId),
        plateNo: r.plateNo,
        warningType: r.warningType,
        source: r.source,
        time: r.triggeredAt,
      }))
      .slice(0, 6),
  }
}

export function getProjectGateOptions(projectId) {
  return (devicesByProject[projectId] || [])
    .filter((item) => item.deviceType === '道闸车牌识别设备')
    .map((item) => ({
      id: item.id,
      label: item.name,
      location: item.location,
      online: item.online,
    }))
}

export function formatVehicleGateLabels(vehicle, projectId) {
  const gateMap = Object.fromEntries(getProjectGateOptions(projectId).map((item) => [item.id, item.label]))
  return (vehicle.authorizedGateIds || []).map((id) => gateMap[id]).filter(Boolean)
}

export function emptyVehicleForm(vehicle) {
  return {
    id: vehicle?.id || '',
    plateNo: vehicle?.plateNo || '',
    vehicleType: vehicle?.vehicleType || vehicleTypeOptions[0],
    unitName: vehicle?.unitName || '',
    driverName: vehicle?.driverName || '',
    driverPhone: vehicle?.driverPhone || '',
    permitNo: vehicle?.permitNo || '',
    permitValidTo: vehicle?.permitValidTo || '',
    status: vehicle?.status || '已准入',
    authorizedGateIds: vehicle?.authorizedGateIds ? [...vehicle.authorizedGateIds] : [],
  }
}

export function emptyVehicleDeviceForm(device) {
  return {
    id: device?.id || '',
    name: device?.name || '',
    deviceType: device?.deviceType || vehicleDeviceTypeOptions[0],
    deviceNo: device?.deviceNo || '',
    location: device?.location || '',
    online: device?.online !== false,
    bindPlateNo: device?.bindPlateNo || '',
  }
}
