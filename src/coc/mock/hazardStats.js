/**
 * COC 隐患统计口径（与 PRD 对齐）
 * - 统一展示态：待整改｜待复查/验收｜已关闭
 * - 来源：巡检（安全/质量）｜监理例会登记｜调度隐患清单
 * - 本期不含随手拍
 */
import {
  SAFETY_HAZARDS,
  QUALITY_HAZARDS,
  HQ_SELECTION_ID,
  HQ_HAZARD_LEVEL_SEGMENTS,
} from './data.js'
import { getDispatchHazards } from '../../utils/dispatchHazardStorage.js'
import { getSupervisionHazards } from '../../utils/cocAdminDeviceStorage.js'

/** 统计/筛选用统一整改状态 */
export const HAZARD_UNIFIED_STATUS_SEGMENTS = [
  { name: '待整改', color: '#F56C6C' },
  { name: '待复查/验收', color: '#E6A23C' },
  { name: '已关闭', color: '#67C23A' },
]

/** 项目隐患统计 · 来源数据卡（总数 + 三分源） */
export const HAZARD_SOURCE_CARD_OPTIONS = [
  { key: 'total', label: '隐患总数', color: '#1498F6' },
  { key: 'inspection', label: '巡检隐患数量', color: '#E6A23C' },
  { key: 'supervision', label: '监理例会登记隐患', color: '#B37FEB' },
  { key: 'dispatch', label: '调度隐患数量', color: '#409EFF' },
]

/** @deprecated 兼容旧引用：渠道选项不含「总数」 */
export const HAZARD_CHANNEL_OPTIONS = HAZARD_SOURCE_CARD_OPTIONS.filter((c) => c.key !== 'total')

/** @deprecated 兼容旧四态命名；统计请用 HAZARD_UNIFIED_STATUS_SEGMENTS */
export const HAZARD_STATUS_SEGMENTS = HAZARD_UNIFIED_STATUS_SEGMENTS

const MID_STATUSES = new Set(['待验收', '待复查', '已复查', '整改中'])
const CLOSED_STATUSES = new Set(['已关闭', '已闭合'])

/**
 * 将各来源原始状态映射为统一展示态
 * - 待整改：一致
 * - 待复查/验收：含待验收、待复查、已复查（及历史「整改中」）
 * - 已关闭：一致（含已闭合）
 */
export function mapHazardUnifiedStatus(rawStatus) {
  const s = String(rawStatus || '').trim()
  if (!s) return '待整改'
  if (s === '待整改') return '待整改'
  if (CLOSED_STATUSES.has(s)) return '已关闭'
  if (MID_STATUSES.has(s)) return '待复查/验收'
  if (s === '待复查/验收') return '待复查/验收'
  return '待复查/验收'
}

export function resolveHazardTicketType(item) {
  return String(item?.ticketType || item?.detail?.ticketType || '').trim()
}

/** 巡检 / 监理例会（COC 安质隐患池）渠道 */
export function resolveInspectPoolChannel(item) {
  const ticket = resolveHazardTicketType(item)
  if (ticket === '监理会议隐患' || ticket === '监理例会隐患') return 'supervision'
  if (ticket === '调度隐患') return 'dispatch'
  return 'inspection'
}

function normalizeLevel(level) {
  const s = String(level || '').trim()
  if (s === '重大' || s === '较大' || s === '一般') return s
  return '一般'
}

function fromInspectPool(item, hazardCategory) {
  const channel = resolveInspectPoolChannel(item)
  const rawStatus = item.status
  return {
    id: item.id,
    projectId: item.projectId,
    projectName: item.projectName,
    projectShortName: item.projectShortName || item.projectName,
    level: normalizeLevel(item.level),
    status: rawStatus,
    unifiedStatus: mapHazardUnifiedStatus(rawStatus),
    desc: item.desc,
    date: item.date,
    channel,
    ticketType: resolveHazardTicketType(item) || (channel === 'supervision' ? '监理会议隐患' : '巡检隐患'),
    hazardCategory,
    source: 'inspect_pool',
    raw: item,
  }
}

