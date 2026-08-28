import { projectTree, getProjectLabel } from './laborRealName.js'
import { nowStr } from '../utils/datetime.js'
import { notifyBizAlertDisposed } from './warningCenterBizHook.js'

export { projectTree, getProjectLabel }

// ==================== 数据模型 ====================
// 监测区域 → 监测点 → 设备 → 监测指标 → 监测数据
// 告警规则 → 告警记录

// ----- 监测区域 -----
const regionTemplates = {
  pit: ['T2航站区深基坑A区', 'T2航站区深基坑B区', '三跑道深基坑C区', '综合配套区深基坑D区', '捷运线深基坑E区'],
  subway: ['地铁12号线保护区-左线', '地铁12号线保护区-右线', '广深港高铁保护区-上行', '广深港高铁保护区-下行', '穗莞深城际保护区'],
  formwork: ['T2航站区大厅高支模', 'T2航站区指廊高支模', '综合交通中心高支模', '捷运线站厅高支模'],
}

// ----- 监测指标 -----
export const indicatorDefs = {
  pit: [
    { name: '水平位移', unit: 'mm', warnPct: 0.8, alertThreshold: 15 },
    { name: '竖向位移', unit: 'mm', warnPct: 0.8, alertThreshold: 10 },
    { name: '水位', unit: 'mm', warnPct: 0.8, alertThreshold: 25 },
    { name: '支撑轴力', unit: 'kN', warnPct: 0.8, alertThreshold: 500 },
  ],
  subway: [
    { name: '沉降', unit: 'mm', warnPct: 0.8, alertThreshold: 8 },
    { name: '水平位移', unit: 'mm', warnPct: 0.8, alertThreshold: 6 },
    { name: '振动', unit: 'mm/s', warnPct: 0.8, alertThreshold: 1.0 },
  ],
  formwork: [
    { name: '沉降', unit: 'mm', warnPct: 0.8, alertThreshold: 5 },
    { name: '位移', unit: 'mm', warnPct: 0.8, alertThreshold: 8 },
    { name: '倾斜', unit: '°', warnPct: 0.8, alertThreshold: 2.0 },
  ],
}

// ----- 缓存容器 -----
const DB = {
  regions: [],   // { id, projectId, hazardType, name }
  points: [],    // { id, regionId, name }
  devices: [],   // { id, name, deviceNo, deviceType, regionId, pointId, online, remark }
  indicators: [], // { id, deviceId, name, unit, warningThreshold, alertThreshold }
  monitorData: [], // { id, deviceId, indicatorId, pointId, regionId, projectId, value, collectTime }
  alertRules: [],  // { id, name, hazardType, deviceIds[], indicatorIds[], handler, pushChannel, thresholdCondition, pushRule, enabled }
  alertRecords: [], // { id, ruleId, hazardType, deviceName, region, point, indicatorName, currentValue, threshold, level, detail, time, status, handler, handlingContent, handlingTime }
}

let seq = 0
function uid(prefix) { return `${prefix}-${++seq}` }

