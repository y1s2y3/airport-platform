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

function pickIdsByScope(scope, count = 2) {
  return listNotifyPositionOptions()
    .filter((item) => item.scope === scope)
    .slice(0, count)
    .map((item) => item.value)
}

/**
 * 分级默认规则：一天 / 一周 / 一月 → 不同层级岗位
 * 一天：项目岗；一周：项目+指挥部；一月：指挥部岗
 */
function buildDefaultRules() {
  const projectIds = pickIdsByScope('项目', 3)
  const hqIds = pickIdsByScope('指挥部', 3)
  return [
    {
      id: 'rule-1d',
      offline_days: 1,
      position_ids: projectIds.slice(0, 2),
      enabled: true,
      remark: '离线满1天，通知项目级岗位',
    },
    {
      id: 'rule-7d',
      offline_days: 7,
      position_ids: [...projectIds.slice(0, 1), ...hqIds.slice(0, 1)].filter(Boolean),
      enabled: true,
      remark: '离线满1周，通知项目与指挥部相关岗位',
    },
    {
      id: 'rule-30d',
      offline_days: 30,
      position_ids: hqIds.slice(0, 2),
      enabled: true,
      remark: '离线满1月，通知指挥部级岗位',
    },
  ]
}

function cloneRules(list) {
  return list.map((item) => ({
    ...item,
    position_ids: [...(item.position_ids || [])],
  }))
}

export const videoOfflineNotifyRules = ref(cloneRules(buildDefaultRules()))

let ruleIdSeq = 100

export function listVideoOfflineNotifyRules() {
  return videoOfflineNotifyRules.value
}

export function createEmptyOfflineNotifyRule() {
  return {
    offline_days: 1,
    position_ids: [],
    enabled: true,
    remark: '',
  }
}

export function addVideoOfflineNotifyRule(payload = {}) {
  const row = {
    id: `rule-${++ruleIdSeq}`,
    offline_days: Number(payload.offline_days) || 1,
    position_ids: [...(payload.position_ids || [])],
    enabled: payload.enabled !== false,
    remark: payload.remark?.trim() || '',
  }
  videoOfflineNotifyRules.value.push(row)
  return row
}

export function updateVideoOfflineNotifyRule(id, payload) {
  const idx = videoOfflineNotifyRules.value.findIndex((item) => item.id === id)
  if (idx < 0) return null
  videoOfflineNotifyRules.value[idx] = {
    ...videoOfflineNotifyRules.value[idx],
    offline_days: Number(payload.offline_days) || 1,
    position_ids: [...(payload.position_ids || [])],
    enabled: payload.enabled !== false,
    remark: payload.remark?.trim() || '',
  }
  return videoOfflineNotifyRules.value[idx]
}

export function deleteVideoOfflineNotifyRule(id) {
  const idx = videoOfflineNotifyRules.value.findIndex((item) => item.id === id)
  if (idx < 0) return false
  videoOfflineNotifyRules.value.splice(idx, 1)
  return true
}

export function saveVideoOfflineNotifyRules(list) {
  videoOfflineNotifyRules.value = cloneRules(list)
  return true
}

export function resetVideoOfflineNotifyRules() {
  videoOfflineNotifyRules.value = cloneRules(buildDefaultRules())
  return videoOfflineNotifyRules.value
}

export function getPositionNames(positionIds = []) {
  const map = Object.fromEntries(listNotifyPositionOptions().map((item) => [item.value, item.label]))
  return positionIds.map((id) => map[id] || id).filter(Boolean)
}