function fromDispatchRow(row) {
  const rawStatus = row.rectifyStatus || '待整改'
  return {
    id: row.id,
    projectId: row.projectId,
    projectName: row.projectName,
    projectShortName: row.projectName,
    level: normalizeLevel(row.hazardLevel),
    status: rawStatus,
    unifiedStatus: mapHazardUnifiedStatus(rawStatus),
    desc: row.description,
    date: String(row.uploadTime || '').slice(0, 10),
    channel: 'dispatch',
    ticketType: '调度隐患',
    hazardCategory: row.hazardType === 'quality' ? '质量' : '安全',
    source: 'dispatch',
    raw: row,
  }
}

function fromSupervisionModuleRow(row) {
  const rawStatus = row.rectifyStatus || '待整改'
  return {
    id: row.id,
    projectId: row.projectId,
    projectName: row.projectName,
    projectShortName: row.projectName,
    level: normalizeLevel(row.hazardLevel),
    status: rawStatus,
    unifiedStatus: mapHazardUnifiedStatus(rawStatus),
    desc: row.description,
    date: String(row.uploadTime || '').slice(0, 10),
    channel: 'supervision',
    ticketType: '监理会议隐患',
    hazardCategory: row.hazardType === 'quality' ? '质量' : '安全',
    source: 'supervision',
    raw: row,
  }
}

/** 列表/详情用行：与 DispatchRecordDetailBody 字段对齐 */
export function toCocHazardListRow(item) {
  if (item.source === 'dispatch' || item.channel === 'dispatch') {
    const raw = item.raw || {}
    const images = []
    if (raw.snapshot) {
      images.push({
        id: `${item.id}-snap`,
        label: '问题截图',
        url: raw.snapshot,
      })
    }
    return {
      id: item.id,
      projectId: item.projectId,
      projectName: item.projectName,
      projectShortName: item.projectShortName,
      level: item.level,
      status: item.status,
      unifiedStatus: item.unifiedStatus,
      desc: item.desc,
      date: item.date,
      channel: 'dispatch',
      ticketType: '调度隐患',
      hazardCategory: item.hazardCategory,
      source: 'dispatch',
      type: raw.hazardType === 'quality' ? 'quality' : 'safety',
      reporter: '',
      rectifier: raw.rectifier || '',
      detail: {
        ticketType: '调度隐患',
        unit: '',
        deadline: raw.hazardDeadline || '',
        measure: '',
        requirement: raw.description || item.desc || '',
        reporter: '',
        rectifier: raw.rectifier || '',
        reportTime: raw.uploadTime || '',
        images,
        cameraName: raw.cameraName || '',
        cameraLocation: raw.cameraLocation || '',
        sourceType: raw.sourceType || '',
        sourceLabel: raw.source || '问题截图',
      },
      raw,
    }
  }

  if (item.source === 'supervision' || item.channel === 'supervision') {
    const raw = item.raw || {}
    const isModule = Boolean(raw.rectifyStatus != null || raw.meetingId != null || raw.source)
    if (isModule && !raw.ticketType && !item.raw?.detail) {
      return {
        id: item.id,
        projectId: item.projectId,
        projectName: item.projectName,
        projectShortName: item.projectShortName,
        level: item.level,
        status: item.status,
        unifiedStatus: item.unifiedStatus,
        desc: item.desc,
        date: item.date,
        channel: 'supervision',
        ticketType: '监理会议隐患',
        hazardCategory: item.hazardCategory,
        source: 'supervision',
        type: raw.hazardType === 'quality' ? 'quality' : 'safety',
        reporter: '',
        rectifier: raw.rectifier || '',
        detail: {
          ticketType: '监理会议隐患',
          deadline: raw.hazardDeadline || '',
          reporter: '',
          rectifier: raw.rectifier || '',
          reportTime: raw.uploadTime || '',
          requirement: raw.description || item.desc || '',
          images: [],
          sourceLabel: raw.source || '清单导入',
          remark: raw.remark || '',
        },
        raw,
      }
    }
  }

  const h = item.raw || {}
  return {
    ...h,
    id: item.id,
    projectId: item.projectId,
    projectName: item.projectName || h.projectName,
    projectShortName: item.projectShortName || h.projectShortName,
    level: item.level,
    status: item.status,
    unifiedStatus: item.unifiedStatus,
    desc: item.desc,
    date: item.date,
    channel: item.channel,
    ticketType: item.ticketType,
    hazardCategory: item.hazardCategory,
    source: item.source || 'inspect_pool',
    raw: item.raw || h,
  }
}