// ----- 种子数据生成 -----
function seedProject(projectId) {
  const seed = Number(projectId.replace(/\D/g, '')) || 0
  const types = ['pit', 'subway', 'formwork']
  const typeLabels = { pit: '深基坑', subway: '地铁铁路', formwork: '高支模' }
  const newDeviceTypes = { pit: '深基坑监测设备', subway: '地铁铁路安全监管监测设备', formwork: '高支模监测设备' }
  const deviceStatusOpts = ['已进场', '已安装', '使用中', '已拆除', '已退场']

  types.forEach((hazardType) => {
    const regions = regionTemplates[hazardType]
    const indicators = indicatorDefs[hazardType]
    const regionCount = 2 + (seed % 3)

    for (let ri = 0; ri < regionCount; ri++) {
      const regionId = uid('reg')
      const regionName = regions[ri % regions.length]
      DB.regions.push({ id: regionId, projectId, hazardType, name: regionName })

      const pointCount = 2 + (seed % 2)
      for (let pi = 0; pi < pointCount; pi++) {
        const pointId = uid('pt')
        const pointPrefixes = { pit: 'SJK', subway: 'DTBH', formwork: 'GZM' }
        const pointName = `${pointPrefixes[hazardType]}${String(ri + 1).padStart(2, '0')}${String(pi + 1).padStart(2, '0')}`
        DB.points.push({ id: pointId, regionId, name: pointName })

        // 每个测点绑定1台设备（多指标集成）
        const deviceId = uid('dev')
        const deviceName = `${typeLabels[hazardType]}${regionName.slice(-2)}监测设备-${String(pi + 1).padStart(2, '0')}`
        const online = (seed + ri + pi) % 4 !== 0
        const today = new Date()
        const bindDate = new Date(today)
        bindDate.setDate(bindDate.getDate() - (30 + seed + ri + pi))
        const lastOnline = new Date(today)
        lastOnline.setHours(lastOnline.getHours() - (seed + ri + pi))
        const statusSeed = (seed + ri + pi) % 5
        const devStatus = deviceStatusOpts[statusSeed]
        DB.devices.push({
          id: deviceId, name: deviceName,
          deviceNo: `${hazardType.toUpperCase().slice(0, 3)}-${String(ri + 1).padStart(2, '0')}-${String(pi + 1).padStart(2, '0')}`,
          deviceType: newDeviceTypes[hazardType],
          regionId, pointId, projectId, online,
          deviceStatus: devStatus,
          bindTime: bindDate.toISOString().slice(0, 10),
          lastOnlineTime: online ? lastOnline.toISOString().slice(0, 19).replace('T', ' ') : '',
          remark: '',
        })

        // 设备采集多个指标
        indicators.forEach((ind) => {
          const indicatorId = uid('ind')
          const warningThreshold = +(ind.alertThreshold * ind.warnPct).toFixed(1)
          DB.indicators.push({
            id: indicatorId, deviceId, hazardType,
            name: ind.name, unit: ind.unit,
            warningThreshold,
            alertThreshold: ind.alertThreshold,
          })

          // 生成近30天的历史监测数据
          const now = new Date()
          for (let d = 29; d >= 0; d--) {
            const date = new Date(now)
            date.setDate(date.getDate() - d)
            for (let h = 8; h < 18; h += 2) {
              const baseVal = ind.alertThreshold * 0.5
              const val = +(baseVal + Math.random() * ind.alertThreshold * 0.7).toFixed(1)
              const collectTime = `${date.toISOString().slice(0, 10)} ${String(h).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`
              DB.monitorData.push({
                id: uid('md'), deviceId, indicatorId, pointId, regionId, projectId, hazardType,
                value: val, collectTime,
              })
            }
          }
        })
      }
    }
  })
}

// ----- 公共 API -----
export function ensureSeeded(projectId) {
  const exists = DB.regions.some(r => r.projectId === projectId)
  if (!exists) seedProject(projectId)
}

export function getRegions(projectId, hazardType) {
  ensureSeeded(projectId)
  return DB.regions.filter(r => r.projectId === projectId && r.hazardType === hazardType)
}

export function getPoints(projectId, hazardType) {
  ensureSeeded(projectId)
  const regionIds = DB.regions.filter(r => r.projectId === projectId && r.hazardType === hazardType).map(r => r.id)
  return DB.points.filter(p => regionIds.includes(p.regionId))
}

export function getDevices(projectId, hazardType) {
  ensureSeeded(projectId)
  const regionIds = DB.regions.filter(r => r.projectId === projectId && r.hazardType === hazardType).map(r => r.id)
  const pointIds = DB.points.filter(p => regionIds.includes(p.regionId)).map(p => p.id)
  return DB.devices.filter(d => d.projectId === projectId && pointIds.includes(d.pointId))
}

export function getIndicatorsByDevice(deviceId) {
  return DB.indicators.filter(i => i.deviceId === deviceId)
}

