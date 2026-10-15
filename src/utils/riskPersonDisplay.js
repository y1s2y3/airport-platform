/**
 * 风险模块专用 · 人员候选过滤与展示工具
 *
 * 一、展示格式（统一口径）：`姓名（组织-岗位）`；数据里没有岗位时回落 `姓名（部门）`。
 *     例：陈安全（总包项目部-安全员）／缺岗位：陈安全（总包项目部）。
 *     本文件不做数据补全，岗位只从既有 positionIds / post_label 解析，缺就少显示，不臆造。
 *
 * 二、候选范围：业务口径要求「只出现当前项目可选人员」。
 *     ⚠️ 数据现状（如实说明）：人员目录 `tierPersonnelCatalog`（src/mock/laborWarningConfig.js）
 *     只有 id / name / dept / positionIds，**没有任何项目维度字段（无 project_id / projectIds）**，
 *     且该文件被其它模块共用、本轮不允许改动，因此**无法做到真正按项目精确过滤**。
 *     当前实现为「按部门排除指挥部层级」的尽力过滤（best-effort，非假过滤）：
 *       - 排除：COC调度中心（指挥长 / 副指挥长）、工程管理部（指挥部项目经理）；
 *       - 保留：总包项目部、施工方项目部、监理单位、安全环保部（演示种子中作为管控责任人的部门）。
 *     待人员目录补 `project_id`（或接入「项目人员名册」）后，只需改本文件一个过滤条件即可精确到项目，
 *     三个调用端（申报表单候选 / 列表与详情展示 / 个人中心待办面板）无需改动。
 */
import { getTierPerson, getTierPositionName, tierPersonnelCatalog } from '../mock/laborWarningConfig.js'

/** 演示数据中属指挥部层级、不属于项目参建人员的部门（尽力过滤的判据） */
export const RISK_HQ_DEPT_NAMES = ['COC调度中心', '工程管理部']

/** 岗位展示名：优先显式 postLabel / post_label，其次按 positionIds 解析，多个岗位以顿号连接 */
function resolveRiskPersonPostLabel(person) {
  const explicit = person.postLabel || person.post_label || person.position
  if (explicit) return String(explicit).trim()
  const ids = Array.isArray(person.positionIds) ? person.positionIds : []
  return ids
    .map((id) => getTierPositionName(id))
    .filter((name) => name && name !== '--')
    .join('、')
}

/**
 * 人员展示名：`姓名（组织-岗位）`；缺岗位回落 `姓名（部门）`；两者皆缺只显姓名；无姓名无组织显 `--`。
 * @param {{name?: string, dept?: string, org?: string, postLabel?: string, post_label?: string, positionIds?: string[]}|null} person
 */
export function formatRiskPersonLabel(person) {
  if (!person) return '--'
  const name = String(person.name || '').trim()
  const dept = String(person.dept || person.org || '').trim()
  const post = resolveRiskPersonPostLabel(person)
  const orgPost = [dept, post].filter(Boolean).join('-')
  if (!name) return orgPost || '--'
  if (!orgPost) return name
  return `${name}（${orgPost}）`
}

/**
 * 按人员标识取展示名（列表 / 详情 / 个人中心待办统一入口）。
 * 标识查不到时，若有历史快照（只存了姓名 + 部门），降级为 `姓名（部门）`；有岗位才写 `姓名（部门-岗位）`。
 * @param {string} personId
 * @param {{name?: string, dept?: string, org?: string, post_label?: string, postLabel?: string}|null} [snapshot]
 */
export function formatRiskPersonLabelById(personId, snapshot = null) {
  const person = getTierPerson(personId)
  if (person) return formatRiskPersonLabel(person)
  if (snapshot && String(snapshot.name || '').trim()) return formatRiskPersonLabel(snapshot)
  return '--'
}

/**
 * 当前项目可选人员（管控责任人 / 实施责任人候选）。
 * 无 projectId 时返回空数组（调用方自行提示先选项目）；返回浅拷贝，避免调用方改动人员目录。
 * 说明：受数据限制，本函数目前只能做「排除指挥部层级部门」的尽力过滤，见文件头说明。
 * @param {string} projectId
 */
export function filterRiskProjectPersonnel(projectId) {
  if (!projectId) return []
  return tierPersonnelCatalog
    .filter((person) => !RISK_HQ_DEPT_NAMES.includes(String(person.dept || '').trim()))
    .map((person) => ({ ...person }))
}
