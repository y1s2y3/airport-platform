import { ref } from 'vue'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { nowStr } from '../utils/datetime.js'
import { notifyBizAlertDisposed } from './warningCenterBizHook.js'

export const AI_CATEGORY_META = {
  unsafe: {
    key: 'unsafe',
    label: '现场不安全行为检测',
    breadcrumb: 'AI 应用 / 现场不安全行为检测',
    description: '查看未戴安全帽、未穿反光衣、吸烟等不安全行为预警，并完成查看与处置。',
    routeSegment: 'unsafe-behavior',
    sidebarKey: 'ai-unsafe-behavior',
    color: '#d97706',
  },
  hazard: {
    key: 'hazard',
    label: '现场隐患事件检测',
    breadcrumb: 'AI 应用 / 现场隐患事件检测',
    description: '查看烟火、物料违规堆放、临边防护缺失等现场隐患预警，并完成查看与处置。',
    routeSegment: 'hazard-event',
    sidebarKey: 'ai-hazard-event',
    color: '#c2410c',
  },
  fence: {
    key: 'fence',
    label: '围栏入侵及破坏检测',
    breadcrumb: 'AI 应用 / 围栏入侵及破坏检测',
    description: '查看围栏入侵、围栏破坏等异常事件预警，并完成查看与处置。',
    routeSegment: 'fence-intrusion',
    sidebarKey: 'ai-fence-intrusion',
    color: '#7c3aed',
  },
}

export const AI_ALERT_TYPES = [
  { value: '未戴安全帽', category: 'unsafe' },
  { value: '未穿反光衣', category: 'unsafe' },
  { value: '吸烟', category: 'unsafe' },
  { value: '烟火预警', category: 'hazard' },
  { value: '物料违规堆放', category: 'hazard' },
  { value: '临边防护缺失', category: 'hazard' },
  { value: '围栏入侵', category: 'fence' },
  { value: '围栏破坏', category: 'fence' },
]

export const AI_HANDLER_OPTIONS = [
  '张伟（项目安全员）',
  '李娜（安全负责人）',
  '王强（安全工程师）',
  '陈敏（现场管理员）',
  '刘洋（施工负责人）',
  '赵磊（项目副经理）',
]

// 本期消息固定使用站内信，不在页面提供选择。
export const AI_NOTICE_METHODS = ['站内信']

const projectSeeds = COC_PROJECT_OPTIONS.slice(0, 8)
let configSequence = 1000
let alertSequence = 2000

function buildHandlerConfigs() {
  return projectSeeds.flatMap((project, projectIndex) =>
    AI_ALERT_TYPES.map((type, typeIndex) => ({
      id: `aic-${++configSequence}`,
      projectId: project.id,
      projectName: project.label,
      category: type.category,
      alertType: type.value,
      // 一个预警类型可配置多名处置人（一对多）
      handlers: [
        AI_HANDLER_OPTIONS[(projectIndex + typeIndex) % AI_HANDLER_OPTIONS.length],
        AI_HANDLER_OPTIONS[(projectIndex + typeIndex + 2) % AI_HANDLER_OPTIONS.length],
      ],
      noticeMethods: ['站内信'],
      enabled: true,
      updatedBy: projectIndex % 2 === 0 ? '项目安全负责人' : '系统管理员',
      updatedAt: `2026-08-${String(10 + (typeIndex % 7)).padStart(2, '0')} ${String(9 + (typeIndex % 7)).padStart(2, '0')}:20:00`,
    })),
  )
}

export const aiHandlerConfigs = ref(buildHandlerConfigs())

const typeContent = {
  未戴安全帽: '识别到作业人员未按要求佩戴安全帽',
  未穿反光衣: '识别到作业人员未按要求穿着反光衣',
  吸烟: '识别到施工区域内存在人员吸烟行为',
  烟火预警: '识别到现场存在烟雾或明火现象',
  物料违规堆放: '识别到施工物料未按指定区域规范堆放',
  临边防护缺失: '识别到临边区域防护设施缺失',
  围栏入侵: '识别到人员进入围栏限制区域',
  围栏破坏: '识别到施工围栏存在倾倒或破损情况',
}