export function getMonitorData(projectId, hazardType, { pointId, indicatorId, startTime, endTime } = {}) {
  ensureSeeded(projectId)
  const regionIds = DB.regions.filter(r => r.projectId === projectId && r.hazardType === hazardType).map(r => r.id)
  const pointIds = DB.points.filter(p => regionIds.includes(p.regionId)).map(p => p.id)
  let data = DB.monitorData.filter(m => m.projectId === projectId && pointIds.includes(m.pointId))
  if (pointId) data = data.filter(m => m.pointId === pointId)
  if (indicatorId) data = data.filter(m => m.indicatorId === indicatorId)
  if (startTime) data = data.filter(m => m.collectTime >= startTime)
  if (endTime) data = data.filter(m => m.collectTime <= endTime)
  return data.sort((a, b) => b.collectTime.localeCompare(a.collectTime))
}

export function enrichMonitorData(data) {
  return data.map(m => {
    const point = DB.points.find(p => p.id === m.pointId)
    const device = DB.devices.find(d => d.id === m.deviceId)
    const indicator = DB.indicators.find(i => i.id === m.indicatorId)
    const region = DB.regions.find(r => r.id === m.regionId)
    return {
      ...m,
      regionName: region?.name || '',
      pointName: point?.name || '',
      deviceName: device?.name || '',
      indicatorName: indicator?.name || '',
      unit: indicator?.unit || '',
      warningThreshold: indicator?.warningThreshold || 0,
      alertThreshold: indicator?.alertThreshold || 0,
    }
  })
}

// ----- 设备管理（跨类型） -----
export function getAllDevices(projectId) {
  ensureSeeded(projectId)
  let list = DB.devices.filter(d => d.projectId === projectId)
  // 构建关联信息
  return list.map(d => {
    const point = DB.points.find(p => p.id === d.pointId)
    const region = DB.regions.find(r => r.id === d.regionId)
    const regionName = region?.name || ''
    const hazardType = region?.hazardType || ''
    const hazardLabels = { pit: '深基坑', subway: '地铁铁路', formwork: '高支模' }
    const indicators = DB.indicators.filter(i => i.deviceId === d.id)
    return {
      ...d,
      regionName: d.regionName || regionName,
      hazardTypeLabel: hazardLabels[hazardType] || '',
      pointName: point?.name || '',
      indicators: indicators.map(i => ({ id: i.id, name: i.name, unit: i.unit, warningThreshold: i.warningThreshold, alertThreshold: i.alertThreshold })),
    }
  })
}

export const monitorDeviceTypeOptions = ['深基坑监测设备', '地铁保护监测设备', '高支模监测设备']
export const deviceStatusTagClass = { 在线: 'is-success', 离线: 'is-warning', 故障: 'is-danger' }
export const responsiblePersonOptions = [
  { label: '张伟', phone: '13800001111' },
  { label: '李强', phone: '13800002222' },
  { label: '王磊', phone: '13800003333' },
  { label: '陈明', phone: '13800004444' },
]

export function emptyMonitorDeviceForm(source = {}) {
  return {
    deviceNo: source.deviceNo || '',
    name: source.name || '',
    deviceType: source.deviceType || '深基坑监测设备',
    location: source.location || source.regionName || '',
    monitorPoint: source.monitorPoint || source.pointName || '',
    remark: source.remark || '',
    monitorIndicator: source.monitorIndicator || '',
    warningThreshold: source.warningThreshold || '',
    alertThreshold: source.alertThreshold || '',
    pushTargets: source.pushTargets ? [...source.pushTargets] : [],
    pushInterval: source.pushInterval || 30,
    supervisionDeadline: source.supervisionDeadline || 24,
    status: source.status || '在线',
  }
}

export function getProjectMonitorDevices(projectId) {
  return getAllDevices(projectId).map((d) => ({
    id: d.id,
    name: d.name,
    deviceNo: d.deviceNo,
    deviceType: d.deviceType,
    location: d.regionName || '',
    monitorPoint: d.pointName || '',
    status: d.online ? '在线' : '离线',
    lastMaintainDate: d.lastMaintainDate || '2026-07-01',
    nextMaintainDate: d.nextMaintainDate || '2026-10-01',
    updatedAt: d.updatedAt || '2026-07-20 11:24:56',
    remark: d.remark || '',
  }))
}

