import { ref } from 'vue'
import { getPosition } from './positions'
import { formatApproverOptionLabel } from '../utils/approverDisplay'

/** 人员配置类型 */
export const STAFF_CONFIG_TYPE = {
  project: 'project',
  hq: 'hq',
}

export const STAFF_CONFIG_TYPE_OPTIONS = [
  { value: STAFF_CONFIG_TYPE.project, label: '项目人员' },
  { value: STAFF_CONFIG_TYPE.hq, label: '指挥部人员' },
]

export const STAFF_CONFIG_TYPE_LABEL = {
  [STAFF_CONFIG_TYPE.project]: '项目人员',
  [STAFF_CONFIG_TYPE.hq]: '指挥部人员',
}

/** 离线时长单位 */
export const OFFLINE_DURATION_UNIT = {
  minute: 'minute',
  hour: 'hour',
  day: 'day',
}

export const OFFLINE_DURATION_UNIT_OPTIONS = [
  { value: OFFLINE_DURATION_UNIT.minute, label: '分钟' },
  { value: OFFLINE_DURATION_UNIT.hour, label: '小时' },
  { value: OFFLINE_DURATION_UNIT.day, label: '天' },
]

export const OFFLINE_DURATION_UNIT_LABEL = {
  [OFFLINE_DURATION_UNIT.minute]: '分钟',
  [OFFLINE_DURATION_UNIT.hour]: '小时',
  [OFFLINE_DURATION_UNIT.day]: '天',
}

/** 换算为分钟，用于排序与唯一性比较 */
export function offlineDurationToMinutes(value, unit) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return 0
  if (unit === OFFLINE_DURATION_UNIT.hour) return n * 60
  if (unit === OFFLINE_DURATION_UNIT.day) return n * 24 * 60
  return n
}

export function formatOfflineDuration(value, unit) {
  const label = OFFLINE_DURATION_UNIT_LABEL[unit] || '分钟'
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return `--`
  return `${n} ${label}`
}

/**
 * 通知人员假数据
 * 展示名：姓名（组织-岗位）
 */
export const notifyPersonnelCatalog = [
  { id: 'np-safe-01', name: '陈安全', org: 'T2空侧捷运线项目部', positionIds: ['pos-007'] },
  { id: 'np-safe-02', name: '刘安全', org: '三跑道扩建项目部', positionIds: ['pos-007'] },
  { id: 'np-labor-01', name: '周劳务', org: 'T2空侧捷运线项目部', positionIds: ['pos-009'] },
  { id: 'np-coc-01', name: '吴调度', org: 'COC调度中心', positionIds: ['pos-008'] },
  { id: 'np-video-01', name: '郑推进', org: 'T1改造项目部', positionIds: ['pos-006'] },
  { id: 'np-plan-01', name: '王规划', org: '规划建设部', positionIds: ['pos-005'] },
  { id: 'np-gm-01', name: '李总', org: '工程指挥部', positionIds: ['pos-003'] },
  { id: 'np-office-01', name: '赵主任', org: '指挥部办公室', positionIds: ['pos-004'] },
  { id: 'np-sz-01', name: '孙协调', org: '深圳分公司', positionIds: ['pos-002'] },
  { id: 'np-test-01', name: '测试员甲', org: '系统测试组', positionIds: ['pos-001'] },
  { id: 'np-hq-01', name: '钱安监', org: '工程指挥部安监室', positionIds: ['pos-013'] },
  { id: 'np-hq-02', name: '冯值守', org: '指挥部值班室', positionIds: ['pos-004'] },
]

function resolvePersonPostLabel(positionIds = []) {
  return positionIds
    .map((id) => getPosition(id)?.name)
    .filter(Boolean)
    .join('、')
}

export function formatNotifyPersonLabel(item) {
  if (!item) return '--'
  return formatApproverOptionLabel(item.name, item.org, resolvePersonPostLabel(item.positionIds))
}