const locationSeeds = ['施工一区', '施工二区', '材料堆场', '基坑东侧', '临建设施区', '南侧围界', '设备停放区', '航站楼作业面']
const cameraSeeds = ['南门枪机01', '施工一区球机02', '材料堆场枪机03', '基坑东侧枪机04', '临建区球机05', '南侧围界枪机06']

function findSeedHandler(projectId, alertType) {
  const config = aiHandlerConfigs.value.find((item) => item.projectId === projectId && item.alertType === alertType)
  return config?.handlers?.length ? config.handlers.join('、') : '未配置'
}

function buildAlerts() {
  const rows = []
  projectSeeds.forEach((project, projectIndex) => {
    AI_ALERT_TYPES.forEach((type, typeIndex) => {
      if ((projectIndex + typeIndex) % 3 === 2 && projectIndex > 3) return
      const index = rows.length
      const day = 18 - (index % 10)
      const hour = 7 + ((index * 3) % 12)
      const handled = index % 3 !== 0
      const disposition = handled ? (index % 7 === 0 ? '误报' : '已处理') : ''
      const occurredAt = `2026-08-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}:00`
      rows.push({
        id: `aie-${++alertSequence}`,
        alertNo: `AI${String(alertSequence).padStart(8, '0')}`,
        projectId: project.id,
        projectName: project.label,
        projectFullName: project.fullName,
        category: type.category,
        alertType: type.value,
        content: typeContent[type.value],
        location: locationSeeds[(projectIndex + typeIndex) % locationSeeds.length],
        camera: cameraSeeds[(projectIndex * 2 + typeIndex) % cameraSeeds.length],
        occurredAt,
        handler: findSeedHandler(project.id, type.value),
        status: handled ? '已处置' : '未处置',
        disposition,
        disposalNote: handled
          ? disposition === '误报'
            ? '现场核实为光线变化导致的误识别，确认无异常情况。'
            : '已通知现场人员及时处理，现场情况已恢复正常。'
          : '',
        disposedBy: handled ? findSeedHandler(project.id, type.value) : '',
        disposedAt: handled ? `2026-08-${String(day).padStart(2, '0')} ${String(Math.min(hour + 1, 23)).padStart(2, '0')}:${String((index * 7 + 18) % 60).padStart(2, '0')}:00` : '',
      })
    })
  })
  return rows
}

export const aiAlerts = ref(buildAlerts())

export function getAlertTypeMeta(alertType) {
  return AI_ALERT_TYPES.find((item) => item.value === alertType) || null
}

export function getCategoryTypes(category) {
  return AI_ALERT_TYPES.filter((item) => item.category === category).map((item) => item.value)
}

export function getProjectHandlerConfigs(projectId) {
  // 配置台账始终展示全部预警类型；新项目首次进入时自动补齐默认配置行。
  const project = COC_PROJECT_OPTIONS.find((item) => item.id === projectId)
  AI_ALERT_TYPES.forEach((type) => {
    const exists = aiHandlerConfigs.value.some(
      (item) => item.projectId === projectId && item.alertType === type.value,
    )
    if (exists) return
    aiHandlerConfigs.value.push({
      id: `aic-${++configSequence}`,
      projectId,
      projectName: project?.label || projectId,
      category: type.category,
      alertType: type.value,
      handlers: [],
      noticeMethods: ['站内信'],
      enabled: true,
      updatedBy: '-',
      updatedAt: '-',
    })
  })
  return aiHandlerConfigs.value.filter((item) => item.projectId === projectId)
}

/**
 * 新增/追加一条预警配置：一个预警类型对应多名处置人（一对多）。
 * 如果该类型已存在配置，则将所选处置人合并到已有配置中（自动去重），
 * 保证已配置的类型仍可继续添加处置人。
 */