export function getMonitorDeviceStats(projectId) {
  const list = getProjectMonitorDevices(projectId)
  return {
    total: list.length,
    online: list.filter((d) => d.status === '在线').length,
    offline: list.filter((d) => d.status === '离线').length,
    fault: list.filter((d) => d.status === '故障').length,
  }
}

export function emptyDeviceForm(source = {}) {
  return {
    name: source.name || '',
    deviceNo: source.deviceNo || '',
    deviceType: source.deviceType || '深基坑监测设备',
    regionName: source.regionName || '',
    contact: source.contact || '',
    contactPhone: source.contactPhone || '',
    remark: source.remark || '',
  }
}

export function saveDevice(data, isEdit) {
  if (isEdit) {
    const idx = DB.devices.findIndex(d => d.id === data.id)
    if (idx !== -1) { Object.assign(DB.devices[idx], data); return DB.devices[idx] }
  } else {
    const now = new Date()
    const d = {
      id: uid('dev'), projectId: data.projectId, online: true,
      bindTime: now.toISOString().slice(0, 10),
      lastOnlineTime: '',
      pointId: '',
      ...data,
    }
    DB.devices.push(d)
    return d
  }
}

// ----- 区域/点管理 -----
export function addRegion(data) {
  const r = { id: 'reg-' + Date.now(), projectId: data.projectId, hazardType: data.hazardType, name: data.name }
  DB.regions.push(r)
  return r
}

export function updateRegion(id, data) {
  const r = DB.regions.find(r => r.id === id)
  if (r) { Object.assign(r, data); return r }
  return null
}

export function deleteRegionAndPoints(regionId) {
  const pts = DB.points.filter(p => p.regionId === regionId)
  pts.forEach(p => {
    const dev = DB.devices.find(d => d.pointId === p.id)
    if (dev) dev.pointId = ''
  })
  DB.points = DB.points.filter(p => p.regionId !== regionId)
  const idx = DB.regions.findIndex(r => r.id === regionId)
  if (idx !== -1) { DB.regions.splice(idx, 1); return true }
  return false
}

export function addPoint(data) {
  const p = { id: 'pt-' + Date.now(), regionId: data.regionId, name: data.name }
  DB.points.push(p)
  // 如果指定了设备，绑定设备
  if (data.deviceId) {
    const dev = DB.devices.find(d => d.id === data.deviceId)
    if (dev) dev.pointId = p.id
  }
  return p
}

export function updatePoint(id, data) {
  const p = DB.points.find(p => p.id === id)
  if (p) {
    p.name = data.name
    // 解绑旧设备
    const oldDev = DB.devices.find(d => d.pointId === id)
    if (oldDev) oldDev.pointId = ''
    // 绑定新设备
    if (data.deviceId) {
      const newDev = DB.devices.find(d => d.id === data.deviceId)
      if (newDev) newDev.pointId = id
    }
    return p
  }
  return null
}

export function deletePoint(id) {
  const dev = DB.devices.find(d => d.pointId === id)
  if (dev) dev.pointId = ''
  const idx = DB.points.findIndex(p => p.id === id)
  if (idx !== -1) { DB.points.splice(idx, 1); return true }
  return false
}

export function removeDevice(id) {
  const idx = DB.devices.findIndex(d => d.id === id)
  if (idx !== -1) { DB.devices.splice(idx, 1); return true }
  return false
}

export function getDeviceStats(projectId) {
  const list = getAllDevices(projectId)
  return { total: list.length, online: list.filter(d => d.online).length, offline: list.filter(d => !d.online).length }
}

// ----- 告警规则 -----
export function getAlertRules(projectId, hazardType) {
  ensureSeeded(projectId)
  if (DB.alertRules.length === 0) seedAlertRules(projectId)
  return DB.alertRules.filter(r => r.projectId === projectId && (!hazardType || r.hazardType === hazardType))
}

