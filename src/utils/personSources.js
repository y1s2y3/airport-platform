/**
 * 人员来源统一口径（用户 2026-11-05 裁决）
 * - 系统用户（项目管理人员）：方案编制人、交底人员、辨识人、责任人、安全管控责任人、审批人等
 *   数据源 = 系统管理 → 用户管理（仅启用用户），展示「姓名（岗位）」
 * - 实名登记（一线作业人员）：安全技术交底/方案交底的接受人、作业人员登记
 *   数据源 = 劳务实名制在岗人员
 */
import { listSysUsers } from '../mock/sysUsers.js'
import { findOrgPositionById } from '../mock/orgStructure.js'

function positionLabel(user) {
  const names = (user.positions || [])
    .map((id) => findOrgPositionById(id)?.name)
    .filter(Boolean)
  return names.length ? names[0] : ''
}

/** 系统用户选项（字符串数组，形如「刘付生（规划建设部经理）」） */
export function listSystemUserOptions() {
  return listSysUsers()
    .filter((user) => user.status !== false && user.status !== 'disabled')
    .map((user) => {
      const name = String(user.name || '').trim()
      if (!name) return ''
      const post = positionLabel(user)
      return post ? `${name}（${post}）` : name
    })
    .filter(Boolean)
}

/** 系统用户兜底（用户表为空时，保证演示可选项非空） */
export const SYSTEM_USER_FALLBACKS = ['陈静（安全质量管理员）', '姚远东（规划建设部经理）', '刘付生（项目经理）']
