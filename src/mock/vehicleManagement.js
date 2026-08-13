import { projectTree, getProjectLabel, getDefaultProjectId } from './laborRealName.js'

export { projectTree, getProjectLabel, getDefaultProjectId }

export const vehicleTypeOptions = ['渣土车', '混凝土车', '材料运输车', '特种车辆', '其他']
export const vehicleDeviceTypeOptions = ['道闸车牌识别设备']
export const vehicleWarningStatusOptions = ['待处置', '处置中', '已关闭']
export const vehicleRegulationWarningTypes = ['黑名单车辆', '证件过期', '无定位信号', '未授权道闸']

/** 项目是否对接轨迹/定位子系统（无对接则不做轨迹硬性要求） */
function nowStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const defaultProjectTrackCapability = {
  'p-000': {
    enabled: true,
    system_name: 'T2 车辆定位系统',
    url: 'https://example.com/vehicle-track/p-000',
    updated_at: '2026-08-02 11:05:00',
  },
  'p-001': {
    enabled: true,
    system_name: 'T1 车辆定位系统',
    url: 'https://example.com/vehicle-track/p-001',
    updated_at: '2026-08-04 09:48:00',
  },
  'p-003': { enabled: false, system_name: '', url: '', updated_at: '' },
  'p-004': {
    enabled: true,
    system_name: '市政车辆定位',
    url: 'https://example.com/vehicle-track/p-004',
    updated_at: '2026-07-30 15:22:00',
  },
  'p-005': {
    enabled: false,
    system_name: '停用车辆定位演示',
    url: 'https://example.com/vehicle-track/p-005',
    updated_at: '2026-06-20 13:10:00',
  },
}

let projectTrackCapabilityStore = structuredClone(defaultProjectTrackCapability)

export function getProjectVehicleTrackCapability(project_id) {
  const item = projectTrackCapabilityStore[project_id]
  return {
    enabled: Boolean(item?.enabled),
    system_name: item?.system_name || '',
    url: item?.url || '',
    updated_at: item?.updated_at || '',
  }
}

export function saveProjectVehicleTrackCapability(project_id, payload = {}) {
  if (!project_id || project_id === 'hq') return null
  projectTrackCapabilityStore[project_id] = {
    enabled: Boolean(payload.enabled),
    system_name: String(payload.system_name || '').trim(),
    url: String(payload.url || '').trim(),
    updated_at: nowStamp(),
  }
  return getProjectVehicleTrackCapability(project_id)
}

/** 车辆轨迹：平台仅提供按项目跳转至自有车辆定位系统，不做统一轨迹回放 */
export function listProjectVehicleTrackJumpConfigs() {
  return (projectTree[0]?.children || []).map((item) => {
    const cfg = getProjectVehicleTrackCapability(item.id)
    return {
      project_id: item.id,
      project_name: item.label.replace(/\(\d+\)$/, ''),
      ...cfg,
    }
  })
}

/** 指挥部 · 车辆轨迹系统：有 URL 即展示（含停用） */
export function listConfiguredVehicleTrackSystems() {
  const nameMap = Object.fromEntries(
    (projectTree[0]?.children || []).map((item) => [
      item.id,
      String(item.label || '').replace(/\(\d+\)$/, ''),
    ]),
  )
  return Object.entries(projectTrackCapabilityStore)
    .map(([project_id, raw]) => {
      const url = String(raw?.url || '').trim()
      return {
        project_id,
        project_name: nameMap[project_id] || project_id,
        url,
        enabled: Boolean(raw?.enabled),
        updated_at: raw?.updated_at || '',
        system_name: raw?.system_name || '',
      }
    })
    .filter((row) => row.url)
    .sort((a, b) => String(a.project_name).localeCompare(String(b.project_name), 'zh-CN'))
}

const units = ['中建三局', '深圳市政', '广东建工', '中铁建工', '城建集团']
const drivers = ['王强', '李明', '张伟', '刘洋', '陈刚', '赵磊', '周杰']