function seedAlertRules(projectId) {
  const types = ['pit', 'subway', 'formwork']
  const typeLabels = { pit: '深基坑', subway: '地铁铁路', formwork: '高支模' }
  const persons = ['张伟', '李强', '王磊', '陈明']
  
  types.forEach((hazardType) => {
    const regionIds = DB.regions.filter(r => r.projectId === projectId && r.hazardType === hazardType).map(r => r.id)
    const pointIds = DB.points.filter(p => regionIds.includes(p.regionId)).map(p => p.id)
    const devs = DB.devices.filter(d => d.projectId === projectId && pointIds.includes(d.pointId))
    const inds = DB.indicators.filter(i => devs.some(d => d.id === i.deviceId))
    
    if (inds.length === 0) return
    
    const indicators = indicatorDefs[hazardType]
    indicators.forEach((ind, idx) => {
      const relatedInds = inds.filter(i => i.name === ind.name)
      if (relatedInds.length === 0) return
      const person = persons[idx % persons.length]
      DB.alertRules.push({
        id: uid('rule'),
        projectId, hazardType,
        name: `${typeLabels[hazardType]}${ind.name}超限预警`,
        deviceIds: devs.map(d => d.id),
        indicatorIds: relatedInds.map(i => i.id),
        indicatorName: ind.name,
        handler: person,
        pushChannel: idx % 2 === 0 ? ['短信', '站内信'] : ['站内信'],
        thresholdCondition: `> ${ind.alertThreshold} ${ind.unit}`,
        pushRule: '实时推送',
        enabled: idx !== 2,
        createdAt: '2026-07-01 09:00:00',
      })
    })
  })
}

export function saveAlertRule(data, isEdit) {
  if (isEdit) {
    const idx = DB.alertRules.findIndex(r => r.id === data.id)
    if (idx !== -1) { Object.assign(DB.alertRules[idx], data); return DB.alertRules[idx] }
  } else {
    const r = { id: uid('rule'), projectId: data.projectId, createdAt: new Date().toISOString().slice(0, 10), ...data }
    DB.alertRules.push(r)
    return r
  }
}

export function removeAlertRule(id) {
  const idx = DB.alertRules.findIndex(r => r.id === id)
  if (idx !== -1) { DB.alertRules.splice(idx, 1); return true }
  return false
}

// ----- 告警记录 -----
export function getAlertRecords(projectId, hazardType, filters = {}) {
  ensureSeeded(projectId)
  if (DB.alertRecords.length === 0) seedAlertRecords(projectId)
  
  let list = DB.alertRecords.filter(r => r.projectId === projectId && (!hazardType || r.hazardType === hazardType))
  if (filters.regionId) list = list.filter(r => r.regionId === filters.regionId)
  if (filters.level) list = list.filter(r => r.level === filters.level)
  if (filters.status) list = list.filter(r => r.status === filters.status)
  if (filters.startTime) list = list.filter(r => r.time >= filters.startTime)
  if (filters.endTime) list = list.filter(r => r.time <= filters.endTime)
  return list.sort((a, b) => b.time.localeCompare(a.time))
}