export function listNotifyPersonOptions(scope = 'all') {
  return notifyPersonnelCatalog
    .filter((item) => {
      if (scope === 'hq') {
        return item.positionIds.some((pid) => getPosition(pid)?.level === '公司')
      }
      if (scope === 'project') {
        return item.positionIds.some((pid) => getPosition(pid)?.level === '项目')
      }
      return true
    })
    .map((item) => ({
      value: item.id,
      label: formatNotifyPersonLabel(item),
      name: item.name,
      org: item.org,
      positionIds: [...item.positionIds],
    }))
}

function pickPersonIds(scope, count = 2) {
  return listNotifyPersonOptions(scope).slice(0, count).map((item) => item.value)
}

/**
 * 指挥部默认分级：10 分钟（项目人员）/ 6 小时（指挥部人员）/ 2 天（指挥部人员）
 */
function buildDefaultHqRules() {
  return [
    {
      id: 'rule-10m',
      offline_value: 10,
      offline_unit: OFFLINE_DURATION_UNIT.minute,
      staff_config_type: STAFF_CONFIG_TYPE.project,
      person_ids: [],
      enabled: true,
    },
    {
      id: 'rule-6h',
      offline_value: 6,
      offline_unit: OFFLINE_DURATION_UNIT.hour,
      staff_config_type: STAFF_CONFIG_TYPE.hq,
      person_ids: pickPersonIds('hq', 2),
      enabled: true,
    },
    {
      id: 'rule-2d',
      offline_value: 2,
      offline_unit: OFFLINE_DURATION_UNIT.day,
      staff_config_type: STAFF_CONFIG_TYPE.hq,
      person_ids: pickPersonIds('hq', 1),
      enabled: true,
    },
  ]
}

function cloneRule(item) {
  return {
    id: item.id,
    offline_value: Number(item.offline_value) || 1,
    offline_unit: item.offline_unit || OFFLINE_DURATION_UNIT.minute,
    staff_config_type: item.staff_config_type || STAFF_CONFIG_TYPE.project,
    person_ids: [...(item.person_ids || [])],
    enabled: item.enabled !== false,
  }
}

function cloneRules(list) {
  return (list || []).map(cloneRule)
}

function sortRules(list) {
  return [...list].sort(
    (a, b) =>
      offlineDurationToMinutes(a.offline_value, a.offline_unit) -
      offlineDurationToMinutes(b.offline_value, b.offline_unit),
  )
}

/** 指挥部全局规则 */
const hqRules = ref(cloneRules(buildDefaultHqRules()))

/** 项目级：仅覆盖「项目人员」类型规则的通知人员 { [projectId]: { [ruleId]: person_ids[] } } */
const projectPersonOverrides = ref({})

let ruleIdSeq = 100

export function createEmptyOfflineNotifyRule() {
  return {
    offline_value: 1,
    offline_unit: OFFLINE_DURATION_UNIT.minute,
    staff_config_type: STAFF_CONFIG_TYPE.project,
    person_ids: [],
    enabled: true,
  }
}

/** 指挥部：读取全局规则 */
export function listHqVideoOfflineNotifyRules() {
  return cloneRules(hqRules.value)
}

/** 项目：回显指挥部规则，并合并本项目对「项目人员」的通知人覆盖 */
export function listProjectVideoOfflineNotifyRules(projectId) {
  if (!projectId || projectId === 'hq') return []
  const overrides = projectPersonOverrides.value[projectId] || {}
  return cloneRules(hqRules.value).map((rule) => {
    if (rule.staff_config_type === STAFF_CONFIG_TYPE.project) {
      const overrideIds = overrides[rule.id]
      return {
        ...rule,
        person_ids: overrideIds ? [...overrideIds] : [],
      }
    }
    return rule
  })
}

/**
 * 兼容旧调用：按项目读（含合并）；无 projectId 时读指挥部
 * @deprecated 优先用 listHq… / listProject…
 */