const projectIds = projectTree[0].children.map((item) => item.id)

function seededCount(project_id, salt) {
  const base = Number(project_id.replace(/\D/g, '')) || 0
  return 32 + ((base + salt) % 16)
}

function getProjectGateDeviceIds(project_id) {
  const gateCount = 4 + (Number(project_id.replace(/\D/g, '')) % 3)
  return Array.from({ length: gateCount }, (_, i) => `${project_id}-dev-gate-${i + 1}`)
}

function buildDevices(project_id, vehicles = []) {
  const seed = Number(project_id.replace(/\D/g, '')) || 0
  const gateCount = 4 + (seed % 3)
  const locations = ['东门', '西门', '材料堆场', '拌合站', '南门', '北门']
  const devices = []

  for (let i = 0; i < gateCount; i += 1) {
    devices.push({
      id: `${project_id}-dev-gate-${i + 1}`,
      project_id,
      name: `道闸识别-${i + 1}`,
      device_type: '道闸车牌识别设备',
      device_no: `DEV-G-${project_id}-${String(i + 1).padStart(3, '0')}`,
      location: locations[i % locations.length],
      online: i % 4 !== 0,
      bind_plate_no: '',
      updated_at: `2026-06-28 ${String(10 + (i % 12)).padStart(2, '0')}:30:00`,
    })
  }

  return devices
}

function buildVehicles(project_id) {
  const gateIds = getProjectGateDeviceIds(project_id)
  const count = seededCount(project_id, 1)
  return Array.from({ length: count }, (_, i) => {
    const platePrefix = ['粤B', '粤A', '粤S', '粤L'][i % 4]
    const plateSeed = Number(project_id.replace(/\D/g, '')) || 0
    return {
      id: `${project_id}-veh-${i + 1}`,
      project_id,
      plate_no: `${platePrefix}${String(10000 + i * 137 + plateSeed * 17).slice(-5)}`,
      vehicle_type: vehicleTypeOptions[i % vehicleTypeOptions.length],
      unit_name: units[i % units.length],
      driver_name: drivers[(i + Number(project_id.replace(/\D/g, ''))) % drivers.length],
      driver_phone: `138${String(10000000 + i * 321).slice(0, 8)}`,
      permit_no: `PZ-${project_id}-${String(i + 1).padStart(4, '0')}`,
      permit_valid_to: '2026-12-31',
      status: i % 7 === 0 ? '已退场' : '已准入',
      authorized_gate_ids: i % 5 === 0 ? [] : gateIds.slice(0, 1 + (i % Math.max(gateIds.length, 1))),
      updated_at: `2026-06-${String(10 + (i % 18)).padStart(2, '0')} 10:00`,
    }
  })
}

const vehiclesByProject = Object.fromEntries(projectIds.map((id) => [id, buildVehicles(id)]))

function buildAccessRecords(project_id) {
  const vehicles = vehiclesByProject[project_id] || []
  const gates = ['东门', '西门', '南门']
  return vehicles.slice(0, 22).flatMap((veh, i) => [
    {
      id: `${project_id}-in-${i + 1}`,
      project_id,
      plate_no: veh.plate_no,
      vehicle_type: veh.vehicle_type,
      direction: '进场',
      gate_name: `${gates[i % gates.length]}道闸`,
      record_time: `2026-06-29 ${String(8 + i).padStart(2, '0')}:${String(i * 7 % 60).padStart(2, '0')}:00`,
    },
    {
      id: `${project_id}-out-${i + 1}`,
      project_id,
      plate_no: veh.plate_no,
      vehicle_type: veh.vehicle_type,
      direction: '出场',
      gate_name: `${gates[i % gates.length]}道闸`,
      record_time: `2026-06-29 ${String(16 + (i % 4)).padStart(2, '0')}:${String(i * 5 % 60).padStart(2, '0')}:00`,
    },
  ])
}