function seedAlertRecords(projectId) {
  const types = ['pit', 'subway', 'formwork']
  const levels = ['一级', '二级', '三级']
  const typeLabels = { pit: '深基坑', subway: '地铁铁路', formwork: '高支模' }
  const handlers = ['张伟', '李强', '王磊', '陈明']
  const handlingContents = [
    '已现场复核，传感器运行正常，数据已趋于稳定，持续观察中。',
    '安排技术人员现场排查，发现为施工振动干扰，已调整滤波参数，数据恢复正常。',
    '已联系设备厂商远程诊断，确认设备无异常，监测值回落至安全范围，已闭环。',
  ]

  types.forEach((hazardType) => {
    const regionIds = DB.regions.filter(r => r.projectId === projectId && r.hazardType === hazardType).map(r => r.id)
    const pointIds = DB.points.filter(p => regionIds.includes(p.regionId)).map(p => p.id)
    const devs = DB.devices.filter(d => d.projectId === projectId && pointIds.includes(d.pointId))
    const inds = DB.indicators.filter(i => devs.some(d => d.id === i.deviceId))
    if (inds.length === 0) return

    const allData = DB.monitorData.filter(m => m.projectId === projectId && pointIds.includes(m.pointId))
    const latestByInd = {}
    allData.forEach(m => {
      if (!latestByInd[m.indicatorId] || m.collectTime > latestByInd[m.indicatorId].collectTime) {
        latestByInd[m.indicatorId] = m
      }
    })
    const latestData = Object.values(latestByInd)
    let pool = latestData.length >= 6 ? latestData : allData
    if (pool.length === 0) return

    const now = new Date()
    for (let i = 0; i < 6; i++) {
      const m = pool[i % pool.length]
      if (!m) continue
      const region = DB.regions.find(r => r.id === m.regionId)
      const device = DB.devices.find(d => d.id === m.deviceId)
      const point = DB.points.find(p => p.id === m.pointId)
      const indicator = DB.indicators.find(i => i.id === m.indicatorId)
      if (!indicator) continue

      const isHandled = i < 3
      const daysAgo = [30, 20, 10][i] || 0
      const hoursAgo = [24, 12, 1][i - 3] || 1
      const time = new Date(now.getTime() - (isHandled ? daysAgo * 86400000 : hoursAgo * 3600000))
      const timeStr = time.toISOString().slice(0, 19).replace('T', ' ')

      const rule = DB.alertRules.find(r => r.projectId === projectId && r.hazardType === hazardType && r.indicatorName === indicator?.name)
      const alertType = rule?.name
        ? rule.name + '预警'
        : typeLabels[hazardType] + indicator.name + '超限预警'

      const exceedPct = ((m.value / indicator.alertThreshold) * 100).toFixed(0)
      const details = [
        indicator.name + '当前值' + m.value + indicator.unit + '，超过预警阈值' + indicator.alertThreshold + indicator.unit + '（超限' + exceedPct + '%），请立即安排人员现场核实处置。',
        indicator.name + '监测数据异常，当前读数' + m.value + indicator.unit + '（阈值' + indicator.alertThreshold + indicator.unit + '），可能原因为施工扰动或传感器异常，建议现场复核。',
        '预警：' + indicator.name + '达到' + m.value + indicator.unit + '，接近红色预警值' + indicator.alertThreshold + indicator.unit + '，请关注趋势变化，必要时采取加固措施。',
      ]

      const images = !isHandled ? ['现场照片_001.jpg', '仪表读数_001.jpg'] : []

      DB.alertRecords.push({
        id: uid('alr'), projectId, hazardType, ruleId: rule?.id || '',
        alertType,
        region: region?.name || '',
        regionId: m.regionId,
        point: point?.name || '',
        deviceName: device?.name || '',
        indicatorName: indicator?.name || '',
        currentValue: m.value,
        threshold: indicator.alertThreshold,
        unit: indicator.unit || '',
        level: levels[i % levels.length],
        detail: details[i % details.length],
        time: timeStr,
        status: isHandled ? '已处置' : '未处置',
        handler: isHandled ? (rule?.handler || handlers[i % handlers.length]) : '',
        handlingContent: isHandled ? handlingContents[i % handlingContents.length] : '',
        handlingTime: isHandled ? timeStr : '',
        handlerPhone: isHandled ? '138****5678' : '',
        images: images,
      })
    }
  })
}

function getLatestMonitorData(projectId, hazardType) {
  const regionIds = DB.regions.filter(r => r.projectId === projectId && r.hazardType === hazardType).map(r => r.id)
  const pointIds = DB.points.filter(p => regionIds.includes(p.regionId)).map(p => p.id)
  if (pointIds.length === 0) return []
  const data = DB.monitorData.filter(m => m.projectId === projectId && pointIds.includes(m.pointId))
  // 取每个指标的最新一条
  const latest = {}
  data.forEach(m => {
    if (!latest[m.indicatorId] || m.collectTime > latest[m.indicatorId].collectTime) {
      latest[m.indicatorId] = m
    }
  })
  return Object.values(latest).filter(m => m.value > (DB.indicators.find(i => i.id === m.indicatorId)?.warningThreshold || Infinity))
}

