import { PHASE1_ROLE_MAP, PHASE1_ROLE_LABELS } from '../config/phase1Menu'
import { getCurrentUserSnapshot } from '../mock/currentUser'
import { selectedProjectId } from '../composables/useCurrentProject'

/** 演示用「按角色预览」覆盖键（?role=HQ-03 或 localStorage） */
export const PHASE1_DEMO_ROLE_KEY = 'phase1-demo-role'

/**
 * 解析当前生效的一期授权角色ID集合
 *
 * 优先级：① URL `?role=HQ-03`（多个用逗号）② localStorage 覆盖 ③ 原型演示角色映射
 * 说明：正式系统接入真实登录后，③ 应替换为登录返回的 35 角色；本函数即唯一替换点。
 *
 * @param {{ override?: string }} [options]
 * @returns {string[]}
 */
export function resolvePhase1RoleIds(options = {}) {
  const urlOverride = String(options.override || '').trim()
  if (urlOverride) return splitRoleCodes(urlOverride)
  const stored = readStoredRole()
  if (stored) return splitRoleCodes(stored)
  return mapPrototypeRolesToPhase1(getCurrentUserSnapshot(selectedProjectId.value)?.roleIds || [])
}

function splitRoleCodes(text) {
  return String(text || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
}

function readStoredRole() {
  try {
    return window.localStorage.getItem(PHASE1_DEMO_ROLE_KEY) || ''
  } catch (e) {
    return ''
  }
}

/** 原型演示角色（role-admin 等）→ 定稿角色（PT/HQ/PJ/CB/GN） */
export function mapPrototypeRolesToPhase1(prototypeRoleIds = []) {
  const set = new Set()
  for (const id of prototypeRoleIds || []) {
    for (const mapped of PHASE1_ROLE_MAP[id] || []) set.add(mapped)
  }
  return [...set]
}

/** 角色 → 展示名（角色已直接用中文名，此处去重后原样返回） */
export function getPhase1RoleLabels(roleIds = []) {
  return [...new Set((roleIds || []).map((id) => PHASE1_ROLE_LABELS[id] || String(id)).filter(Boolean))]
}

/** 设置/清除演示预览角色（开发/演示用） */
export function setPhase1DemoRole(roleCodes) {
  try {
    const text = String(roleCodes || '').trim()
    if (text) window.localStorage.setItem(PHASE1_DEMO_ROLE_KEY, text)
    else window.localStorage.removeItem(PHASE1_DEMO_ROLE_KEY)
    return true
  } catch (e) {
    return false
  }
}