function buildVehicleRegulationWarnings(project_id) {
  const vehicles = vehiclesByProject[project_id] || []
  return vehicles.slice(0, 6).map((veh, i) => ({
    id: `${project_id}-warn-${i + 1}`,
    warning_no: `VW-${project_id}-${String(i + 1).padStart(3, '0')}`,
    project_id,
    plate_no: veh.plate_no,
    warning_type: vehicleRegulationWarningTypes[i % vehicleRegulationWarningTypes.length],
    source: '车辆监管',
    related_info: veh.unit_name,
    status: i === 0 ? '待处置' : '处置中',
    triggered_at: `2026-06-29 ${String(10 + i).padStart(2, '0')}:30:00`,
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
function buildTrackAlerts(project_id) {
  if (!getProjectVehicleTrackCapability(project_id).enabled) return []
  const vehicles = vehiclesByProject[project_id] || []
  return vehicles.slice(0, 3).map((veh, i) => ({
    id: `${project_id}-track-${i + 1}`,
    project_id,
    plate_no: veh.plate_no,
    alert_type: '超速提醒',
    route_name: `运输路线-${i + 1}`,
    status: i === 0 ? '处置中' : '待处置',
    alert_time: `2026-06-29 ${String(11 + i).padStart(2, '0')}:20:00`,
  }))
}

const trackAlertsByProject = Object.fromEntries(projectIds.map((id) => [id, buildTrackAlerts(id)]))

export function vehicleWarningStatusTagClass(status) {
  if (status === '已关闭') return 'ap-tag-enabled'
  if (status === '处置中') return 'ap-tag-draft'
  return 'ap-tag-high'
}

export function getProjectVehicleWarnings(project_id) {
  const regulationWarnings = regulationWarningsByProject[project_id] || []

  const track_warning_count = getProjectTrackAlerts(project_id).map((row, index) => ({
    id: row.id,
    warning_no: `VT-${project_id}-${String(index + 1).padStart(3, '0')}`,
    project_id,
    plate_no: row.plate_no,
    warning_type: row.alert_type,
    source: '轨迹监管',
    related_info: row.route_name,
    status: row.status === '已关闭' ? '已关闭' : row.status,
    triggered_at: row.alert_time,
  }))

  return [...regulationWarnings, ...track_warning_count].sort((a, b) =>
    (b.triggered_at || '').localeCompare(a.triggered_at || ''),
  )
}

export function getVehicleWarningStats(project_id) {
  const list = getProjectVehicleWarnings(project_id)
  return {
    total: list.length,
    pending: list.filter((item) => item.status === '待处置').length,
    processing: list.filter((item) => item.status === '处置中').length,
    closed: list.filter((item) => item.status === '已关闭').length,
    track: list.filter((item) => item.source === '轨迹监管').length,
    vehicle: list.filter((item) => item.source === '车辆监管').length,
  }
}

export function getProjectVehicles(project_id) {
  return vehiclesByProject[project_id] || []
}

export function getProjectAccessRecords(project_id) {
  return accessByProject[project_id] || []
}

export function getProjectVehicleDevices(project_id) {
  return devicesByProject[project_id] || []
}

export function getProjectTrackAlerts(project_id) {
  return trackAlertsByProject[project_id] || []
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

export function getProjectTrackVehicles(project_id) {
  if (!getProjectVehicleTrackCapability(project_id).enabled) return []
  const devices = getProjectVehicleDevices(project_id)
  return getProjectVehicles(project_id)
    .filter((veh) => veh.status !== '已退场')
    .map((veh) => {
      const device = devices.find(
        (item) => item.bind_plate_no === veh.plate_no && item.device_type === '轨迹监测设备',
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

function aggregateProjectStats(project_id) {
  const vehicles = getProjectVehicles(project_id)
  const access = getProjectAccessRecords(project_id)
  const today_in_count = access.filter((r) => r.direction === '进场').length
  const today_out_count = access.filter((r) => r.direction === '出场').length
  const on_site_count = Math.max(0, today_in_count - today_out_count)
  const in_transit_count = Math.max(1, Math.round(on_site_count * 0.25))
  const warnings = getProjectVehicleWarnings(project_id)
  const vehicle_warning_count = warnings.filter((w) => w.source === '车辆监管' && w.status !== '已关闭').length
  const track_warning_count = warnings.filter((w) => w.source === '轨迹监管' && w.status !== '已关闭').length
  return {
    project_id,
    project_name: getProjectLabel(project_id),
    today_in_count,
    today_out_count,
    on_site_count,
    in_transit_count,
    registered: vehicles.length,
    vehicle_warning_count,
    track_warning_count,
    total_warning_count: vehicle_warning_count + track_warning_count,
  }
}

export function getVehicleDashboardData(scopeId) {
  if (scopeId === 'hq') {
    const projectStats = projectIds.map(aggregateProjectStats)
    const summary = projectStats.reduce(
      (acc, row) => {
        acc.today_in_count += row.today_in_count
        acc.today_out_count += row.today_out_count
        acc.on_site_count += row.on_site_count
        acc.in_transit_count += row.in_transit_count
        acc.registered += row.registered
        acc.vehicle_warning_count += row.vehicle_warning_count
        acc.track_warning_count += row.track_warning_count
        acc.total_warning_count += row.total_warning_count
        return acc
      },
      {
        today_in_count: 0,
        today_out_count: 0,
        on_site_count: 0,
        in_transit_count: 0,
        registered: 0,
        vehicle_warning_count: 0,
        track_warning_count: 0,
        total_warning_count: 0,
      },
    )
    return {
      summary,
      projectStats,
      recentWarnings: projectIds
        .flatMap((id) =>
          getProjectVehicleWarnings(id).map((r) => ({
            id: r.id,
            project_name: getProjectLabel(id),
            plate_no: r.plate_no,
            warning_type: r.warning_type,
            source: r.source,
            time: r.triggered_at,
          })),
        )
        .slice(0, 8),
    }
  }

  const projectStats = [aggregateProjectStats(scopeId)]
  const summary = { ...projectStats[0] }
  delete summary.project_id
  delete summary.project_name
  return {
    summary,
    projectStats,
    recentWarnings: getProjectVehicleWarnings(scopeId)
      .map((r) => ({
        id: r.id,
        project_name: getProjectLabel(scopeId),
        plate_no: r.plate_no,
        warning_type: r.warning_type,
        source: r.source,
        time: r.triggered_at,
      }))
      .slice(0, 6),
  }
}

export function getProjectGateOptions(project_id) {
  return (devicesByProject[project_id] || [])
    .filter((item) => item.device_type === '道闸车牌识别设备')
    .map((item) => ({
      id: item.id,
      label: item.name,
      location: item.location,
      online: item.online,
    }))
}

export function formatVehicleGateLabels(vehicle, project_id) {
  const gateMap = Object.fromEntries(getProjectGateOptions(project_id).map((item) => [item.id, item.label]))
  return (vehicle.authorized_gate_ids || []).map((id) => gateMap[id]).filter(Boolean)
}

export function emptyVehicleForm(vehicle) {
  return {
    id: vehicle?.id || '',
    plate_no: vehicle?.plate_no || '',
    vehicle_type: vehicle?.vehicle_type || vehicleTypeOptions[0],
    unit_name: vehicle?.unit_name || '',
    driver_name: vehicle?.driver_name || '',
    driver_phone: vehicle?.driver_phone || '',
    permit_no: vehicle?.permit_no || '',
    permit_valid_to: vehicle?.permit_valid_to || '',
    status: vehicle?.status || '已准入',
    authorized_gate_ids: vehicle?.authorized_gate_ids ? [...vehicle.authorized_gate_ids] : [],
  }
}

export function emptyVehicleDeviceForm(device) {
  return {
    id: device?.id || '',
    name: device?.name || '',
    device_type: device?.device_type || vehicleDeviceTypeOptions[0],
    device_no: device?.device_no || '',
    location: device?.location || '',
    online: device?.online !== false,
    bind_plate_no: device?.bind_plate_no || '',
  }
}