export function handleAlertRecord(id, { content, handler } = {}) {
  const rec = DB.alertRecords.find((r) => r.id === id)
  if (!rec || rec.status === '已处置') return false
  rec.status = '已处置'
  rec.handlingContent = content || ''
  rec.handlingTime = nowStr()
  if (handler) rec.handler = handler
  notifyBizAlertDisposed('major', id, {
    operator: handler || rec.handler || '系统',
    disposalResult: String(content || '').startsWith('误报') ? '误报' : '已处置',
    disposalNote: content || '',
  })
  return true
}

/** 个人中心预警中心演示关联的危大预警记录 id */
export const WC_DEMO_MAJOR_ALERT_ID = 'alr-wc-demo-001'

/**
 * 确保存在可被预警中心关联的危大未处置记录（固定 id，便于闭环演示）
 */
export function ensureWcDemoMajorAlert() {
  ensureSeeded('p-000')
  if (!DB.alertRecords.some((r) => r.projectId === 'p-000')) {
    seedAlertRecords('p-000')
  }
  let rec = DB.alertRecords.find((r) => r.id === WC_DEMO_MAJOR_ALERT_ID)
  if (!rec) {
    rec = {
      id: WC_DEMO_MAJOR_ALERT_ID,
      projectId: 'p-000',
      hazardType: 'pit',
      ruleId: '',
      alertType: '深基坑水平位移超限预警',
      region: '基坑东侧',
      regionId: '',
      point: 'JC-03',
      deviceName: '位移监测点 JC-03',
      indicatorName: '水平位移',
      currentValue: 18.5,
      threshold: 15,
      unit: 'mm',
      level: '一级',
      detail:
        '深基坑水平位移超限：基坑东侧监测点当前数值超过预警阈值，请立即安排人员现场核实处置。',
      time: '2026-08-21 08:56:42',
      status: '未处置',
      handler: '',
      handlingContent: '',
      handlingTime: '',
      handlerPhone: '',
      images: ['现场照片_001.jpg'],
    }
    DB.alertRecords.unshift(rec)
  }
  return rec
}

export function getMajorAlertById(id) {
  return DB.alertRecords.find((r) => String(r.id) === String(id)) || null
}

// ----- 统计 -----
export function getMonitorStats(projectId, hazardType) {
  const regions = getRegions(projectId, hazardType)
  const points = getPoints(projectId, hazardType)
  const devices = getDevices(projectId, hazardType)
  return { regions: regions.length, points: points.length, devices: devices.length, onlineDevices: devices.filter(d => d.online).length }
}

// ----- 指挥部看板统计 -----
const projectInfo = [
  { id: 'p-000', label: '飞行区跑道延长工程' },
  { id: 'p-001', label: 'T3航站楼扩建工程' },
  { id: 'p-003', label: '新货运站建设工程' },
]

export function getHQProjectStats(hazardType) {
  return projectInfo.map(p => {
    const regions = getRegions(p.id, hazardType)
    const points = getPoints(p.id, hazardType)
    const devices = getDevices(p.id, hazardType)
    // 获取今日告警数（当天）
    const today = new Date().toISOString().slice(0, 10)
    const allAlerts = getAlertRecords(p.id, hazardType, {})
    const todayAlerts = allAlerts.filter(a => a.time && a.time.startsWith(today))
    const pendingAlerts = allAlerts.filter(a => a.status === '未处置')
    return {
      projectId: p.id,
      projectName: p.label,
      regionCount: regions.length,
      pointCount: points.length,
      deviceCount: devices.length,
      todayAlertCount: todayAlerts.length,
      pendingAlertCount: pendingAlerts.length,
    }
  })
}