export function addHandlerConfig(
  projectId,
  alertType,
  handlers,
  noticeMethods = AI_NOTICE_METHODS,
  updatedBy = '当前用户',
) {
  const existing = aiHandlerConfigs.value.find(
    (item) => item.projectId === projectId && item.alertType === alertType,
  )
  if (existing) {
    existing.handlers = [...new Set([...(existing.handlers || []), ...handlers])]
    existing.noticeMethods = [...noticeMethods]
    existing.enabled = true
    existing.updatedBy = updatedBy
    existing.updatedAt = nowStr()
    return existing
  }
  const project = COC_PROJECT_OPTIONS.find((item) => item.id === projectId)
  const meta = getAlertTypeMeta(alertType)
  const row = {
    id: `aic-${++configSequence}`,
    projectId,
    projectName: project?.label || projectId,
    category: meta?.category || '',
    alertType,
    handlers: [...handlers],
    noticeMethods: [...noticeMethods],
    enabled: true,
    updatedBy,
    updatedAt: nowStr(),
  }
  aiHandlerConfigs.value.push(row)
  return row
}

/**
 * 兼容旧调用：批量新增多条配置（每个预警类型一名处置人）
 */
export function addHandlerConfigs(projectId, alertTypes, handler, updatedBy = '当前用户') {
  return alertTypes.map((alertType) =>
    addHandlerConfig(projectId, alertType, [handler], AI_NOTICE_METHODS, updatedBy),
  )
}

/**
 * 更新一条预警配置的处置人列表
 */
export function updateHandlerConfig(
  id,
  handlers,
  updatedBy = '当前用户',
) {
  const row = aiHandlerConfigs.value.find((item) => item.id === id)
  if (!row) return null
  row.handlers = [...handlers]
  row.noticeMethods = ['站内信']
  row.updatedBy = updatedBy
  row.updatedAt = nowStr()
  return row
}

export function toggleHandlerConfig(id, updatedBy = '当前用户') {
  const row = aiHandlerConfigs.value.find((item) => item.id === id)
  if (!row) return null
  row.enabled = !row.enabled
  row.updatedBy = updatedBy
  row.updatedAt = nowStr()
  return row
}

export function removeHandlerConfig(id) {
  const index = aiHandlerConfigs.value.findIndex((item) => item.id === id)
  if (index < 0) return false
  aiHandlerConfigs.value.splice(index, 1)
  return true
}

export function getAiAlerts({ projectId = '', category = '' } = {}) {
  return aiAlerts.value.filter((item) => {
    if (projectId && item.projectId !== projectId) return false
    if (category && item.category !== category) return false
    return true
  })
}

export function getAiAlertById(id) {
  return aiAlerts.value.find((item) => item.id === id) || null
}

export function disposeAiAlert(id, disposition, disposalNote, disposedBy = '', disposalAttachments = []) {
  const row = getAiAlertById(id)
  if (!row) return null
  const wasPending = row.status !== '已处置'
  row.status = '已处置'
  row.disposition = disposition
  row.disposalNote = disposalNote
  row.disposalAttachments = disposalAttachments.map((item) => ({ ...item }))
  row.disposedBy = disposedBy || row.handler
  row.disposedAt = nowStr()
  if (wasPending) {
    notifyBizAlertDisposed('ai', id, {
      operator: row.disposedBy,
      disposalResult: disposition === '误报' ? '误报' : '已处置',
      disposalNote: disposalNote || '',
      attachments: disposalAttachments.map((item) =>
        typeof item === 'string' ? item : item?.name || item,
      ),
    })
  }
  return row
}

export function getProjectAiSummary(projectId, source = aiAlerts.value) {
  const list = source.filter((item) => item.projectId === projectId)
  const handled = list.filter((item) => item.status === '已处置').length
  const unhandled = list.length - handled
  const processed = list.filter((item) => item.disposition === '已处理').length
  const falseAlarm = list.filter((item) => item.disposition === '误报').length
  return {
    total: list.length,
    handled,
    unhandled,
    processed,
    falseAlarm,
    handlingRate: list.length ? Math.round((handled / list.length) * 1000) / 10 : 0,
  }
}

export function getProjectOption(projectId) {
  return COC_PROJECT_OPTIONS.find((item) => item.id === projectId) || null
}
