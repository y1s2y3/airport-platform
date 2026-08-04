import { ref } from 'vue'
import { positionRecords } from './positions'

/** 岗位管理「公司」对应指挥部层级，「项目」对应项目层级 */
export const NOTIFY_POSITION_SCOPE = {
  公司: '指挥部',
  项目: '项目',
}

export function mapPositionLevelToScope(level) {
  return NOTIFY_POSITION_SCOPE[level] || level || '项目'
}

/** 通知岗位假数据：来源于岗位管理，区分指挥部 / 项目 */
export function listNotifyPositionOptions() {
  return positionRecords.value.map((item) => ({
    value: item.id,
    label: item.name,
    code: item.code,
    level: item.level,
    scope: mapPositionLevelToScope(item.level),
  }))
}

/** 按指挥部 / 项目分组，供下拉分组展示 */
export function listNotifyPositionGroups() {
  const groups = [
    { scope: '指挥部', label: '指挥部', options: [] },
    { scope: '项目', label: '项目', options: [] },
  ]
  listNotifyPositionOptions().forEach((opt) => {
    const group = groups.find((item) => item.scope === opt.scope)
    if (group) group.options.push(opt)
    else groups[1].options.push(opt)
  })
  return groups.filter((item) => item.options.length > 0)
}

/**
 * 通知人员假数据（挂靠岗位管理中的岗位 id）
 * 展示名：姓名 · 所属单位
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
]

export function listNotifyPersonOptions(positionIds = []) {
  const all = notifyPersonnelCatalog.map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.org}`,
    name: item.name,
    org: item.org,
    positionIds: [...item.positionIds],
  }))
  if (!positionIds?.length) return all
  const set = new Set(positionIds)
  const matched = all.filter((item) => item.positionIds.some((pid) => set.has(pid)))
  const others = all.filter((item) => !item.positionIds.some((pid) => set.has(pid)))
  return [...matched, ...others]
}

export function listNotifyPersonGroups(positionIds = []) {
  if (!positionIds?.length) {
    return [{ label: '全部人员', options: listNotifyPersonOptions() }]
  }
  const set = new Set(positionIds)
  const matched = []
  const others = []
  listNotifyPersonOptions().forEach((opt) => {
    if (opt.positionIds.some((pid) => set.has(pid))) matched.push(opt)
    else others.push(opt)
  })
  const groups = []
  if (matched.length) groups.push({ label: '所选岗位下人员', options: matched })
  if (others.length) groups.push({ label: '其他人员', options: others })
  return groups
}

function pickIdsByScope(scope, count = 2) {
  return listNotifyPositionOptions()
    .filter((item) => item.scope === scope)
    .slice(0, count)
    .map((item) => item.value)
}

function pickPersonIdsByPositions(positionIds = [], count = 2) {
  return listNotifyPersonOptions(positionIds)
    .filter((item) => item.positionIds.some((pid) => positionIds.includes(pid)))
    .slice(0, count)
    .map((item) => item.value)
}

/**
 * 分级默认规则：一天 / 一周 / 一月（项目级配置；可仍通知指挥部岗位）
 * 备注留空，由用户按需填写
 */
function buildDefaultRules() {
  const projectIds = pickIdsByScope('项目', 3)
  const hqIds = pickIdsByScope('指挥部', 2)
  const day1Positions = projectIds.slice(0, 2)
  const day7Positions = [...projectIds.slice(0, 1), ...hqIds.slice(0, 1)].filter(Boolean)
  const day30Positions = [...projectIds.slice(0, 1), ...hqIds.slice(0, 1)].filter(Boolean)
  return [
    {
      id: 'rule-1d',
      offline_days: 1,
      position_ids: day1Positions,
      person_ids: pickPersonIdsByPositions(day1Positions, 2),
      enabled: true,
      remark: '',
    },
    {
      id: 'rule-7d',
      offline_days: 7,
      position_ids: day7Positions,
      person_ids: pickPersonIdsByPositions(day7Positions, 2),
      enabled: true,
      remark: '',
    },
    {
      id: 'rule-30d',
      offline_days: 30,
      position_ids: day30Positions,
      person_ids: pickPersonIdsByPositions(day30Positions, 1),
      enabled: true,
      remark: '',
    },
  ]
}

function cloneRules(list) {
  return list.map((item) => ({
    ...item,
    position_ids: [...(item.position_ids || [])],
    person_ids: [...(item.person_ids || [])],
    remark: item.remark || '',
  }))
}

/** 按项目隔离的离线通知规则 */
const rulesByProject = ref({})

function ensureProjectRules(projectId) {
  if (!projectId || projectId === 'hq') return []
  if (!rulesByProject.value[projectId]) {
    rulesByProject.value[projectId] = cloneRules(buildDefaultRules())
  }
  return rulesByProject.value[projectId]
}

let ruleIdSeq = 100

export function listVideoOfflineNotifyRules(projectId) {
  return ensureProjectRules(projectId)
}

export function createEmptyOfflineNotifyRule() {
  return {
    offline_days: 1,
    position_ids: [],
    person_ids: [],
    enabled: true,
    remark: '',
  }
}

export function addVideoOfflineNotifyRule(projectId, payload = {}) {
  const list = ensureProjectRules(projectId)
  if (!list.length && (!projectId || projectId === 'hq')) return null
  const row = {
    id: `rule-${++ruleIdSeq}`,
    offline_days: Number(payload.offline_days) || 1,
    position_ids: [...(payload.position_ids || [])],
    person_ids: [...(payload.person_ids || [])],
    enabled: payload.enabled !== false,
    remark: payload.remark?.trim() || '',
  }
  list.push(row)
  return row
}

export function updateVideoOfflineNotifyRule(projectId, id, payload) {
  const list = ensureProjectRules(projectId)
  const idx = list.findIndex((item) => item.id === id)
  if (idx < 0) return null
  list[idx] = {
    ...list[idx],
    offline_days: Number(payload.offline_days) || 1,
    position_ids: [...(payload.position_ids || [])],
    person_ids: [...(payload.person_ids || [])],
    enabled: payload.enabled !== false,
    remark: payload.remark?.trim() || '',
  }
  return list[idx]
}

export function deleteVideoOfflineNotifyRule(projectId, id) {
  const list = ensureProjectRules(projectId)
  const idx = list.findIndex((item) => item.id === id)
  if (idx < 0) return false
  list.splice(idx, 1)
  return true
}

export function saveVideoOfflineNotifyRules(projectId, list) {
  if (!projectId || projectId === 'hq') return false
  rulesByProject.value[projectId] = cloneRules(list)
  return true
}

export function resetVideoOfflineNotifyRules(projectId) {
  if (!projectId || projectId === 'hq') return []
  rulesByProject.value[projectId] = cloneRules(buildDefaultRules())
  return rulesByProject.value[projectId]
}

export function getPositionNames(positionIds = []) {
  const map = Object.fromEntries(listNotifyPositionOptions().map((item) => [item.value, item.label]))
  return positionIds.map((id) => map[id] || id).filter(Boolean)
}

export function getPersonNames(personIds = []) {
  const map = Object.fromEntries(notifyPersonnelCatalog.map((item) => [item.id, item.name]))
  return personIds.map((id) => map[id] || id).filter(Boolean)
}