export function listVideoOfflineNotifyRules(projectId) {
  if (!projectId || projectId === 'hq') return listHqVideoOfflineNotifyRules()
  return listProjectVideoOfflineNotifyRules(projectId)
}

export function saveHqVideoOfflineNotifyRules(list) {
  hqRules.value = sortRules(cloneRules(list)).map((row, index) => ({
    ...row,
    id: row.id || `rule-${index + 1}`,
  }))
  return true
}

/**
 * 项目级仅保存「项目人员」类型规则的通知人员
 * @param {string} projectId
 * @param {Array<{ id: string, staff_config_type: string, person_ids: string[] }>} list
 */
export function saveProjectVideoOfflineNotifyPersons(projectId, list) {
  if (!projectId || projectId === 'hq') return false
  const next = { ...(projectPersonOverrides.value[projectId] || {}) }
  ;(list || []).forEach((row) => {
    if (row.staff_config_type !== STAFF_CONFIG_TYPE.project || !row.id) return
    next[row.id] = [...(row.person_ids || [])]
  })
  projectPersonOverrides.value[projectId] = next
  return true
}

export function resetHqVideoOfflineNotifyRules() {
  hqRules.value = cloneRules(buildDefaultHqRules())
  return cloneRules(hqRules.value)
}

export function resetVideoOfflineNotifyRules(projectId) {
  if (!projectId || projectId === 'hq') {
    return resetHqVideoOfflineNotifyRules()
  }
  // 项目级重置：清空本项目通知人覆盖
  projectPersonOverrides.value[projectId] = {}
  return listProjectVideoOfflineNotifyRules(projectId)
}

export function saveVideoOfflineNotifyRules(projectId, list) {
  if (!projectId || projectId === 'hq') {
    return saveHqVideoOfflineNotifyRules(list)
  }
  return saveProjectVideoOfflineNotifyPersons(projectId, list)
}

export function addVideoOfflineNotifyRule(_projectId, payload = {}) {
  const row = {
    id: `rule-${++ruleIdSeq}`,
    ...createEmptyOfflineNotifyRule(),
    offline_value: Number(payload.offline_value) || 1,
    offline_unit: payload.offline_unit || OFFLINE_DURATION_UNIT.minute,
    staff_config_type: payload.staff_config_type || STAFF_CONFIG_TYPE.project,
    person_ids: [...(payload.person_ids || [])],
    enabled: payload.enabled !== false,
  }
  hqRules.value = sortRules([...hqRules.value, row])
  return cloneRule(row)
}

export function updateVideoOfflineNotifyRule(_projectId, id, payload) {
  const idx = hqRules.value.findIndex((item) => item.id === id)
  if (idx < 0) return null
  hqRules.value[idx] = cloneRule({
    ...hqRules.value[idx],
    ...payload,
    id,
  })
  hqRules.value = sortRules(hqRules.value)
  return cloneRule(hqRules.value.find((item) => item.id === id))
}

export function deleteVideoOfflineNotifyRule(_projectId, id) {
  const idx = hqRules.value.findIndex((item) => item.id === id)
  if (idx < 0) return false
  hqRules.value.splice(idx, 1)
  return true
}

export function getPersonNames(personIds = []) {
  const map = Object.fromEntries(
    notifyPersonnelCatalog.map((item) => [item.id, formatNotifyPersonLabel(item)]),
  )
  return personIds.map((id) => map[id] || id).filter(Boolean)
}

/** 兼容旧导出：岗位相关已废弃，保留空实现避免误引用报错 */
export const NOTIFY_POSITION_SCOPE = { 公司: '指挥部', 项目: '项目' }
export function mapPositionLevelToScope(level) {
  return NOTIFY_POSITION_SCOPE[level] || level || '项目'
}
export function listNotifyPositionOptions() {
  return []
}
export function listNotifyPositionGroups() {
  return []
}
export function getPositionNames() {
  return []
}