/** 隐患清单行（巡检 + 监理例会 + 调度清单，去重） */
export function getCocHazardListRows(projectId) {
  return collectCocHazards(projectId).map(toCocHazardListRow)
}

/** 按来源取明细行（统计卡弹窗） */
export function getCocHazardsByChannel(projectId, channel) {
  return collectCocHazards(projectId)
    .filter((h) => h.channel === channel)
    .map(toCocHazardListRow)
}

function matchProject(row, projectId) {
  if (!projectId || projectId === HQ_SELECTION_ID) return true
  if (row.projectId && row.projectId === projectId) return true
  return false
}

/**
 * 汇总全来源隐患：
 * - 巡检：安质池中 ticketType=巡检隐患
 * - 监理例会：监理隐患清单（后台模块）
 * - 调度：调度隐患清单
 */
export function collectCocHazards(projectId) {
  const dispatchRows = getDispatchHazards().map(fromDispatchRow)
  const supervisionRows = getSupervisionHazards().map(fromSupervisionModuleRow)

  const inspectionRows = [
    ...SAFETY_HAZARDS.map((h) => fromInspectPool(h, '安全')),
    ...QUALITY_HAZARDS.map((h) => fromInspectPool(h, '质量')),
  ].filter((row) => row.channel === 'inspection')

  return [...inspectionRows, ...supervisionRows, ...dispatchRows].filter((row) =>
    matchProject(row, projectId),
  )
}

export function getProjectHazardStats(projectId) {
  const all = collectCocHazards(projectId)

  const bySource = {
    total: all.length,
    inspection: 0,
    supervision: 0,
    dispatch: 0,
  }
  all.forEach((item) => {
    if (bySource[item.channel] != null) bySource[item.channel] += 1
  })

  const byStatus = Object.fromEntries(HAZARD_UNIFIED_STATUS_SEGMENTS.map((s) => [s.name, 0]))
  all.forEach((item) => {
    if (byStatus[item.unifiedStatus] != null) byStatus[item.unifiedStatus] += 1
  })

  const byLevel = Object.fromEntries(HQ_HAZARD_LEVEL_SEGMENTS.map((s) => [s.filter, 0]))
  all.forEach((item) => {
    if (byLevel[item.level] != null) byLevel[item.level] += 1
  })

  const pendingTotal = byStatus['待整改'] || 0

  return {
    total: all.length,
    pendingTotal,
    /** 四张来源数据卡 */
    sourceCards: HAZARD_SOURCE_CARD_OPTIONS.map((c) => ({
      ...c,
      value: bySource[c.key] || 0,
    })),
    /** @deprecated 旧渠道字段：待整改按来源；现改为全量来源计数 */
    channels: HAZARD_CHANNEL_OPTIONS.map((c) => ({
      ...c,
      value: bySource[c.key] || 0,
    })),
    statusSegments: HAZARD_UNIFIED_STATUS_SEGMENTS.map((s) => ({
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

/** 指挥部隐患分析：统一态=待整改（含巡检/监理例会/调度） */
export function getHqOpenHazards() {
  return collectCocHazards(HQ_SELECTION_ID).filter((h) => h.unifiedStatus === '待整改')
}

export function getHqPendingTopProjects(limit = 3) {
  const counts = new Map()
  getHqOpenHazards().forEach((h) => {
    if (!h.projectId) return
    const row = counts.get(h.projectId) || {
      projectId: h.projectId,
      shortName: h.projectShortName || h.projectName || h.projectId,
      fullName: h.projectName || h.projectShortName || h.projectId,
      value: 0,
    }
    row.value += 1
    if (h.projectShortName) row.shortName = h.projectShortName
    if (h.projectName) row.fullName = h.projectName
    counts.set(h.projectId, row)
  })
  return [...counts.values()]
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || String(a.shortName).localeCompare(String(b.shortName), 'zh-CN'))
    .slice(0, limit)
}
