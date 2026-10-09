import { ref } from 'vue'
import { getPosition } from './positions'
import { formatApproverOptionLabel } from '../utils/approverDisplay'

/**
 * 视频监控 · 离线通知配置（Mock）
 *
 * 口径：不再区分「人员配置类型」。
 * 指挥部层级与项目层级各自维护一套独立的分级规则，各自只能为本层级用户配置通知人员，
 * 两侧分别保存、互不覆盖（指挥部规则全局一份；项目规则按 projectId 各存一份）。
 *
 * 规则结构：{ id, offline_value, offline_unit, person_ids, enabled }
 */

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

/**
 * 按配置层级取通知人员候选
 * 岗位层级口径：公司 = 指挥部层级用户，项目 = 项目层级用户
 * @param {'all'|'hq'|'project'} scope
 */
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

function createRule(offlineValue, offlineUnit, personIds = []) {
  return {
    offline_value: offlineValue,
    offline_unit: offlineUnit,
    person_ids: [...personIds],
    enabled: true,
  }
}

function cloneRule(item) {
  return {
    id: item.id,
    offline_value: Number(item.offline_value) || 1,
    offline_unit: item.offline_unit || OFFLINE_DURATION_UNIT.minute,
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

function normalizeRules(list) {
  return sortRules(cloneRules(list)).map((row, index) => ({
    ...row,
    id: row.id || `rule-${index + 1}`,
  }))
}

/** 指挥部层级默认档位：6 小时 / 2 天，通知人员留空待配置 */
function buildDefaultHqRules() {
  return [
    { id: 'rule-6h', ...createRule(6, OFFLINE_DURATION_UNIT.hour) },
    { id: 'rule-2d', ...createRule(2, OFFLINE_DURATION_UNIT.day) },
  ]
}

/** 项目层级默认档位：10 分钟，通知人员留空待配置 */
function buildDefaultProjectRules() {
  return [{ id: 'rule-10m', ...createRule(10, OFFLINE_DURATION_UNIT.minute) }]
}

export function createEmptyOfflineNotifyRule() {
  return createRule(1, OFFLINE_DURATION_UNIT.minute)
}

/** 指挥部层级规则（全局一份） */
const hqRules = ref(normalizeRules(buildDefaultHqRules()))

/** 项目层级规则：每个项目一套 { [projectId]: rule[] } */
const projectRules = ref({})

export function listHqVideoOfflineNotifyRules() {
  return cloneRules(hqRules.value)
}

export function saveHqVideoOfflineNotifyRules(list) {
  hqRules.value = normalizeRules(list)
  return true
}

export function resetHqVideoOfflineNotifyRules() {
  hqRules.value = normalizeRules(buildDefaultHqRules())
  return cloneRules(hqRules.value)
}

export function listProjectVideoOfflineNotifyRules(projectId) {
  if (!projectId || projectId === 'hq') return []
  return cloneRules(projectRules.value[projectId] || buildDefaultProjectRules())
}

export function saveProjectVideoOfflineNotifyRules(projectId, list) {
  if (!projectId || projectId === 'hq') return false
  projectRules.value[projectId] = normalizeRules(list)
  return true
}

export function resetProjectVideoOfflineNotifyRules(projectId) {
  if (!projectId || projectId === 'hq') return false
  projectRules.value[projectId] = normalizeRules(buildDefaultProjectRules())
  return cloneRules(projectRules.value[projectId])
}
